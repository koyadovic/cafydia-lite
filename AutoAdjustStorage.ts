import AsyncStorage from '@react-native-async-storage/async-storage';
import {open} from '@op-engineering/op-sqlite';
import type {
  DoseParameters,
  MealObservation,
  MealType,
  ModelProposal,
} from './AutoAdjustModel';

export interface AppParameters extends DoseParameters {
  basal_desayunos: number;
  basal_comidas: number;
  basal_cenas: number;
}

export const defaultParameters: AppParameters = {
  basal_desayunos: 78,
  basal_comidas: 0,
  basal_cenas: 0,
  m: 0.187,
  desayuno_b: 8,
  comida_b: 5,
  cena_b: 2,
  fc: 15,
};

export interface FoodItem {
  id: string;
  percentage: number;
  grams: number;
}

export interface PendingMeal {
  id: string;
  mealType: MealType;
  startedAt: number;
  dueAt: number;
  carbs: number;
}

export interface SavedMeal {
  id: string;
  sessionId: string;
  mealType: MealType;
  startedAt: number;
  dueAt: number;
  preGlucose: number;
  preGlucoseEntered: boolean;
  carbs: number;
  recommendedRapid: number;
  actualRapid: number;
  basalRecommended: number;
  foods: FoodItem[];
}

const db = open({name: 'cafydia.sqlite'});
let initialization: Promise<void> | null = null;

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

async function setting(key: string): Promise<string | null> {
  const result = await db.execute('SELECT value FROM settings WHERE key = ?', [
    key,
  ]);
  return (result.rows[0]?.value as string) ?? null;
}

export function initializeStorage(): Promise<void> {
  if (!initialization) {
    initialization = (async () => {
      await db.execute('PRAGMA foreign_keys = ON');
      await db.execute(
        'CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)',
      );
      await db.execute(
        'CREATE TABLE IF NOT EXISTS auto_adjust_sessions (id TEXT PRIMARY KEY, started_at INTEGER NOT NULL, ended_at INTEGER)',
      );
      await db.execute(
        'CREATE TABLE IF NOT EXISTS parameter_versions (id TEXT PRIMARY KEY, created_at INTEGER NOT NULL, source TEXT NOT NULL, values_json TEXT NOT NULL)',
      );
      await db.execute(`CREATE TABLE IF NOT EXISTS meals (
        id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES auto_adjust_sessions(id),
        meal_type TEXT NOT NULL, started_at INTEGER NOT NULL, due_at INTEGER NOT NULL,
        pre_glucose REAL, pre_glucose_entered INTEGER, carbs REAL NOT NULL, recommended_rapid REAL NOT NULL,
        actual_rapid REAL NOT NULL, basal_recommended REAL NOT NULL,
        parameter_version_id TEXT NOT NULL REFERENCES parameter_versions(id),
        context_flag INTEGER NOT NULL DEFAULT 0, context_note TEXT,
        followup_skipped_at INTEGER,
        target_pre REAL NOT NULL DEFAULT 100, target_90 REAL NOT NULL DEFAULT 135
      )`);
      const mealColumns = await db.execute('PRAGMA table_info(meals)');
      const names = mealColumns.rows.map(row => String(row.name));
      if (!names.includes('pre_glucose_entered')) {
        await db.execute('ALTER TABLE meals ADD COLUMN pre_glucose_entered INTEGER');
      }
      if (!names.includes('context_note')) {
        await db.execute('ALTER TABLE meals ADD COLUMN context_note TEXT');
      }
      if (!names.includes('followup_skipped_at')) {
        await db.execute(
          'ALTER TABLE meals ADD COLUMN followup_skipped_at INTEGER',
        );
      }
      if (!names.includes('target_pre')) {
        await db.execute(
          'ALTER TABLE meals ADD COLUMN target_pre REAL NOT NULL DEFAULT 100',
        );
      }
      if (!names.includes('target_90')) {
        await db.execute(
          'ALTER TABLE meals ADD COLUMN target_90 REAL NOT NULL DEFAULT 135',
        );
      }
      await db.execute(
        'CREATE TABLE IF NOT EXISTS foods (id TEXT PRIMARY KEY, meal_id TEXT NOT NULL REFERENCES meals(id), percentage REAL NOT NULL, grams REAL NOT NULL)',
      );
      await db.execute(`CREATE TABLE IF NOT EXISTS glucose_readings (
        id TEXT PRIMARY KEY, meal_id TEXT NOT NULL REFERENCES meals(id), kind TEXT NOT NULL,
        glucose REAL NOT NULL, measured_at INTEGER NOT NULL, recorded_at INTEGER NOT NULL
      )`);
      await db.execute(`CREATE TABLE IF NOT EXISTS adjustment_runs (
        id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES auto_adjust_sessions(id),
        created_at INTEGER NOT NULL, trigger_reading_id TEXT REFERENCES glucose_readings(id),
        values_json TEXT NOT NULL, evidence_json TEXT NOT NULL, status TEXT NOT NULL,
        algorithm_version TEXT NOT NULL DEFAULT 'v1'
      )`);
      const runColumns = await db.execute('PRAGMA table_info(adjustment_runs)');
      if (!runColumns.rows.some(row => row.name === 'algorithm_version')) {
        await db.execute(
          "ALTER TABLE adjustment_runs ADD COLUMN algorithm_version TEXT NOT NULL DEFAULT 'v1'",
        );
      }
      await db.execute(
        'CREATE INDEX IF NOT EXISTS readings_by_meal ON glucose_readings(meal_id, kind, recorded_at)',
      );
      await db.execute(
        'CREATE INDEX IF NOT EXISTS meals_by_session ON meals(session_id, started_at)',
      );
      if ((await setting('current_parameters')) === null) {
        const legacy = await AsyncStorage.getItem('parameters');
        let parameters = defaultParameters;
        if (legacy) {
          try {
            parameters = {...defaultParameters, ...JSON.parse(legacy)};
          } catch (_) {
            parameters = defaultParameters;
          }
        }
        await writeParameters(parameters, 'migration');
      }
    })().catch(error => {
      initialization = null;
      throw error;
    });
  }
  return initialization;
}

