import { agentRegistry } from './core/AgentRegistry';
import { AgentType } from './core/types';
import {
  OCRAgent,
  ClassificationAgent,
  DataExtractionAgent,
  AnalysisAgent,
  RecommendationAgent,
} from './placeholders/agents';

agentRegistry.register(AgentType.OCR, new OCRAgent());
agentRegistry.register(AgentType.CLASSIFICATION, new ClassificationAgent());
agentRegistry.register(AgentType.DATA_EXTRACTION, new DataExtractionAgent());
agentRegistry.register(AgentType.ANALYSIS, new AnalysisAgent());
agentRegistry.register(AgentType.RECOMMENDATION, new RecommendationAgent());
