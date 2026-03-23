import { UserHealthProfile } from './health';

export interface HealthReport {
  reportId: string;
  userId: string;
  generatedDate: Date;
  userProfile: UserHealthProfile;
  riskTrends: RiskTrend[];
  behaviorPatterns: BehaviorPattern[];
  summary: string;
}

export interface RiskTrend {
  nutrient: string;
  trend: 'increasing' | 'decreasing' | 'stable';
  explanation: string;
}

export interface BehaviorPattern {
  pattern: string;
  explanation: string;
  recommendation: string;
}
