import { ChatOpenAI } from '@langchain/openai';
import { executeQuery, logConversation } from './toolkits/postgres';
import { env } from './config/env';

export interface AgentRequest {
  message: string;
  context?: {
    restaurant_id?: string;
    phone?: string;
    email?: string;
    conversation_id?: string;
    previous_intent?: string;
    session_id?: string;
  };
}

export interface AgentResponse {
  response: string;
  agent_used: string;
  confidence: number;
  intent?: string;
  next_action?: string;
  needs_human_handoff?: boolean;
  data?: any;
  tasks?: Task[];
  memory_updates?: MemoryUpdate[];
}

export interface Task {
  id: string;
  type: 'research' | 'action' | 'analysis' | 'communication';
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  priority: number;
  dependencies?: string[];
  result?: any;
  agent?: string;
  created_at: Date;
  updated_at: Date;
}

export interface MemoryUpdate {
  type: 'fact' | 'preference' | 'context' | 'goal';
  key: string;
  value: any;
  confidence: number;
  source: string;
  timestamp: Date;
}

export interface AgentMemory {
  session_id: string;
  conversation_history: Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }>;
  facts: Map<string, { value: any; confidence: number; source: string; timestamp: Date }>;
  preferences: Map<string, { value: any; confidence: number; timestamp: Date }>;
  context: Map<string, any>;
  goals: Array<{ description: string; status: 'active' | 'completed' | 'abandoned'; priority: number }>;
  tasks: Map<string, Task>;
}

export type AgentType = 'voice' | 'crm' | 'campaigns' | 'postgres' | 'tools' | 'orchestrator';

export class AgentOrchestrator {
  private llm: ChatOpenAI;
  private memory: Map<string, AgentMemory> = new Map();
  private taskQueue: Task[] = [];
  
  constructor() {
    this.llm = new ChatOpenAI({
      modelName: 'gpt-4',
      temperature: 0.3,
      openAIApiKey: env.openai.apiKey,
    });
  }

  private getOrCreateMemory(sessionId: string): AgentMemory {
    if (!this.memory.has(sessionId)) {
      this.memory.set(sessionId, {
        session_id: sessionId,
        conversation_history: [],
        facts: new Map(),
        preferences: new Map(),
        context: new Map(),
        goals: [],
        tasks: new Map()
      });
    }
    return this.memory.get(sessionId)!;
  }

  private updateMemory(sessionId: string, updates: MemoryUpdate[]) {
    const memory = this.getOrCreateMemory(sessionId);
    
    for (const update of updates) {
      switch (update.type) {
        case 'fact':
          memory.facts.set(update.key, {
            value: update.value,
            confidence: update.confidence,
            source: update.source,
            timestamp: update.timestamp
          });
          break;
        case 'preference':
          memory.preferences.set(update.key, {
            value: update.value,
            confidence: update.confidence,
            timestamp: update.timestamp
          });
          break;
        case 'context':
          memory.context.set(update.key, update.value);
          break;
        case 'goal':
          memory.goals.push({
            description: update.value.description,
            status: update.value.status || 'active',
            priority: update.value.priority || 1
          });
          break;
      }
    }
  }

  private async decomposeGoalIntoTasks(goal: string, context: any): Promise<Task[]> {
    const decompositionPrompt = `Given this goal and context, break it down into specific, actionable tasks.

GOAL: ${goal}
CONTEXT: ${JSON.stringify(context, null, 2)}

Break this down into 3-7 specific tasks that can be executed by our restaurant AI agents:
- CRM Agent: Customer data, segmentation, loyalty management
- Campaign Agent: Email/SMS marketing, review responses, LangGraph workflows  
- Voice Agent: Phone calls, Twilio integration, voice interactions
- Restaurant Agent: Reservations, menu queries, operational Q&A
- Tools Agent: SMS keywords, utility functions

Return a JSON array of tasks:
[
  {
    "id": "task_1",
    "type": "research|action|analysis|communication",
    "description": "Specific task description",
    "priority": 1-5,
    "agent": "crm|campaigns|voice|postgres|tools",
    "dependencies": ["task_id_if_any"]
  }
]`;

    try {
      const response = await this.llm.invoke(decompositionPrompt);
      const tasks = JSON.parse(response.content as string);
      
      return tasks.map((task: any) => ({
        ...task,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date()
      }));
    } catch (error) {
      console.error('Task decomposition error:', error);
      return [{
        id: 'fallback_task',
        type: 'action',
        description: goal,
        status: 'pending',
        priority: 1,
        agent: 'postgres',
        created_at: new Date(),
        updated_at: new Date()
      }];
    }
  }

