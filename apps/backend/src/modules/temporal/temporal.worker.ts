import { Provider } from '@nestjs/common';
import { Worker } from '@temporalio/worker';
import { ConfigService } from '@nestjs/config';

export const TEMPORAL_WORKER = 'TEMPORAL_WORKER';

export const TemporalWorkerProvider: Provider = {
  provide: TEMPORAL_WORKER,
  useFactory: async (configService: ConfigService): Promise<Worker> => {
    const workflowsPath = require.resolve('./workflows');
    const activities = require('./activities');

    return await Worker.create({
      workflowsPath,
      activities,
      taskQueue: configService.get('TEMPORAL_TASK_QUEUE') || 'accu-workflows',
      maxConcurrentWorkflowTaskPollers: configService.get('TEMPORAL_MAX_CONCURRENT_WORKFLOW_POLLERS') || 2,
      maxConcurrentActivityTaskPollers: configService.get('TEMPORAL_MAX_CONCURRENT_ACTIVITY_POLLERS') || 2,
      maxConcurrentWorkflowTaskExecutions: configService.get('TEMPORAL_MAX_CONCURRENT_WORKFLOW_EXECUTIONS') || 100,
      maxConcurrentActivityTaskExecutions: configService.get('TEMPORAL_MAX_CONCURRENT_ACTIVITY_EXECUTIONS') || 100,
    });
  },
  inject: [ConfigService],
};