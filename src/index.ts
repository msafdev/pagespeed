#!/usr/bin/env node

import chalk from "chalk";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { Command } from "commander";
import { config } from "./config/config";
import { UserInterface } from "./ui/interface";
import { SessionManager } from "./services/session";
import { PageSpeedService } from "./services/pagespeed";
import { ExportService } from "./services/report";
import { ResultsDisplay } from "./ui/result";
import { InputValidator } from "./utils/validator";
import { Result } from "./config/types";
import { ProgressTracker } from "./ui/loader";

interface CliOptions {
  url?: string;
  slugs?: string;
  strategy?: "mobile" | "desktop";
  session?: string;
  interactive?: boolean;
  export?: string[];
  filename?: string;
  format?: "json" | "markdown" | "both";
  open?: boolean;
  silent?: boolean;
}

class PageSpeedCLI {
  private validator = new InputValidator();
  private sessionManager = new SessionManager();
  private pageSpeedService = new PageSpeedService(config.API_KEY);
  private exportService = new ExportService();
  private resultsDisplay = new ResultsDisplay();
  private ui = new UserInterface();

  async runYargs() {
    await yargs(hideBin(process.argv))
      .scriptName("pagespeed")
      .usage("$0 <command> [options]")
      .command({
        command: "analyze [url]",
        describe: "Analyze PageSpeed for given URL(s)",
        builder: (yargs) => {
          return yargs
            .positional("url", {
              describe: "Base URL to analyze",
              type: "string",
            })
            .option("slugs", {
              alias: "s",
              describe: "Path to file containing URL slugs",
              type: "string",
            })
            .option("strategy", {
              alias: "t",
              describe: "Testing strategy",
              choices: ["mobile", "desktop"] as const,
              default: "mobile" as const,
            })
            .option("export", {
              alias: "e",
              describe: "Export formats",
              type: "array",
              choices: ["data", "markdown"],
              default: [],
            })
            .option("filename", {
              alias: "f",
              describe: "Output directory for exports",
              type: "string",
            })
            .option("open", {
              describe: "Open markdown report after generation",
              type: "boolean",
              default: false,
            })
            .option("silent", {
              describe: "Suppress progress output",
              type: "boolean",
              default: false,
            });
        },
        handler: async (argv) => {
          await this.handleAnalyze(argv as any);
        },
      })
      .command({
        command: "interactive",
        aliases: ["i"],
        describe: "Run in interactive mode",
        handler: async () => {
          await this.runInteractive();
        },
      })
      .command({
        command: "sessions",
        describe: "Manage saved sessions",
        builder: (yargs) => {
          return yargs
            .command({
              command: "list",
              describe: "List all saved sessions",
              handler: async () => {
                await this.listSessions();
              },
            })
            .command({
              command: "run <name>",
              describe: "Run a saved session",
              builder: (yargs) => {
                return yargs
                  .positional("name", {
                    describe: "Session name to run",
                    type: "string",
                    demandOption: true,
                  })
                  .option("export", {
                    alias: "e",
                    describe: "Export formats",
                    type: "array",
                    choices: ["data", "markdown"],
                    default: [],
                  });
              },
              handler: async (argv) => {
                await this.runSession(
                  argv.name as string,
                  argv.export as string[]
                );
              },
            });
        },
        handler: () => {},
      })
      .option("version", {
        alias: "v",
        describe: "Show version",
      })
      .help()
      .alias("help", "h")
      .demandCommand(1, "You must specify a command")
      .strict()
      .parse();
  }

