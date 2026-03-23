export enum AgentType {
  OCR = 'OCR',
  CLASSIFICATION = 'CLASSIFICATION',
  DATA_EXTRACTION = 'DATA_EXTRACTION',
  ANALYSIS = 'ANALYSIS',
  RECOMMENDATION = 'RECOMMENDATION',
}

export interface Task {
  id: string;
  type: AgentType;
  payload: any;
  priority: number;
}

export interface AgentResult {
  agent: AgentType;
  result: any;
  error?: any;
}

export interface Agent {
  process(task: Task): Promise<AgentResult>;
}
