import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  StyleSheet,
  Alert,
  ScrollView,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';



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
  // Configuración inicial
  const [parameters, setParameters] = useState(defaultParameters);

  const [foodItems, setFoodItems] = useState<FoodItem[]>([]); // Alimentos seleccionados
  const [percentage, setPercentage] = useState<string>(''); // Porcentaje de hidratos
  const [grams, setGrams] = useState<string>(''); // Gramos del alimento
  const [glucoseBeforeMeal, setGlucoseBeforeMeal] = useState<string>('100'); // Glucosa antes de comer
  const [mealType, setMealType] = useState<'desayuno' | 'comida' | 'cena'>(determineMealType());
  const [showConfigModal, setShowConfigModal] = useState(false); // Mostrar modal de configuración

  function determineMealType(): 'desayuno' | 'comida' | 'cena' {
    const hour = new Date().getHours();
    if (hour >= 7 && hour < 11) {
      return 'desayuno';
    } else if (hour >= 12 && hour < 16) {
      return 'comida';
    } else {
      return 'cena';
    }
  }

  useEffect(() => {
    // Cargar configuraciones al inicio
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

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => setShowConfigModal(true)}
      >
        <Text>Settings</Text>
      </TouchableOpacity>

      <Text style={styles.title}>CafydiaLite</Text>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.section}>
          <Text style={styles.subtitle}>Tipo de comida</Text>
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

        <View style={styles.section}>
          <Text style={styles.subtitle}>Glucosa antes de comer</Text>
          <TextInput
            style={styles.input}
            placeholder="Glucosa (mg/dL)"
            keyboardType="numeric"
            value={glucoseBeforeMeal}
            onChangeText={setGlucoseBeforeMeal}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>Añadir alimento</Text>
          <TextInput
            style={styles.input}
            placeholder="% Hidratos"
            keyboardType="numeric"
            value={percentage}
            onChangeText={setPercentage}
          />
          <TextInput
            style={styles.input}
            placeholder="Gramos"
            keyboardType="numeric"
            value={grams}
            onChangeText={setGrams}
          />
          <Button
            title="Añadir alimento"
            onPress={() => {
              const parsedPercentage = parseFloat(percentage);
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
            item ? (
              <Text style={styles.listItem}>
                {item.grams}g de {item.percentage}% = {((item.percentage / 100) * item.grams).toFixed(2)}g de hidratos
              </Text>
            ) : (
              <Text style={styles.listItem}>Elemento inválido</Text>
            )
          )}
          ListEmptyComponent={<Text style={styles.emptyList}>No hay alimentos añadidos.</Text>}
        />

        <Button title="Calcular dosis" onPress={calculateDose} />
      </ScrollView>

      <Modal
        visible={showConfigModal}
        animationType="slide"
        onRequestClose={() => setShowConfigModal(false)}
      >
        <ScrollView contentContainerStyle={styles.modalContainer}>
          <Text style={styles.subtitle}>Configuración</Text>

          {Object.keys(parameters).map((key) => (
            <View key={key} style={styles.configItem}>
              <Text style={styles.label}>{key}</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={parameters[key as keyof typeof parameters].toString()}
                onChangeText={(value) =>
                  saveParameters({
                    ...parameters,
                    [key]: parseFloat(value) || 0,
                  })
                }
              />
            </View>
          ))}

          <Button title="Cerrar configuración" onPress={() => setShowConfigModal(false)} />
        </ScrollView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f4f4f4',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
  },
  section: {
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  listItem: {
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
  emptyList: {
    textAlign: 'center',
    marginVertical: 20,
    fontStyle: 'italic',
    color: '#888',
  },
  settingsButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
  },
  modalContainer: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  configItem: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
});

export default App;
