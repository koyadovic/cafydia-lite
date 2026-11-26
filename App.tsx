import React, {useState, useEffect, useMemo, useCallback} from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  ScrollView,
  Modal,
  TouchableOpacity,
  StatusBar,
  Switch,
  AppState,
} from 'react-native';
import {appStyles, colors} from './AppStyles';
import {
  proposeParameters,
  type MealType,
  type ModelProposal,
} from './AutoAdjustModel';
import {
  defaultParameters,
  loadParameters,
  saveParameters,
  getActiveSessionId,
  startSession,
  stopSession,
  saveMeal,
  listPendingMeals,
  addReading,
  loadObservations,
  saveProposal,
  loadLatestProposal,
  skipMealReading,
  type AppParameters,
  type FoodItem,
  type PendingMeal,
} from './AutoAdjustStorage';
import {
  scheduleMealReminder,
  cancelMealReminder,
  cancelMealReminders,
  initialReminderMealId,
  subscribeReminderPress,
} from './MealNotifications';

type ParamKey = keyof AppParameters;

const mealOptions: {key: MealType; label: string; emoji: string}[] = [
  {key: 'desayuno', label: 'Desayuno', emoji: '☀️'},
  {key: 'comida', label: 'Comida', emoji: '🍽️'},
  {key: 'cena', label: 'Cena', emoji: '🌙'},
];

const paramGroups: {
  title: string;
  items: {key: ParamKey; label: string; help: string}[];
}[] = [
  {
    title: 'Insulina basal',
    items: [
      {
        key: 'basal_desayunos',
        label: 'Basal desayuno',
        help: 'Unidades de basal por la mañana',
      },
      {
        key: 'basal_comidas',
        label: 'Basal comida',
        help: 'Unidades de basal al mediodía',
      },
      {
        key: 'basal_cenas',
        label: 'Basal cena',
        help: 'Unidades de basal por la noche',
      },
    ],
  },
  {
    title: 'Bolus base',
    items: [
      {
        key: 'desayuno_b',
        label: 'Bolus desayuno',
        help: 'Unidades fijas por desayuno',
      },
      {
        key: 'comida_b',
        label: 'Bolus comida',
        help: 'Unidades fijas por comida',
      },
      {key: 'cena_b', label: 'Bolus cena', help: 'Unidades fijas por cena'},
    ],
  },
  {
    title: 'Sensibilidad',
    items: [
      {
        key: 'm',
        label: 'Ratio hidratos (m)',
        help: 'Unidades por gramo de hidrato',
      },
      {
        key: 'fc',
        label: 'Factor corrección (fc)',
        help: 'mg/dL que baja 1 unidad',
      },
    ],
  },
];
const parameterKeys = paramGroups.flatMap(group =>
  group.items.map(item => item.key),
);
const adjustableKeys = [
  'm',
  'desayuno_b',
  'comida_b',
  'cena_b',
  'fc',
] as const;

function roundToFour(value: number): number {
  return Number(value.toFixed(4));
}

