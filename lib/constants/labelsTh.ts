import type { ActivityLevel, Gender, GoalType } from '@/types/domain';

export const genderLabelTh = (v: Gender): string => {
  switch (v) {
    case 'male':
      return 'ชาย';
    case 'female':
      return 'หญิง';
    default: {
      const _exhaustive: never = v;
      return _exhaustive;
    }
  }
};

export const activityLabelTh = (v: ActivityLevel): string => {
  switch (v) {
    case 'sedentary':
      return 'นั่งทำงานเป็นหลัก';
    case 'light':
      return 'เบา';
    case 'moderate':
      return 'ปานกลาง';
    case 'active':
      return 'หนัก';
    case 'very_active':
      return 'หนักมาก';
    default: {
      const _exhaustive: never = v;
      return _exhaustive;
    }
  }
};

export const goalLabelTh = (v: GoalType): string => {
  switch (v) {
    case 'lose':
      return 'ลดน้ำหนัก';
    case 'maintain':
      return 'รักษาน้ำหนัก';
    case 'gain':
      return 'เพิ่มน้ำหนัก';
    default: {
      const _exhaustive: never = v;
      return _exhaustive;
    }
  }
};
