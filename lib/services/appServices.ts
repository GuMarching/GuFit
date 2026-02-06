import {
  localExerciseLogRepository,
  localFoodLogRepository,
  localUserRepository,
  localWeightLogRepository,
} from '@/db/local/repositories';

import {
  supabaseExerciseLogRepository,
  supabaseFoodLogRepository,
  supabaseUserRepository,
  supabaseWeightLogRepository,
} from '@/db/supabase/repositories';
import { isSupabaseEnabled } from '@/lib/supabase/client';

// Central wiring point.
// When migrating to Supabase later, change these bindings to supabase repositories.
export const repositories = {
  user: {
    getById: (...args: Parameters<typeof localUserRepository.getById>) =>
      (isSupabaseEnabled() ? supabaseUserRepository : localUserRepository).getById(...args),
    upsert: (...args: Parameters<typeof localUserRepository.upsert>) =>
      (isSupabaseEnabled() ? supabaseUserRepository : localUserRepository).upsert(...args),
  },
  food: {
    listByDate: (...args: Parameters<typeof localFoodLogRepository.listByDate>) =>
      (isSupabaseEnabled() ? supabaseFoodLogRepository : localFoodLogRepository).listByDate(...args),
    create: (...args: Parameters<typeof localFoodLogRepository.create>) =>
      (isSupabaseEnabled() ? supabaseFoodLogRepository : localFoodLogRepository).create(...args),
    updateById: (...args: Parameters<typeof localFoodLogRepository.updateById>) =>
      (isSupabaseEnabled() ? supabaseFoodLogRepository : localFoodLogRepository).updateById(...args),
    deleteById: (...args: Parameters<typeof localFoodLogRepository.deleteById>) =>
      (isSupabaseEnabled() ? supabaseFoodLogRepository : localFoodLogRepository).deleteById(...args),
  },
  weight: {
    list: (...args: Parameters<typeof localWeightLogRepository.list>) =>
      (isSupabaseEnabled() ? supabaseWeightLogRepository : localWeightLogRepository).list(...args),
    upsertForDate: (...args: Parameters<typeof localWeightLogRepository.upsertForDate>) =>
      (isSupabaseEnabled() ? supabaseWeightLogRepository : localWeightLogRepository).upsertForDate(...args),
  },
  exercise: {
    listByDate: (...args: Parameters<typeof localExerciseLogRepository.listByDate>) =>
      (isSupabaseEnabled() ? supabaseExerciseLogRepository : localExerciseLogRepository).listByDate(
        ...args,
      ),
    create: (...args: Parameters<typeof localExerciseLogRepository.create>) =>
      (isSupabaseEnabled() ? supabaseExerciseLogRepository : localExerciseLogRepository).create(...args),
    updateById: (...args: Parameters<typeof localExerciseLogRepository.updateById>) =>
      (isSupabaseEnabled() ? supabaseExerciseLogRepository : localExerciseLogRepository).updateById(
        ...args,
      ),
    deleteById: (...args: Parameters<typeof localExerciseLogRepository.deleteById>) =>
      (isSupabaseEnabled() ? supabaseExerciseLogRepository : localExerciseLogRepository).deleteById(
        ...args,
      ),
  },
};
