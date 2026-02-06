// Domain types are kept separate from UI so we can swap the data layer (local JSON now, Supabase later)
// without changing business logic and pages.

export type Gender = 'male' | 'female';

export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'very_active';

export type GoalType = 'lose' | 'maintain' | 'gain';

export type IsoDateString = `${number}-${string}-${string}`; // YYYY-MM-DD (kept simple for MVP)

export type UserProfile = {
  id: string;
  gender: Gender;
  age: number;
  dateOfBirth?: IsoDateString;
  heightCm: number;
  weightKg: number;
  goalWeightKg?: number;
  activityLevel: ActivityLevel;
  goalType: GoalType;
  startDate?: IsoDateString;
  createdAt: string;
  updatedAt: string;
};

export type FoodLog = {
  id: string;
  userId: string;
  foodName: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  date: IsoDateString;
  createdAt: string;
};

export type WeightLog = {
  id: string;
  userId: string;
  weightKg: number;
  date: IsoDateString;
  createdAt: string;
};

export type ExerciseLog = {
  id: string;
  userId: string;
  name: string;
  caloriesBurned: number;
  date: IsoDateString;
  createdAt: string;
};
