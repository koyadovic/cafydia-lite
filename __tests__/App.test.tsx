/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {TextInput} from 'react-native';
import App from '../App';

jest.mock('../AutoAdjustStorage', () => ({
  defaultParameters: {
    basal_desayunos: 78,
    basal_comidas: 0,
    basal_cenas: 0,
    m: 0.187,
    desayuno_b: 8,
    comida_b: 5,
    cena_b: 2,
    fc: 15,
  },
  loadParameters: jest.fn(async () => ({
    basal_desayunos: 78,
    basal_comidas: 0,
    basal_cenas: 0,
    m: 0.187,
    desayuno_b: 8,
    comida_b: 5,
    cena_b: 2,
    fc: 15,
  })),
  getActiveSessionId: jest.fn(async () => null),
  listPendingMeals: jest.fn(async () => []),
  loadLatestProposal: jest.fn(async () => null),
  saveMeal: jest.fn(async input => ({
    ...input,
    id: 'meal-1',
    sessionId: 'session-1',
    dueAt: input.startedAt + 90 * 60000,
  })),
  setMealContextFlag: jest.fn(async () => {}),
  addReading: jest.fn(async () => ({
    readingId: 'reading-1',
    sessionId: 'session-1',
  })),
  loadObservations: jest.fn(async () => []),
  saveProposal: jest.fn(async () => {}),
}));

jest.mock('../MealNotifications', () => ({
  initialReminderMealId: jest.fn(async () => null),
  subscribeReminderPress: jest.fn(() => () => {}),
  scheduleMealReminder: jest.fn(async () => true),
  cancelMealReminder: jest.fn(async () => {}),
}));

test('renders correctly', async () => {
  await ReactTestRenderer.act(async () => {
    ReactTestRenderer.create(<App />);
  });
});

test('stores the rapid dose actually administered with the meal', async () => {
  const storage = require('../AutoAdjustStorage');
  storage.getActiveSessionId.mockResolvedValueOnce('session-1');
  storage.saveMeal.mockClear();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });
  const root = renderer!.root;
  await ReactTestRenderer.act(async () => {
    root.findByProps({testID: 'glucose-before'}).props.onChangeText('110');
    root.findByProps({testID: 'food-grams'}).props.onChangeText('50');
  });
  await ReactTestRenderer.act(async () => {
    root.findByProps({testID: 'add-food'}).props.onPress();
  });
  await ReactTestRenderer.act(async () => {
    root.findByProps({testID: 'calculate-dose'}).props.onPress();
  });
  await ReactTestRenderer.act(async () => {
    root
      .findAllByType(TextInput)
      .find(
        input =>
          input.props.accessibilityLabel === 'Rápida realmente administrada',
      )!
      .props.onChangeText('12');
  });
  await ReactTestRenderer.act(async () => {
    await root.findByProps({testID: 'confirm-meal'}).props.onPress();
  });
  expect(storage.saveMeal).toHaveBeenCalledWith(
    expect.objectContaining({preGlucose: 110, carbs: 50, actualRapid: 12}),
  );
  await ReactTestRenderer.act(async () => renderer!.unmount());
});

test('records a follow-up glucose and leaves insufficient evidence unapplied', async () => {
  const storage = require('../AutoAdjustStorage');
  const pending = {
    id: 'meal-2',
    mealType: 'cena',
    startedAt: Date.now() - 90 * 60000,
    dueAt: Date.now(),
    carbs: 50,
  };
  storage.getActiveSessionId.mockResolvedValueOnce('session-1');
  storage.listPendingMeals.mockResolvedValueOnce([pending]);
  storage.listPendingMeals.mockResolvedValueOnce([]);
  storage.addReading.mockClear();
  storage.saveProposal.mockClear();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });
  const root = renderer!.root;
  await ReactTestRenderer.act(async () => {
    root.findByProps({testID: 'pending-meal-meal-2'}).props.onPress();
  });
  await ReactTestRenderer.act(async () => {
    root.findByProps({testID: 'glucose-after'}).props.onChangeText('150');
  });
  await ReactTestRenderer.act(async () => {
    await root.findByProps({testID: 'save-after-glucose'}).props.onPress();
  });
  expect(storage.addReading).toHaveBeenCalledWith(
    'meal-2',
    150,
    expect.any(Number),
  );
  expect(storage.saveProposal).toHaveBeenCalledWith(
    'session-1',
    'reading-1',
    expect.objectContaining({status: 'insufficient'}),
  );
  await ReactTestRenderer.act(async () => renderer!.unmount());
});

test('uses 100 when pre-meal glucose is left blank with auto-adjust enabled', async () => {
  const storage = require('../AutoAdjustStorage');
  storage.getActiveSessionId.mockResolvedValueOnce('session-1');
  storage.saveMeal.mockClear();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });
  await ReactTestRenderer.act(async () => {
    renderer!.root.findByProps({testID: 'calculate-dose'}).props.onPress();
  });
  await ReactTestRenderer.act(async () => {
    await renderer!.root.findByProps({testID: 'confirm-meal'}).props.onPress();
  });
  expect(storage.saveMeal).toHaveBeenCalledWith(
    expect.objectContaining({preGlucose: 100}),
  );
  await ReactTestRenderer.act(async () => renderer!.unmount());
});

test('applies the same correction factor to glucose below 100', async () => {
  const storage = require('../AutoAdjustStorage');
  storage.getActiveSessionId.mockResolvedValueOnce('session-1');
  storage.saveMeal.mockClear();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });
  const root = renderer!.root;
  await ReactTestRenderer.act(async () => {
    root.findByProps({testID: 'glucose-before'}).props.onChangeText('65');
    root.findByProps({testID: 'food-grams'}).props.onChangeText('50');
  });
  await ReactTestRenderer.act(async () => {
    root.findByProps({testID: 'add-food'}).props.onPress();
  });
  await ReactTestRenderer.act(async () => {
    root.findByProps({testID: 'calculate-dose'}).props.onPress();
  });
  await ReactTestRenderer.act(async () => {
    await root.findByProps({testID: 'confirm-meal'}).props.onPress();
  });
  const saved = storage.saveMeal.mock.calls[0][0];
  const b = {desayuno: 8, comida: 5, cena: 2}[
    saved.mealType as 'desayuno' | 'comida' | 'cena'
  ];
  expect(saved.preGlucose).toBe(65);
  expect(saved.recommendedRapid).toBe(
    Math.round((50 * 0.187 + b + (65 - 100) / 15) * 2) / 2,
  );
  await ReactTestRenderer.act(async () => renderer!.unmount());
});
