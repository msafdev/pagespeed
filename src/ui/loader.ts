import cliProgress from "cli-progress";
import chalk from "chalk";

export class ProgressTracker {
  private progressBar: cliProgress.SingleBar;

  constructor(private total: number) {
    this.progressBar = new cliProgress.SingleBar({
      format:
        chalk.white("Progress |") +
        chalk.cyan("{bar}") +
        chalk.white("| {percentage}% | {value}/{total} URLs | ETA: {eta}s"),
      barCompleteChar: "█",
      barIncompleteChar: "░",
      hideCursor: true,
    });
  }

  start(): void {
    this.progressBar.start(this.total, 0);
  }

  increment(): void {
    this.progressBar.increment();
  }

  stop(): void {
    this.progressBar.stop();
  }
}
