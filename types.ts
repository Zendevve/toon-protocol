export interface TokenStats {
  jsonChars: number;
  toonChars: number;
  savingsPercent: number;
  estimatedTokensJson: number;
  estimatedTokensToon: number;
}

export type GenerationStatus = 'idle' | 'loading' | 'success' | 'error';

export type ViewMode = 'json' | 'toon' | 'visual';
