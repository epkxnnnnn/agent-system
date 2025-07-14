#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const envPath = path.join(__dirname, '..', '.env');
const mergedEnvPath = path.join(__dirname, '..', '.env.merged.raw');

console.log('🍽️  Restaurant AI Agents - Environment Setup\n');

// Check if .env.merged.raw exists
if (fs.existsSync(mergedEnvPath)) {
  console.log('✅ Found .env.merged.raw with production credentials\n');
  
  rl.question('Would you like to copy production credentials to .env? (y/n): ', (answer) => {
    if (answer.toLowerCase() === 'y') {
      // Read merged env file
      const mergedContent = fs.readFileSync(mergedEnvPath, 'utf8');
      const mergedVars = {};
      
      mergedContent.split('\n').forEach(line => {
        if (line && !line.startsWith('#')) {
          const [key, ...valueParts] = line.split('=');
          if (key && valueParts.length > 0) {
            mergedVars[key.trim()] = valueParts.join('=').trim();
          }
        }
      });
      
      // Key mappings from .env.merged.raw to .env
      const keyMappings = {
        'OPENAI_API_KEY': 'OPENAI_API_KEY',
        'DATABASE_URL': 'DATABASE_URL',
        'TWILIO_ACCOUNT_SID': 'TWILIO_ACCOUNT_SID',
        'TWILIO_AUTH_TOKEN': 'TWILIO_AUTH_TOKEN',
        'TWILIO_PHONE_NUMBER_LULLABAR': 'TWILIO_PHONE_NUMBER',
        'RESEND_API_KEY': 'RESEND_API_KEY',
        'NEXT_PUBLIC_SUPABASE_URL': 'SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY': 'SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY': 'SUPABASE_PRIVATE_KEY'
      };
      
      // Build new .env content
      let envContent = `# Restaurant AI Agents Environment Configuration
# Generated from .env.merged.raw on ${new Date().toISOString()}

# OpenAI Configuration
OPENAI_API_KEY=${mergedVars['OPENAI_API_KEY'] || 'your_openai_api_key_here'}

# Database Configuration
DATABASE_URL=${mergedVars['DATABASE_URL'] || 'postgresql://username:password@localhost:5432/restaurant_agents'}

# Twilio Configuration
TWILIO_ACCOUNT_SID=${mergedVars['TWILIO_ACCOUNT_SID'] || 'your_twilio_account_sid'}
TWILIO_AUTH_TOKEN=${mergedVars['TWILIO_AUTH_TOKEN'] || 'your_twilio_auth_token'}
TWILIO_PHONE_NUMBER=${mergedVars['TWILIO_PHONE_NUMBER_LULLABAR'] || '+1234567890'}

# Email Configuration
RESEND_API_KEY=${mergedVars['RESEND_API_KEY'] || 'your_resend_api_key'}
FROM_EMAIL=${mergedVars['FROM_EMAIL'] || 'noreply@lullabar.com'}

# Supabase Configuration
SUPABASE_URL=${mergedVars['NEXT_PUBLIC_SUPABASE_URL'] || 'https://your-project.supabase.co'}
SUPABASE_ANON_KEY=${mergedVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || 'your_supabase_anon_key'}
SUPABASE_PRIVATE_KEY=${mergedVars['SUPABASE_SERVICE_ROLE_KEY'] || 'your_supabase_private_key'}

# Application Configuration
VERCEL_URL=http://localhost:3000
NODE_ENV=development

# LangChain Configuration
LANGCHAIN_CALLBACKS_BACKGROUND=false
LANGCHAIN_TRACING_V2=${mergedVars['LANGCHAIN_TRACING_V2'] || 'true'}
LANGCHAIN_API_KEY=${mergedVars['LANGCHAIN_API_KEY'] || 'your_langchain_api_key'}
LANGCHAIN_PROJECT=restaurant-agents

# Feature Flags
ENABLE_MEMORY_PERSISTENCE=true
ENABLE_TASK_ORCHESTRATION=true
ENABLE_MULTI_STEP_WORKFLOWS=true

# Demo Mode
DEMO_MODE=false
`;
      
      // Write the new .env file
      fs.writeFileSync(envPath, envContent);
      console.log('\n✅ Successfully created .env file with production credentials!');
      console.log('\n⚠️  Remember to keep your .env file secure and never commit it to git.');
      
    } else {
      console.log('\n📝 You can manually copy credentials from .env.merged.raw to .env');
    }
    
    console.log('\n🚀 Next steps:');
    console.log('1. Review your .env file and ensure all credentials are correct');
    console.log('2. Run: pnpm install');
    console.log('3. Run: pnpm dev');
    console.log('4. Open http://localhost:3000');
    
    rl.close();
  });
} else {
  console.log('⚠️  No .env.merged.raw file found.');
  console.log('\n📝 Please manually configure your .env file with:');
  console.log('- OpenAI API key');
  console.log('- PostgreSQL database URL');
  console.log('- Twilio credentials (for voice/SMS)');
  console.log('- Resend API key (for email)');
  console.log('- Supabase credentials (optional)');
  
  rl.close();
}