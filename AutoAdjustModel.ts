export type MealType = 'desayuno' | 'comida' | 'cena';

export interface DoseParameters {
  m: number;
  desayuno_b: number;
  comida_b: number;
  cena_b: number;
  fc: number;
}

export interface MealObservation {
  mealType: MealType;
  carbs: number;
  glucoseBefore: number;
  rapidActual: number;
  glucoseAfter: number;
  minutesAfterMeal: number;
  contextFlag: boolean;
}

export interface ModelProposal {
  values: DoseParameters;
  usable: number;
  total: number;
  status: 'insufficient' | 'ready';
  reason: string;
  meanAbsoluteError: number | null;
}

const TARGET = 135;

function solve(matrix: number[][], vector: number[]): number[] | null {
  const n = vector.length;
  const augmented = matrix.map((row, i) => [...row, vector[i]]);
  for (let column = 0; column < n; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < n; row += 1) {
      if (
        Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])
      ) {
        pivot = row;
      }
    }
    if (Math.abs(augmented[pivot][column]) < 1e-9) {
      return null;
    }
    [augmented[column], augmented[pivot]] = [
      augmented[pivot],
      augmented[column],
    ];
    const divisor = augmented[column][column];
    for (let j = column; j <= n; j += 1) {
      augmented[column][j] /= divisor;
    }
    for (let row = 0; row < n; row += 1) {
      if (row === column) {
        continue;
      }
      const factor = augmented[row][column];
      for (let j = column; j <= n; j += 1) {
        augmented[row][j] -= factor * augmented[column][j];
      }
    }
  }
  return augmented.map(row => row[n]);
}

function features(item: MealObservation): number[] {
  return [
    item.carbs / 50,
    item.mealType === 'desayuno' ? 1 : 0,
    item.mealType === 'comida' ? 1 : 0,
    item.mealType === 'cena' ? 1 : 0,
    (item.glucoseBefore - 100) / 50,
    -item.rapidActual / 10,
  ];
}

function fit(
  items: MealObservation[],
  weights: number[],
  prior: number[],
): number[] | null {
  const dimension = 6;
  const matrix = Array.from({length: dimension}, () =>
    Array(dimension).fill(0),
  );
  const vector = Array(dimension).fill(0);
  items.forEach((item, i) => {
    const x = features(item);
    const y = item.glucoseAfter - TARGET;
    for (let a = 0; a < dimension; a += 1) {
      vector[a] += weights[i] * x[a] * y;
      for (let b = 0; b < dimension; b += 1) {
        matrix[a][b] += weights[i] * x[a] * x[b];
      }
    }
  });
  // Regularize toward the active formula so even a single meal has a finite proposal.
  for (let i = 0; i < dimension; i += 1) {
    matrix[i][i] += 0.05;
    vector[i] += 0.05 * prior[i];
  }
  return solve(matrix, vector);
}

function independentFeatures(items: MealObservation[]): boolean {
  const dimension = 6;
  const gram = Array.from({length: dimension}, () => Array(dimension).fill(0));
  items.forEach(item => {
    const x = features(item);
    for (let i = 0; i < dimension; i += 1) {
      for (let j = 0; j < dimension; j += 1) {
        gram[i][j] += x[i] * x[j];
      }
    }
  });
  for (let column = 0; column < dimension; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < dimension; row += 1) {
      if (Math.abs(gram[row][column]) > Math.abs(gram[pivot][column])) {
        pivot = row;
      }
    }
    if (Math.abs(gram[pivot][column]) < 0.001) {
      return false;
    }
    [gram[column], gram[pivot]] = [gram[pivot], gram[column]];
    for (let row = column + 1; row < dimension; row += 1) {
      const factor = gram[row][column] / gram[column][column];
      for (let j = column; j < dimension; j += 1) {
        gram[row][j] -= factor * gram[column][j];
      }
    }
  }
  return true;
}

