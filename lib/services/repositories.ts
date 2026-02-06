import type { ExerciseLog, FoodLog, IsoDateString, UserProfile, WeightLog } from '@/types/domain';

// Repository interfaces are the key migration point:
// - Today: Local JSON implementation in /db/local
// - Later: Supabase implementation in /db/supabase (same interfaces)

export type UserRepository = {
  getById: (id: string) => Promise<UserProfile | null>;
  upsert: (profile: Omit<UserProfile, 'createdAt' | 'updatedAt'>) => Promise<UserProfile>;
};

export type FoodLogRepository = {
  listByDate: (params: { userId: string; date: IsoDateString }) => Promise<FoodLog[]>;
  create: (input: Omit<FoodLog, 'id' | 'createdAt'>) => Promise<FoodLog>;
  updateById: (input: {
    userId: string;
    id: string;
    foodName: string;
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  }) => Promise<FoodLog>;
  deleteById: (params: { userId: string; id: string }) => Promise<void>;
};

export type WeightLogRepository = {
  list: (params: { userId: string }) => Promise<WeightLog[]>;
  upsertForDate: (input: Omit<WeightLog, 'id' | 'createdAt'>) => Promise<WeightLog>;
};

export type ExerciseLogRepository = {
  listByDate: (params: { userId: string; date: IsoDateString }) => Promise<ExerciseLog[]>;
  create: (input: Omit<ExerciseLog, 'id' | 'createdAt'>) => Promise<ExerciseLog>;
  updateById: (input: {
    userId: string;
    id: string;
    name: string;
    caloriesBurned: number;
  }) => Promise<ExerciseLog>;
  deleteById: (params: { userId: string; id: string }) => Promise<void>;
};
