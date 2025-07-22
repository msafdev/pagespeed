import chalk from 'chalk';
import { Result, Strategy } from '../config/types';
import { config } from '../config/config';

export class ResultsDisplay {
  showResults(results: Result[], strategy: Strategy): void {
    console.log(
      chalk.white.bold(`\n📊 Results Summary (${strategy.toUpperCase()}):`),
    );

    results.forEach((result, index) => {
      console.log(chalk.white.bold(`\n${index + 1}. ${result.url}`));

      // Scores
      Object.entries(result.scores).forEach(([category, score]) => {
        console.log(
          `   ${chalk.gray('•')} ${category.padEnd(16)} ${this.scoreColor(score)}`,
        );
      });

      // Core Web Vitals
      console.log(chalk.gray('\n   Core Web Vitals:'));
      console.log(
        `   ${chalk.gray('•')} CLS             ${this.vitalColor(result.vitals.cls, 'cls')}`,
      );
      console.log(
        `   ${chalk.gray('•')} LCP             ${this.vitalColor(result.vitals.lcp, 'lcp')}`,
      );
      console.log(
        `   ${chalk.gray('•')} TBT             ${this.vitalColor(result.vitals.tbt, 'tbt')}`,
      );
      console.log(
        `   ${chalk.gray('•')} FID             ${this.vitalColor(result.vitals.fid, 'fid')}`,
      );
      console.log(
        `   ${chalk.gray('•')} FCP             ${this.vitalColor(result.vitals.fcp, 'fcp')}`,
      );
      console.log(
        `   ${chalk.gray('•')} SI              ${this.vitalColor(result.vitals.si, 'si')}`,
      );
    });
  }

  showThresholdAlerts(results: Result[]): void {
    const alerts: string[] = [];

    results.forEach((result) => {
      Object.entries(result.scores).forEach(([category, score]) => {
        if (typeof score === 'number' && score < config.THRESHOLD) {
          alerts.push(`${result.url} - ${category}: ${score}%`);
        }
      });
    });

    if (alerts.length > 0) {
      console.log(
        chalk.yellow.bold(`\n⚠️  Threshold Alerts (< ${config.THRESHOLD}%):`),
      );
      alerts.forEach((alert) => {
        console.log(chalk.yellow(`   • ${alert}`));
      });
    }
  }

  private scoreColor(score: number | 'N/A'): string {
    if (score === 'N/A') return chalk.dim('N/A');
    const numScore = score as number;
    if (numScore >= config.THRESHOLD) return chalk.green.bold(`${numScore}%`);
    if (numScore >= 50) return chalk.yellow(`${numScore}%`);
    return chalk.red(`${numScore}%`);
  }

  private vitalColor(value: number | null, metric: string): string {
    if (value === null) return chalk.dim('N/A');

    const [good, poor] = config.VITALS_THRESHOLDS[
      metric as keyof typeof config.VITALS_THRESHOLDS
    ] || [0, 0];
    const displayValue =
      metric === 'cls' ? value.toFixed(3) : `${Math.round(value)}ms`;

    if (value <= good) return chalk.green.bold(displayValue);
    if (value <= poor) return chalk.yellow(displayValue);
    return chalk.red(displayValue);
  }
}
