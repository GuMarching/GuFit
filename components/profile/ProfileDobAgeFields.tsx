'use client';

import { useMemo, useState } from 'react';

import { Field, Input } from '@/components/ui';

const isIsoDate = (v: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(v);

const bangkokTodayIso = (): string => {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(new Date());
};

const calcAge = (dobIso: string, todayIso: string): number => {
  if (!isIsoDate(dobIso) || !isIsoDate(todayIso)) return 0;
  const [by, bm, bd] = dobIso.split('-').map((x) => Number(x));
  const [ty, tm, td] = todayIso.split('-').map((x) => Number(x));
  if (!by || !bm || !bd || !ty || !tm || !td) return 0;

  let age = ty - by;
  const beforeBirthday = tm < bm || (tm === bm && td < bd);
  if (beforeBirthday) age -= 1;
  return Math.max(0, age);
};

export default function ProfileDobAgeFields(props: { defaultDob: string; defaultAge: number }) {
  const [dob, setDob] = useState(props.defaultDob);
  const [age, setAge] = useState(String(props.defaultAge));

  const todayIso = useMemo(() => bangkokTodayIso(), []);

  return (
    <>
      <Field label="วันเกิด">
        <Input
          name="dateOfBirth"
          type="date"
          value={dob}
          onChange={(e) => {
            const nextDob = e.target.value;
            setDob(nextDob);
            const nextAge = calcAge(nextDob, todayIso);
            if (nextAge > 0) setAge(String(nextAge));
          }}
          required
        />
      </Field>

      <Field label="อายุ (คำนวณอัตโนมัติ)">
        <Input
          name="age"
          type="number"
          min={10}
          max={100}
          value={age}
          onChange={(e) => setAge(e.target.value)}
          required
        />
      </Field>
    </>
  );
}
