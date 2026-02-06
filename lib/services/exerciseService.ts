import type { ExerciseLog, IsoDateString } from '@/types/domain';
import { repositories } from '@/lib/services/appServices';

export const listExerciseLogsByDate = async (params: {
  userId: string;
  date: IsoDateString;
}): Promise<ExerciseLog[]> => repositories.exercise.listByDate(params);

export const addExerciseLog = async (
  input: Omit<ExerciseLog, 'id' | 'createdAt'>,
): Promise<ExerciseLog> => repositories.exercise.create(input);

export const updateExerciseLog = async (input: {
  userId: string;
  id: string;
  name: string;
  caloriesBurned: number;
}): Promise<ExerciseLog> => repositories.exercise.updateById(input);

export const deleteExerciseLog = async (params: { userId: string; id: string }): Promise<void> =>
  repositories.exercise.deleteById(params);
