import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/toolkits/postgres';

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    // Database schema creation queries
    const queries = [
      // Enable UUID extension
      `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
      
      // Restaurants table
      `CREATE TABLE IF NOT EXISTS restaurants (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address TEXT,
        phone VARCHAR(20),
        email VARCHAR(255),
        settings JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Customers table
      `CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        restaurant_id INTEGER REFERENCES restaurants(id),
        name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(20),
        preferences JSONB DEFAULT '{}',
        segment VARCHAR(50),
        loyalty_points INTEGER DEFAULT 0,
        visit_count INTEGER DEFAULT 0,
        last_visit TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Agent memory table
      `CREATE TABLE IF NOT EXISTS agent_memory (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255) UNIQUE NOT NULL,
        customer_id INTEGER REFERENCES customers(id),
        conversation_history JSONB DEFAULT '[]',
        facts JSONB DEFAULT '{}',
        preferences JSONB DEFAULT '{}',
        context JSONB DEFAULT '{}',
        goals JSONB DEFAULT '[]',
        tasks JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Conversations table
      `CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255),
        customer_id INTEGER REFERENCES customers(id),
        agent_type VARCHAR(50),
        input TEXT,
        output TEXT,
        confidence_score FLOAT,
        memory_updates JSONB,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Campaigns table
      `CREATE TABLE IF NOT EXISTS campaigns (
        id SERIAL PRIMARY KEY,
        restaurant_id INTEGER REFERENCES restaurants(id),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        target_segment VARCHAR(50),
        status VARCHAR(20) DEFAULT 'draft',
        content JSONB,
        metrics JSONB DEFAULT '{}',
        execution_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Menu items table
      `CREATE TABLE IF NOT EXISTS menu_items (
        id SERIAL PRIMARY KEY,
        restaurant_id INTEGER REFERENCES restaurants(id),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2),
        category VARCHAR(100),
        ingredients JSONB DEFAULT '[]',
        allergens JSONB DEFAULT '[]',
        available BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Create indexes
      `CREATE INDEX IF NOT EXISTS idx_customers_restaurant ON customers(restaurant_id)`,
      `CREATE INDEX IF NOT EXISTS idx_conversations_session ON conversations(session_id)`,
      `CREATE INDEX IF NOT EXISTS idx_agent_memory_session ON agent_memory(session_id)`,
      `CREATE INDEX IF NOT EXISTS idx_campaigns_restaurant ON campaigns(restaurant_id)`
    ];

    // Execute all queries
    const results = [];
    for (const query of queries) {
      try {
        const result = await executeQuery(query);
        results.push({ query: query.substring(0, 50) + '...', success: true });
      } catch (error: any) {
        results.push({ 
          query: query.substring(0, 50) + '...', 
          success: false, 
          error: error.message 
        });
      }
    }

    // Insert sample data
    try {
      // Insert sample restaurant
      await executeQuery(`
        INSERT INTO restaurants (name, phone, email, address) 
        VALUES ($1, $2, $3, $4) 
        ON CONFLICT DO NOTHING
        RETURNING id
      `, [
        'Lullabar Thai Fusion & Izakaya',
        '+19388888496',
        'info@lullabarlv.com',
        '6590 S Rainbow Blvd, Las Vegas, NV 89118'
      ]);

      // Insert sample menu items
      await executeQuery(`
        INSERT INTO menu_items (restaurant_id, name, description, price, category, ingredients, allergens) 
        VALUES 
          (1, 'Pad Thai', 'Traditional Thai stir-fried noodles with shrimp', 16.99, 'Entrees', $1, $2),
          (1, 'Green Curry', 'Spicy coconut curry with chicken and vegetables', 18.99, 'Entrees', $3, '[]'),
          (1, 'Tom Yum Soup', 'Hot and sour Thai soup with shrimp', 12.99, 'Soups', $4, $5),
          (1, 'Mango Sticky Rice', 'Traditional Thai dessert', 8.99, 'Desserts', $6, '[]')
        ON CONFLICT DO NOTHING
      `, [
        JSON.stringify(["rice noodles", "shrimp", "bean sprouts", "peanuts"]),
        JSON.stringify(["shellfish", "peanuts"]),
        JSON.stringify(["chicken", "coconut milk", "thai basil", "bamboo shoots"]),
        JSON.stringify(["shrimp", "lemongrass", "lime leaves", "mushrooms"]),
        JSON.stringify(["shellfish"]),
        JSON.stringify(["sticky rice", "coconut milk", "fresh mango"])
      ]);

      results.push({ query: 'Sample data insertion', success: true });
    } catch (error: any) {
      results.push({ query: 'Sample data insertion', success: false, error: error.message });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Database setup completed',
      results,
      tablesCreated: [
        'restaurants',
        'customers', 
        'agent_memory',
        'conversations',
        'campaigns',
        'menu_items'
      ]
    });

  } catch (error: any) {
    console.error('Database setup error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        message: 'Failed to set up database'
      }, 
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Database Setup API',
    usage: 'POST to this endpoint to create database tables',
    note: 'This will create all required tables for the restaurant AI system'
  });
}