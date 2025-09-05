"use client";

import * as Sentry from '@sentry/nextjs';
import * as React from 'react';

export default function SentryExamplePage() {
  const throwClientError = () => {
    const e = new Error('Sentry example client-side error');
    Sentry.captureException(e);
    throw e;
  };

  const triggerServerError = async () => {
    await fetch('/api/sentry-example');
  };

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Sentry Example</h1>
      <button className="px-4 py-2 bg-red-600 text-white rounded" onClick={throwClientError}>
        Throw Client Error
      </button>
      <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={triggerServerError}>
        Trigger Server Error
      </button>
    </div>
  );
}

