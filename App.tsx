import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  ScrollView,
  Modal,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { appStyles, colors } from './AppStyles';


interface FoodItem {
  id: string;
  percentage: number;
  grams: number;
}

type MealType = 'desayuno' | 'comida' | 'cena';

type ParamKey =
  | 'basal_desayunos'
  | 'basal_comidas'
  | 'basal_cenas'
  | 'm'
  | 'desayuno_b'
  | 'comida_b'
  | 'cena_b'
  | 'fc';

const defaultParameters: Record<ParamKey, number> = {
  basal_desayunos: 78,
  basal_comidas: 0,
  basal_cenas: 0,
  m: 0.187,
  desayuno_b: 8,
  comida_b: 5,
  cena_b: 2,
  fc: 15,
};

const mealOptions: { key: MealType; label: string; emoji: string }[] = [
  { key: 'desayuno', label: 'Desayuno', emoji: '☀️' },
  { key: 'comida', label: 'Comida', emoji: '🍽️' },
  { key: 'cena', label: 'Cena', emoji: '🌙' },
];

const paramGroups: {
  title: string;
  items: { key: ParamKey; label: string; help: string }[];
}[] = [
  {
    title: 'Insulina basal',
    items: [
      { key: 'basal_desayunos', label: 'Basal desayuno', help: 'Unidades de basal por la mañana' },
      { key: 'basal_comidas', label: 'Basal comida', help: 'Unidades de basal al mediodía' },
      { key: 'basal_cenas', label: 'Basal cena', help: 'Unidades de basal por la noche' },
    ],
  },
  {
    title: 'Bolus base',
    items: [
      { key: 'desayuno_b', label: 'Bolus desayuno', help: 'Unidades fijas por desayuno' },
      { key: 'comida_b', label: 'Bolus comida', help: 'Unidades fijas por comida' },
      { key: 'cena_b', label: 'Bolus cena', help: 'Unidades fijas por cena' },
    ],
  },
  {
    title: 'Sensibilidad',
    items: [
      { key: 'm', label: 'Ratio hidratos (m)', help: 'Unidades por gramo de hidrato' },
      { key: 'fc', label: 'Factor corrección (fc)', help: 'mg/dL que baja 1 unidad' },
    ],
  },
];

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