  async runCommander() {
    const program = new Command();

    program
      .name("pagespeed")
      .description("Enhanced PageSpeed Insights Checker, now with CLI")
      .version("1.0.1");

    program
      .command("analyze")
      .description("Analyze PageSpeed for given URL(s)")
      .argument("[url]", "Base URL to analyze")
      .option("-s, --slugs <file>", "Path to file containing URL slugs")
      .option(
        "-t, --strategy <strategy>",
        "Testing strategy (mobile|desktop)",
        "mobile"
      )
      .option("-e, --export <formats...>", "Export formats (data|markdown)")
      .option("-f, --filename <file>", "Custom filename (optional)")
      .option("--open", "Open markdown report after generation")
      .option("--silent", "Suppress progress output")
      .action(async (url, options) => {
        await this.handleAnalyze({ url, ...options });
      });

    program
      .command("interactive")
      .alias("i")
      .description("Run in interactive mode")
      .action(async () => {
        await this.runInteractive();
      });

    const sessionsCmd = program
      .command("sessions")
      .description("Manage saved sessions");

    sessionsCmd
      .command("list")
      .description("List all saved sessions")
      .action(async () => {
        await this.listSessions();
      });

    sessionsCmd
      .command("run")
      .description("Run a saved session")
      .argument("<name>", "Session name to run")
      .option("-e, --export <formats...>", "Export formats (data|markdown)")
      .action(async (name, options) => {
        await this.runSession(name, options.export || []);
      });

    await program.parseAsync();
  }

  private async handleAnalyze(options: CliOptions) {
    try {
      if (!options.url && !options.interactive) {
        console.log(
          chalk.red("✘ Base URL is required. Use --help for usage information.")
        );
        process.exit(1);
      }

      const baseUrl = this.validator.normalizeUrl(options.url!);
      const validation = this.validator.validateUrl(baseUrl);

      if (validation !== true) {
        console.log(chalk.red(`✘ ${validation}`));
        process.exit(1);
      }

      const slugs = options.slugs
        ? this.validator.resolveSlugs(options.slugs)
        : ["/"];

      const strategy = options.strategy || "mobile";

      if (!options.silent) {
        console.log(
          chalk.white.bold("\n🚀 Enhanced PageSpeed Insights Checker\n")
        );
        console.log(
          chalk.white(
            `📊 Testing ${slugs.length} URL(s) with ${strategy} strategy...\n`
          )
        );
      }

      const results = await this.analyzeUrls(
        baseUrl,
        slugs,
        strategy,
        !options.silent
      );

      if (!options.silent) {
        this.resultsDisplay.showResults(results, strategy);
        this.resultsDisplay.showThresholdAlerts(results);
      }

      await this.handleExports(results, options);

      if (!options.silent) {
        console.log(chalk.green.bold("\n✨ Analysis complete!\n"));
      }
    } catch (error: any) {
      console.error(chalk.red("✘ An error occurred:"), error.message);
      process.exit(1);
    }
  }

  private async analyzeUrls(
    baseUrl: string,
    slugs: string[],
    strategy: "mobile" | "desktop",
    showProgress: boolean = true
  ): Promise<Result[]> {
    const results: Result[] = [];
    const progressTracker = showProgress
      ? new ProgressTracker(slugs.length)
      : null;

    if (progressTracker) {
      progressTracker.start();
    }

    for (const slug of slugs) {
      const fullUrl = this.validator.buildFullUrl(baseUrl, slug);
      try {
        const data = await this.pageSpeedService.analyzeUrl(fullUrl, strategy);
        results.push({
          url: fullUrl,
          strategy,
          scores: data.scores,
          vitals: data.vitals,
          timestamp: new Date().toISOString(),
        });
        if (progressTracker) {
          progressTracker.increment();
        }
      } catch (err: any) {
        if (progressTracker) {
          progressTracker.increment();
        }
        console.log(
          chalk.red(`\n✘ Failed to analyze ${fullUrl}: ${err.message}`)
        );
      }
    }

    if (progressTracker) {
      progressTracker.stop();
    }

    return results;
  }

  private async handleExports(results: Result[], options: CliOptions) {
    const exportFormats = options.export || [];

    const fileName = options.filename;

    if (exportFormats.includes("data")) {
      await this.exportService.exportData(results);
    }

    if (exportFormats.includes("markdown")) {
      const reportPath = await this.exportService.generateMarkdownReport(
        results,
        fileName
      );

      if (options.open) {
        const open = (await import("open")).default;
        await open(reportPath);
      } else {
        console.log(chalk.blue(`📄 Markdown report saved to: ${reportPath}`));
      }
    }
  }

