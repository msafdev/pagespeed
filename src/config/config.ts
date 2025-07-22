import * as dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config();

const API_KEY = process.env['PAGESPEED_API_KEY'];

if (!API_KEY) {
  console.log('');
  console.error(chalk.red('✘ Missing API key in .env (PAGESPEED_API_KEY)'));
  process.exit(1);
}

export const config = {
  API_KEY,
  THRESHOLD: 90,
  SESSIONS_FILE: '.pagespeed-sessions.json',
  MAX_SESSIONS: 10,
  CATEGORIES: ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'],
  VITALS_THRESHOLDS: {
    cls: [0.1, 0.25],
    lcp: [2500, 4000],
    tbt: [200, 600],
    fid: [100, 300],
    fcp: [1800, 3000],
    si: [3400, 5800],
  },
} as const;
