import { Agent, AgentType } from './types';

class AgentRegistry {
  private agents: Map<AgentType, Agent> = new Map();

  register(agentType: AgentType, agent: Agent) {
    this.agents.set(agentType, agent);
  }

  getAgent(agentType: AgentType): Agent | undefined {
    return this.agents.get(agentType);
  }
}

export const agentRegistry = new AgentRegistry();
