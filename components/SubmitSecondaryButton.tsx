'use client';

import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';

import { SecondaryButton } from '@/components/ui';

const Spinner = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v3a5 5 0 0 0-5 5H4z" />
  </svg>
);

export default function SubmitSecondaryButton(props: {
  children: ReactNode;
  loadingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <SecondaryButton type="submit" disabled={pending} className={props.className ?? ''}>
      <span className="inline-flex items-center justify-center gap-2">
        {pending ? <Spinner /> : null}
        <span>{pending ? (props.loadingText ?? 'กำลังบันทึก…') : props.children}</span>
      </span>
    </SecondaryButton>
  );
}