  private async extractMemoryUpdates(userMessage: string, agentResponse: string, context: any): Promise<MemoryUpdate[]> {
    const extractionPrompt = `Analyze this conversation and extract important information to remember.

USER: ${userMessage}
AGENT: ${agentResponse}
CONTEXT: ${JSON.stringify(context, null, 2)}

Extract facts, preferences, and context that should be remembered. Return JSON:
{
  "updates": [
    {
      "type": "fact|preference|context",
      "key": "descriptive_key",
      "value": "value_to_remember", 
      "confidence": 0.8,
      "source": "conversation"
    }
  ]
}`;

    try {
      const response = await this.llm.invoke(extractionPrompt);
      const result = JSON.parse(response.content as string);
      
      return result.updates.map((update: any) => ({
        ...update,
        timestamp: new Date()
      }));
    } catch (error) {
      console.error('Memory extraction error:', error);
      return [];
    }
  }

  async routeToAgent(request: AgentRequest): Promise<{ agent: AgentType; confidence: number; reasoning: string }> {
    const { message, context } = request;
    const sessionId = context?.session_id || context?.conversation_id || 'default';
    const memory = this.getOrCreateMemory(sessionId);
    
    // Include memory context in routing decision
    const memoryContext = {
      recent_facts: Array.from(memory.facts.entries()).slice(-5),
      active_goals: memory.goals.filter(g => g.status === 'active'),
      recent_conversation: memory.conversation_history.slice(-6)
    };
    
    const routingPrompt = `Analyze this user message and determine which agent should handle it, considering conversation memory.

User message: "${message}"
Context: ${JSON.stringify(context, null, 2)}
Memory: ${JSON.stringify(memoryContext, null, 2)}

Available agents:
1. ORCHESTRATOR - Complex multi-step tasks requiring coordination across agents
2. VOICE - Voice calls, phone interactions, Twilio webhooks, bilingual support
3. CRM - Customer management, data analysis, segmentation, loyalty programs
4. CAMPAIGNS - Email/SMS marketing, LangGraph workflows, review automation
5. POSTGRES - Restaurant operations, reservations, menu queries, Q&A
6. TOOLS - Simple utilities, SMS keywords, direct tool execution

Routing Guidelines:
- Use ORCHESTRATOR for complex goals requiring multiple steps/agents
- Consider conversation history and active goals
- Route to specific agents for focused tasks

Return JSON:
{
  "agent": "orchestrator|voice|crm|campaigns|postgres|tools",
  "confidence": 0.95,
  "reasoning": "Why this agent was chosen based on message and memory"
}`;

    try {
      const response = await this.llm.invoke(routingPrompt);
      const result = JSON.parse(response.content as string);
      
      // Validate response
      const validAgents: AgentType[] = ['orchestrator', 'voice', 'crm', 'campaigns', 'postgres', 'tools'];
      if (!validAgents.includes(result.agent)) {
        return {
          agent: 'postgres',
          confidence: 0.6,
          reasoning: 'Defaulted to restaurant operations agent'
        };
      }
      
      return result;
    } catch (error) {
      console.error('Agent routing error:', error);
      return this.fallbackRouting(message);
    }
  }

  private fallbackRouting(message: string): { agent: AgentType; confidence: number; reasoning: string } {
    const messageLower = message.toLowerCase();
    
    // Check for complex multi-step indicators
    if (messageLower.includes('campaign') && (messageLower.includes('create') || messageLower.includes('setup'))) {
      return { agent: 'orchestrator', confidence: 0.7, reasoning: 'Complex campaign setup requires orchestration' };
    }
    
    if (messageLower.includes('call') || messageLower.includes('voice')) {
      return { agent: 'voice', confidence: 0.7, reasoning: 'Voice-related keyword routing' };
    }
    
    if (messageLower.includes('customer') || messageLower.includes('loyalty')) {
      return { agent: 'crm', confidence: 0.7, reasoning: 'CRM-related keyword routing' };
    }
    
    if (messageLower.includes('email') || messageLower.includes('marketing')) {
      return { agent: 'campaigns', confidence: 0.7, reasoning: 'Campaign-related keyword routing' };
    }
    
    return { agent: 'postgres', confidence: 0.5, reasoning: 'Default restaurant operations routing' };
  }

