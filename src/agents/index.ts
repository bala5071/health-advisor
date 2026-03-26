import { agentRegistry } from './core/AgentRegistry';
import { AgentType } from './core/types';
import { VisionAgent } from './VisionAgent';
import { OCRAgent } from './OCRAgent';
import { HealthAdvisorAgent } from './HealthAdvisorAgent';
import {
  ClassificationAgent,
  DataExtractionAgent,
  AnalysisAgent,
} from './placeholders/agents';

agentRegistry.register(AgentType.OCR, new OCRAgent());
agentRegistry.register(AgentType.VISION, new VisionAgent());
agentRegistry.register(AgentType.CLASSIFICATION, new ClassificationAgent());
agentRegistry.register(AgentType.DATA_EXTRACTION, new DataExtractionAgent());
agentRegistry.register(AgentType.ANALYSIS, new AnalysisAgent());
agentRegistry.register(AgentType.RECOMMENDATION, new HealthAdvisorAgent());
