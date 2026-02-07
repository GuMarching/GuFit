import { NextResponse } from 'next/server';

export async function GET() {
  const version =
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.VERCEL_DEPLOYMENT_ID ??
    process.env.NEXT_PUBLIC_APP_VERSION ??
    'dev';

  return NextResponse.json(
    { version },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
