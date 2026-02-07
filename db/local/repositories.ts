import type {
  ExerciseLogRepository,
  FoodLogRepository,
  UserRepository,
  WeightLogRepository,
} from '@/lib/services/repositories';
import type { ExerciseLog, FoodLog, IsoDateString, UserProfile, WeightLog } from '@/types/domain';
import { createId, nowIso, readLocalDb, writeLocalDb } from '@/db/local/store';

export const localUserRepository: UserRepository = {
  getById: async (id) => {
    const db = await readLocalDb();
    return db.users.find((u) => u.id === id) ?? null;
  },
  upsert: async (profile) => {
    const db = await readLocalDb();
    const existingIndex = db.users.findIndex((u) => u.id === profile.id);
    const now = nowIso();

    if (existingIndex >= 0) {
      const updated: UserProfile = {
        ...db.users[existingIndex]!,
        ...profile,
        updatedAt: now,
      };
      db.users[existingIndex] = updated;
      await writeLocalDb(db);
      return updated;
    }

    const created: UserProfile = {
      ...profile,
      createdAt: now,
      updatedAt: now,
    };
    db.users.push(created);
    await writeLocalDb(db);
    return created;
  },
};

export const localFoodLogRepository: FoodLogRepository = {
  listByDate: async (params) => {
    const db = await readLocalDb();
    return db.foodLogs
      .filter((l) => l.userId === params.userId && l.date === params.date)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },
  listByRange: async (params) => {
    const db = await readLocalDb();
    const from = String(params.from);
    const to = String(params.to);
    return db.foodLogs
      .filter((l) => l.userId === params.userId && l.date >= from && l.date <= to)
      .sort((a, b) => (a.date === b.date ? (a.createdAt > b.createdAt ? 1 : -1) : a.date > b.date ? 1 : -1));
  },
  create: async (input) => {
    const db = await readLocalDb();
    const created: FoodLog = {
      ...input,
      id: createId(),
      createdAt: nowIso(),
    };
    db.foodLogs.push(created);
    await writeLocalDb(db);
    return created;
  },
  updateById: async (input) => {
    const db = await readLocalDb();
    const idx = db.foodLogs.findIndex((l) => l.userId === input.userId && l.id === input.id);
    if (idx < 0) throw new Error('ไม่พบรายการอาหารที่ต้องการแก้ไข');
    const updated: FoodLog = {
      ...db.foodLogs[idx]!,
      foodName: input.foodName,
      calories: input.calories,
      protein: input.protein,
      fat: input.fat,
      carbs: input.carbs,
    };
    db.foodLogs[idx] = updated;
    await writeLocalDb(db);
    return updated;
  },
  deleteById: async (params) => {
    const db = await readLocalDb();
    db.foodLogs = db.foodLogs.filter((l) => !(l.userId === params.userId && l.id === params.id));
    await writeLocalDb(db);
  },
};

export const localWeightLogRepository: WeightLogRepository = {
  list: async (params) => {
    const db = await readLocalDb();
    return db.weightLogs
      .filter((l) => l.userId === params.userId)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  },
  upsertForDate: async (input) => {
    const db = await readLocalDb();
    const existingIndex = db.weightLogs.findIndex(
      (l) => l.userId === input.userId && l.date === (input.date as IsoDateString),
    );

    if (existingIndex >= 0) {
      const updated: WeightLog = {
        ...db.weightLogs[existingIndex]!,
        ...input,
      };
      db.weightLogs[existingIndex] = updated;
      await writeLocalDb(db);
      return updated;
    }

    const created: WeightLog = {
      ...input,
      id: createId(),
      createdAt: nowIso(),
    };
    db.weightLogs.push(created);
    await writeLocalDb(db);
    return created;
  },
};

export const localExerciseLogRepository: ExerciseLogRepository = {
  listByDate: async (params) => {
    const db = await readLocalDb();
    return db.exerciseLogs
      .filter((l) => l.userId === params.userId && l.date === params.date)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },
  create: async (input) => {
    const db = await readLocalDb();
    const created: ExerciseLog = {
      ...input,
      id: createId(),
      createdAt: nowIso(),
    };
    db.exerciseLogs.push(created);
    await writeLocalDb(db);
    return created;
  },
  updateById: async (input) => {
    const db = await readLocalDb();
    const idx = db.exerciseLogs.findIndex((l) => l.userId === input.userId && l.id === input.id);
    if (idx < 0) throw new Error('ไม่พบรายการกิจกรรมที่ต้องการแก้ไข');
    const updated: ExerciseLog = {
      ...db.exerciseLogs[idx]!,
      name: input.name,
      caloriesBurned: input.caloriesBurned,
    };
    db.exerciseLogs[idx] = updated;
    await writeLocalDb(db);
    return updated;
  },
  deleteById: async (params) => {
    const db = await readLocalDb();
    db.exerciseLogs = db.exerciseLogs.filter(
      (l) => !(l.userId === params.userId && l.id === params.id),
    );
    await writeLocalDb(db);
  },
};
