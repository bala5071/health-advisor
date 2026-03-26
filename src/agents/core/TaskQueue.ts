import { AgentResult, Task } from './types';
import { agentRegistry } from './AgentRegistry';

class TaskQueue {
  private queue: Task[] = [];
  private isProcessing = false;
  private onTaskComplete: ((result: AgentResult) => void) | null = null;

  setOnTaskComplete(handler: (result: AgentResult) => void) {
    this.onTaskComplete = handler;
  }

  enqueue(task: Task) {
    this.queue.push(task);
    this.queue.sort((a, b) => a.priority - b.priority);
    this.processQueue();
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const task = this.queue.shift()!;

    const agent = agentRegistry.getAgent(task.type);
    if (agent) {
      const result = await agent.process(task);
      this.onTaskComplete?.(result);
    }

    this.isProcessing = false;
    this.processQueue();
  }
}

export const taskQueue = new TaskQueue();