const App: React.FC = () => {
  const [parameters, setParameters] = useState<Record<ParamKey, number>>(defaultParameters);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [percentage, setPercentage] = useState<string>('');
  const [grams, setGrams] = useState<string>('');
  const [glucoseBeforeMeal, setGlucoseBeforeMeal] = useState<string>('');
  const [mealType, setMealType] = useState<MealType>(determineMealType());
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [paramInputs, setParamInputs] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ fast: number; basal: number; carbs: number; meal: MealType } | null>(null);

  useEffect(() => {
    const loadParameters = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem('parameters');
        setParameters(
          jsonValue != null
            ? { ...defaultParameters, ...JSON.parse(jsonValue) }
            : defaultParameters
        );
      } catch (error) {
        Alert.alert('Error', 'No se pudieron cargar las configuraciones.');
      }
    };
    loadParameters();
  }, []);

  useEffect(() => {
    setParamInputs(
      Object.fromEntries(
        Object.entries(parameters).map(([k, v]) => [k, v.toString()])
      )
    );
  }, [parameters, showConfigModal]);

  const saveParameters = async (newParameters: Record<ParamKey, number>) => {
    setParameters(newParameters);
    try {
      await AsyncStorage.setItem('parameters', JSON.stringify(newParameters));
    } catch (e) {
      Alert.alert('Error', 'No se pudieron guardar las configuraciones.');
    }
  };

  const totalCarbs = useMemo(
    () => foodItems.reduce((t, i) => t + (i.percentage / 100) * i.grams, 0),
    [foodItems]
  );

  const calculateDose = () => {
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

    const glucose = parseFloat(glucoseBeforeMeal) || 100;
    const dose = totalCarbs * parameters.m + b + (glucose - 100) / parameters.fc;
    const fast = Math.round(dose * 2) / 2;
    setResult({ fast, basal, carbs: totalCarbs, meal: mealType });
  };

  const addFood = () => {
    const parsedPercentage = parseFloat(percentage) || 100.0;
    const parsedGrams = parseFloat(grams);

    if (isNaN(parsedPercentage) || isNaN(parsedGrams)) {
      Alert.alert('Error', 'Por favor, introduce valores válidos para porcentaje y gramos.');
      return;
    }

    setFoodItems((prev) => [
      ...prev,
      { id: Date.now().toString(), percentage: parsedPercentage, grams: parsedGrams },
    ]);
    setPercentage('');
    setGrams('');
  };

  const removeItem = (id: string) => {
    setFoodItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <View style={appStyles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={appStyles.header}>
        <View style={appStyles.headerTextWrap}>
          <Text style={appStyles.title}>Cafydia Lite</Text>
          <Text style={appStyles.subtitle}>Hidratos e insulina, en segundos</Text>
        </View>
        <TouchableOpacity
          style={appStyles.settingsButton}
          onPress={() => setShowConfigModal(true)}
          activeOpacity={0.7}
        >
          <Text style={appStyles.settingsEmoji}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={appStyles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={appStyles.card}>
          <Text style={appStyles.cardLabel}>Tipo de comida</Text>
          <View style={appStyles.segmentedContainer}>
            {mealOptions.map((opt) => {
              const active = mealType === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[appStyles.segment, active && appStyles.segmentActive]}
                  onPress={() => setMealType(opt.key)}
                  activeOpacity={0.7}
                >
                  <Text style={appStyles.segmentEmoji}>{opt.emoji}</Text>
                  <Text style={[appStyles.segmentLabel, active && appStyles.segmentLabelActive]}>
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
            activeOpacity={0.8}
          >
            <Text style={appStyles.secondaryButtonText}>＋  Añadir alimento</Text>
          </TouchableOpacity>
        </View>

        <View style={appStyles.card}>
          <Text style={appStyles.cardLabel}>Alimentos</Text>
          {foodItems.length === 0 ? (
            <Text style={appStyles.emptyList}>Aún no has añadido nada</Text>
          ) : (
            <>
              {foodItems.map((item) => (
                <View key={item.id} style={appStyles.foodItem}>
                  <View style={appStyles.foodIcon}>
                    <Text style={appStyles.foodIconText}>🍞</Text>
                  </View>
                  <View style={appStyles.foodInfo}>
                    <Text style={appStyles.foodPrimary}>
                      {((item.percentage / 100) * item.grams).toFixed(1)} g de hidratos
                    </Text>
                    <Text style={appStyles.foodSecondary}>
                      {item.grams} g · {item.percentage}% CH
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => removeItem(item.id)}
                    style={appStyles.deleteButton}
                    activeOpacity={0.7}
                  >
                    <Text style={appStyles.deleteText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <View style={appStyles.totalCarbs}>
                <Text style={appStyles.totalCarbsLabel}>Total hidratos</Text>
                <Text style={appStyles.totalCarbsValue}>{totalCarbs.toFixed(1)} g</Text>
              </View>
            </>
          )}
        </View>

        <TouchableOpacity
          style={appStyles.primaryButton}
          onPress={calculateDose}
          activeOpacity={0.85}
        >
          <Text style={appStyles.primaryButtonText}>Calcular dosis</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={result !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setResult(null)}
      >
        <View style={appStyles.resultBackdrop}>
          <View style={appStyles.resultCard}>
            <Text style={appStyles.resultTitle}>Dosis recomendada</Text>
            <Text style={appStyles.resultSubtitle}>
              {mealOptions.find((m) => m.key === result?.meal)?.label} ·{' '}
              {result?.carbs.toFixed(1)} g de hidratos
            </Text>

            <View style={[appStyles.resultRow, appStyles.resultRowAccent]}>
              <Text style={[appStyles.resultLabel, appStyles.resultLabelAccent]}>Rápida</Text>
              <View style={appStyles.resultValueRow}>
                <Text style={[appStyles.resultValue, appStyles.resultValueAccent]}>
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

            <TouchableOpacity
              style={appStyles.primaryButton}
              onPress={() => setResult(null)}
              activeOpacity={0.85}
            >
              <Text style={appStyles.primaryButtonText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showConfigModal}
        animationType="slide"
        onRequestClose={() => setShowConfigModal(false)}
      >
        <View style={appStyles.modalContainer}>
          <View style={appStyles.modalHeader}>
            <Text style={appStyles.modalTitle}>Configuración</Text>
            <TouchableOpacity
              style={appStyles.modalClose}
              onPress={() => setShowConfigModal(false)}
              activeOpacity={0.7}
            >
              <Text style={appStyles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={appStyles.modalContent}>
            {paramGroups.map((group) => (
              <View key={group.title} style={appStyles.sectionGroup}>
                <Text style={appStyles.sectionGroupTitle}>{group.title}</Text>
                <View style={appStyles.configCard}>
                  {group.items.map((item, idx) => (
                    <View
                      key={item.key}
                      style={[
                        appStyles.configItem,
                        idx === group.items.length - 1 && appStyles.configItemLast,
                      ]}
                    >
                      <View style={appStyles.configRow}>
                        <View style={appStyles.configTexts}>
                          <Text style={appStyles.configLabel}>{item.label}</Text>
                          <Text style={appStyles.configHelp}>{item.help}</Text>
                        </View>
                        <TextInput
                          style={appStyles.configInput}
                          keyboardType="numeric"
                          value={paramInputs[item.key] ?? ''}
                          onChangeText={(v) =>
                            setParamInputs((prev) => ({ ...prev, [item.key]: v }))
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
              activeOpacity={0.85}
              onPress={() => {
                const parsed = Object.fromEntries(
                  Object.entries(paramInputs).map(([k, v]) => [k, parseFloat(v) || 0])
                ) as Record<ParamKey, number>;
                saveParameters(parsed);
                setShowConfigModal(false);
              }}
            >
              <Text style={appStyles.primaryButtonText}>Guardar cambios</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};


export default App;
