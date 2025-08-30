'use client';

import { Amplify } from 'aws-amplify';
import outputs from '@/amplify_outputs.json';

// Configure Amplify on module load
if (typeof window !== 'undefined') {
  Amplify.configure(outputs, {
    ssr: true, // Enable SSR mode for Next.js
  });
}

export default function ConfigureAmplifyClientSide() {
  // Ensure configuration happens on client side
  if (typeof window !== 'undefined') {
    Amplify.configure(outputs, {
      ssr: true,
    });
  }
  return null;
}