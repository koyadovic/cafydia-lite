import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  Alert,
  ScrollView,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { appStyles } from './AppStyles';


interface FoodItem {
  id: string;
  percentage: number;
  grams: number;
}


const defaultParameters = {
  basal_desayunos: 78,
  basal_comidas: 0,
  basal_cenas: 0,
  m: 0.187,
  desayuno_b: 8,
  comida_b: 5,
  cena_b: 2,
  fc: 15,
};

const App: React.FC = () => {
  const [parameters, setParameters] = useState(defaultParameters);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [percentage, setPercentage] = useState<string>('');
  const [grams, setGrams] = useState<string>('');
  const [glucoseBeforeMeal, setGlucoseBeforeMeal] = useState<string>('');
  const [mealType, setMealType] = useState<'desayuno' | 'comida' | 'cena'>(determineMealType());
  const [showConfigModal, setShowConfigModal] = useState(false);

  function determineMealType(): 'desayuno' | 'comida' | 'cena' {
    const hour = new Date().getHours();
    if(hour < 5 || hour > 16) {
      return 'cena';
    }
    if (hour < 12) {
      return 'desayuno';
    }
    return 'comida';
  }

  useEffect(() => {
    const loadParameters = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem('parameters');
        setParameters(jsonValue != null ? JSON.parse(jsonValue) : defaultParameters);
        } catch (error) {
        Alert.alert('Error', 'No se pudieron cargar las configuraciones.');
      }
    };
    loadParameters();
  }, []);

  const [paramInputs, setParamInputs] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    setParamInputs(
      Object.fromEntries(
        Object.entries(parameters).map(([k, v]) => [k, v.toString()])
      )
    );
  }, [parameters, showConfigModal]);

  const saveParameters = async (newParameters: typeof parameters) => {
    setParameters(newParameters);
    try {
      await AsyncStorage.setItem('parameters', JSON.stringify(newParameters));
    } catch (e) {
      Alert.alert('Error', 'No se pudieron guardar las configuraciones.');
    }
  };

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
    const totalCarbs = foodItems.reduce(
      (total, item) => total + (item.percentage / 100) * item.grams,
      0
    );

    const dose = totalCarbs * parameters.m + b + ((glucose - 100) / parameters.fc);
    let recommendation = `Rápida: ${Math.round(dose * 2) / 2} unidades.\n`;
    recommendation += `Basal: ${basal} unidades.`;
    Alert.alert('Dosis recomendada', recommendation);
  };

  const removeItem = (id: string) => {
    setFoodItems((prevItems) => prevItems.filter((item) => item.id !== id));
  };

  return (
    <View style={appStyles.container}>
      <TouchableOpacity
        style={appStyles.settingsButton}
        onPress={() => setShowConfigModal(true)}
      >
        <Text style={appStyles.emoji}>⚙️</Text>
      </TouchableOpacity>

      <Text style={appStyles.title}>Cafydia Lite</Text>

      <ScrollView contentContainerStyle={appStyles.scrollContainer}>
        <View style={appStyles.section}>
          <Text style={appStyles.subtitle}>Tipo de comida</Text>
          <Picker
            selectedValue={mealType}
            onValueChange={(itemValue) => {
              if (['desayuno', 'comida', 'cena'].includes(itemValue)) {
                setMealType(itemValue as 'desayuno' | 'comida' | 'cena');
              } else {
                console.error('Valor inválido recibido en Picker:', itemValue);
              }
            }}
          >
            <Picker.Item label="Desayuno" value="desayuno" />
            <Picker.Item label="Comida" value="comida" />
            <Picker.Item label="Cena" value="cena" />
          </Picker>
        </View>

        <View style={appStyles.section}>
          <Text style={appStyles.subtitle}>Glucosa antes de comer</Text>
          <TextInput
            style={appStyles.input}
            placeholder="mg/dL (vacío es 100mg/dL)"
            keyboardType="numeric"
            value={glucoseBeforeMeal}
            onChangeText={setGlucoseBeforeMeal}
          />
        </View>

        <View style={appStyles.section}>
          <Text style={appStyles.subtitle}>Añadir alimento</Text>
          <TextInput
            style={appStyles.input}
            placeholder="% Hidratos (vacío es 100%)"
            keyboardType="numeric"
            value={percentage}
            onChangeText={setPercentage}
          />
          <TextInput
            style={appStyles.input}
            placeholder="Gramos"
            keyboardType="numeric"
            value={grams}
            onChangeText={setGrams}
          />
          <Button
            title="Añadir alimento"
            onPress={() => {
              const parsedPercentage = parseFloat(percentage) || 100.0;
              const parsedGrams = parseFloat(grams);

              if (isNaN(parsedPercentage) || isNaN(parsedGrams)) {
                Alert.alert('Error', 'Por favor, introduce valores válidos para porcentaje y gramos.');
                return;
              }

              setFoodItems((prevItems) => [
                ...prevItems,
                { id: Date.now().toString(), percentage: parsedPercentage, grams: parsedGrams },
              ]);

              setPercentage('');
              setGrams('');
            }}
          />
        </View>

        <FlatList
          data={foodItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={appStyles.listItemContainer}>
              <Text style={appStyles.listItem}>
                🥩 {item.grams}g ({item.percentage}%) = {((item.percentage / 100) * item.grams).toFixed(1)}g CH
              </Text>
              <TouchableOpacity onPress={() => removeItem(item.id)} style={appStyles.deleteButton}>
                <Text style={appStyles.deleteText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={<Text style={appStyles.emptyList}>No hay alimentos añadidos.</Text>}
        />

        <Button title="Calcular dosis" onPress={calculateDose} />
      </ScrollView>

      <Modal
        visible={showConfigModal}
        animationType="slide"
        onRequestClose={() => setShowConfigModal(false)}
      >
        <ScrollView contentContainerStyle={appStyles.modalContainer}>
          <Text style={appStyles.subtitle}>Configuración</Text>

          {Object.keys(paramInputs).map((key) => (
            <View key={key} style={appStyles.configItem}>
              <Text style={appStyles.label}>{key}</Text>
              <TextInput
                style={appStyles.input}
                keyboardType="numeric"
                value={paramInputs[key]}
                onChangeText={(value) =>
                  setParamInputs((prev) => ({ ...prev, [key]: value }))
                }
              />
            </View>
          ))}

          <Button
            title="Guardar configuración"
            onPress={() => {
              const parsed = Object.fromEntries(
                Object.entries(paramInputs).map(([k, v]) => [k, parseFloat(v) || 0])
              );
              saveParameters(parsed as typeof parameters);
              setShowConfigModal(false);
            }}
          />
        </ScrollView>
      </Modal>
    </View>
  );
};


export default App;
