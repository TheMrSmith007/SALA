export interface LotteryConfig {
  gameName: string;
  mainNumbersCount: number;
  mainNumbersRange: { min: number; max: number };
  specialName?: string;
  specialNumbersCount?: number;
  specialNumbersRange?: { min: number; max: number };
}

export interface PredictedNumbers {
  mainNumbers: number[];
  specialNumbers: number[];
  explanation: string;
}

export type AIStrategy = 'balanced' | 'hot' | 'overdue';

export interface NumberAnalysis {
  number: number;
  value: number;
}

export interface AnalysisResults {
  hotNumbers: NumberAnalysis[];
  coldNumbers: NumberAnalysis[];
  overdueNumbers: NumberAnalysis[];
}

export interface HitScore {
    mainHits: number[];
    specialHits: number[];
}