export async function loadParameters(): Promise<AppParameters> {
  await initializeStorage();
  const json = await setting('current_parameters');
  return json ? {...defaultParameters, ...JSON.parse(json)} : defaultParameters;
}

async function writeParameters(
  parameters: AppParameters,
  source: string,
  sessionId?: string | null,
): Promise<void> {
  const version = uid();
  await db.transaction(async tx => {
    await tx.execute(
      'INSERT INTO parameter_versions(id, created_at, source, values_json) VALUES(?, ?, ?, ?)',
      [version, Date.now(), source, JSON.stringify(parameters)],
    );
    await tx.execute(
      'INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      ['current_parameters', JSON.stringify(parameters)],
    );
    await tx.execute(
      'INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      ['parameter_version_id', version],
    );
    if (sessionId) {
      await tx.execute(
        `UPDATE adjustment_runs SET status = ? WHERE id = (
        SELECT id FROM adjustment_runs WHERE session_id = ? ORDER BY created_at DESC LIMIT 1
      )`,
        [source === 'manual' ? 'stale' : 'applied', sessionId],
      );
    }
  });
}

export async function saveParameters(
  parameters: AppParameters,
  source: string,
  sessionId?: string | null,
): Promise<void> {
  await initializeStorage();
  await writeParameters(parameters, source, sessionId);
}

export async function getActiveSessionId(): Promise<string | null> {
  await initializeStorage();
  return setting('active_session_id');
}

export async function startSession(): Promise<string> {
  await initializeStorage();
  const current = await setting('active_session_id');
  if (current) {
    return current;
  }
  const id = uid();
  await db.transaction(async tx => {
    await tx.execute(
      'INSERT INTO auto_adjust_sessions(id, started_at) VALUES(?, ?)',
      [id, Date.now()],
    );
    await tx.execute(
      'INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      ['active_session_id', id],
    );
  });
  return id;
}

export async function stopSession(): Promise<void> {
  await initializeStorage();
  const id = await setting('active_session_id');
  if (!id) {
    return;
  }
  await db.transaction(async tx => {
    await tx.execute(
      'UPDATE auto_adjust_sessions SET ended_at = ? WHERE id = ?',
      [Date.now(), id],
    );
    await tx.execute('DELETE FROM settings WHERE key = ?', [
      'active_session_id',
    ]);
  });
}

