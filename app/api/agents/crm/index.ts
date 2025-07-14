import { NextRequest, NextResponse } from 'next/server';
import { executeQuery, createOrUpdateCustomer } from '@/lib/toolkits/postgres';

export async function createCustomer(customerData: {
  restaurant_id: string;
  customer_phone?: string;
  customer_email?: string;
  customer_name?: string;
  signup_source?: string;
  signup_keyword?: string;
  opt_in_sms?: boolean;
  opt_in_email?: boolean;
  tags?: string[];
  langchain_conversation_id?: string;
  conversation_summary?: string;
}) {
  try {
    const result = await createOrUpdateCustomer(customerData);
    return { success: true, customer: result.data?.[0] };
  } catch (error: any) {
    console.error('Error creating customer:', error);
    return { success: false, error: error.message };
  }
}

export async function getCustomers(restaurant_id: string, filters?: {
  opt_in_sms?: boolean;
  opt_in_email?: boolean;
  tags?: string[];
  search?: string;
}) {
  try {
    let query = 'SELECT * FROM restaurant_customers WHERE restaurant_id = $1';
    const params: any[] = [restaurant_id];
    let paramIndex = 2;

    if (filters) {
      if (filters.opt_in_sms !== undefined) {
        query += ` AND opt_in_sms = $${paramIndex}`;
        params.push(filters.opt_in_sms);
        paramIndex++;
      }
      
      if (filters.opt_in_email !== undefined) {
        query += ` AND opt_in_email = $${paramIndex}`;
        params.push(filters.opt_in_email);
        paramIndex++;
      }
      
      if (filters.tags && filters.tags.length > 0) {
        query += ` AND tags && $${paramIndex}`;
        params.push(filters.tags);
        paramIndex++;
      }
      
      if (filters.search) {
        query += ` AND (customer_name ILIKE $${paramIndex} OR customer_email ILIKE $${paramIndex} OR customer_phone ILIKE $${paramIndex})`;
        params.push(`%${filters.search}%`);
        paramIndex++;
      }
    }

    query += ' ORDER BY created_at DESC';
    
    const result = await executeQuery(query, params);
    return { success: true, customers: result.data };
  } catch (error: any) {
    console.error('Error fetching customers:', error);
    return { success: false, error: error.message };
  }
}

export async function updateCustomerInteraction(
  restaurant_id: string, 
  customer_phone: string, 
  interaction_data?: {
    total_spent?: number;
    visit_count_increment?: number;
    loyalty_points_increment?: number;
    notes?: string;
    tags?: string[];
    conversation_summary?: string;
  }
) {
  try {
    const updates: string[] = ['last_interaction = NOW()', 'updated_at = NOW()'];
    const params: any[] = [restaurant_id, customer_phone];
    let paramIndex = 3;

    if (interaction_data) {
      if (interaction_data.total_spent !== undefined) {
        updates.push(`total_spent = total_spent + $${paramIndex}`);
        params.push(interaction_data.total_spent);
        paramIndex++;
      }
      
      if (interaction_data.visit_count_increment) {
        updates.push(`visit_count = visit_count + $${paramIndex}`);
        params.push(interaction_data.visit_count_increment);
        paramIndex++;
      }
      
      if (interaction_data.loyalty_points_increment) {
        updates.push(`loyalty_points = loyalty_points + $${paramIndex}`);
        params.push(interaction_data.loyalty_points_increment);
        paramIndex++;
      }
      
      if (interaction_data.notes) {
        updates.push(`notes = $${paramIndex}`);
        params.push(interaction_data.notes);
        paramIndex++;
      }
      
      if (interaction_data.tags) {
        updates.push(`tags = $${paramIndex}`);
        params.push(interaction_data.tags);
        paramIndex++;
      }
      
      if (interaction_data.conversation_summary) {
        updates.push(`conversation_summary = $${paramIndex}`);
        params.push(interaction_data.conversation_summary);
        paramIndex++;
      }
    }

    const query = `
      UPDATE restaurant_customers 
      SET ${updates.join(', ')}
      WHERE restaurant_id = $1 AND customer_phone = $2
      RETURNING *
    `;
    
    const result = await executeQuery(query, params);
    return { success: true, customer: result.data?.[0] };
  } catch (error: any) {
    console.error('Error updating customer interaction:', error);
    return { success: false, error: error.message };
  }
}

export async function getCustomerSegments(restaurant_id: string) {
  try {
    const result = await executeQuery(`
      SELECT 
        COUNT(*) as total_customers,
        COUNT(*) FILTER (WHERE opt_in_sms = true) as sms_subscribers,
        COUNT(*) FILTER (WHERE opt_in_email = true) as email_subscribers,
        COUNT(*) FILTER (WHERE visit_count > 5) as loyal_customers,
        COUNT(*) FILTER (WHERE total_spent > 100) as high_value_customers,
        COUNT(*) FILTER (WHERE last_interaction > NOW() - INTERVAL '30 days') as recent_customers
      FROM restaurant_customers 
      WHERE restaurant_id = $1
    `, [restaurant_id]);
    
    return { success: true, segments: result.data?.[0] };
  } catch (error: any) {
    console.error('Error fetching customer segments:', error);
    return { success: false, error: error.message };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, ...data } = await request.json();
    
    switch (action) {
      case 'create_customer':
        return NextResponse.json(await createCustomer(data));
      
      case 'get_customers':
        return NextResponse.json(await getCustomers(data.restaurant_id, data.filters));
      
      case 'update_interaction':
        return NextResponse.json(await updateCustomerInteraction(
          data.restaurant_id, 
          data.customer_phone, 
          data.interaction_data
        ));
      
      case 'get_segments':
        return NextResponse.json(await getCustomerSegments(data.restaurant_id));
      
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' }, 
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('CRM API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const restaurant_id = searchParams.get('restaurant_id');
  const action = searchParams.get('action') || 'get_customers';
  
  if (!restaurant_id) {
    return NextResponse.json(
      { success: false, error: 'restaurant_id required' }, 
      { status: 400 }
    );
  }
  
  switch (action) {
    case 'get_customers':
      return NextResponse.json(await getCustomers(restaurant_id));
    
    case 'get_segments':
      return NextResponse.json(await getCustomerSegments(restaurant_id));
    
    default:
      return NextResponse.json(
        { success: false, error: 'Invalid action' }, 
        { status: 400 }
      );
  }
}