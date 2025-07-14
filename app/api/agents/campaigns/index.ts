import { NextRequest, NextResponse } from 'next/server';
import { StateGraph, END } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import { executeQuery } from '@/lib/toolkits/postgres';
import { sendEmail } from '@/lib/toolkits/sendgrid';
import { sendSMS } from '@/lib/toolkits/twilio';

// Agent-GPT inspired state management for multi-step campaigns
export interface CampaignState {
  campaign_id: string;
  restaurant_id: string;
  goal: string;
  current_step: string;
  steps_completed: string[];
  steps_remaining: string[];
  campaign_data: {
    type?: 'email' | 'sms' | 'multi_channel';
    target_segments?: string[];
    content?: any;
    schedule?: any;
    personalization?: any;
  };
  customer_analysis?: {
    total_customers: number;
    segments: any;
    preferences: any;
  };
  content_variants?: Array<{
    variant_id: string;
    subject?: string;
    content: string;
    target_segment: string;
    performance_score?: number;
  }>;
  execution_results?: {
    sent: number;
    delivered: number;
    opened?: number;
    clicked?: number;
    failed: number;
    errors: string[];
  };
  memory_context?: any;
  requires_approval?: boolean;
  approval_status?: 'pending' | 'approved' | 'rejected';
  next_actions?: string[];
}

// Agent-GPT style task execution patterns
export interface CampaignTask {
  id: string;
  type: 'analyze' | 'create' | 'personalize' | 'approve' | 'execute' | 'monitor';
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  dependencies: string[];
  agent_instructions: string;
  result?: any;
  error?: string;
}

export class CampaignOrchestrator {
  private llm: ChatOpenAI;
  private activeWorkflows: Map<string, CampaignState> = new Map();

