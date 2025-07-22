export type Strategy = 'mobile' | 'desktop';

export type AuditCategory = {
  id: string;
  title: string;
  score: number | null;
};

export type CoreWebVitals = {
  cls: number | null;
  lcp: number | null;
  tbt: number | null;
  fid: number | null;
  fcp: number | null;
  si: number | null;
};

export type Result = {
  url: string;
  strategy: Strategy;
  scores: Record<string, number | 'N/A'>;
  vitals: CoreWebVitals;
  timestamp: string;
};

export type Session = {
  baseUrl: string;
  slugs: string[];
  strategy: Strategy;
  timestamp: string;
};

export type AnalysisData = {
  scores: Record<string, number | 'N/A'>;
  vitals: CoreWebVitals;
};
