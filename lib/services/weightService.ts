import type { WeightLog } from '@/types/domain';
import { repositories } from '@/lib/services/appServices';

export const listWeightLogs = async (params: { userId: string }): Promise<WeightLog[]> =>
  repositories.weight.list(params);

export const upsertWeightForDate = async (
  input: Omit<WeightLog, 'id' | 'createdAt'>,
): Promise<WeightLog> => repositories.weight.upsertForDate(input);
