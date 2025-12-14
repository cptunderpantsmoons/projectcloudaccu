'use client';

import { useState, useEffect } from 'react';
import { WorkflowDashboard } from '@/components/workflow/WorkflowDashboard';
import { WorkflowAction } from '@/types/workflow';

export default function WorkflowsPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleWorkflowAction = async (workflowId: string, action: WorkflowAction) => {
    try {
      // This would make actual API calls to the backend
      const response = await fetch(`/api/workflows/${workflowId}/actions/${action.name}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          reason: action.requiresConfirmation ? `Action: ${action.label}` : undefined,
        }),
      });

      if (response.ok) {
        // Show success notification
        console.log(`Action ${action.name} performed successfully`);
      } else {
        // Show error notification
        console.error(`Failed to perform action ${action.name}`);
      }
    } catch (error) {
      console.error('Error performing workflow action:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Trigger refresh of dashboard data
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <WorkflowDashboard 
        onWorkflowAction={handleWorkflowAction}
        onRefresh={handleRefresh}
      />
    </div>
  );
}