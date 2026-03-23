import { AgentType, Task, AgentResult } from './types';
import { agentRegistry } from './AgentRegistry';
import { taskQueue } from './TaskQueue';
import { v4 as uuidv4 } from 'uuid';

class AgentOrchestrator {
  async processImage(imageUri: string) {
    const taskId = uuidv4();
    const initialTask: Task = {
      id: taskId,
      type: AgentType.OCR,
      payload: { imageUri },
      priority: 1,
    };

    taskQueue.enqueue(initialTask);
  }

  async handleTaskCompletion(result: AgentResult) {
    const nextTask = this.getNextTask(result);
    if (nextTask) {
      taskQueue.enqueue(nextTask);
    }
  }

  private getNextTask(result: AgentResult): Task | null {
    const { agent, result: data } = result;
    const taskId = uuidv4();

    switch (agent) {
      case AgentType.OCR:
        return { id: taskId, type: AgentType.CLASSIFICATION, payload: { text: data }, priority: 2 };
      case AgentType.CLASSIFICATION:
        return { id: taskId, type: AgentType.DATA_EXTRACTION, payload: { classification: data }, priority: 3 };
      case AgentType.DATA_EXTRACTION:
        return { id: taskId, type: AgentType.ANALYSIS, payload: { extractedData: data }, priority: 4 };
      case AgentType.ANALYSIS:
        return { id: taskId, type: AgentType.RECOMMENDATION, payload: { analysis: data }, priority: 5 };
      default:
        return null;
    }
  }
}

export const agentOrchestrator = new AgentOrchestrator();
