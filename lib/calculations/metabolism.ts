import type { ActivityLevel, Gender, GoalType } from '@/types/domain';

export const activityMultiplier = (level: ActivityLevel): number => {
  switch (level) {
    case 'sedentary':
      return 1.2;
    case 'light':
      return 1.375;
    case 'moderate':
      return 1.55;
    case 'active':
      return 1.725;
    case 'very_active':
      return 1.9;
    default: {
      const _exhaustive: never = level;
      return _exhaustive;
    }
  }
};

// Mifflin-St Jeor equation
export const calculateBmr = (params: {
  gender: Gender;
  age: number;
  heightCm: number;
  weightKg: number;
}): number => {
  const base = 10 * params.weightKg + 6.25 * params.heightCm - 5 * params.age;
  const genderAdjustment = params.gender === 'male' ? 5 : -161;
  return Math.round(base + genderAdjustment);
};

export const calculateTdee = (params: {
  bmr: number;
  activityLevel: ActivityLevel;
}): number => {
  return Math.round(params.bmr * activityMultiplier(params.activityLevel));
};

// Simple MVP calorie targets.
// Later you can make this user-configurable and/or use weekly rate-of-loss targets.
export const calculateDailyCalorieTarget = (params: {
  tdee: number;
  goalType: GoalType;
}): number => {
  switch (params.goalType) {
    case 'lose':
      return Math.max(1200, params.tdee - 500);
    case 'maintain':
      return params.tdee;
    case 'gain':
      return params.tdee + 250;
    default: {
      const _exhaustive: never = params.goalType;
      return _exhaustive;
    }
  }
};
