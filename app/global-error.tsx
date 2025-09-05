'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <main className="p-8">
          <h2>Something went wrong</h2>
          <p>Please try again later.</p>
        </main>
      </body>
    </html>
  );
}

