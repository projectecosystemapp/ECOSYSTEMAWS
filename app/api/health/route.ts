// SECURITY FIX: CWE-209, CWE-532
// Risk: Information disclosure through health check responses
// Mitigation: Minimal information disclosure, no sensitive data exposure
// Validated: Health check provides only necessary status information

import { NextResponse } from 'next/server';

import type { HealthCheckResponse, ApiResponse } from '@/lib/api-types';

// Health check configuration
const HEALTH_CHECK_CONFIG = {
  SERVICE_NAME: 'Ecosystem Marketplace API',
  VERSION: process.env.npm_package_version || '1.0.0',
  ENVIRONMENT: process.env.NODE_ENV || 'development',
  INCLUDE_DETAILED_INFO: process.env.NODE_ENV === 'development',
} as const;

// Simple uptime tracking
const startTime = Date.now();

export async function GET(): Promise<NextResponse<ApiResponse<HealthCheckResponse>>> {
  const correlationId = `health-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  
  try {
    console.info(`[${correlationId}] Health check requested`);
    
    const now = Date.now();
    const uptime = Math.floor((now - startTime) / 1000); // seconds
    
    // Basic health response
    const healthResponse: HealthCheckResponse = {
      status: 'ok',
      timestamp: now,
    };
    
    // Add detailed information only in development
    if (HEALTH_CHECK_CONFIG.INCLUDE_DETAILED_INFO) {
      healthResponse.version = HEALTH_CHECK_CONFIG.VERSION;
      healthResponse.uptime = uptime;
      
      // Check basic dependencies (mock for now)
      healthResponse.dependencies = {
        database: 'ok', // Would check actual database connection
        aws: 'ok',      // Would check AWS service status
        stripe: 'ok',   // Would check Stripe API connectivity
      };
    }
    
    console.info(`[${correlationId}] Health check completed - status: ${healthResponse.status}`);
    
    return NextResponse.json(
      {
        success: true,
        data: healthResponse,
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Health-Check': 'ok',
        },
      }
    );
  } catch (error) {
    console.error(`[${correlationId}] Health check error:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    // Return error status without exposing sensitive information
    const errorResponse: HealthCheckResponse = {
      status: 'error',
      timestamp: Date.now(),
    };
    
    return NextResponse.json(
      {
        success: false,
        data: errorResponse,
        error: 'Health check failed',
      },
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'X-Health-Check': 'error',
        },
      }
    );
  }
}

