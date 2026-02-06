export type CatalogFood = {
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
};

export const FOOD_CATALOG_TH: CatalogFood[] = [
  { name: 'ข้าวสวย 1 ทัพพี', calories: 80, protein: 2, fat: 0, carbs: 18 },
  { name: 'อกไก่ย่าง 100g', calories: 165, protein: 31, fat: 4, carbs: 0 },
  { name: 'ไข่ต้ม 1 ฟอง', calories: 70, protein: 6, fat: 5, carbs: 1 },
  { name: 'กล้วย 1 ลูก', calories: 105, protein: 1, fat: 0, carbs: 27 },
  { name: 'นมจืด 1 แก้ว', calories: 150, protein: 8, fat: 8, carbs: 12 },
  { name: 'ส้มตำไทย 1 จาน', calories: 120, protein: 2, fat: 3, carbs: 20 },
  { name: 'ก๋วยเตี๋ยวน้ำ 1 ชาม', calories: 300, protein: 15, fat: 8, carbs: 40 },
  { name: 'ผัดกะเพราไก่ 1 จาน', calories: 520, protein: 30, fat: 18, carbs: 55 },
];
