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
  const raw = await fs.readFile(dbFilePath(), 'utf8');
  const parsed = JSON.parse(raw) as Partial<LocalDb>;
  return {
    users: parsed.users ?? [],
    foodLogs: parsed.foodLogs ?? [],
    weightLogs: parsed.weightLogs ?? [],
    exerciseLogs: parsed.exerciseLogs ?? [],
  };
};

export const writeLocalDb = async (db: LocalDb): Promise<void> => {
  const raw = JSON.stringify(db, null, 2);
  await fs.writeFile(dbFilePath(), raw, 'utf8');
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
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}` as IsoDateString;
};
