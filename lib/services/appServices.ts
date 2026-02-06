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
  user: isSupabaseEnabled() ? supabaseUserRepository : localUserRepository,
  food: isSupabaseEnabled() ? supabaseFoodLogRepository : localFoodLogRepository,
  weight: isSupabaseEnabled() ? supabaseWeightLogRepository : localWeightLogRepository,
  exercise: isSupabaseEnabled() ? supabaseExerciseLogRepository : localExerciseLogRepository,
};