  private async executeOrchestrator(request: AgentRequest): Promise<AgentResponse> {
    const sessionId = request.context?.session_id || request.context?.conversation_id || 'default';
    const memory = this.getOrCreateMemory(sessionId);
    
    // Determine if this is a complex goal requiring task decomposition
    const goalAnalysisPrompt = `Analyze this request to determine if it requires multi-step orchestration.

Request: "${request.message}"
Context: ${JSON.stringify(request.context, null, 2)}

Is this a complex goal requiring multiple agents and steps? Examples:
- "Create a comprehensive marketing campaign for new customers"
- "Set up a complete customer onboarding flow" 
- "Analyze customer data and create targeted promotions"

Simple requests should be routed to specific agents instead.

Return JSON:
{
  "is_complex": true/false,
  "goal": "Extracted main goal if complex",
  "reasoning": "Why this is/isn't complex"
}`;

    try {
      const goalResponse = await this.llm.invoke(goalAnalysisPrompt);
      const goalAnalysis = JSON.parse(goalResponse.content as string);
      
      if (!goalAnalysis.is_complex) {
        // Route to specific agent instead
        const routing = await this.routeToAgent(request);
        return await this.executeAgent(routing.agent, request);
      }
      
      // Decompose goal into tasks
      const tasks = await this.decomposeGoalIntoTasks(goalAnalysis.goal, request.context);
      
      // Add tasks to memory and queue
      for (const task of tasks) {
        memory.tasks.set(task.id, task);
        this.taskQueue.push(task);
      }
      
      // Add goal to memory
      memory.goals.push({
        description: goalAnalysis.goal,
        status: 'active',
        priority: 1
      });
      
      // Execute first available task
      const firstTask = tasks.find(t => !t.dependencies || t.dependencies.length === 0);
      let executionResult = '';
      
      if (firstTask) {
        firstTask.status = 'in_progress';
        const taskRequest = {
          message: firstTask.description,
          context: request.context
        };
        
        const result = await this.executeAgent(firstTask.agent as AgentType, taskRequest);
        firstTask.status = 'completed';
        firstTask.result = result;
        executionResult = result.response;
      }
      
      return {
        response: `I've created a plan to ${goalAnalysis.goal.toLowerCase()}. ${executionResult}\n\nNext steps: ${tasks.slice(1, 3).map(t => t.description).join(', ')}`,
        agent_used: 'orchestrator',
        confidence: 0.9,
        tasks: tasks,
        data: {
          goal: goalAnalysis.goal,
          total_tasks: tasks.length,
          completed_tasks: tasks.filter(t => t.status === 'completed').length
        }
      };
      
    } catch (error) {
      console.error('Orchestrator execution error:', error);
      return {
        response: 'I understand you have a complex request. Let me break it down and handle it step by step.',
        agent_used: 'orchestrator',
        confidence: 0.5,
        data: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  async executeAgent(agent: AgentType, request: AgentRequest): Promise<AgentResponse> {
    const sessionId = request.context?.session_id || request.context?.conversation_id || 'default';
    const memory = this.getOrCreateMemory(sessionId);
    
    // Add to conversation history
    memory.conversation_history.push({
      role: 'user',
      content: request.message,
      timestamp: new Date()
    });
    
    // Handle orchestrator agent specially
    if (agent === 'orchestrator') {
      return await this.executeOrchestrator(request);
    }
    
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    
    try {
      let endpoint = '';
      let payload: any = {};

      switch (agent) {
        case 'voice':
          endpoint = `${baseUrl}/api/agents/voice`;
          payload = {
            message: request.message,
            phone: request.context?.phone,
            conversation_id: request.context?.conversation_id,
            language: this.detectLanguage(request.message),
            memory_context: this.buildMemoryContext(memory)
          };
          break;

        case 'crm':
          endpoint = `${baseUrl}/api/agents/crm`;
          payload = {
            action: this.determineCRMAction(request.message),
            restaurant_id: request.context?.restaurant_id || 'lullabar',
            memory_context: this.buildMemoryContext(memory),
            ...request.context
          };
          break;

        case 'campaigns':
          endpoint = `${baseUrl}/api/agents/campaigns`;
          payload = {
            action: this.determineCampaignAction(request.message),
            restaurant_id: request.context?.restaurant_id || 'lullabar',
            memory_context: this.buildMemoryContext(memory),
            ...request.context
          };
          break;

        case 'postgres':
          endpoint = `${baseUrl}/api/agents/postgres`;
          payload = {
            message: request.message,
            conversation_id: request.context?.conversation_id || `conv_${Date.now()}`,
            memory_context: this.buildMemoryContext(memory)
          };
          break;

        case 'tools':
          endpoint = `${baseUrl}/api/agents/tools`;
          payload = {
            tool: this.determineToolAction(request.message),
            memory_context: this.buildMemoryContext(memory),
            ...request.context,
            message: request.message
          };
          break;

        default:
          throw new Error(`Unknown agent type: ${agent}`);
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Agent ${agent} returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || `Agent ${agent} returned unsuccessful response`);
      }

      const agentResponse = data.response || data.message || 'Operation completed successfully';
      
      // Add agent response to conversation history
      memory.conversation_history.push({
        role: 'assistant',
        content: agentResponse,
        timestamp: new Date()
      });
      
      // Extract and update memory
      const memoryUpdates = await this.extractMemoryUpdates(request.message, agentResponse, request.context);
      this.updateMemory(sessionId, memoryUpdates);

      return {
        response: agentResponse,
        agent_used: agent,
        confidence: data.confidence || 0.8,
        intent: data.intent,
        next_action: data.next_action,
        needs_human_handoff: data.needs_human_handoff || false,
        memory_updates: memoryUpdates,
        data: data
      };

    } catch (error: any) {
      console.error(`Error executing agent ${agent}:`, error);
      
      return {
        response: `I apologize, but I'm having trouble processing your request right now. Please try again or contact us directly.`,
        agent_used: agent,
        confidence: 0.1,
        needs_human_handoff: true,
        data: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  private buildMemoryContext(memory: AgentMemory) {
    return {
      recent_facts: Array.from(memory.facts.entries()).slice(-5).map(([key, value]) => ({ key, ...value })),
      preferences: Array.from(memory.preferences.entries()).slice(-3).map(([key, value]) => ({ key, ...value })),
      active_goals: memory.goals.filter(g => g.status === 'active'),
      recent_conversation: memory.conversation_history.slice(-4)
    };
  }

  private detectLanguage(message: string): 'english' | 'chinese' {
    const chineseRegex = /[\u4e00-\u9fff]/;
    return chineseRegex.test(message) ? 'chinese' : 'english';
  }

  private determineCRMAction(message: string): string {
    const messageLower = message.toLowerCase();
    
    if (messageLower.includes('create') || messageLower.includes('add')) return 'create_customer';
    if (messageLower.includes('find') || messageLower.includes('search')) return 'get_customers';
    if (messageLower.includes('update') || messageLower.includes('interaction')) return 'update_interaction';
    if (messageLower.includes('segment') || messageLower.includes('analytics')) return 'get_segments';
    
    return 'get_customers';
  }

  private determineCampaignAction(message: string): string {
    const messageLower = message.toLowerCase();
    
    if (messageLower.includes('create') || messageLower.includes('new campaign')) return 'create_campaign';
    if (messageLower.includes('execute') || messageLower.includes('send')) return 'execute_campaign';
    if (messageLower.includes('review') || messageLower.includes('response')) return 'process_review';
    if (messageLower.includes('approve')) return 'approve_review_response';
    
    return 'get_campaigns';
  }

  private determineToolAction(message: string): string {
    const messageLower = message.toLowerCase();
    
    if (messageLower.includes('keyword') || messageLower.includes('sms')) return 'sms_keyword';
    if (messageLower.includes('review')) return 'review_response';
    if (messageLower.includes('segment')) return 'customer_segments';
    
    return 'sms_keyword';
  }

  async processRequest(request: AgentRequest): Promise<AgentResponse> {
    const sessionId = request.context?.session_id || request.context?.conversation_id || 'default';
    
    // Route to appropriate agent
    const routing = await this.routeToAgent(request);
    
    // Execute the selected agent
    const response = await this.executeAgent(routing.agent, request);
    
    // Add routing metadata
    response.data = {
      ...response.data,
      routing: {
        selected_agent: routing.agent,
        routing_confidence: routing.confidence,
        reasoning: routing.reasoning
      }
    };
    
    // Log conversation for persistence
    try {
      await logConversation({
        conversation_id: sessionId,
        phone: request.context?.phone,
        user_message: request.message,
        agent_response: response.response,
        intent: response.intent,
        confidence_score: response.confidence
      });
    } catch (error) {
      console.error('Failed to log conversation:', error);
    }
    
    return response;
  }

  // Public method to get memory for debugging/dashboard
  getMemory(sessionId: string): AgentMemory | undefined {
    return this.memory.get(sessionId);
  }

  // Public method to get task queue status
  getTaskQueue(): Task[] {
    return this.taskQueue;
  }
}

export const agentOrchestrator = new AgentOrchestrator();