import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

import { Card, Field, Input, Select, DangerButton } from '@/components/ui';
import SubmitButton from '@/components/SubmitButton';
import { getUserProfile, saveUserProfile } from '@/lib/services/userService';
import type { ActivityLevel, Gender, GoalType, IsoDateString } from '@/types/domain';
import { resetLocalDb, todayIsoDate } from '@/db/local/store';
import { getUserIdOrRedirect } from '@/lib/supabase/auth';
import { isSupabaseEnabled } from '@/lib/supabase/client';
import { createSupabaseServerClientReadonly } from '@/lib/supabase/server';
import ProfileDobAgeFields from '@/components/profile/ProfileDobAgeFields';

export default async function ProfilePage() {
  const userId = await getUserIdOrRedirect();
  const profile = await getUserProfile(userId);
  const today = todayIsoDate();

  const upsertProfile = async (formData: FormData) => {
    'use server';

    const gender = formData.get('gender');
    const dateOfBirth = formData.get('dateOfBirth');
    const age = formData.get('age');
    const heightCm = formData.get('heightCm');
    const weightKg = formData.get('weightKg');
    const goalWeightKg = formData.get('goalWeightKg');
    const activityLevel = formData.get('activityLevel');
    const goalType = formData.get('goalType');
    const startDate = formData.get('startDate');

    if (
      typeof gender !== 'string' ||
      typeof activityLevel !== 'string' ||
      typeof goalType !== 'string' ||
      typeof age !== 'string' ||
      typeof dateOfBirth !== 'string' ||
      typeof heightCm !== 'string' ||
      typeof weightKg !== 'string' ||
      typeof goalWeightKg !== 'string' ||
      typeof startDate !== 'string'
    ) {
      throw new Error('Invalid form data');
    }

    const isIso = (v: string): v is IsoDateString => /^\d{4}-\d{2}-\d{2}$/.test(v);
    const dob = isIso(dateOfBirth) ? dateOfBirth : undefined;
    const start = isIso(startDate) ? startDate : undefined;

    await saveUserProfile({
      id: userId,
      gender: gender as Gender,
      age: Number(age),
      dateOfBirth: dob,
      heightCm: Number(heightCm),
      weightKg: Number(weightKg),
      goalWeightKg: goalWeightKg ? Number(goalWeightKg) : undefined,
      activityLevel: activityLevel as ActivityLevel,
      goalType: goalType as GoalType,
      startDate: start,
    });

    redirect('/dashboard');
  };

  const resetAll = async (formData: FormData) => {
    'use server';

    const confirm = formData.get('confirmReset');
    if (confirm !== 'RESET') {
      redirect('/profile');
    }

    if (isSupabaseEnabled()) {
      const cookieStore = await cookies();
      const sb = createSupabaseServerClientReadonly({
        getAll: () => cookieStore.getAll().map((c) => ({ name: c.name, value: c.value })),
      });

      const foodRes = await sb.from('food_logs').delete().eq('user_id', userId);
      if (foodRes.error) throw new Error(foodRes.error.message);

      const exerciseRes = await sb.from('exercise_logs').delete().eq('user_id', userId);
      if (exerciseRes.error) throw new Error(exerciseRes.error.message);

      const weightRes = await sb.from('weight_logs').delete().eq('user_id', userId);
      if (weightRes.error) throw new Error(weightRes.error.message);

      const profileRes = await sb.from('profiles').delete().eq('id', userId);
      if (profileRes.error) throw new Error(profileRes.error.message);
    } else {
      await resetLocalDb();
    }
    redirect('/profile');
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">โปรไฟล์</h1>

      <Card title="ข้อมูลส่วนตัว">
        <form action={upsertProfile} className="grid gap-4 md:grid-cols-2">
          <Field label="เพศ">
            <Select name="gender" defaultValue={profile?.gender ?? 'male'} required>
              <option value="male">ชาย</option>
              <option value="female">หญิง</option>
            </Select>
          </Field>

          <ProfileDobAgeFields
            defaultDob={profile?.dateOfBirth ?? '1990-01-01'}
            defaultAge={profile?.age ?? 25}
          />

          <Field label="ส่วนสูง (ซม.)">
            <Input
              name="heightCm"
              type="number"
              min={100}
              max={250}
              step="0.1"
              defaultValue={profile?.heightCm ?? 170}
              required
            />
          </Field>

          <Field label="น้ำหนัก (กก.)">
            <Input
              name="weightKg"
              type="number"
              min={30}
              max={300}
              step="0.1"
              defaultValue={profile?.weightKg ?? 70}
              required
            />
          </Field>

          <Field label="เป้าหมายน้ำหนัก (กก.)">
            <Input
              name="goalWeightKg"
              type="number"
              min={30}
              max={300}
              step="0.1"
              defaultValue={profile?.goalWeightKg ?? ''}
            />
          </Field>

          <Field label="ระดับกิจกรรม">
            <Select name="activityLevel" defaultValue={profile?.activityLevel ?? 'light'} required>
              <option value="sedentary">นั่งทำงานเป็นหลัก</option>
              <option value="light">เบา</option>
              <option value="moderate">ปานกลาง</option>
              <option value="active">หนัก</option>
              <option value="very_active">หนักมาก</option>
            </Select>
          </Field>

          <Field label="เป้าหมาย">
            <Select name="goalType" defaultValue={profile?.goalType ?? 'lose'} required>
              <option value="lose">ลดน้ำหนัก</option>
              <option value="maintain">รักษาน้ำหนัก</option>
              <option value="gain">เพิ่มน้ำหนัก</option>
            </Select>
          </Field>

          <Field label="วันที่เริ่ม">
            <Input name="startDate" type="date" defaultValue={profile?.startDate ?? today} required />
          </Field>

          <div className="md:col-span-2">
            <SubmitButton loadingText="กำลังบันทึก…">บันทึก</SubmitButton>
          </div>
        </form>
      </Card>

      <Card title="รีเซ็ตข้อมูลทั้งหมด">
        <form action={resetAll} className="space-y-3">
          <div className="text-sm text-gray-700">
            การรีเซ็ตจะล้างข้อมูลทั้งหมด (อาหาร, กิจกรรม, น้ำหนัก, โปรไฟล์) และไม่สามารถกู้คืนได้
          </div>
          <Field label="พิมพ์ RESET เพื่อยืนยัน">
            <Input name="confirmReset" placeholder="RESET" />
          </Field>
          <DangerButton type="submit">ล้างข้อมูลทั้งหมด</DangerButton>
        </form>
      </Card>
    </div>
  );
}
