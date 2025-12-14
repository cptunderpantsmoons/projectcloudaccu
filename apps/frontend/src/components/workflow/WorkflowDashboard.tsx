import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WorkflowMetrics, WorkflowState, WorkflowAction } from '@/types/workflow';
import { WorkflowStatusCard } from './WorkflowStatusCard';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Settings,
  BarChart3
} from 'lucide-react';

interface WorkflowDashboardProps {
  onWorkflowAction: (workflowId: string, action: WorkflowAction) => void;
  onRefresh: () => void;
}

export function WorkflowDashboard({ onWorkflowAction, onRefresh }: WorkflowDashboardProps) {
  const [metrics, setMetrics] = useState<WorkflowMetrics | null>(null);
  const [recentWorkflows, setRecentWorkflows] = useState<WorkflowState[]>([]);
  const [failedWorkflows, setFailedWorkflows] = useState<WorkflowState[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    loadDashboardData();
    // Set up real-time updates
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // This would be actual API calls
      // const metricsResponse = await fetch('/api/workflows/metrics');
      // const workflowsResponse = await fetch('/api/workflows/list?limit=10');
      // const failedResponse = await fetch('/api/workflows/failed');
      
      // Mock data for demonstration
      setMetrics({
        totalWorkflows: 156,
        runningWorkflows: 23,
        completedWorkflows: 128,
        failedWorkflows: 5,
        terminatedWorkflows: 0,
        averageExecutionTime: 45 * 60 * 1000, // 45 minutes in milliseconds
        workflowTypes: {
          'accu_application': 45,
          'project': 38,
          'document': 52,
          'calendar': 21,
        },
        statusDistribution: {
          'running': 23,
          'completed': 128,
          'failed': 5,
          'terminated': 0,
        },
      });

      setRecentWorkflows([
        {
          workflowId: 'accu-app-123',
          type: 'accu_application',
          status: 'running',
          currentStep: 'Under Review',
          progress: 75,
          startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
          history: [],
          metadata: { currentStatus: 'under_review', deadlineDate: new Date() },
        },
        {
          workflowId: 'project-456',
          type: 'project',
          status: 'running',
          currentStep: 'Execution Phase',
          progress: 60,
          startTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          history: [],
          metadata: { currentPhase: 'execution' },
        },
        {
          workflowId: 'doc-789',
          type: 'document',
          status: 'completed',
          currentStep: 'Published',
          progress: 100,
          startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
          closeTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
          history: [],
          metadata: { version: 1 },
        },
      ]);

      setFailedWorkflows([
        {
          workflowId: 'accu-app-999',
          type: 'accu_application',
          status: 'failed',
          currentStep: 'Error in Approval',
          progress: 80,
          startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
          history: [],
          metadata: { error: 'Database connection timeout' },
        },
      ]);

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWorkflowAction = (workflowId: string, action: WorkflowAction) => {
    onWorkflowAction(workflowId, action);
    // Refresh after action
    setTimeout(loadDashboardData, 1000);
  };

  const formatDuration = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  const getSuccessRate = () => {
    if (!metrics) return 0;
    const total = metrics.totalWorkflows;
    const successful = metrics.completedWorkflows;
    return total > 0 ? Math.round((successful / total) * 100) : 0;
  };

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">Loading workflow dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflow Dashboard</h1>
          <p className="text-gray-600">
            Monitor and manage business process workflows
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <p className="text-sm text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
          <Button 
            onClick={() => { onRefresh(); loadDashboardData(); }}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Workflows</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalWorkflows}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{getSuccessRate()}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics.completedWorkflows} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Running</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{metrics.runningWorkflows}</div>
            <p className="text-xs text-muted-foreground">
              Avg: {formatDuration(metrics.averageExecutionTime)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics.failedWorkflows}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.failedWorkflows > 0 ? 'Requires attention' : 'All good'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Workflow Types Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Workflow Types Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(metrics.workflowTypes).map(([type, count]) => (
              <div key={type} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{count}</div>
                <div className="text-sm text-gray-600 capitalize">
                  {type.replace('_', ' ')} Workflows
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Failed Workflows Alert */}
      {failedWorkflows.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Failed Workflows ({failedWorkflows.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {failedWorkflows.map((workflow) => (
                <div key={workflow.workflowId} className="flex items-center justify-between p-3 bg-white rounded border">
                  <div>
                    <p className="font-medium">{workflow.workflowId}</p>
                    <p className="text-sm text-gray-600">{workflow.currentStep}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="destructive">Failed</Badge>
                    <Button size="sm" variant="outline">
                      Retry
                    </Button>
                    <Button size="sm" variant="outline">
                      Escalate
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Workflows */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Workflows</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentWorkflows.map((workflow) => {
              // Mock available actions based on workflow type and status
              const getAvailableActions = (workflow: WorkflowState): WorkflowAction[] => {
                const actions: WorkflowAction[] = [];
                
                if (workflow.status === 'running') {
                  if (workflow.type === 'accu_application') {
                    actions.push(
                      { name: 'approve', label: 'Approve', color: 'success' },
                      { name: 'reject', label: 'Reject', color: 'danger', requiresConfirmation: true }
                    );
                  } else if (workflow.type === 'project') {
                    actions.push(
                      { name: 'pause', label: 'Pause', color: 'warning' },
                      { name: 'complete', label: 'Complete', color: 'success' }
                    );
                  } else if (workflow.type === 'document') {
                    actions.push(
                      { name: 'approve', label: 'Approve', color: 'success' },
                      { name: 'request_revision', label: 'Request Revision', color: 'warning' }
                    );
                  }
                }
                
                if (workflow.status === 'failed') {
                  actions.push(
                    { name: 'retry', label: 'Retry', color: 'primary' },
                    { name: 'escalate', label: 'Escalate', color: 'warning' }
                  );
                }
                
                return actions;
              };

              return (
                <WorkflowStatusCard
                  key={workflow.workflowId}
                  workflow={workflow}
                  availableActions={getAvailableActions(workflow)}
                  onActionClick={(action) => handleWorkflowAction(workflow.workflowId, action)}
                  isLoading={isLoading}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}