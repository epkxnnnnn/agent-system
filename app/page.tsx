import { ChatWindow } from "@/components/ChatWindow";
import { GuideInfoBox } from "@/components/guide/GuideInfoBox";

export default function Home() {
  const InfoCard = (
    <GuideInfoBox>
      <ul>
        <li className="text-l">
          🍜
          <span className="ml-2">
            Welcome to <strong>Lullabar AI Assistant</strong> - a multi-agent restaurant management system powered by{" "}
            <a href="https://js.langchain.com/" target="_blank">
              LangChain.js
            </a>{" "}
            and{" "}
            <a href="https://sdk.vercel.ai/docs" target="_blank">
              Vercel AI SDK
            </a>
          </span>
        </li>
        <li className="text-l">
          🤖
          <span className="ml-2">
            Our system includes specialized agents for <strong>CRM</strong>, <strong>Campaigns</strong>, 
            <strong> Voice</strong>, <strong>Restaurant Operations</strong>, and an <strong>Orchestrator</strong> 
            that coordinates complex multi-step workflows.
          </span>
        </li>
        <li className="text-l">
          🧠
          <span className="ml-2">
            Features agent-gpt style memory, task decomposition, and goal-driven planning. 
            Each conversation is remembered and agents work together to handle complex requests.
          </span>
        </li>
        <li className="hidden text-l md:block">
          💻
          <span className="ml-2">
            The agent orchestration logic is in{" "}
            <code>lib/agentOrchestrator.ts</code> and streaming chat in{" "}
            <code>app/api/chat/route.ts</code>.
          </span>
        </li>
        <li className="text-l">
          👇
          <span className="ml-2">
            Try asking: <code>Create a marketing campaign for loyal customers</code> or{" "}
            <code>Show me today&apos;s reservations</code> or{" "}
            <code>Analyze customer segments and suggest promotions</code>
          </span>
        </li>
        <li className="text-l">
          🔗
          <span className="ml-2">
            Visit <code>/dashboard</code> for the admin interface with analytics and campaign management.
          </span>
        </li>
      </ul>
    </GuideInfoBox>
  );

  return (
    <ChatWindow
      endpoint="api/chat"
      emoji="🍜"
      placeholder="Ask about reservations, campaigns, customer management, or any restaurant operations..."
      emptyStateComponent={InfoCard}
    />
  );
}