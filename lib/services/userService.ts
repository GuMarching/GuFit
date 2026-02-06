import type { UserProfile } from '@/types/domain';
import { repositories } from '@/lib/services/appServices';
import { calculateAgeFromDob } from '@/lib/calculations/dates';

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  return repositories.user.getById(userId);
};

export const saveUserProfile = async (
  profile: Omit<UserProfile, 'createdAt' | 'updatedAt'>,
): Promise<UserProfile> => {
  const age = profile.dateOfBirth ? calculateAgeFromDob(profile.dateOfBirth) : profile.age;
  return repositories.user.upsert({ ...profile, age });
};
