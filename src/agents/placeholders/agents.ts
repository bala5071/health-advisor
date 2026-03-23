import { Agent, AgentType, Task, AgentResult } from '../core/types';

export class OCRAgent implements Agent {
  async process(task: Task): Promise<AgentResult> {
    console.log('OCR Agent processing task:', task);
    return { agent: AgentType.OCR, result: 'Extracted text from image' };
  }
}

export class ClassificationAgent implements Agent {
  async process(task: Task): Promise<AgentResult> {
    console.log('Classification Agent processing task:', task);
    return { agent: AgentType.CLASSIFICATION, result: 'blood_test' };
  }
}

export class DataExtractionAgent implements Agent {
  async process(task: Task): Promise<AgentResult> {
    console.log('Data Extraction Agent processing task:', task);
    return { agent: AgentType.DATA_EXTRACTION, result: { hemoglobin: 14 } };
  }
}

export class AnalysisAgent implements Agent {
  async process(task: Task): Promise<AgentResult> {
    console.log('Analysis Agent processing task:', task);
    return { agent: AgentType.ANALYSIS, result: 'Hemoglobin levels are normal' };
  }
}

export class RecommendationAgent implements Agent {
  async process(task: Task): Promise<AgentResult> {
    console.log('Recommendation Agent processing task:', task);
    console.log('--- PIPELINE COMPLETE ---');
    return { agent: AgentType.RECOMMENDATION, result: 'No recommendations at this time' };
  }
}
