'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// Temporarily simplified to debug issues
// import { 
//   Users, 
//   MessageSquare, 
//   Mail, 
//   Phone, 
//   Calendar, 
//   BarChart3,
//   Brain,
//   Activity,
//   Clock,
//   TrendingUp,
//   Settings
// } from 'lucide-react';

interface DashboardStats {
  activeAgents: number;
  totalSessions: number;
  tasksInProgress: number;
  memoryEntries: number;
  campaignsActive: number;
  avgResponseTime: number;
}

interface AgentStatus {
  name: string;
  type: string;
  status: 'active' | 'idle' | 'busy';
  lastUsed: Date;
  successRate: number;
  tasksCompleted: number;
}

interface MemoryEntry {
  session_id: string;
  facts: number;
  preferences: number;
  goals: number;
  lastActivity: Date;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    activeAgents: 6,
    totalSessions: 23,
    tasksInProgress: 4,
    memoryEntries: 156,
    campaignsActive: 2,
    avgResponseTime: 1.2
  });

  const [agentStatuses] = useState<AgentStatus[]>([
    {
      name: 'Orchestrator',
      type: 'orchestrator',
      status: 'active',
      lastUsed: new Date(),
      successRate: 95,
      tasksCompleted: 12
    },
    {
      name: 'CRM Agent',
      type: 'crm',
      status: 'idle',
      lastUsed: new Date(Date.now() - 300000),
      successRate: 98,
      tasksCompleted: 45
    },
    {
      name: 'Campaign Agent',
      type: 'campaigns',
      status: 'busy',
      lastUsed: new Date(Date.now() - 60000),
      successRate: 92,
      tasksCompleted: 8
    },
    {
      name: 'Voice Agent',
      type: 'voice',
      status: 'idle',
      lastUsed: new Date(Date.now() - 1800000),
      successRate: 89,
      tasksCompleted: 23
    },
    {
      name: 'Restaurant Agent',
      type: 'postgres',
      status: 'active',
      lastUsed: new Date(Date.now() - 30000),
      successRate: 96,
      tasksCompleted: 67
    },
    {
      name: 'Tools Agent',
      type: 'tools',
      status: 'idle',
      lastUsed: new Date(Date.now() - 900000),
      successRate: 94,
      tasksCompleted: 34
    }
  ]);

  const [memoryData] = useState<MemoryEntry[]>([
    {
      session_id: 'session_123',
      facts: 12,
      preferences: 5,
      goals: 2,
      lastActivity: new Date()
    },
    {
      session_id: 'session_456',
      facts: 8,
      preferences: 3,
      goals: 1,
      lastActivity: new Date(Date.now() - 300000)
    }
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'busy': return 'bg-yellow-500';
      case 'idle': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getAgentIcon = (type: string) => {
    switch (type) {
      case 'orchestrator': return <span className="text-lg">🧠</span>;
      case 'crm': return <span className="text-lg">👥</span>;
      case 'campaigns': return <span className="text-lg">📧</span>;
      case 'voice': return <span className="text-lg">📞</span>;
      case 'postgres': return <span className="text-lg">📅</span>;
      case 'tools': return <span className="text-lg">⚙️</span>;
      default: return <span className="text-lg">💬</span>;
    }
  };

  const formatTimeAgo = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🍜 Restaurant AI Dashboard
          </h1>
          <p className="text-gray-600">
            Multi-agent orchestration system with memory & task management
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <span className="text-2xl">🧠</span>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Active Agents</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeAgents}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <span className="text-2xl">💬</span>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Sessions</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalSessions}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <span className="text-2xl">⚡</span>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Tasks Running</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.tasksInProgress}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <span className="text-2xl">📊</span>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Memory Entries</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.memoryEntries}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <span className="text-2xl">📧</span>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Campaigns</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.campaignsActive}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <span className="text-2xl">⏱️</span>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Avg Response</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.avgResponseTime}s</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="agents" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="agents">Agent Status</TabsTrigger>
            <TabsTrigger value="memory">Memory System</TabsTrigger>
            <TabsTrigger value="workflows">Workflows</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Agent Status Tab */}
          <TabsContent value="agents">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {agentStatuses.map((agent) => (
                <Card key={agent.name}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getAgentIcon(agent.type)}
                        <CardTitle className="text-lg">{agent.name}</CardTitle>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(agent.status)}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Status:</span>
                        <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                          {agent.status}
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Last Used:</span>
                        <span>{formatTimeAgo(agent.lastUsed)}</span>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Success Rate:</span>
                        <span className="font-medium">{agent.successRate}%</span>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tasks Completed:</span>
                        <span className="font-medium">{agent.tasksCompleted}</span>
                      </div>

                      <div className="pt-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${agent.successRate}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Memory System Tab */}
          <TabsContent value="memory">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Active Sessions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {memoryData.map((session) => (
                      <div key={session.session_id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {session.session_id}
                          </code>
                          <span className="text-sm text-gray-500">
                            {formatTimeAgo(session.lastActivity)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div className="text-center">
                            <div className="font-semibold text-blue-600">{session.facts}</div>
                            <div className="text-gray-600">Facts</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-green-600">{session.preferences}</div>
                            <div className="text-gray-600">Preferences</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-purple-600">{session.goals}</div>
                            <div className="text-gray-600">Goals</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Memory Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                      <span className="font-medium">Total Facts Stored</span>
                      <span className="text-xl font-bold text-blue-600">342</span>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                      <span className="font-medium">User Preferences</span>
                      <span className="text-xl font-bold text-green-600">89</span>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-purple-50 rounded">
                      <span className="font-medium">Active Goals</span>
                      <span className="text-xl font-bold text-purple-600">15</span>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-orange-50 rounded">
                      <span className="font-medium">Conversation History</span>
                      <span className="text-xl font-bold text-orange-600">1,234</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Workflows Tab */}
          <TabsContent value="workflows">
            <Card>
              <CardHeader>
                <CardTitle>Active Workflows & Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold">Multi-Channel Campaign Creation</h4>
                        <p className="text-sm text-gray-600">Orchestrator → CRM → Campaigns</p>
                      </div>
                      <Badge variant="default">In Progress</Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span>Customer analysis completed</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span>Content generation completed</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                        <span>Awaiting campaign execution approval</span>
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold">Customer Segmentation Analysis</h4>
                        <p className="text-sm text-gray-600">CRM Agent</p>
                      </div>
                      <Badge variant="secondary">Completed</Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span>Analyzed 1,234 customer records</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span>Generated 5 customer segments</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Agent Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {agentStatuses.map((agent) => (
                      <div key={agent.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getAgentIcon(agent.type)}
                          <span className="font-medium">{agent.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">{agent.successRate}%</span>
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full" 
                              style={{ width: `${agent.successRate}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Response Time</span>
                      <div className="flex items-center gap-2">
                        <span className="text-green-500">📈</span>
                        <span className="text-green-600 font-semibold">Excellent</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Memory Usage</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-500 h-2 rounded-full w-3/4" />
                        </div>
                        <span className="text-sm text-gray-600">75%</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="font-medium">API Health</span>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span className="text-green-600 font-semibold">Healthy</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" size="sm">
                💬 Start New Chat Session
              </Button>
              <Button variant="outline" size="sm">
                ⚙️ Configure Agents
              </Button>
              <Button variant="outline" size="sm">
                📊 Export Analytics
              </Button>
              <Button variant="outline" size="sm">
                🧠 Clear Memory Cache
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}