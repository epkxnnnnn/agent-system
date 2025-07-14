# 🍽️ LangChain Restaurant AI Agents

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Flangchain-ai%2Flangchain-nextjs-template)

A sophisticated multi-agent restaurant management system built with LangChain.js, Next.js, and agent-gpt inspired orchestration patterns. This application showcases advanced AI capabilities including persistent memory, task decomposition, goal-driven planning, and intelligent agent routing.

## 🌟 Features

### Multi-Agent Architecture
- **Intelligent Agent Orchestrator** - Routes requests and coordinates between specialized agents
- **CRM Agent** - Customer relationship management and segmentation
- **Campaign Agent** - Marketing campaign planning and execution with LangGraph workflows
- **Voice Agent** - Twilio-powered voice and SMS interactions
- **Restaurant Agent** - Menu management, orders, and operational tasks
- **Tools Agent** - Database operations and external integrations

### Agent-GPT Style Intelligence
- **Persistent Memory System** - Session-based conversation memory with facts, preferences, and context
- **Task Decomposition** - Complex goals broken into manageable sub-tasks
- **Goal-Driven Planning** - Autonomous planning and execution of multi-step workflows
- **Confidence Scoring** - Intelligent routing based on agent confidence levels
- **Memory Extraction** - Automatic extraction of customer facts and preferences from conversations

### Advanced Capabilities
- **LangGraph Workflows** - Complex multi-step campaign orchestration
- **Streaming Chat Interface** - Real-time responses with Vercel AI SDK
- **Memory Analytics Dashboard** - Monitor agent performance and memory systems
- **Database Integration** - PostgreSQL with connection pooling
- **Communication Tools** - Twilio (voice/SMS) and Resend (email) integration

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- OpenAI API key
- Twilio account (for voice/SMS features)
- Resend account (for email features)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd langchain-restaurant-agents
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables by copying `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

4. Configure your environment variables:
```env
# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/restaurant_db

# Twilio (for voice/SMS)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Resend (for email)
RESEND_API_KEY=your_resend_api_key

