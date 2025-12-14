import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { WorkflowState, WorkflowAction } from '@/types/workflow';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Play, 
  Pause, 
  Square,
  FileText,
  Calendar,
  Settings
} from 'lucide-react';

interface WorkflowStatusCardProps {
  workflow: WorkflowState;
  availableActions: WorkflowAction[];
  onActionClick: (action: WorkflowAction) => void;
  isLoading?: boolean;
}

const statusConfig = {
  running: { color: 'bg-blue-500', icon: Play, label: 'Running' },
  completed: { color: 'bg-green-500', icon: CheckCircle, label: 'Completed' },
  failed: { color: 'bg-red-500', icon: XCircle, label: 'Failed' },
  terminated: { color: 'bg-gray-500', icon: Square, label: 'Terminated' },
  cancelled: { color: 'bg-gray-400', icon: Square, label: 'Cancelled' },
};

const typeConfig = {
  accu_application: { icon: FileText, label: 'ACCU Application' },
  project: { icon: Settings, label: 'Project' },
  document: { icon: FileText, label: 'Document' },
  calendar: { icon: Calendar, label: 'Calendar' },
};

export function WorkflowStatusCard({ 
  workflow, 
  availableActions, 
  onActionClick, 
  isLoading = false 
}: WorkflowStatusCardProps) {
  const statusInfo = statusConfig[workflow.status];
  const typeInfo = typeConfig[workflow.type];
  
  const StatusIcon = statusInfo.icon;
  const TypeIcon = typeInfo.icon;

  const formatDuration = (start: Date, end?: Date) => {
    const startTime = new Date(start);
    const endTime = end ? new Date(end) : new Date();
    const duration = endTime.getTime() - startTime.getTime();
    
    const days = Math.floor(duration / (1000 * 60 * 60 * 24));
    const hours = Math.floor((duration % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getProgressPercentage = () => {
    if (workflow.status === 'completed') return 100;
    if (workflow.status === 'failed' || workflow.status === 'terminated' || workflow.status === 'cancelled') return workflow.progress;
    return workflow.progress;
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-gray-100">
              <TypeIcon className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {typeInfo.label} Workflow
              </CardTitle>
              <p className="text-sm text-gray-500">
                ID: {workflow.workflowId}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge 
              variant="outline" 
              className={`${statusInfo.color} text-white border-0`}
            >
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusInfo.label}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{getProgressPercentage()}%</span>
          </div>
          <Progress value={getProgressPercentage()} className="h-2" />
        </div>

        {/* Current Step */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm font-medium">Current Step</p>
            <p className="text-sm text-gray-600">{workflow.currentStep}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Duration</p>
            <p className="text-sm font-medium">
              <Clock className="h-3 w-3 inline mr-1" />
              {formatDuration(workflow.startTime, workflow.closeTime)}
            </p>
          </div>
        </div>

        {/* Type-specific Information */}
        {workflow.type === 'accu_application' && (
          <div className="grid grid-cols-2 gap-4 p-3 bg-blue-50 rounded-lg">
            <div>
              <p className="text-xs text-gray-500">Status</p>
              <p className="text-sm font-medium">
                {(workflow as any).currentStatus?.replace('_', ' ').toUpperCase()}
              </p>
            </div>
            {(workflow as any).deadlineDate && (
              <div>
                <p className="text-xs text-gray-500">Deadline</p>
                <p className="text-sm font-medium">
                  {new Date((workflow as any).deadlineDate).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        )}

        {workflow.type === 'project' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 p-3 bg-green-50 rounded-lg">
              <div>
                <p className="text-xs text-gray-500">Phase</p>
                <p className="text-sm font-medium">
                  {(workflow as any).currentPhase?.replace('_', ' ').toUpperCase()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Progress</p>
                <p className="text-sm font-medium">
                  {(workflow as any).progressMetrics?.completionPercentage || 0}%
                </p>
              </div>
            </div>
            {(workflow as any).milestones && (
              <div>
                <p className="text-sm font-medium mb-2">Milestones</p>
                <div className="space-y-1">
                  {(workflow as any).milestones.slice(0, 3).map((milestone: any) => (
                    <div key={milestone.id} className="flex items-center justify-between text-xs">
                      <span className="truncate">{milestone.name}</span>
                      <Badge 
                        variant="outline" 
                        className={
                          milestone.status === 'completed' ? 'text-green-600' :
                          milestone.status === 'overdue' ? 'text-red-600' :
                          'text-yellow-600'
                        }
                      >
                        {milestone.status}
                      </Badge>
                    </div>
                  ))}
                  {(workflow as any).milestones.length > 3 && (
                    <p className="text-xs text-gray-500">
                      +{(workflow as any).milestones.length - 3} more milestones
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {workflow.type === 'document' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 p-3 bg-purple-50 rounded-lg">
              <div>
                <p className="text-xs text-gray-500">Version</p>
                <p className="text-sm font-medium">v{(workflow as any).version}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Security Scan</p>
                <Badge 
                  variant="outline" 
                  className={
                    (workflow as any).securityScan?.status === 'passed' ? 'text-green-600' :
                    (workflow as any).securityScan?.status === 'failed' ? 'text-red-600' :
                    'text-yellow-600'
                  }
                >
                  {(workflow as any).securityScan?.status || 'pending'}
                </Badge>
              </div>
            </div>
            {(workflow as any).reviewProcess?.assignedReviewerId && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium">Review Status</p>
                <p className="text-xs text-gray-600">
                  Assigned to: {(workflow as any).reviewProcess.assignedReviewerId}
                </p>
              </div>
            )}
          </div>
        )}

        {workflow.type === 'calendar' && (
          <div className="space-y-3">
            <div className="p-3 bg-orange-50 rounded-lg">
              <p className="text-sm font-medium">Active Deadlines</p>
              <p className="text-xs text-gray-600">
                {(workflow as any).deadlines?.filter((d: any) => d.status === 'pending').length || 0} pending
              </p>
            </div>
            {(workflow as any).deadlines?.slice(0, 2).map((deadline: any) => (
              <div key={deadline.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div>
                  <p className="text-xs font-medium">{deadline.title}</p>
                  <p className="text-xs text-gray-500">
                    Due: {new Date(deadline.dueDate).toLocaleDateString()}
                  </p>
                </div>
                <Badge 
                  variant="outline" 
                  className={
                    deadline.priority === 'critical' ? 'text-red-600' :
                    deadline.priority === 'high' ? 'text-orange-600' :
                    deadline.priority === 'medium' ? 'text-yellow-600' :
                    'text-green-600'
                  }
                >
                  {deadline.priority}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* Available Actions */}
        {availableActions.length > 0 && workflow.status === 'running' && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">Available Actions</p>
            <div className="flex flex-wrap gap-2">
              {availableActions.map((action) => (
                <Button
                  key={action.name}
                  variant={action.color === 'primary' ? 'default' : 'outline'}
                  size="sm"
                  disabled={action.disabled || isLoading}
                  onClick={() => onActionClick(action)}
                  className={
                    action.color === 'success' ? 'bg-green-600 hover:bg-green-700' :
                    action.color === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700' :
                    action.color === 'danger' ? 'bg-red-600 hover:bg-red-700' :
                    ''
                  }
                >
                  {action.icon && <action.icon className="h-3 w-3 mr-1" />}
                  {action.label}
                </Button>
              ))}
            </div>
            {availableActions.some(a => a.requiresConfirmation) && (
              <p className="text-xs text-gray-500 mt-2">
                Some actions require confirmation
              </p>
            )}
          </div>
        )}

        {/* History Preview */}
        {workflow.history && workflow.history.length > 0 && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">Recent Activity</p>
            <div className="space-y-2">
              {workflow.history.slice(-3).map((entry, index) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-gray-300" />
                    <span className="text-gray-600">{entry.action.replace('_', ' ')}</span>
                  </div>
                  <span className="text-gray-400">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}