export async function saveMeal(
  input: Omit<SavedMeal, 'id' | 'sessionId' | 'dueAt'>,
): Promise<SavedMeal> {
  await initializeStorage();
  const sessionId = await setting('active_session_id');
  const parameterVersionId = await setting('parameter_version_id');
  if (!sessionId || !parameterVersionId) {
    throw new Error('El autoajuste no está activo.');
  }
  const meal: SavedMeal = {
    ...input,
    id: uid(),
    sessionId,
    dueAt: input.startedAt + 90 * 60 * 1000,
  };
  await db.transaction(async tx => {
    await tx.execute(
      `INSERT INTO meals(id, session_id, meal_type, started_at, due_at, pre_glucose, pre_glucose_entered, carbs,
      recommended_rapid, actual_rapid, basal_recommended, parameter_version_id)
      VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        meal.id,
        sessionId,
        meal.mealType,
        meal.startedAt,
        meal.dueAt,
        meal.preGlucose,
        meal.preGlucoseEntered ? 1 : 0,
        meal.carbs,
        meal.recommendedRapid,
        meal.actualRapid,
        meal.basalRecommended,
        parameterVersionId,
      ],
    );
    for (const food of meal.foods) {
      await tx.execute(
        'INSERT INTO foods(id, meal_id, percentage, grams) VALUES(?, ?, ?, ?)',
        [uid(), meal.id, food.percentage, food.grams],
      );
    }
  });
  return meal;
}

export async function listPendingMeals(): Promise<PendingMeal[]> {
  await initializeStorage();
  const result =
    await db.execute(`SELECT m.id, m.meal_type, m.started_at, m.due_at, m.carbs
    FROM meals m WHERE m.followup_skipped_at IS NULL AND NOT EXISTS (
      SELECT 1 FROM glucose_readings r WHERE r.meal_id = m.id AND r.kind = '90min'
    ) ORDER BY m.due_at ASC`);
  return result.rows.map(row => ({
    id: String(row.id),
    mealType: row.meal_type as MealType,
    startedAt: Number(row.started_at),
    dueAt: Number(row.due_at),
    carbs: Number(row.carbs),
  }));
}

export async function skipMealReading(mealId: string): Promise<void> {
  await initializeStorage();
  await db.execute('UPDATE meals SET followup_skipped_at = ? WHERE id = ?', [
    Date.now(),
    mealId,
  ]);
}

export async function addReading(
  mealId: string,
  glucose: number,
  measuredAt: number,
): Promise<{readingId: string; sessionId: string}> {
  await initializeStorage();
  const meal = await db.execute('SELECT session_id FROM meals WHERE id = ?', [
    mealId,
  ]);
  if (!meal.rows.length) {
    throw new Error('No se encuentra la comida.');
  }
  const readingId = uid();
  await db.execute(
    'INSERT INTO glucose_readings(id, meal_id, kind, glucose, measured_at, recorded_at) VALUES(?, ?, ?, ?, ?, ?)',
    [readingId, mealId, '90min', glucose, measuredAt, Date.now()],
  );
  return {readingId, sessionId: String(meal.rows[0].session_id)};
}

export async function setMealContextFlag(
  mealId: string,
  flagged: boolean,
  note: string,
): Promise<void> {
  await initializeStorage();
  await db.execute(
    'UPDATE meals SET context_flag = ?, context_note = ? WHERE id = ?',
    [flagged ? 1 : 0, flagged ? note : null, mealId],
  );
}

export async function loadObservations(
  sessionId: string,
): Promise<MealObservation[]> {
  await initializeStorage();
  const result = await db.execute(
    `SELECT m.meal_type, m.carbs, m.pre_glucose, m.actual_rapid,
      m.context_flag, m.started_at, r.glucose, r.measured_at
    FROM meals m JOIN glucose_readings r ON r.meal_id = m.id AND r.kind = '90min'
    WHERE m.session_id = ? AND m.pre_glucose IS NOT NULL AND r.rowid = (
      SELECT r2.rowid FROM glucose_readings r2 WHERE r2.meal_id = m.id AND r2.kind = '90min'
      ORDER BY r2.recorded_at DESC, r2.rowid DESC LIMIT 1
    )`,
    [sessionId],
  );
  return result.rows.map(row => ({
    mealType: row.meal_type as MealType,
    carbs: Number(row.carbs),
    glucoseBefore: Number(row.pre_glucose),
    rapidActual: Number(row.actual_rapid),
    glucoseAfter: Number(row.glucose),
    minutesAfterMeal:
      (Number(row.measured_at) - Number(row.started_at)) / 60000,
    contextFlag: Boolean(row.context_flag),
  }));
}

export async function saveProposal(
  sessionId: string,
  readingId: string,
  proposal: ModelProposal,
): Promise<void> {
  await initializeStorage();
  await db.execute(
    `INSERT INTO adjustment_runs(id, session_id, created_at, trigger_reading_id,
    values_json, evidence_json, status) VALUES(?, ?, ?, ?, ?, ?, ?)`,
    [
      uid(),
      sessionId,
      Date.now(),
      readingId,
      JSON.stringify(proposal.values),
      JSON.stringify({
        usable: proposal.usable,
        total: proposal.total,
        reason: proposal.reason,
        meanAbsoluteError: proposal.meanAbsoluteError,
      }),
      proposal.status,
    ],
  );
}

export async function loadLatestProposal(
  sessionId: string,
): Promise<ModelProposal | null> {
  await initializeStorage();
  const result = await db.execute(
    'SELECT values_json, evidence_json, status FROM adjustment_runs WHERE session_id = ? ORDER BY created_at DESC LIMIT 1',
    [sessionId],
  );
  if (!result.rows.length) {
    return null;
  }
  const row = result.rows[0];
  if (row.status === 'applied' || row.status === 'stale') {
    return null;
  }
  return {
    ...JSON.parse(String(row.evidence_json)),
    values: JSON.parse(String(row.values_json)),
    status: row.status,
  } as ModelProposal;
}
