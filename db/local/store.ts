import { promises as fs } from 'fs';
import path from 'path';
import type { ExerciseLog, FoodLog, UserProfile, WeightLog } from '@/types/domain';
import type { IsoDateString } from '@/types/domain';

export type LocalDb = {
  users: UserProfile[];
  foodLogs: FoodLog[];
  weightLogs: WeightLog[];
  exerciseLogs: ExerciseLog[];
};

const dbFilePath = (): string => path.join(process.cwd(), 'db', 'local', 'data.json');

export const readLocalDb = async (): Promise<LocalDb> => {
  try {
    const raw = await fs.readFile(dbFilePath(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<LocalDb>;
    return {
      users: parsed.users ?? [],
      foodLogs: parsed.foodLogs ?? [],
      weightLogs: parsed.weightLogs ?? [],
      exerciseLogs: parsed.exerciseLogs ?? [],
    };
  } catch (e: unknown) {
    const err = e as { code?: unknown };
    if (err?.code === 'ENOENT') {
      return {
        users: [],
        foodLogs: [],
        weightLogs: [],
        exerciseLogs: [],
      };
    }
    throw e;
  }
};

export const writeLocalDb = async (db: LocalDb): Promise<void> => {
  try {
    const raw = JSON.stringify(db, null, 2);
    await fs.writeFile(dbFilePath(), raw, 'utf8');
  } catch (e: unknown) {
    const err = e as { code?: unknown };
    if (err?.code === 'EROFS' || err?.code === 'EACCES' || err?.code === 'ENOENT') {
      return;
    }
    throw e;
  }
};

export const resetLocalDb = async (): Promise<void> => {
  await writeLocalDb({
    users: [],
    foodLogs: [],
    weightLogs: [],
    exerciseLogs: [],
  });
};

export const nowIso = (): string => new Date().toISOString();

export const createId = (): string => {
  // Good enough for local-first MVP; swap to UUID in DB layer later.
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const todayIsoDate = (): IsoDateString => {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(new Date()) as IsoDateString;
};
