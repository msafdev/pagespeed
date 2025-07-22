import axios from 'axios';
import {
  Strategy,
  AuditCategory,
  CoreWebVitals,
  AnalysisData,
} from '../config/types';
import { config } from '../config/config';

export class PageSpeedService {
  constructor(private apiKey: string) {}

  async analyzeUrl(url: string, strategy: Strategy): Promise<AnalysisData> {
    const endpoint =
      'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

    const params = new URLSearchParams({
      url,
      key: this.apiKey,
      strategy,
    });

    config.CATEGORIES.forEach((cat) => params.append('category', cat));

    const { data } = await axios.get(`${endpoint}?${params.toString()}`);
    const categories = data.lighthouseResult.categories;
    const audits = data.lighthouseResult.audits;

    const categoryData: AuditCategory[] = [
      {
        id: 'performance',
        title: 'Performance',
        score: categories.performance?.score ?? null,
      },
      {
        id: 'accessibility',
        title: 'Accessibility',
        score: categories.accessibility?.score ?? null,
      },
      {
        id: 'best-practices',
        title: 'Best Practices',
        score: categories['best-practices']?.score ?? null,
      },
      { id: 'seo', title: 'SEO', score: categories.seo?.score ?? null },
      { id: 'pwa', title: 'PWA', score: categories.pwa?.score ?? null },
    ];

    const vitals: CoreWebVitals = {
      cls: audits['cumulative-layout-shift']?.numericValue ?? null,
      lcp: audits['largest-contentful-paint']?.numericValue ?? null,
      tbt: audits['total-blocking-time']?.numericValue ?? null,
      fid: audits['max-potential-fid']?.numericValue ?? null,
      fcp: audits['first-contentful-paint']?.numericValue ?? null,
      si: audits['speed-index']?.numericValue ?? null,
    };

    const scores: Record<string, number | 'N/A'> = {};
    for (const { title, score } of categoryData) {
      const s = score === null ? 'N/A' : Math.round(score * 100);
      scores[title] = s;
    }

    return { scores, vitals };
  }
}
