'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export default function SplashVideo(props: {
  src?: string;
  ms?: number;
}) {
  const src = props.src ?? '/splash.mp4';
  const ms = props.ms ?? 4000;

  const key = useMemo(() => 'gufit_splash_v1', []);
  const [open, setOpen] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    try {
      const seen = sessionStorage.getItem(key);
      if (seen === '1') {
        setOpen(false);
        return;
      }
      sessionStorage.setItem(key, '1');
      setOpen(true);
    } catch {
      setOpen(true);
    }
  }, [key]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => setOpen(false), ms);
    return () => window.clearTimeout(t);
  }, [open, ms]);

  if (!open || blocked) return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-white">
      <video
        ref={videoRef}
        src={src}
        className="w-full object-contain"
        style={{ maxHeight: '62dvh' }}
        autoPlay
        muted
        playsInline
        preload="metadata"
        disablePictureInPicture
        onError={() => {
          setBlocked(true);
          setOpen(false);
        }}
        onEnded={() => setOpen(false)}
      />
    </div>
  );
}
