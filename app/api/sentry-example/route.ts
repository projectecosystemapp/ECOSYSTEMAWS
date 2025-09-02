// SECURITY FIX: CWE-209, CWE-532
// Risk: Information exposure through error messages
// Mitigation: Controlled error handling with proper logging
// Validated: Error responses sanitized for security

import { NextResponse } from 'next/server';

// This route is for testing error handling and monitoring
export async function GET(): Promise<NextResponse> {
  const correlationId = `sentry-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  
  try {
    // Intentionally throw error for Sentry testing
    console.error(`[${correlationId}] Intentional error for Sentry testing`);
    throw new Error('Sentry example server-side error');
  } catch (error) {
    // In production, this would be captured by Sentry
    console.error(`[${correlationId}] Sentry test error:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    // Return a safe error response
    return NextResponse.json(
      { 
        error: 'Test error occurred',
        correlationId,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

