import {proposeParameters, type MealObservation} from '../AutoAdjustModel';

const current = {m: 0.187, desayuno_b: 8, comida_b: 5, cena_b: 2, fc: 15};

test('does not infer parameters from one glucose reading', () => {
  const item: MealObservation = {
    mealType: 'desayuno',
    carbs: 40,
    glucoseBefore: 110,
    rapidActual: 12,
    glucoseAfter: 150,
    minutesAfterMeal: 90,
    contextFlag: false,
  };
  expect(proposeParameters([item], current)).toMatchObject({
    status: 'insufficient',
    values: current,
  });
});

test('excludes late or confounded readings from the fit', () => {
  const item: MealObservation = {
    mealType: 'comida',
    carbs: 40,
    glucoseBefore: 110,
    rapidActual: 12,
    glucoseAfter: 150,
    minutesAfterMeal: 150,
    contextFlag: false,
  };
  expect(
    proposeParameters(
      [item, {...item, contextFlag: true, minutesAfterMeal: 90}],
      current,
    ),
  ).toMatchObject({status: 'insufficient', usable: 0, total: 2});
});

test('rejects data whose actual doses do not vary from the active formula', () => {
  const items: MealObservation[] = Array.from({length: 21}, (_, i) => {
    const mealType = (['desayuno', 'comida', 'cena'] as const)[i % 3];
    const carbs = 20 + i * 3;
    const glucoseBefore = 80 + i * 4;
    const rapidActual =
      current.m * carbs +
      current[`${mealType}_b`] +
      (glucoseBefore - 100) / current.fc;
    return {
      mealType,
      carbs,
      glucoseBefore,
      rapidActual,
      glucoseAfter: 135,
      minutesAfterMeal: 90,
      contextFlag: false,
    };
  });
  expect(proposeParameters(items, current)).toMatchObject({
    status: 'insufficient',
  });
});

test('recovers a small coherent change when meal, glucose and actual dose vary', () => {
  const expected = {
    m: 0.19,
    desayuno_b: 8.2,
    comida_b: 5.1,
    cena_b: 2.1,
    fc: 16,
  };
  const items: MealObservation[] = Array.from({length: 90}, (_, i) => {
    const mealType = (['desayuno', 'comida', 'cena'] as const)[i % 3];
    const carbs = 20 + ((i * 17) % 80);
    const glucoseBefore = 80 + ((i * 23) % 100);
    const baseDose =
      current.m * carbs +
      current[`${mealType}_b`] +
      (glucoseBefore - 100) / current.fc;
    const rapidActual = baseDose + (((i * 7) % 5) - 2) * 0.5;
    const required =
      expected.m * carbs +
      expected[`${mealType}_b`] +
      (glucoseBefore - 100) / expected.fc;
    return {
      mealType,
      carbs,
      glucoseBefore,
      rapidActual,
      glucoseAfter: 135 + 10 * (required - rapidActual),
      minutesAfterMeal: 90,
      contextFlag: false,
    };
  });
  const result = proposeParameters(items, current);
  expect(result.status).toBe('ready');
  expect(result.values.m).toBeCloseTo(expected.m, 2);
  expect(result.values.fc).toBeCloseTo(expected.fc, 0);
});

test('rejects dose differences explained only by the meal type', () => {
  const items: MealObservation[] = Array.from({length: 36}, (_, i) => {
    const mealType = (['desayuno', 'comida', 'cena'] as const)[i % 3];
    const carbs = 20 + ((i * 17) % 80);
    const glucoseBefore = 80 + ((i * 23) % 100);
    const rapidActual =
      current.m * carbs +
      current[`${mealType}_b`] +
      (glucoseBefore - 100) / current.fc +
      (mealType === 'desayuno' ? 1 : mealType === 'cena' ? -1 : 0);
    return {
      mealType,
      carbs,
      glucoseBefore,
      rapidActual,
      glucoseAfter: 135,
      minutesAfterMeal: 90,
      contextFlag: false,
    };
  });
  expect(proposeParameters(items, current)).toMatchObject({
    status: 'insufficient',
  });
});
