import type { IsoDateString } from '@/types/domain';

export const calculateAgeFromDob = (dob: IsoDateString, now: Date = new Date()): number => {
  const parts = dob.split('-');
  const y = Number(parts[0] ?? '0');
  const m = Number(parts[1] ?? '1');
  const d = Number(parts[2] ?? '1');
  const birth = new Date(y, m - 1, d);

  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age -= 1;

  return Math.max(0, age);
};
