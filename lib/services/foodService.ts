import type { FoodLog, IsoDateString } from '@/types/domain';
import { repositories } from '@/lib/services/appServices';

export const listFoodLogsByDate = async (params: {
  userId: string;
  date: IsoDateString;
}): Promise<FoodLog[]> => repositories.food.listByDate(params);

export const listFoodLogsByRange = async (params: {
  userId: string;
  from: IsoDateString;
  to: IsoDateString;
}): Promise<FoodLog[]> => repositories.food.listByRange(params);

export const addFoodLog = async (input: Omit<FoodLog, 'id' | 'createdAt'>): Promise<FoodLog> =>
  repositories.food.create(input);

export const updateFoodLog = async (input: {
  userId: string;
  id: string;
  foodName: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}): Promise<FoodLog> => repositories.food.updateById(input);

export const deleteFoodLog = async (params: { userId: string; id: string }): Promise<void> =>
  repositories.food.deleteById(params);
