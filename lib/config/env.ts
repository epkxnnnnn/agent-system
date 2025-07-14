/**
 * Centralized environment configuration
 * Maps environment variables and provides defaults
 */

export const env = {
  // OpenAI
  openai: {
    apiKey: process.env.OPENAI_API_KEY!,
  },
  
  // Database
  database: {
    url: process.env.DATABASE_URL || process.env.POSTGRES_URL!,
    host: process.env.DATABASE_HOST || process.env.POSTGRES_HOST,
    port: parseInt(process.env.DATABASE_PORT || process.env.POSTGRES_PORT || '5432'),
    name: process.env.DATABASE_NAME || process.env.POSTGRES_DB,
    user: process.env.DATABASE_USER || process.env.POSTGRES_USER,
    password: process.env.DATABASE_PASSWORD || process.env.POSTGRES_PASSWORD,
  },
  
  // Twilio
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID!,
    authToken: process.env.TWILIO_AUTH_TOKEN!,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER!,
    phoneNumbers: {
      lullabar: process.env.TWILIO_NUMBER_LULLABAR || process.env.TWILIO_PHONE_NUMBER,
      daikonBasil: process.env.TWILIO_NUMBER_DAIKON_BASIL,
      koloaAlisa: process.env.TWILIO_NUMBER_KOLOA_ALISA,
      reppro: process.env.TWILIO_NUMBER_REPPRO,
    }
  },
  
  // Email (Resend)
  email: {
    resendApiKey: process.env.RESEND_API_KEY!,
    fromEmail: process.env.FROM_EMAIL || process.env.RESEND_FROM_EMAIL || 'noreply@restaurant.com',
    sendgridApiKey: process.env.SENDGRID_API_KEY,
    sendgridFromEmail: process.env.SENDGRID_FROM_EMAIL,
  },
  
  // Supabase
  supabase: {
    url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceKey: process.env.SUPABASE_PRIVATE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!,
  },
  
  // Application
  app: {
    url: process.env.VERCEL_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    nodeEnv: process.env.NODE_ENV || 'development',
    isDevelopment: process.env.NODE_ENV !== 'production',
    isProduction: process.env.NODE_ENV === 'production',
  },
  
  // LangChain
  langchain: {
    tracingV2: process.env.LANGCHAIN_TRACING_V2 === 'true',
    apiKey: process.env.LANGCHAIN_API_KEY,
    project: process.env.LANGCHAIN_PROJECT || 'restaurant-agents',
    callbacksBackground: process.env.LANGCHAIN_CALLBACKS_BACKGROUND !== 'false',
  },
  
  // Restaurant defaults
  restaurant: {
    defaultId: process.env.DEFAULT_RESTAURANT_ID || 'lullabar',
    defaultPhone: process.env.DEFAULT_BUSINESS_PHONE || process.env.TWILIO_PHONE_NUMBER,
    defaultName: process.env.DEFAULT_BUSINESS_NAME || 'Restaurant',
  },
  
  // Feature flags
  features: {
    memoryPersistence: process.env.ENABLE_MEMORY_PERSISTENCE !== 'false',
    taskOrchestration: process.env.ENABLE_TASK_ORCHESTRATION !== 'false',
    multiStepWorkflows: process.env.ENABLE_MULTI_STEP_WORKFLOWS !== 'false',
    voiceAgent: process.env.ENABLE_VOICE_AGENT !== 'false',
    campaigns: process.env.ENABLE_CAMPAIGNS !== 'false',
    crm: process.env.ENABLE_CRM !== 'false',
    analytics: process.env.ENABLE_ANALYTICS !== 'false',
  },
  
  // Optional services
  services: {
    serpApiKey: process.env.SERPAPI_API_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    elevenLabsApiKey: process.env.ELEVENLABS_API_KEY,
    googleApiKey: process.env.GOOGLE_API_KEY,
    openRouterApiKey: process.env.OPENROUTER_API_KEY,
  },
  
  // Demo mode
  demoMode: process.env.DEMO_MODE === 'true' || process.env.NEXT_PUBLIC_DEMO === 'true',
};

// Type exports for better TypeScript support
export type AppConfig = typeof env;