  private async runInteractive() {
    console.log(
      chalk.white.bold(
        "\n🚀 Enhanced PageSpeed Insights Checker (Interactive Mode)\n"
      )
    );

    try {
      const sessions = await this.sessionManager.loadSessions();
      const { baseUrl, slugs, strategy, isNewSession } =
        await this.ui.getAnalysisConfig(sessions);

      if (isNewSession) {
        await this.sessionManager.saveSession({
          baseUrl,
          slugs,
          strategy,
          timestamp: new Date().toISOString(),
        });
      }

      console.log(
        chalk.white(
          `\n📊 Testing ${slugs.length} URL(s) with ${strategy} strategy...\n`
        )
      );

      const results = await this.analyzeUrls(baseUrl, slugs, strategy);

      this.resultsDisplay.showResults(results, strategy);
      this.resultsDisplay.showThresholdAlerts(results);

      const exportFormats = await this.ui.getExportPreferences();
      if (exportFormats.includes("data")) {
        await this.exportService.exportData(results);
      }
      if (exportFormats.includes("markdown")) {
        const reportPath =
          await this.exportService.generateMarkdownReport(results);
        const shouldOpen = await this.ui.askToOpenReport();
        if (shouldOpen) {
          const open = (await import("open")).default;
          await open(reportPath);
        }
      }

      console.log(chalk.green.bold("\n✨ Analysis complete!\n"));
    } catch (error: any) {
      console.error(chalk.red("✘ An error occurred:"), error.message);
      process.exit(1);
    }
  }

  private async listSessions() {
    try {
      const sessions = await this.sessionManager.loadSessions();

      if (sessions.length === 0) {
        console.log(chalk.yellow("No saved sessions found."));
        return;
      }

      console.log(chalk.white.bold("\n📋 Saved Sessions:\n"));

      sessions.forEach((session, index) => {
        console.log(chalk.cyan(`${index + 1}. ${session.baseUrl}`));
        console.log(`   Strategy: ${session.strategy}`);
        console.log(`   Slugs: ${session.slugs.length} URL(s)`);
        console.log(
          `   Created: ${new Date(session.timestamp).toLocaleString()}`
        );
        console.log("");
      });
    } catch (error: any) {
      console.error(chalk.red("✘ Failed to load sessions:"), error.message);
      process.exit(1);
    }
  }

  private async runSession(sessionName: string, exportFormats: string[] = []) {
    try {
      const sessions = await this.sessionManager.loadSessions();
      const sessionIndex = parseInt(sessionName) - 1;

      let session;
      if (
        !isNaN(sessionIndex) &&
        sessionIndex >= 0 &&
        sessionIndex < sessions.length
      ) {
        session = sessions[sessionIndex];
      } else {
        session = sessions.find((s) => s.baseUrl.includes(sessionName));
      }

      if (!session) {
        console.log(
          chalk.red(
            '✘ Session not found. Use "pagespeed sessions list" to see available sessions.'
          )
        );
        process.exit(1);
      }

      console.log(chalk.white.bold("\n🚀 Running Saved Session\n"));
      console.log(chalk.white(`Base URL: ${session.baseUrl}`));
      console.log(chalk.white(`Strategy: ${session.strategy}`));
      console.log(chalk.white(`Testing ${session.slugs.length} URL(s)...\n`));

      const results = await this.analyzeUrls(
        session.baseUrl,
        session.slugs,
        session.strategy
      );

      this.resultsDisplay.showResults(results, session.strategy);
      this.resultsDisplay.showThresholdAlerts(results);

      await this.handleExports(results, { export: exportFormats });

      console.log(chalk.green.bold("\n✨ Session analysis complete!\n"));
    } catch (error: any) {
      console.error(chalk.red("✘ Failed to run session:"), error.message);
      process.exit(1);
    }
  }
}

// Main execution
const main = async () => {
  const cli = new PageSpeedCLI();

  // Check if we should use yargs or commander based on environment or preference
  const useYargs =
    process.env["CLI_PARSER"] === "yargs" ||
    process.argv.includes("--use-yargs");

  try {
    if (useYargs) {
      await cli.runYargs();
    } else {
      await cli.runCommander();
    }
  } catch (error) {
    // Silently exit if user cancels (Ctrl+C)
    if (error instanceof Error && error.message.includes("cancelled")) {
      process.exit(0);
    }
    throw error;
  }
};

main().catch((error) => {
  console.error(chalk.red("✘ Unexpected error:"), error);
  process.exit(1);
});
