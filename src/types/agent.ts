export enum AgentType {
  NUTRITIONIST = 'nutritionist',
  FITNESS_COACH = 'fitness_coach',
  GENERAL_PRACTITIONER = 'general_practitioner',
}

export interface Task {
  id: string;
  agentType: AgentType;
  prompt: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: AgentResult;
}

export interface AgentResult {
  taskId: string;
  summary: string;
  recommendations: string[];
  confidenceScore: number;
}

export interface Agent {
  type: AgentType;
  process: (task: Task) => Promise<AgentResult>;
}
