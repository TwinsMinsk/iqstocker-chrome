/**
 * Health check endpoint для мониторинга frontend
 */
import { NextResponse } from 'next/server';

export async function GET() {
  const healthStatus = {
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    // Помогает быстро понять, какой именно коммит сейчас задеплоен на Railway/CI
    // Railway: RAILWAY_GIT_COMMIT_SHA, GitHub Actions: GITHUB_SHA
    commit: process.env.RAILWAY_GIT_COMMIT_SHA || process.env.GITHUB_SHA || null,
    api: {
      url: process.env.NEXT_PUBLIC_API_URL,
      reachable: false,
    },
  };

  // Проверяем доступность backend API
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    
    if (!apiUrl) {
      throw new Error('NEXT_PUBLIC_API_URL is not defined');
    }

    const healthUrl = apiUrl.replace('/api/v1', '/health');
    
    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5 секунд таймаут
    });

    if (response.ok) {
      healthStatus.api.reachable = true;
    }
  } catch (error) {
    healthStatus.status = 'degraded';
    healthStatus.api.reachable = false;
  }

  return NextResponse.json(healthStatus, {
    status: healthStatus.status === 'healthy' ? 200 : 503,
  });
}

