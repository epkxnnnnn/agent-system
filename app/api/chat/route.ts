import { NextRequest, NextResponse } from "next/server";
import { Message as VercelChatMessage, StreamingTextResponse } from "ai";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { HttpResponseOutputParser } from "langchain/output_parsers";
import { agentOrchestrator, AgentRequest } from "@/lib/agentOrchestrator";

export const runtime = "edge";

const formatMessage = (message: VercelChatMessage) => {
  return `${message.role}: ${message.content}`;
};

// Enhanced template for restaurant AI with agent orchestration
const RESTAURANT_TEMPLATE = `You are an intelligent AI assistant for Lullabar Thai Fusion & Izakaya restaurant. You have access to multiple specialized agents and can handle complex multi-step requests.

AGENT CONTEXT:
{agent_context}

MEMORY CONTEXT:
{memory_context}

CONVERSATION HISTORY:
{chat_history}

Current conversation:
User: {input}

INSTRUCTIONS:
- Provide helpful, accurate information about restaurant operations
- Use the agent's findings to enhance your response
- Maintain a warm, professional tone
- For complex requests, explain the steps being taken
- Reference customer history when available

AI Assistant:`;

/**
 * Enhanced streaming chat with agent orchestration and memory
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages = body.messages ?? [];
    const context = body.context ?? {};
    
    if (messages.length === 0) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    const formattedPreviousMessages = messages.slice(0, -1).map(formatMessage);
    const currentMessageContent = messages[messages.length - 1].content;

    // Extract session/conversation ID
    const sessionId = context?.session_id || context?.conversation_id || `session_${Date.now()}`;
    
    // Process through agent orchestrator first
    const agentRequest: AgentRequest = {
      message: currentMessageContent,
      context: {
        restaurant_id: context?.restaurant_id || 'lullabar',
        phone: context?.phone,
        email: context?.email,
        conversation_id: sessionId,
        session_id: sessionId,
        previous_intent: context?.previous_intent
      }
    };

    console.log('Processing agent request:', { message: currentMessageContent, sessionId });
    
    const agentResponse = await agentOrchestrator.processRequest(agentRequest);
    
    console.log('Agent response received:', { 
      agent: agentResponse.agent_used, 
      confidence: agentResponse.confidence 
    });

    // Build context for LangChain streaming
    const agentContext = `
Agent Used: ${agentResponse.agent_used}
Confidence: ${agentResponse.confidence}
Intent: ${agentResponse.intent || 'general'}
Routing Reasoning: ${agentResponse.data?.routing?.reasoning || 'Standard routing'}
${agentResponse.tasks ? `Active Tasks: ${agentResponse.tasks.length}` : ''}
Base Response: "${agentResponse.response}"`;

    const memoryContext = agentResponse.memory_updates ? 
      `Recent Memory Updates: ${agentResponse.memory_updates.slice(-2).map(u => `${u.key}: ${u.value}`).join(', ')}` : 
      'No recent memory updates';

    const prompt = PromptTemplate.fromTemplate(RESTAURANT_TEMPLATE);

    const model = new ChatOpenAI({
      temperature: 0.7,
      model: "gpt-4o-mini",
      streaming: true,
    });

    const outputParser = new HttpResponseOutputParser();
    const chain = prompt.pipe(model).pipe(outputParser);

    const stream = await chain.stream({
      agent_context: agentContext,
      memory_context: memoryContext,
      chat_history: formattedPreviousMessages.join("\n"),
      input: currentMessageContent,
    });

    // Add custom headers with agent metadata
    const response = new StreamingTextResponse(stream, {
      headers: {
        'X-Agent-Used': agentResponse.agent_used,
        'X-Agent-Confidence': agentResponse.confidence.toString(),
        'X-Session-ID': sessionId,
        'X-Intent': agentResponse.intent || 'general',
        'X-Tasks-Count': agentResponse.tasks?.length.toString() || '0'
      }
    });

    return response;

  } catch (e: any) {
    console.error('Chat route error:', e);
    
    // Fallback to direct agent response if streaming fails
    try {
      const body = await req.json();
      const messages = body.messages ?? [];
      const context = body.context ?? {};
      
      if (messages.length > 0) {
        const agentRequest: AgentRequest = {
          message: messages[messages.length - 1].content,
          context: {
            restaurant_id: context?.restaurant_id || 'lullabar',
            session_id: context?.session_id || `fallback_${Date.now()}`
          }
        };

        const agentResponse = await agentOrchestrator.processRequest(agentRequest);
        
        return NextResponse.json({
          role: 'assistant',
          content: agentResponse.response,
          metadata: {
            agent_used: agentResponse.agent_used,
            confidence: agentResponse.confidence,
            intent: agentResponse.intent,
            tasks: agentResponse.tasks?.length || 0,
            fallback: true
          }
        });
      }
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
    }
    
    return NextResponse.json({ 
      error: e.message || 'Chat service temporarily unavailable' 
    }, { 
      status: e.status ?? 500 
    });
  }
}

// Non-streaming endpoint for simple requests and debugging
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const message = searchParams.get('message');
  const restaurant_id = searchParams.get('restaurant_id') || 'lullabar';
  const session_id = searchParams.get('session_id') || `get_${Date.now()}`;

  if (!message) {
    return NextResponse.json(
      { error: 'Message parameter is required' },
      { status: 400 }
    );
  }

  try {
    const agentRequest: AgentRequest = {
      message: message.trim(),
      context: {
        restaurant_id,
        session_id
      }
    };

    const result = await agentOrchestrator.processRequest(agentRequest);

    return NextResponse.json({
      success: true,
      response: result.response,
      agent_used: result.agent_used,
      confidence: result.confidence,
      intent: result.intent,
      needs_human_handoff: result.needs_human_handoff,
      session_id,
      routing_info: result.data?.routing,
      tasks: result.tasks?.length || 0,
      memory_updates: result.memory_updates?.length || 0
    });

  } catch (error: any) {
    console.error('Chat GET error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        response: 'I apologize, but I\'m experiencing technical difficulties. Please try again in a moment.'
      },
      { status: 500 }
    );
  }
}

// Agent orchestration management endpoint
export async function PATCH(req: NextRequest) {
  try {
    const { session_id, action, data } = await req.json();
    
    switch (action) {
      case 'get_memory':
        const memory = agentOrchestrator.getMemory(session_id);
        return NextResponse.json({
          success: true,
          memory: memory ? {
            facts: Array.from(memory.facts.entries()).slice(-10),
            preferences: Array.from(memory.preferences.entries()).slice(-5),
            goals: memory.goals.filter(g => g.status === 'active'),
            recent_conversation: memory.conversation_history.slice(-10)
          } : null
        });
      
      case 'get_tasks':
        const tasks = agentOrchestrator.getTaskQueue();
        return NextResponse.json({
          success: true,
          tasks: tasks.filter(t => 
            t.id.includes(session_id) || 
            t.status === 'in_progress' || 
            t.status === 'pending'
          ).slice(-20)
        });
      
      case 'continue_workflow':
        if (data.task_id) {
          return NextResponse.json({
            success: true,
            message: `Continuing workflow for task: ${data.task_id}`
          });
        }
        break;
      
      case 'clear_memory':
        // Clear session memory (useful for testing)
        const clearedMemory = agentOrchestrator.getMemory(session_id);
        if (clearedMemory) {
          clearedMemory.conversation_history = [];
          clearedMemory.facts.clear();
          clearedMemory.preferences.clear();
          clearedMemory.context.clear();
          clearedMemory.goals = [];
        }
        return NextResponse.json({
          success: true,
          message: 'Session memory cleared'
        });
      
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Chat PATCH error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}