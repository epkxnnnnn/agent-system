import { Pool, PoolClient } from 'pg';
import { env } from '@/lib/config/env';

const pool = new Pool({
  connectionString: env.database.url,
  ssl: env.app.isProduction ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export interface QueryResult<T = any> {
  success: boolean;
  data?: T[];
  error?: string;
  rowCount?: number;
}

export async function executeQuery<T = any>(
  query: string, 
  params: any[] = []
): Promise<QueryResult<T>> {
  let client: PoolClient | null = null;
  
  try {
    client = await pool.connect();
    const result = await client.query(query, params);
    
    return {
      success: true,
      data: result.rows,
      rowCount: result.rowCount || 0,
    };
  } catch (error: any) {
    console.error('Database query error:', error);
    return {
      success: false,
      error: error.message,
    };
  } finally {
    if (client) {
      client.release();
    }
  }
}

export async function getCustomer(restaurant_id: string, identifier: string, type: 'phone' | 'email' = 'phone') {
  const field = type === 'phone' ? 'customer_phone' : 'customer_email';
  const query = `SELECT * FROM restaurant_customers WHERE restaurant_id = $1 AND ${field} = $2`;
  return await executeQuery(query, [restaurant_id, identifier]);
}

export async function createOrUpdateCustomer(customerData: {
  restaurant_id: string;
  customer_phone?: string;
  customer_email?: string;
  customer_name?: string;
  signup_source?: string;
  tags?: string[];
  conversation_summary?: string;
}) {
  const {
    restaurant_id,
    customer_phone,
    customer_email,
    customer_name,
    signup_source = 'api',
    tags = [],
    conversation_summary
  } = customerData;

  const query = `
    INSERT INTO restaurant_customers 
    (restaurant_id, customer_phone, customer_email, customer_name, signup_source, tags, conversation_summary, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
    ON CONFLICT (restaurant_id, customer_phone) 
    DO UPDATE SET
      customer_email = COALESCE(EXCLUDED.customer_email, restaurant_customers.customer_email),
      customer_name = COALESCE(EXCLUDED.customer_name, restaurant_customers.customer_name),
      tags = EXCLUDED.tags,
      conversation_summary = COALESCE(EXCLUDED.conversation_summary, restaurant_customers.conversation_summary),
      updated_at = NOW()
    RETURNING *
  `;

  return await executeQuery(query, [
    restaurant_id,
    customer_phone,
    customer_email,
    customer_name,
    signup_source,
    tags,
    conversation_summary
  ]);
}

export async function logConversation(conversationData: {
  conversation_id: string;
  phone?: string;
  user_message: string;
  agent_response: string;
  intent?: string;
  confidence_score?: number;
}) {
  const query = `
    INSERT INTO conversations 
    (conversation_id, phone, user_message, agent_response, intent, confidence_score, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
    RETURNING *
  `;

  return await executeQuery(query, [
    conversationData.conversation_id,
    conversationData.phone,
    conversationData.user_message,
    conversationData.agent_response,
    conversationData.intent,
    conversationData.confidence_score
  ]);
}

export async function createReservation(reservationData: {
  name: string;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  phone?: string;
  special_requests?: string;
}) {
  const query = `
    INSERT INTO reservations 
    (name, party_size, reservation_date, reservation_time, phone, special_requests, status, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, 'confirmed', NOW())
    RETURNING *
  `;

  return await executeQuery(query, [
    reservationData.name,
    reservationData.party_size,
    reservationData.reservation_date,
    reservationData.reservation_time,
    reservationData.phone,
    reservationData.special_requests
  ]);
}

export async function getReservations(date?: string) {
  let query = 'SELECT * FROM reservations';
  const params: any[] = [];

  if (date) {
    query += ' WHERE reservation_date = $1';
    params.push(date);
  } else {
    query += ' WHERE reservation_date >= CURRENT_DATE';
  }

  query += ' ORDER BY reservation_date, reservation_time';
  return await executeQuery(query, params);
}