function insufficient(
  current: DoseParameters,
  usable: number,
  total: number,
  reason: string,
): ModelProposal {
  return {
    values: current,
    usable,
    total,
    status: 'insufficient',
    reason,
    meanAbsoluteError: null,
  };
}

/** The 90-minute fit is exploratory; it never changes the active dose formula by itself. */
export function proposeParameters(
  items: MealObservation[],
  current: DoseParameters,
): ModelProposal {
  const usableItems = items.filter(
    item =>
      !item.contextFlag &&
      item.minutesAfterMeal >= 75 &&
      item.minutesAfterMeal <= 105 &&
      [
        item.carbs,
        item.glucoseBefore,
        item.rapidActual,
        item.glucoseAfter,
      ].every(Number.isFinite) &&
      item.carbs >= 0 &&
      item.glucoseBefore > 0 &&
      item.rapidActual >= 0 &&
      item.glucoseAfter > 0,
  );
  const usable = usableItems.length;
  const total = items.length;
  if (usable === 0) {
    return insufficient(
      current,
      usable,
      total,
      'No hay mediciones utilizables alrededor de los 90 minutos.',
    );
  }

  // The current correction factor is only a starting estimate for the
  // 90-minute glucose change per unit; observations can move all coefficients.
  const prior = [
    50 * current.fc * current.m,
    current.fc * current.desayuno_b,
    current.fc * current.comida_b,
    current.fc * current.cena_b,
    50,
    10 * current.fc,
  ];

  let coefficients = fit(
    usableItems,
    usableItems.map(() => 1),
    prior,
  );
  if (!coefficients) {
    return insufficient(
      current,
      usable,
      total,
      'Los datos no permiten resolver la regresión.',
    );
  }
  // Huber reweighting limits the influence of unusual meals.
  for (let iteration = 0; iteration < 3; iteration += 1) {
    const weights = usableItems.map(item => {
      const residual =
        item.glucoseAfter -
        TARGET -
        features(item).reduce(
          (sum, x, index) => sum + x * coefficients![index],
          0,
        );
      return Math.min(1, 35 / Math.max(Math.abs(residual), 1));
    });
    coefficients = fit(usableItems, weights, prior);
    if (!coefficients) {
      return insufficient(
        current,
        usable,
        total,
        'La regresión no es estable.',
      );
    }
  }
  const insulinEffect = coefficients[5] / 10;
  const glucoseEffect = coefficients[4] / 50;
  if (insulinEffect <= 0 || glucoseEffect <= 0) {
    return insufficient(
      current,
      usable,
      total,
      'No se ha identificado una respuesta coherente a la insulina y la glucosa previa.',
    );
  }
  const raw: DoseParameters = {
    m: coefficients[0] / 50 / insulinEffect,
    desayuno_b: coefficients[1] / insulinEffect,
    comida_b: coefficients[2] / insulinEffect,
    cena_b: coefficients[3] / insulinEffect,
    fc: insulinEffect / glucoseEffect,
  };
  if (
    Object.values(raw).some(value => !Number.isFinite(value)) ||
    raw.m <= 0 ||
    raw.fc <= 0
  ) {
    return insufficient(
      current,
      usable,
      total,
      'Los coeficientes estimados quedan fuera de los límites válidos.',
    );
  }
  const meanAbsoluteError =
    usableItems.reduce(
      (sum, item) =>
        sum +
        Math.abs(
          item.glucoseAfter -
            TARGET -
            features(item).reduce((acc, x, i) => acc + x * coefficients![i], 0),
        ),
      0,
    ) / usable;
  return {
    values: raw,
    usable,
    total,
    status: 'ready',
    reason: independentFeatures(usableItems)
      ? 'Propuesta exploratoria pendiente de aplicar.'
      : 'Propuesta preliminar: faltan variaciones para separar todos los parámetros.',
    meanAbsoluteError,
  };
}