# LangSmith (optional)
LANGCHAIN_CALLBACKS_BACKGROUND=false
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your_langsmith_api_key
```

5. Set up the database schema:
```sql
-- Core tables for restaurant operations
CREATE TABLE restaurants (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER REFERENCES restaurants(id),
  name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  preferences JSONB,
  segment VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent memory system
CREATE TABLE agent_memory (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) UNIQUE NOT NULL,
  conversation_history JSONB DEFAULT '[]',
  facts JSONB DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  context JSONB DEFAULT '{}',
  goals JSONB DEFAULT '[]',
  tasks JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conversation logging
CREATE TABLE conversations (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  agent_type VARCHAR(50),
  input TEXT,
  output TEXT,
  confidence_score FLOAT,
  memory_updates JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Campaign management
CREATE TABLE campaigns (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER REFERENCES restaurants(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  target_segment VARCHAR(50),
  status VARCHAR(20) DEFAULT 'draft',
  content JSONB,
  metrics JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

6. Run the development server:
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 🏗️ Architecture

### Agent Orchestrator (`/lib/agentOrchestrator.ts`)
The central hub that routes requests between specialized agents using agent-gpt patterns:

```typescript
export interface AgentMemory {
  session_id: string;
  conversation_history: Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }>;
  facts: Map<string, { value: any; confidence: number; source: string; timestamp: Date }>;
  preferences: Map<string, { value: any; confidence: number; timestamp: Date }>;
  context: Map<string, any>;
  goals: Array<{ description: string; status: 'active' | 'completed' | 'abandoned'; priority: number }>;
  tasks: Map<string, Task>;
}
```

### Campaign Orchestration (`/app/api/agents/campaigns/index.ts`)
Advanced LangGraph-based campaign workflows:

```typescript
// Multi-step campaign planning with AI-powered content generation
const campaignWorkflow = new StateGraph({
  channels: {
    goal: { reducer: (state, action) => action },
    customerAnalysis: { reducer: (state, action) => ({ ...state, ...action }) },
    contentVariants: { reducer: (state, action) => [...(state || []), ...action] },
    executionPlan: { reducer: (state, action) => action },
    results: { reducer: (state, action) => ({ ...state, ...action }) }
  }
});
```

### Memory-Aware Chat (`/app/api/chat/route.ts`)
Streaming chat with persistent memory and agent coordination:

```typescript
// Enhanced chat with memory context and agent routing
const agentResponse = await agentOrchestrator.processRequest({
  input: message,
  session_id: sessionId,
  memory_context: memoryContext,
  agent_preferences: agentPreferences
});
```

## 🎯 Usage Examples

### Simple Restaurant Query
```
User: "What's on the menu today?"
AI: "Let me check our current menu for you..." [Routes to Restaurant Agent]
```

### Complex Multi-Step Campaign
```
User: "Create a marketing campaign to increase lunch sales for busy professionals"

AI Planning:
1. Analyze customer segments for professional demographics
2. Generate targeted content for lunch promotions  
3. Create multi-channel campaign (email, SMS, social)
4. Set up automated follow-up sequences
5. Monitor and optimize performance

AI: "I'll create a comprehensive lunch campaign for professionals. Let me start by analyzing your customer base..."
```

### Memory-Aware Conversation
```
User: "I'm vegetarian and prefer spicy food"
AI: [Stores preference] "I've noted your vegetarian preference and love for spicy food."

Later conversation:
User: "What would you recommend for dinner?"
AI: "Based on your vegetarian preference and love for spicy food, I'd recommend our Spicy Thai Curry with tofu..."
```

## 🔧 Advanced Configuration

### Custom Agent Development
Create new specialized agents by extending the base agent interface:

```typescript
export interface Agent {
  name: string;
  confidence: number;
  canHandle(input: string): boolean;
  process(input: AgentRequest): Promise<AgentResponse>;
}
```

### Memory System Customization
Configure memory extraction patterns and confidence thresholds:

```typescript
const memoryConfig = {
  factExtractionThreshold: 0.8,
  preferenceConfidenceMin: 0.7,
  contextRetentionDays: 30,
  maxConversationHistory: 100
};
```

### LangGraph Workflow Extensions
Build custom multi-step workflows using LangGraph:

```typescript
const customWorkflow = new StateGraph({
  channels: { /* define state channels */ }
})
.addNode("analyze", analyzeStep)
.addNode("plan", planStep) 
.addNode("execute", executeStep)
.addEdge("analyze", "plan")
.addEdge("plan", "execute");
```

## 📊 Monitoring & Analytics

The dashboard at `/dashboard` provides insights into:
- Agent performance metrics
- Memory system analytics
- Conversation success rates
- Campaign effectiveness
- Customer engagement patterns

## 🧪 Testing

Run the test suite:
```bash
pnpm test
```

Type checking:
```bash
pnpm typecheck
```

Linting:
```bash
pnpm lint
```

## 🚀 Deployment

### Vercel Deployment
1. Connect your repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy with automatic builds on push

### Environment Setup
Ensure all required environment variables are configured:
- Database connection for persistent memory
- OpenAI API key for AI capabilities
- Twilio credentials for voice/SMS
- Resend API key for email campaigns

## 🔒 Security

- No API keys or secrets are logged or exposed
- Customer data is encrypted and access-controlled
- Memory system includes data retention policies
- All database queries use parameterized statements

## 📚 Learn More

- [LangChain.js Documentation](https://js.langchain.com/docs/)
- [LangGraph Workflows](https://langchain-ai.github.io/langgraphjs/)
- [Vercel AI SDK](https://github.com/vercel-labs/ai)
- [Agent-GPT Architecture](https://github.com/reworkd/AgentGPT)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

Built on the excellent [LangChain Next.js Template](https://github.com/langchain-ai/langchain-nextjs-template) with inspiration from [Agent-GPT](https://github.com/reworkd/AgentGPT) orchestration patterns.