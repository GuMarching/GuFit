# GuFit (Phase 1 - Offline Architecture)

## Goals
- Local-first calorie tracking + weight loss foundation
- Clean separation of UI / business logic / data layer
- Future-ready to swap local repositories to Supabase repositories

## Run locally
1. Install dependencies
```bash
npm install
```

2. Start dev server
```bash
npm run dev
```

## Architecture (migration-ready)
- **UI**: `app/*` pages and `components/*`
- **Business logic**: `lib/calculations/*` and `lib/services/*`
- **Data layer**: repository interfaces in `lib/services/repositories.ts`
  - Local JSON implementation: `db/local/*`
  - Supabase later: create `db/supabase/*` implementing the same interfaces, then swap bindings in `lib/services/appServices.ts`

## Local data storage
- Stored in `db/local/data.json`
- Models map 1:1 with future tables:
  - `UserProfile`
  - `FoodLog`
  - `WeightLog`

## Gemini API (เตรียมไว้สำหรับอนาคต)
ตอนนี้ระบบเป็น **ออฟไลน์ล้วน** และยังไม่เรียก API ใดๆ

แนวทางที่จะเปิดใช้ Gemini ภายหลัง (โดยไม่ต้องรื้อโครง):
- สร้างไฟล์ `.env.local`
- ใส่ค่า `GEMINI_API_KEY=...`
- สร้าง repository/service ฝั่ง AI แยกใน `lib/services/*` แล้วเรียกจากหน้า `diary` เฉพาะตอนมี key

หลักการคือให้ AI เป็น optional dependency เพื่อรักษาโหมดออฟไลน์เป็นค่าเริ่มต้น
