import 'server-only';

import type {
  ExerciseLog,
  FoodLog,
  IsoDateString,
  UserProfile,
  WeightLog,
} from '@/types/domain';
import type {
  ExerciseLogRepository,
  FoodLogRepository,
  UserRepository,
  WeightLogRepository,
} from '@/lib/services/repositories';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

import { readSupabaseEnv } from '@/lib/supabase/client';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type JsonRecord = Record<string, unknown>;

const asRecord = (v: unknown): JsonRecord | null => {
  if (!v || typeof v !== 'object') return null;
  return v as JsonRecord;
};

const safeString = (v: unknown): string => (typeof v === 'string' ? v : String(v ?? ''));
const safeNumber = (v: unknown): number => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const getSupabaseClient = async () => {
  try {
    const cookieStore = await cookies();
    return createSupabaseServerClient({
      getAll: () => cookieStore.getAll().map((c) => ({ name: c.name, value: c.value })),
      setAll: (all) => {
        all.forEach((c) => cookieStore.set(c.name, c.value, c.options));
      },
    });
  } catch {
    const env = readSupabaseEnv();
    if (!env) {
      throw new Error(
        'Supabase env not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY',
      );
    }

    return createClient(env.url, env.anonKey);
  }
};

const mapProfile = (row: unknown): UserProfile => {
  const r = asRecord(row) ?? {};
  return {
    id: safeString(r.id),
    gender: r.gender as UserProfile['gender'],
    age: safeNumber(r.age),
    dateOfBirth: (r.date_of_birth as IsoDateString) ?? undefined,
    heightCm: safeNumber(r.height_cm),
    weightKg: safeNumber(r.weight_kg),
    goalWeightKg: r.goal_weight_kg === null || r.goal_weight_kg === undefined ? undefined : safeNumber(r.goal_weight_kg),
    activityLevel: r.activity_level as UserProfile['activityLevel'],
    goalType: r.goal_type as UserProfile['goalType'],
    startDate: (r.start_date as IsoDateString) ?? undefined,
    createdAt: safeString(r.created_at),
    updatedAt: safeString(r.updated_at),
  };
};

const mapFoodLog = (row: unknown): FoodLog => {
  const r = asRecord(row) ?? {};
  return {
    id: safeString(r.id),
    userId: safeString(r.user_id),
    foodName: safeString(r.food_name),
    calories: safeNumber(r.calories),
    protein: safeNumber(r.protein),
    fat: safeNumber(r.fat),
    carbs: safeNumber(r.carbs),
    date: r.date as IsoDateString,
    createdAt: safeString(r.created_at),
  };
};

const mapExerciseLog = (row: unknown): ExerciseLog => {
  const r = asRecord(row) ?? {};
  return {
    id: safeString(r.id),
    userId: safeString(r.user_id),
    name: safeString(r.name),
    caloriesBurned: safeNumber(r.calories_burned),
    date: r.date as IsoDateString,
    createdAt: safeString(r.created_at),
  };
};

const mapWeightLog = (row: unknown): WeightLog => {
  const r = asRecord(row) ?? {};
  return {
    id: safeString(r.id),
    userId: safeString(r.user_id),
    weightKg: safeNumber(r.weight_kg),
    date: r.date as IsoDateString,
    createdAt: safeString(r.created_at),
  };
};

export const supabaseUserRepository: UserRepository = {
  async getById(id) {
    const sb = await getSupabaseClient();
    const { data, error } = await sb.from('profiles').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapProfile(data) : null;
  },

  async upsert(profile) {
    const sb = await getSupabaseClient();
    const payload = {
      id: profile.id,
      gender: profile.gender,
      age: profile.age,
      date_of_birth: profile.dateOfBirth ?? null,
      height_cm: profile.heightCm,
      weight_kg: profile.weightKg,
      goal_weight_kg: profile.goalWeightKg ?? null,
      activity_level: profile.activityLevel,
      goal_type: profile.goalType,
      start_date: profile.startDate ?? null,
    };

    const { data, error } = await sb.from('profiles').upsert(payload).select('*').single();
    if (error) throw new Error(error.message);
    return mapProfile(data);
  },
};

export const supabaseFoodLogRepository: FoodLogRepository = {
  async listByDate({ userId, date }) {
    const sb = await getSupabaseClient();
    const { data, error } = await sb
      .from('food_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapFoodLog);
  },

  async create(input) {
    const sb = await getSupabaseClient();
    const payload = {
      user_id: input.userId,
      date: input.date,
      food_name: input.foodName,
      calories: input.calories,
      protein: input.protein,
      fat: input.fat,
      carbs: input.carbs,
    };
    const { data, error } = await sb.from('food_logs').insert(payload).select('*').single();
    if (error) throw new Error(error.message);
    return mapFoodLog(data);
  },

  async updateById(input) {
    const sb = await getSupabaseClient();
    const payload = {
      food_name: input.foodName,
      calories: input.calories,
      protein: input.protein,
      fat: input.fat,
      carbs: input.carbs,
    };
    const { data, error } = await sb
      .from('food_logs')
      .update(payload)
      .eq('id', input.id)
      .eq('user_id', input.userId)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return mapFoodLog(data);
  },

  async deleteById({ userId, id }) {
    const sb = await getSupabaseClient();
    const { error } = await sb.from('food_logs').delete().eq('id', id).eq('user_id', userId);
    if (error) throw new Error(error.message);
  },
};

export const supabaseExerciseLogRepository: ExerciseLogRepository = {
  async listByDate({ userId, date }) {
    const sb = await getSupabaseClient();
    const { data, error } = await sb
      .from('exercise_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapExerciseLog);
  },

  async create(input) {
    const sb = await getSupabaseClient();
    const payload = {
      user_id: input.userId,
      date: input.date,
      name: input.name,
      calories_burned: input.caloriesBurned,
    };
    const { data, error } = await sb.from('exercise_logs').insert(payload).select('*').single();
    if (error) throw new Error(error.message);
    return mapExerciseLog(data);
  },

  async updateById(input) {
    const sb = await getSupabaseClient();
    const payload = {
      name: input.name,
      calories_burned: input.caloriesBurned,
    };
    const { data, error } = await sb
      .from('exercise_logs')
      .update(payload)
      .eq('id', input.id)
      .eq('user_id', input.userId)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return mapExerciseLog(data);
  },

  async deleteById({ userId, id }) {
    const sb = await getSupabaseClient();
    const { error } = await sb.from('exercise_logs').delete().eq('id', id).eq('user_id', userId);
    if (error) throw new Error(error.message);
  },
};

export const supabaseWeightLogRepository: WeightLogRepository = {
  async list({ userId }) {
    const sb = await getSupabaseClient();
    const { data, error } = await sb
      .from('weight_logs')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapWeightLog);
  },

  async upsertForDate(input) {
    const sb = await getSupabaseClient();
    const payload = {
      user_id: input.userId,
      date: input.date,
      weight_kg: input.weightKg,
    };

    const { data, error } = await sb
      .from('weight_logs')
      .upsert(payload, { onConflict: 'user_id,date' })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return mapWeightLog(data);
  },
};
