import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { Client } from '@temporalio/client';
import { Worker } from '@temporalio/worker';

@Injectable()
export class TemporalService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TemporalService.name);
  private client: Client;
  private worker: Worker;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.initializeTemporal();
  }

  async onModuleDestroy() {
    await this.cleanup();
  }

  private async initializeTemporal() {
    try {
      // Initialize Temporal client
      this.client = new Client({
        address: this.configService.get('TEMPORAL_ADDRESS') || 'localhost:7233',
        namespace: this.configService.get('TEMPORAL_NAMESPACE') || 'default',
      });

      this.logger.log('Temporal client initialized successfully');

      // Initialize Temporal worker
      this.worker = await Worker.create({
        workflowsPath: require.resolve('./workflows'),
        activities: require('./activities'),
      });

      this.logger.log('Temporal worker initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize Temporal', error);
      throw error;
    }
  }

  private async cleanup() {
    try {
      if (this.client) {
        await this.client.connection.close();
      }
      if (this.worker) {
        await this.worker.shutdown();
      }
      this.logger.log('Temporal services cleaned up successfully');
    } catch (error) {
      this.logger.error('Error during Temporal cleanup', error);
    }
  }

  getClient(): Client {
    return this.client;
  }

  getWorker(): Worker {
    return this.worker;
  }

  async createWorkflow<T = any>(workflowType: string, args: any[]): Promise<string> {
    try {
      const handle = await this.client.workflow.start(workflowType, {
        taskQueue: 'accu-workflows',
        workflowId: `${workflowType}-${Date.now()}`,
        args,
      });

      this.logger.log(`Started workflow: ${workflowType} with ID: ${handle.workflowId}`);
      return handle.workflowId;
    } catch (error) {
      this.logger.error(`Failed to create workflow: ${workflowType}`, error);
      throw error;
    }
  }

  async signalWorkflow(workflowId: string, signalName: string, data: any): Promise<void> {
    try {
      const handle = this.client.workflow.getHandle(workflowId);
      await handle.signal(signalName, data);
      this.logger.log(`Signaled workflow: ${workflowId} with signal: ${signalName}`);
    } catch (error) {
      this.logger.error(`Failed to signal workflow: ${workflowId}`, error);
      throw error;
    }
  }

  async queryWorkflow<T = any>(workflowId: string, queryName: string, ...args: any[]): Promise<T> {
    try {
      const handle = this.client.workflow.getHandle(workflowId);
      return await handle.query(queryName, ...args);
    } catch (error) {
      this.logger.error(`Failed to query workflow: ${workflowId}`, error);
      throw error;
    }
  }

  async terminateWorkflow(workflowId: string, reason?: string): Promise<void> {
    try {
      const handle = this.client.workflow.getHandle(workflowId);
      await handle.terminate(reason || 'Manual termination');
      this.logger.log(`Terminated workflow: ${workflowId}`);
    } catch (error) {
      this.logger.error(`Failed to terminate workflow: ${workflowId}`, error);
      throw error;
    }
  }

  async listWorkflows(query?: string): Promise<any[]> {
    try {
      const workflows = await this.client.workflow.list(query || '');
      return workflows;
    } catch (error) {
      this.logger.error('Failed to list workflows', error);
      throw error;
    }
  }
}