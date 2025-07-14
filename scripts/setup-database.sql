-- Restaurant AI Multi-Agent System Database Schema
-- Run this script on your PostgreSQL database to create all required tables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Core restaurant table
CREATE TABLE IF NOT EXISTS restaurants (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer management table
CREATE TABLE IF NOT EXISTS customers (
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
);

-- Agent memory system - core table for session-based memory
CREATE TABLE IF NOT EXISTS agent_memory (
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
);

-- Conversation logging table
CREATE TABLE IF NOT EXISTS conversations (
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
);

-- Campaign management table
CREATE TABLE IF NOT EXISTS campaigns (
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
);

-- Menu items table
CREATE TABLE IF NOT EXISTS menu_items (
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
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER REFERENCES restaurants(id),
  customer_id INTEGER REFERENCES customers(id),
  order_items JSONB NOT NULL,
  total_amount DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'pending',
  order_type VARCHAR(50), -- dine-in, takeout, delivery
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reservations table
CREATE TABLE IF NOT EXISTS reservations (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER REFERENCES restaurants(id),
  customer_id INTEGER REFERENCES customers(id),
  party_size INTEGER NOT NULL,
  reservation_time TIMESTAMP NOT NULL,
  status VARCHAR(50) DEFAULT 'confirmed',
  special_requests TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent tasks and workflows table
CREATE TABLE IF NOT EXISTS agent_tasks (
  id SERIAL PRIMARY KEY,
  task_id UUID DEFAULT uuid_generate_v4(),
  session_id VARCHAR(255),
  agent_type VARCHAR(50),
  task_type VARCHAR(50),
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  priority INTEGER DEFAULT 0,
  input_data JSONB,
  output_data JSONB,
  error_message TEXT,
  parent_task_id UUID REFERENCES agent_tasks(task_id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_restaurant ON customers(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_conversations_session ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_customer ON conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created ON conversations(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_memory_session ON agent_memory(session_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_restaurant ON campaigns(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant ON menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_reservations_restaurant ON reservations(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_reservations_time ON reservations(reservation_time);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_session ON agent_tasks(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status);

-- Insert sample restaurant data
INSERT INTO restaurants (name, phone, email, address) 
VALUES (
  'Lullabar Thai Fusion & Izakaya', 
  '+19388888496', 
  'info@lullabarlv.com',
  '6590 S Rainbow Blvd, Las Vegas, NV 89118'
) ON CONFLICT DO NOTHING;

-- Insert sample menu items
INSERT INTO menu_items (restaurant_id, name, description, price, category, ingredients, allergens) 
VALUES 
  (1, 'Pad Thai', 'Traditional Thai stir-fried noodles with shrimp', 16.99, 'Entrees', '["rice noodles", "shrimp", "bean sprouts", "peanuts"]', '["shellfish", "peanuts"]'),
  (1, 'Green Curry', 'Spicy coconut curry with chicken and vegetables', 18.99, 'Entrees', '["chicken", "coconut milk", "thai basil", "bamboo shoots"]', '[]'),
  (1, 'Tom Yum Soup', 'Hot and sour Thai soup with shrimp', 12.99, 'Soups', '["shrimp", "lemongrass", "lime leaves", "mushrooms"]', '["shellfish"]'),
  (1, 'Mango Sticky Rice', 'Traditional Thai dessert', 8.99, 'Desserts', '["sticky rice", "coconut milk", "fresh mango"]', '[]')
ON CONFLICT DO NOTHING;

-- Insert sample customers
INSERT INTO customers (restaurant_id, name, email, phone, preferences, segment, loyalty_points, visit_count) 
VALUES 
  (1, 'John Smith', 'john@example.com', '+1234567890', '{"dietary": "vegetarian", "spice_level": "mild"}', 'regular', 120, 8),
  (1, 'Sarah Johnson', 'sarah@example.com', '+1234567891', '{"dietary": "none", "spice_level": "spicy"}', 'vip', 450, 23),
  (1, 'Mike Chen', 'mike@example.com', '+1234567892', '{"dietary": "gluten-free", "spice_level": "medium"}', 'new', 25, 2)
ON CONFLICT DO NOTHING;

-- Success message
SELECT 'Database schema created successfully! Tables: restaurants, customers, agent_memory, conversations, campaigns, menu_items, orders, reservations, agent_tasks' as status;