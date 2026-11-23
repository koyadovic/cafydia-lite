import {proposeParameters, type MealObservation} from '../AutoAdjustModel';

const current = {m: 0.187, desayuno_b: 8, comida_b: 5, cena_b: 2, fc: 15};

test('offers a preliminary proposal from the first usable glucose reading', () => {
  const item: MealObservation = {
    mealType: 'desayuno',
    carbs: 40,
    glucoseBefore: 65,
    rapidActual: 12,
    glucoseAfter: 150,
    minutesAfterMeal: 90,
    contextFlag: false,
  };
  const result = proposeParameters([item], current);
  expect(result.status).toBe('ready');
  expect(result.usable).toBe(1);
  expect(result.reason).toContain('preliminar');
  expect(Object.values(result.values).every(Number.isFinite)).toBe(true);
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

test('marks a dataset with doses on the active formula as preliminary', () => {
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
    status: 'ready',
    usable: 21,
    reason: expect.stringContaining('preliminar'),
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
    const carbs = i === 0 ? 0 : 20 + ((i * 17) % 80);
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
  expect(result.usable).toBe(90);
  expect(result.values.m).toBeCloseTo(expected.m, 2);
  expect(result.values.fc).toBeCloseTo(expected.fc, 0);
});

test('can propose a negative meal intercept', () => {
  const active = {...current, comida_b: -2};
  const expected = {
    ...active,
    m: 0.19,
    comida_b: -1.8,
    fc: 16,
  };
  const items: MealObservation[] = Array.from({length: 90}, (_, i) => {
    const mealType = (['desayuno', 'comida', 'cena'] as const)[i % 3];
    const carbs = 20 + ((i * 17) % 80);
    const glucoseBefore = 80 + ((i * 23) % 100);
    const rapidActual =
      active.m * carbs +
      active[`${mealType}_b`] +
      (glucoseBefore - 100) / active.fc +
      (((i * 7) % 5) - 2) * 0.5;
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
  const result = proposeParameters(items, active);
  expect(result.status).toBe('ready');
  expect(result.values.comida_b).toBeLessThan(0);
  expect(result.values.comida_b).toBeCloseTo(expected.comida_b, 0);
});

test('does not reject a well-supported change larger than 25 percent', () => {
  const expected = {...current, m: 0.27};
  const items: MealObservation[] = Array.from({length: 90}, (_, i) => {
    const mealType = (['desayuno', 'comida', 'cena'] as const)[i % 3];
    const carbs = 20 + ((i * 17) % 80);
    const glucoseBefore = 80 + ((i * 23) % 100);
    const rapidActual =
      current.m * carbs +
      current[`${mealType}_b`] +
      (glucoseBefore - 100) / current.fc +
      (((i * 7) % 5) - 2) * 0.5;
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
  expect(result.values.m).toBeGreaterThan(current.m * 1.25);
  expect(Math.abs(result.values.m - expected.m)).toBeLessThan(0.01);
});

test('keeps a proposal available when dose differences follow the meal type', () => {
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
    status: 'ready',
    usable: 36,
  });
});