function determineMealType(): MealType {
  const hour = new Date().getHours();
  if (hour < 5 || hour > 16) {
    return 'cena';
  }
  if (hour < 12) {
    return 'desayuno';
  }
  return 'comida';
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

const App: React.FC = () => {
  const [parameters, setParameters] =
    useState<AppParameters>(defaultParameters);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [percentage, setPercentage] = useState<string>('');
  const [grams, setGrams] = useState<string>('');
  const [glucoseBeforeMeal, setGlucoseBeforeMeal] = useState<string>('');
  const [mealType, setMealType] = useState<MealType>(determineMealType());
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [paramInputs, setParamInputs] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{
    fast: number;
    basal: number;
    carbs: number;
    meal: MealType;
    preGlucose: number;
    preGlucoseEntered: boolean;
    foods: FoodItem[];
  } | null>(null);
  const [actualRapid, setActualRapid] = useState('');
  const [autoAdjust, setAutoAdjust] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [proposal, setProposal] = useState<ModelProposal | null>(null);
  const [pendingMeals, setPendingMeals] = useState<PendingMeal[]>([]);
  const [selectedMeal, setSelectedMeal] = useState<PendingMeal | null>(null);
  const [glucoseAfter, setGlucoseAfter] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  const refreshPending = useCallback(async () => {
    setPendingMeals(await listPendingMeals());
  }, []);

  useEffect(() => {
    setGlucoseAfter('');
  }, [selectedMeal?.id]);

  useEffect(() => {
    const load = async () => {
      try {
        const [saved, active] = await Promise.all([
          loadParameters(),
          getActiveSessionId(),
        ]);
        setParameters(saved);
        setSessionId(active);
        setAutoAdjust(active !== null);
        if (active) {
          setProposal(await loadLatestProposal(active));
        }
        await refreshPending();
        setReady(true);
        const openedId = await initialReminderMealId().catch(() => null);
        if (openedId) {
          const pending = await listPendingMeals();
          setSelectedMeal(pending.find(meal => meal.id === openedId) ?? null);
        }
      } catch (error) {
        Alert.alert(
          'Error',
          'No se pudo cargar el historial o la configuración.',
        );
      }
    };
    load();
    const unsubscribe = subscribeReminderPress(async id => {
      const pending = await listPendingMeals();
      setSelectedMeal(pending.find(meal => meal.id === id) ?? null);
      setPendingMeals(pending);
    });
    const stateListener = AppState.addEventListener('change', state => {
      if (state !== 'active') {
        return;
      }
      (async () => {
        const pending = await listPendingMeals();
        setPendingMeals(pending);
        const openedId = await initialReminderMealId().catch(() => null);
        if (openedId) {
          setSelectedMeal(pending.find(meal => meal.id === openedId) ?? null);
        }
      })().catch(() => {});
    });
    return () => {
      unsubscribe();
      stateListener.remove();
    };
  }, [refreshPending]);

  useEffect(() => {
    setParamInputs(
      Object.fromEntries(
        Object.entries(parameters).map(([k, v]) => [k, v.toString()]),
      ),
    );
  }, [parameters, showConfigModal]);

  const persistParameters = async (
    newParameters: AppParameters,
    source: 'manual' | 'auto_adjust_applied',
  ): Promise<boolean> => {
    try {
      if (
        source === 'manual' &&
        (Object.keys(parameters) as ParamKey[]).every(
          key => parameters[key] === newParameters[key],
        )
      ) {
        return true;
      }
      await saveParameters(newParameters, source, sessionId);
      setParameters(newParameters);
      setProposal(null);
      return true;
    } catch (e) {
      Alert.alert('Error', 'No se pudieron guardar las configuraciones.');
      return false;
    }
  };

  const parseNumber = (value: string, allowNegative = false): number | null => {
    const trimmed = value.trim();
    const pattern = allowNegative
      ? /^-?\d+(?:[.,]\d+)?$/
      : /^\d+(?:[.,]\d+)?$/;
    if (!pattern.test(trimmed)) {
      return null;
    }
    const parsed = Number(trimmed.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  };

  const toggleAutoAdjust = async (enabled: boolean) => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      if (enabled) {
        const id = await startSession();
        setSessionId(id);
        setProposal(await loadLatestProposal(id));
      } else {
        await stopSession();
        await cancelMealReminders(pendingMeals).catch(() => {});
        setSessionId(null);
        setProposal(null);
      }
      setAutoAdjust(enabled);
    } catch (_) {
      Alert.alert('Error', 'No se pudo cambiar el estado del autoajuste.');
    } finally {
      setBusy(false);
    }
  };

  const totalCarbs = useMemo(
    () => foodItems.reduce((t, i) => t + (i.percentage / 100) * i.grams, 0),
    [foodItems],
  );

  const calculateDose = () => {
    if (!ready) {
      Alert.alert('Configuración', 'Espera a que se carguen los parámetros.');
      return;
    }
    const b =
      mealType === 'desayuno'
        ? parameters.desayuno_b
        : mealType === 'comida'
        ? parameters.comida_b
        : parameters.cena_b;

    const basal =
      mealType === 'desayuno'
        ? parameters.basal_desayunos
        : mealType === 'comida'
        ? parameters.basal_comidas
        : parameters.basal_cenas;

    const glucose = glucoseBeforeMeal.trim()
      ? parseNumber(glucoseBeforeMeal)
      : 100;
    if (glucose === null || glucose <= 0) {
      Alert.alert('Error', 'Introduce una glucosa previa válida.');
      return;
    }
    if (totalCarbs < 0 || !Number.isFinite(totalCarbs) || parameters.fc <= 0) {
      Alert.alert('Error', 'Comprueba los hidratos y el factor de corrección.');
      return;
    }
    const dose =
      totalCarbs * parameters.m + b + (glucose - 100) / parameters.fc;
    if (!Number.isFinite(dose)) {
      Alert.alert(
        'Error',
        'No se puede calcular una dosis válida con estos datos.',
      );
      return;
    }
    const fast = Math.round(dose * 2) / 2;
    setActualRapid(fast.toString());
    setResult({
      fast,
      basal,
      carbs: totalCarbs,
      meal: mealType,
      preGlucose: glucose,
      preGlucoseEntered: glucoseBeforeMeal.trim() !== '',
      foods: [...foodItems],
    });
  };

  const confirmMeal = async () => {
    if (!result || busy) {
      return;
    }
    const actual = parseNumber(actualRapid);
    if (actual === null || actual < 0) {
      Alert.alert(
        'Error',
        'Introduce la cantidad de rápida realmente administrada.',
      );
      return;
    }
    if (!autoAdjust) {
      setResult(null);
      return;
    }
    setBusy(true);
    try {
      const startedAt = Date.now();
      const saved = await saveMeal({
        mealType: result.meal,
        startedAt,
        preGlucose: result.preGlucose,
        preGlucoseEntered: result.preGlucoseEntered,
        carbs: result.carbs,
        recommendedRapid: result.fast,
        actualRapid: actual,
        basalRecommended: result.basal,
        foods: result.foods,
      });
      const notified = await scheduleMealReminder({
        id: saved.id,
        mealType: saved.mealType,
        startedAt: saved.startedAt,
        dueAt: saved.dueAt,
        carbs: saved.carbs,
      });
      await refreshPending();
      setResult(null);
      setFoodItems([]);
      setGlucoseBeforeMeal('');
      if (!notified) {
        Alert.alert(
          'Comida guardada',
          'El aviso no está disponible. La medición pendiente aparece en la app.',
        );
      }
    } catch (_) {
      Alert.alert('Error', 'No se pudo guardar la comida.');
    } finally {
      setBusy(false);
    }
  };

  const saveAfterGlucose = async () => {
    if (!selectedMeal || busy) {
      return;
    }
    const glucose = parseNumber(glucoseAfter);
    if (glucose === null || glucose <= 0) {
      Alert.alert('Error', 'Introduce una glucosa válida en mg/dL.');
      return;
    }
    setBusy(true);
    try {
      const {readingId, sessionId: mealSession} = await addReading(
        selectedMeal.id,
        glucose,
        selectedMeal.dueAt,
      );
      await cancelMealReminder(selectedMeal.id).catch(() => {});
      await refreshPending();
      setSelectedMeal(null);
      setGlucoseAfter('');
      if (mealSession === sessionId) {
        try {
          const observations = await loadObservations(mealSession);
          const next = proposeParameters(observations, parameters);
          await saveProposal(mealSession, readingId, next);
          setProposal(next);
        } catch (_) {
          Alert.alert(
            'Medición guardada',
            'No se pudo actualizar la propuesta de autoajuste.',
          );
        }
      }
    } catch (_) {
      Alert.alert('Error', 'No se pudo guardar la medición.');
    } finally {
      setBusy(false);
    }
  };

  const skipSelectedMeal = async () => {
    if (!selectedMeal || busy) {
      return;
    }
    setBusy(true);
    try {
      await skipMealReading(selectedMeal.id);
      await cancelMealReminder(selectedMeal.id).catch(() => {});
      await refreshPending();
      setSelectedMeal(null);
      setGlucoseAfter('');
    } catch (_) {
      Alert.alert('Error', 'No se pudo omitir esta medición.');
    } finally {
      setBusy(false);
    }
  };

  const addFood = () => {
    const parsedPercentage = percentage.trim() ? parseNumber(percentage) : 100;
    const parsedGrams = parseNumber(grams);

    if (
      parsedPercentage === null ||
      parsedPercentage < 0 ||
      parsedPercentage > 100 ||
      parsedGrams === null ||
      parsedGrams <= 0
    ) {
      Alert.alert(
        'Error',
        'Por favor, introduce valores válidos para porcentaje y gramos.',
      );
      return;
    }

    setFoodItems(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        percentage: parsedPercentage,
        grams: parsedGrams,
      },
    ]);
    setPercentage('');
    setGrams('');
  };

  const removeItem = (id: string) => {
    setFoodItems(prev => prev.filter(i => i.id !== id));
  };

  return (
    <View style={appStyles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={appStyles.header}>
        <View style={appStyles.headerTextWrap}>
          <Text style={appStyles.title}>Cafydia Lite</Text>
          <Text style={appStyles.subtitle}>
            Hidratos e insulina, en segundos
          </Text>
        </View>
        <TouchableOpacity
          style={appStyles.settingsButton}
          testID="open-settings"
          onPress={() => setShowConfigModal(true)}
          activeOpacity={0.7}
          disabled={!ready}>
          <Text style={appStyles.settingsEmoji}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={appStyles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <View style={appStyles.card}>
          <Text style={appStyles.cardLabel}>Tipo de comida</Text>
          <View style={appStyles.segmentedContainer}>
            {mealOptions.map(opt => {
              const active = mealType === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[appStyles.segment, active && appStyles.segmentActive]}
                  testID={`meal-${opt.key}`}
                  onPress={() => setMealType(opt.key)}
                  activeOpacity={0.7}>
                  <Text style={appStyles.segmentEmoji}>{opt.emoji}</Text>
                  <Text
                    style={[
                      appStyles.segmentLabel,
                      active && appStyles.segmentLabelActive,
                    ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={appStyles.card}>
          <Text style={appStyles.cardLabel}>Glucosa antes de comer</Text>
          <TextInput
            style={appStyles.input}
            placeholder="mg/dL (por defecto 100)"
            testID="glucose-before"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            value={glucoseBeforeMeal}
            onChangeText={setGlucoseBeforeMeal}
            selectionColor={colors.primary}
          />
        </View>

        <View style={appStyles.card}>
          <Text style={appStyles.cardLabel}>Añadir alimento</Text>
          <View style={appStyles.inputRow}>
            <View style={appStyles.inputCol}>
              <Text style={appStyles.inputLabel}>% Hidratos</Text>
              <TextInput
                style={appStyles.input}
                placeholder="100"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={percentage}
                onChangeText={setPercentage}
                selectionColor={colors.primary}
              />
            </View>
            <View style={appStyles.inputColSpacer} />
            <View style={appStyles.inputCol}>
              <Text style={appStyles.inputLabel}>Gramos</Text>
              <TextInput
                style={appStyles.input}
                placeholder="0"
                testID="food-grams"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={grams}
                onChangeText={setGrams}
                selectionColor={colors.primary}
              />
            </View>
          </View>
          <TouchableOpacity
            style={appStyles.secondaryButton}
            onPress={addFood}
            testID="add-food"
            activeOpacity={0.8}>
            <Text style={appStyles.secondaryButtonText}>
              ＋ Añadir alimento
            </Text>
          </TouchableOpacity>
        </View>

        <View style={appStyles.card}>
          <Text style={appStyles.cardLabel}>Alimentos</Text>
          {foodItems.length === 0 ? (
            <Text style={appStyles.emptyList}>Aún no has añadido nada</Text>
          ) : (
            <>
              {foodItems.map(item => (
                <View key={item.id} style={appStyles.foodItem}>
                  <View style={appStyles.foodIcon}>
                    <Text style={appStyles.foodIconText}>🍞</Text>
                  </View>
                  <View style={appStyles.foodInfo}>
                    <Text style={appStyles.foodPrimary}>
                      {((item.percentage / 100) * item.grams).toFixed(1)} g de
                      hidratos
                    </Text>
                    <Text style={appStyles.foodSecondary}>
                      {item.grams} g · {item.percentage}% CH
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => removeItem(item.id)}
                    style={appStyles.deleteButton}
                    activeOpacity={0.7}>
                    <Text style={appStyles.deleteText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <View style={appStyles.totalCarbs}>
                <Text style={appStyles.totalCarbsLabel}>Total hidratos</Text>
                <Text style={appStyles.totalCarbsValue}>
                  {totalCarbs.toFixed(1)} g
                </Text>
              </View>
            </>
          )}
        </View>

        <TouchableOpacity
          style={appStyles.primaryButton}
          onPress={calculateDose}
          testID="calculate-dose"
          activeOpacity={0.85}
          disabled={!ready}>
          <Text style={appStyles.primaryButtonText}>
            {ready ? 'Calcular dosis' : 'Cargando configuración…'}
          </Text>
        </TouchableOpacity>

        {pendingMeals.length > 0 && (
          <View style={appStyles.card}>
            <Text style={appStyles.cardLabel}>Glucosas pendientes</Text>
            {pendingMeals.map(meal => (
              <TouchableOpacity
                key={meal.id}
                style={appStyles.pendingRow}
                testID={`pending-meal-${meal.id}`}
                onPress={() => setSelectedMeal(meal)}>
                <Text style={appStyles.pendingText}>
                  {
                    mealOptions.find(option => option.key === meal.mealType)
                      ?.label
                  }{' · comida '}
                  {formatTime(meal.startedAt)}
                  {'\nGlucosa '}
                  {formatTime(meal.dueAt)}
                </Text>
                <Text style={appStyles.pendingAction}>
                  {Date.now() >= meal.dueAt ? 'Introducir' : 'Pendiente'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={result !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setResult(null)}>
        <View style={appStyles.resultBackdrop}>
          <View style={appStyles.resultCard}>
            <Text style={appStyles.resultTitle}>Dosis recomendada</Text>
            <Text style={appStyles.resultSubtitle}>
              {mealOptions.find(m => m.key === result?.meal)?.label} ·{' '}
              {result?.carbs.toFixed(1)} g de hidratos
            </Text>

            <View style={[appStyles.resultRow, appStyles.resultRowAccent]}>
              <Text
                style={[appStyles.resultLabel, appStyles.resultLabelAccent]}>
                Rápida
              </Text>
              <View style={appStyles.resultValueRow}>
                <Text
                  style={[appStyles.resultValue, appStyles.resultValueAccent]}>
                  {result?.fast}
                </Text>
                <Text style={appStyles.resultUnit}>uds.</Text>
              </View>
            </View>

            <View style={appStyles.resultRow}>
              <Text style={appStyles.resultLabel}>Basal</Text>
              <View style={appStyles.resultValueRow}>
                <Text style={appStyles.resultValue}>{result?.basal}</Text>
                <Text style={appStyles.resultUnit}>uds.</Text>
              </View>
            </View>

            <Text style={appStyles.inputLabel}>
              Rápida realmente administrada (uds.)
            </Text>
            <TextInput
              style={appStyles.input}
              keyboardType="decimal-pad"
              value={actualRapid}
              onChangeText={setActualRapid}
              selectTextOnFocus
              accessibilityLabel="Rápida realmente administrada"
            />
            {autoAdjust && (
              <Text style={appStyles.proposalHelp}>
                Confirma al empezar a comer; el aviso se programará para 90
                minutos después.
              </Text>
            )}

            <TouchableOpacity
              style={appStyles.primaryButton}
              onPress={confirmMeal}
              testID="confirm-meal"
              activeOpacity={0.85}
              disabled={busy}>
              <Text style={appStyles.primaryButtonText}>
                {autoAdjust ? 'Confirmar y guardar comida' : 'Entendido'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showConfigModal}
        animationType="slide"
        onRequestClose={() => setShowConfigModal(false)}>
        <View style={appStyles.modalContainer}>
          <View style={appStyles.modalHeader}>
            <Text style={appStyles.modalTitle}>Configuración</Text>
            <TouchableOpacity
              style={appStyles.modalClose}
              onPress={() => setShowConfigModal(false)}
              activeOpacity={0.7}>
              <Text style={appStyles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={appStyles.modalContent}>
            <View style={appStyles.sectionGroup}>
              <Text style={appStyles.sectionGroupTitle}>Autoajuste</Text>
              <View style={appStyles.configCard}>
                <View style={appStyles.configRow}>
                  <View style={appStyles.configTexts}>
                    <Text style={appStyles.configLabel}>
                      Registrar comidas y mediciones
                    </Text>
                    <Text style={appStyles.configHelp}>
                      El ajuste usa solo datos desde la última activación.
                    </Text>
                  </View>
                  <Switch
                    value={autoAdjust}
                    onValueChange={toggleAutoAdjust}
                    disabled={busy}
                    trackColor={{true: colors.primary}}
                  />
                </View>
                {autoAdjust && (
                  <>
                    <Text style={appStyles.proposalHelp}>
                      {proposal
                        ? `${proposal.usable} de ${proposal.total} comidas usadas · ${proposal.reason}`
                        : 'Aún no hay mediciones completas.'}
                    </Text>
                    {proposal?.meanAbsoluteError !== null &&
                      proposal?.meanAbsoluteError !== undefined && (
                        <Text style={appStyles.proposalHelp}>
                          Error medio en esos datos:{' '}
                          {proposal.meanAbsoluteError.toFixed(0)} mg/dL.
                        </Text>
                      )}
                    {adjustableKeys.map(key => (
                      <View key={key} style={appStyles.proposalRow}>
                        <Text style={appStyles.configLabel}>{key}</Text>
                        <Text
                          style={appStyles.proposalValue}
                          testID={`proposal-value-${key}`}>
                          {parameters[key].toFixed(4)} →{' '}
                          {roundToFour(
                            proposal?.values[key] ?? parameters[key],
                          ).toFixed(4)}
                        </Text>
                      </View>
                    ))}
                    <TouchableOpacity
                      testID="apply-proposal"
                      style={[
                        appStyles.primaryButton,
                        proposal?.status !== 'ready' &&
                          appStyles.disabledButton,
                      ]}
                      disabled={proposal?.status !== 'ready' || busy}
                      onPress={() => {
                        if (!proposal || proposal.status !== 'ready') {
                          return;
                        }
                        Alert.alert(
                          'Aplicar parámetros',
                          'Los valores propuestos cambiarán las próximas recomendaciones de rápida.',
                          [
                            {text: 'Cancelar', style: 'cancel'},
                            {
                              text: 'Aplicar',
                              onPress: async () => {
                                const roundedValues = {...proposal.values};
                                adjustableKeys.forEach(key => {
                                  roundedValues[key] = roundToFour(
                                    proposal.values[key],
                                  );
                                });
                                await persistParameters(
                                  {...parameters, ...roundedValues},
                                  'auto_adjust_applied',
                                );
                              },
                            },
                          ],
                        );
                      }}>
                      <Text style={appStyles.primaryButtonText}>
                        Aplicar valores propuestos
                      </Text>
                    </TouchableOpacity>
                    <Text style={appStyles.proposalHelp}>
                      La lectura a los 90 minutos no indica una corrección
                      inmediata. Los valores solo se aplican al pulsar el botón.
                    </Text>
                  </>
                )}
              </View>
            </View>
            {paramGroups.map(group => (
              <View key={group.title} style={appStyles.sectionGroup}>
                <Text style={appStyles.sectionGroupTitle}>{group.title}</Text>
                <View style={appStyles.configCard}>
                  {group.items.map((item, idx) => (
                    <View
                      key={item.key}
                      style={[
                        appStyles.configItem,
                        idx === group.items.length - 1 &&
                          appStyles.configItemLast,
                      ]}>
                      <View style={appStyles.configRow}>
                        <View style={appStyles.configTexts}>
                          <Text style={appStyles.configLabel}>
                            {item.label}
                          </Text>
                          <Text style={appStyles.configHelp}>{item.help}</Text>
                        </View>
                        <TextInput
                          style={appStyles.configInput}
                          keyboardType="numeric"
                          testID={`parameter-${item.key}`}
                          value={paramInputs[item.key] ?? ''}
                          onChangeText={v =>
                            setParamInputs(prev => ({...prev, [item.key]: v}))
                          }
                          selectionColor={colors.primary}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={appStyles.modalFooter}>
            <TouchableOpacity
              style={appStyles.primaryButton}
              testID="save-settings"
              activeOpacity={0.85}
              onPress={async () => {
                const parsed = Object.fromEntries(
                  parameterKeys.map(key => [
                    key,
                    parseNumber(
                      paramInputs[key] ?? '',
                      key === 'desayuno_b' ||
                        key === 'comida_b' ||
                        key === 'cena_b',
                    ),
                  ]),
                ) as Record<ParamKey, number | null>;
                if (
                  Object.values(parsed).some(value => value === null) ||
                  parsed.m === null ||
                  parsed.m <= 0 ||
                  parsed.fc === null ||
                  parsed.fc <= 0 ||
                  parsed.basal_desayunos! < 0 ||
                  parsed.basal_comidas! < 0 ||
                  parsed.basal_cenas! < 0
                ) {
                  Alert.alert(
                    'Error',
                    'Revisa los parámetros: m y fc deben ser positivos y la basal no puede ser negativa. Los bolos base sí admiten valores negativos.',
                  );
                  return;
                }
                if (
                  await persistParameters(parsed as AppParameters, 'manual')
                ) {
                  setShowConfigModal(false);
                }
              }}>
              <Text style={appStyles.primaryButtonText}>Guardar cambios</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={selectedMeal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setSelectedMeal(null);
          setGlucoseAfter('');
        }}>
        <View style={appStyles.resultBackdrop}>
          <ScrollView
            style={appStyles.resultScroll}
            contentContainerStyle={appStyles.resultCard}
            keyboardShouldPersistTaps="handled">
            <Text style={appStyles.resultTitle}>Glucosa después de comer</Text>
            <Text style={appStyles.resultSubtitle}>
              {
                mealOptions.find(
                  option => option.key === selectedMeal?.mealType,
                )?.label
              }{' '}
              · {selectedMeal?.carbs.toFixed(1)} g de hidratos · objetivo 135
              mg/dL{'\n'}Glucosa de las{' '}
              {selectedMeal && formatTime(selectedMeal.dueAt)}
            </Text>
            <Text style={appStyles.proposalHelp}>
              Esta medición sirve para el historial y el ajuste; no indica una
              dosis de corrección ahora.
            </Text>
            <TextInput
              style={appStyles.input}
              placeholder="Glucosa a esa hora (mg/dL)"
              testID="glucose-after"
              keyboardType="numeric"
              value={glucoseAfter}
              onChangeText={setGlucoseAfter}
              accessibilityLabel="Glucosa a la hora prevista"
            />
            <TouchableOpacity
              style={appStyles.primaryButton}
              onPress={saveAfterGlucose}
              testID="save-after-glucose"
              disabled={busy}>
              <Text style={appStyles.primaryButtonText}>Guardar medición</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={appStyles.secondaryButton}
              onPress={() => {
                setSelectedMeal(null);
                setGlucoseAfter('');
              }}>
              <Text style={appStyles.secondaryButtonText}>Ahora no</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={appStyles.secondaryButton}
              onPress={skipSelectedMeal}
              disabled={busy}>
              <Text style={appStyles.secondaryButtonText}>
                Omitir esta medición
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

export default App;