  constructor() {
    this.llm = new ChatOpenAI({
      modelName: 'gpt-4',
      temperature: 0.3,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
  }

  // Agent-GPT inspired goal decomposition for campaigns
  async planCampaignWorkflow(goal: string, context: any): Promise<CampaignTask[]> {
    const planningPrompt = `You are a campaign planning AI. Break down this marketing goal into specific, executable tasks.

GOAL: ${goal}
CONTEXT: ${JSON.stringify(context, null, 2)}

Available capabilities:
- Customer analysis and segmentation
- Content creation and personalization
- A/B testing and optimization
- Multi-channel execution (email, SMS)
- Performance monitoring and analysis
- Review response automation

Break this into 4-8 sequential tasks. Each task should be specific and measurable.

Return JSON array:
[
  {
    "id": "task_1",
    "type": "analyze|create|personalize|approve|execute|monitor",
    "description": "Specific task description",
    "dependencies": ["previous_task_id"],
    "agent_instructions": "Detailed instructions for execution"
  }
]`;

    try {
      const response = await this.llm.invoke(planningPrompt);
      const tasks = JSON.parse(response.content as string);
      
      return tasks.map((task: any, index: number) => ({
        ...task,
        id: task.id || `task_${index + 1}`,
        status: 'pending' as const,
        dependencies: task.dependencies || (index === 0 ? [] : [`task_${index}`])
      }));
    } catch (error) {
      console.error('Campaign planning error:', error);
      return [{
        id: 'fallback_task',
        type: 'create',
        description: goal,
        status: 'pending',
        dependencies: [],
        agent_instructions: 'Execute the requested campaign goal'
      }];
    }
  }

  // Multi-step customer analysis
  async analyzeCustomerBase(state: CampaignState): Promise<CampaignState> {
    try {
      const segmentQuery = `
        SELECT 
          COUNT(*) as total_customers,
          COUNT(*) FILTER (WHERE opt_in_sms = true) as sms_subscribers,
          COUNT(*) FILTER (WHERE opt_in_email = true) as email_subscribers,
          COUNT(*) FILTER (WHERE visit_count > 5) as loyal_customers,
          COUNT(*) FILTER (WHERE total_spent > 100) as high_value_customers,
          COUNT(*) FILTER (WHERE last_interaction > NOW() - INTERVAL '30 days') as recent_customers,
          AVG(total_spent) as avg_spending,
          AVG(visit_count) as avg_visits
        FROM restaurant_customers 
        WHERE restaurant_id = $1
      `;
      
      const segmentResult = await executeQuery(segmentQuery, [state.restaurant_id]);
      const segments = segmentResult.data?.[0] || {};

      // Analyze customer preferences using AI
      const preferenceAnalysisPrompt = `Based on this customer data, identify key patterns and preferences for campaign targeting:

Customer Segments:
${JSON.stringify(segments, null, 2)}

Campaign Goal: ${state.goal}

Analyze and return JSON:
{
  "recommended_segments": ["segment1", "segment2"],
  "personalization_opportunities": ["opportunity1", "opportunity2"],
  "optimal_timing": "time_recommendation",
  "channel_preferences": {"email": 0.7, "sms": 0.3},
  "content_themes": ["theme1", "theme2"]
}`;

      const preferenceResponse = await this.llm.invoke(preferenceAnalysisPrompt);
      const preferences = JSON.parse(preferenceResponse.content as string);

      return {
        ...state,
        current_step: 'analysis_complete',
        steps_completed: [...state.steps_completed, 'analyze_customers'],
        customer_analysis: {
          total_customers: segments.total_customers || 0,
          segments,
          preferences
        }
      };
    } catch (error) {
      console.error('Customer analysis error:', error);
      return {
        ...state,
        current_step: 'analysis_failed'
      };
    }
  }

  // AI-powered content generation with variants
  async generateCampaignContent(state: CampaignState): Promise<CampaignState> {
    const analysis = state.customer_analysis;
    if (!analysis) {
      throw new Error('Customer analysis required before content generation');
    }

    const contentPrompt = `Create personalized campaign content for this restaurant marketing goal.

GOAL: ${state.goal}
RESTAURANT: ${state.restaurant_id}
CUSTOMER INSIGHTS: ${JSON.stringify(analysis.preferences, null, 2)}
RECOMMENDED SEGMENTS: ${analysis.preferences.recommended_segments?.join(', ')}

Create 2-3 content variants targeting different customer segments. Include:
- Personalized messaging for each segment
- Compelling subject lines (for email)
- Clear call-to-action
- Restaurant-appropriate tone

Return JSON:
{
  "variants": [
    {
      "variant_id": "variant_1",
      "target_segment": "loyal_customers",
      "subject": "email subject line",
      "content": "main message content",
      "cta": "call to action",
      "personalization_tags": ["tag1", "tag2"]
    }
  ]
}`;

    try {
      const response = await this.llm.invoke(contentPrompt);
      const contentData = JSON.parse(response.content as string);
      
      return {
        ...state,
        current_step: 'content_generated',
        steps_completed: [...state.steps_completed, 'generate_content'],
        content_variants: contentData.variants.map((variant: any, index: number) => ({
          ...variant,
          variant_id: variant.variant_id || `variant_${index + 1}`
        }))
      };
    } catch (error) {
      console.error('Content generation error:', error);
      return {
        ...state,
        current_step: 'content_generation_failed'
      };
    }
  }

  // Intelligent campaign execution with monitoring
  async executeCampaign(state: CampaignState): Promise<CampaignState> {
    if (!state.content_variants || state.content_variants.length === 0) {
      throw new Error('Content variants required for execution');
    }

    const results = {
      sent: 0,
      delivered: 0,
      failed: 0,
      errors: [] as string[]
    };

    try {
      // Get customers for each target segment
      for (const variant of state.content_variants) {
        const customerQuery = this.buildSegmentQuery(variant.target_segment, state.restaurant_id);
        const customerResult = await executeQuery(customerQuery.query, customerQuery.params);
        const customers = customerResult.data || [];

        // Execute campaign for this segment
        for (const customer of customers) {
          try {
            if (state.campaign_data.type === 'email' && customer.customer_email && customer.opt_in_email) {
              await sendEmail({
                to: customer.customer_email,
                subject: variant.subject || 'Special Offer from Lullabar',
                html: this.personalizeContent(variant.content, customer),
                from: process.env.FROM_EMAIL
              });
              results.sent++;
              results.delivered++;
            } else if (state.campaign_data.type === 'sms' && customer.customer_phone && customer.opt_in_sms) {
              await sendSMS({
                to: customer.customer_phone,
                body: this.personalizeContent(variant.content, customer)
              });
              results.sent++;
              results.delivered++;
            }

            // Log interaction
            await executeQuery(
              `INSERT INTO campaign_interactions 
               (campaign_id, customer_id, variant_id, interaction_type, status, sent_at)
               VALUES ($1, $2, $3, $4, $5, NOW())`,
              [state.campaign_id, customer.id, variant.variant_id, state.campaign_data.type, 'sent']
            );

          } catch (error: any) {
            console.error(`Failed to send to customer ${customer.id}:`, error);
            results.failed++;
            results.errors.push(`Customer ${customer.id}: ${error.message}`);
          }
        }
      }

      // Update campaign status
      await executeQuery(
        `UPDATE campaigns 
         SET status = $1, results = $2, completed_at = NOW()
         WHERE campaign_id = $3`,
        ['completed', JSON.stringify(results), state.campaign_id]
      );

      return {
        ...state,
        current_step: 'execution_complete',
        steps_completed: [...state.steps_completed, 'execute_campaign'],
        execution_results: results
      };

    } catch (error) {
      console.error('Campaign execution error:', error);
      return {
        ...state,
        current_step: 'execution_failed',
        execution_results: {
          ...results,
          errors: [...results.errors, error instanceof Error ? error.message : String(error)]
        }
      };
    }
  }

  private buildSegmentQuery(segment: string, restaurant_id: string) {
    let query = 'SELECT * FROM restaurant_customers WHERE restaurant_id = $1';
    const params = [restaurant_id];
    let paramIndex = 2;

    switch (segment) {
      case 'loyal_customers':
        query += ` AND visit_count > 5`;
        break;
      case 'high_value_customers':
        query += ` AND total_spent > 100`;
        break;
      case 'recent_customers':
        query += ` AND last_interaction > NOW() - INTERVAL '30 days'`;
        break;
      case 'sms_subscribers':
        query += ` AND opt_in_sms = true AND customer_phone IS NOT NULL`;
        break;
      case 'email_subscribers':
        query += ` AND opt_in_email = true AND customer_email IS NOT NULL`;
        break;
    }

    return { query, params };
  }

  private personalizeContent(content: string, customer: any): string {
    return content
      .replace(/\{name\}/g, customer.customer_name || 'Valued Customer')
      .replace(/\{first_name\}/g, customer.customer_name?.split(' ')[0] || 'Friend')
      .replace(/\{loyalty_points\}/g, customer.loyalty_points || '0')
      .replace(/\{visit_count\}/g, customer.visit_count || '0');
  }

  // Create LangGraph workflow for campaign execution
  async createCampaignWorkflow() {
    const workflow = new StateGraph({
      channels: {
        campaign_id: { reducer: (state: any, action: any) => action },
        restaurant_id: { reducer: (state: any, action: any) => action },
        goal: { reducer: (state: any, action: any) => action },
        current_step: { reducer: (state: any, action: any) => action },
        steps_completed: { reducer: (state: any, action: any) => action },
        steps_remaining: { reducer: (state: any, action: any) => action },
        campaign_data: { reducer: (state: any, action: any) => action },
        customer_analysis: { reducer: (state: any, action: any) => ({ ...state, ...action }) },
        content_variants: { reducer: (state: any, action: any) => [...(state || []), ...action] },
        execution_results: { reducer: (state: any, action: any) => ({ ...state, ...action }) },
        memory_context: { reducer: (state: any, action: any) => action },
        requires_approval: { reducer: (state: any, action: any) => action },
        approval_status: { reducer: (state: any, action: any) => action },
        next_actions: { reducer: (state: any, action: any) => action }
      }
    });

    workflow.addNode("analyze_customers", this.analyzeCustomerBase.bind(this));
    workflow.addNode("generate_content", this.generateCampaignContent.bind(this));
    workflow.addNode("execute_campaign", this.executeCampaign.bind(this));
    workflow.addNode("monitor_results", this.monitorCampaignResults.bind(this));

    // Conditional routing based on state
    workflow.addConditionalEdges(
      "analyze_customers",
      (state: CampaignState) => state.current_step,
      {
        "analysis_complete": "generate_content",
        "analysis_failed": END
      }
    );

    workflow.addConditionalEdges(
      "generate_content", 
      (state: CampaignState) => state.requires_approval ? "approval_required" : "execute_campaign",
      {
        "execute_campaign": "execute_campaign",
        "approval_required": END
      }
    );

    workflow.addEdge("execute_campaign", "monitor_results");
    workflow.addEdge("monitor_results", END);

    workflow.setEntryPoint("analyze_customers");

    return workflow.compile();
  }

  async monitorCampaignResults(state: CampaignState): Promise<CampaignState> {
    // AI-powered performance analysis
    const analysisPrompt = `Analyze this campaign performance and provide insights:

Campaign Goal: ${state.goal}
Execution Results: ${JSON.stringify(state.execution_results, null, 2)}
Content Variants: ${state.content_variants?.length || 0}

Provide analysis and recommendations:
{
  "performance_summary": "overall assessment",
  "success_metrics": ["metric1", "metric2"],
  "areas_for_improvement": ["improvement1", "improvement2"],
  "next_campaign_recommendations": ["recommendation1", "recommendation2"]
}`;

    try {
      const response = await this.llm.invoke(analysisPrompt);
      const analysis = JSON.parse(response.content as string);

      return {
        ...state,
        current_step: 'monitoring_complete',
        steps_completed: [...state.steps_completed, 'monitor_results'],
        next_actions: analysis.next_campaign_recommendations
      };
    } catch (error) {
      console.error('Results monitoring error:', error);
      return {
        ...state,
        current_step: 'monitoring_failed'
      };
    }
  }
}

const campaignOrchestrator = new CampaignOrchestrator();

// Main API handlers
export async function createAdvancedCampaign(campaignData: {
  restaurant_id: string;
  goal: string;
  campaign_type: 'email' | 'sms' | 'multi_channel';
  target_segments?: string[];
  memory_context?: any;
}) {
  try {
    const campaign_id = `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Initialize campaign state
    const initialState: CampaignState = {
      campaign_id,
      restaurant_id: campaignData.restaurant_id,
      goal: campaignData.goal,
      current_step: 'initializing',
      steps_completed: [],
      steps_remaining: ['analyze_customers', 'generate_content', 'execute_campaign', 'monitor_results'],
      campaign_data: {
        type: campaignData.campaign_type,
        target_segments: campaignData.target_segments || []
      },
      memory_context: campaignData.memory_context,
      requires_approval: false,
      approval_status: 'approved'
    };

    // Store in database
    await executeQuery(
      `INSERT INTO campaigns 
       (campaign_id, restaurant_id, campaign_type, status, target_segments, content, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        campaign_id,
        campaignData.restaurant_id,
        campaignData.campaign_type,
        'running',
        JSON.stringify(campaignData.target_segments || []),
        JSON.stringify({ goal: campaignData.goal })
      ]
    );

    // Execute workflow
    const workflow = await campaignOrchestrator.createCampaignWorkflow();
    const result = await workflow.invoke(initialState);

    return { success: true, campaign: result };
  } catch (error: any) {
    console.error('Advanced campaign creation error:', error);
    return { success: false, error: error.message };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, ...data } = await request.json();
    
    switch (action) {
      case 'create_advanced_campaign':
        return NextResponse.json(await createAdvancedCampaign(data));
      
      case 'get_campaign_status':
        const campaign = campaignOrchestrator.activeWorkflows.get(data.campaign_id);
        return NextResponse.json({ 
          success: true, 
          campaign: campaign || null 
        });
      
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' }, 
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Campaigns API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}