import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/toolkits/postgres';

export const runtime = "nodejs";

export async function GET() {
  try {
    // Test database connection
    const result = await executeQuery('SELECT NOW() as current_time, version() as pg_version');
    
    // Check if core tables exist
    const tableCheck = await executeQuery(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('restaurants', 'customers', 'conversations', 'agent_memory', 'campaigns')
      ORDER BY table_name
    `);

    const existingTables = tableCheck.data?.map(row => row.table_name) || [];
    const requiredTables = ['restaurants', 'customers', 'conversations', 'agent_memory', 'campaigns'];
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));

    return NextResponse.json({
      status: 'healthy',
      database: {
        connected: true,
        timestamp: result.data?.[0]?.current_time,
        version: result.data?.[0]?.pg_version?.split(' ').slice(0, 2).join(' ')
      },
      tables: {
        existing: existingTables,
        missing: missingTables,
        allTablesExist: missingTables.length === 0
      },
      setup: missingTables.length > 0 ? {
        message: 'Some tables are missing. Run database setup.',
        endpoint: '/api/setup/database',
        method: 'POST'
      } : {
        message: 'All required tables exist'
      }
    });

  } catch (error: any) {
    console.error('Health check error:', error);
    return NextResponse.json(
      { 
        status: 'unhealthy',
        database: {
          connected: false,
          error: error.message
        },
        message: 'Database connection failed'
      }, 
      { status: 500 }
    );
  }
}