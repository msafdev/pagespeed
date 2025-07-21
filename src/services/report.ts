import * as fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import { Result } from "../config/types";
import { config } from "../config/config";

export class ExportService {
  private createResultFolder({ base = false }: { base?: boolean }): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const folderPath = path.join(
      process.cwd(),
      "results",
      !base ? timestamp : ""
    );
    fs.ensureDirSync(folderPath);
    return folderPath;
  }

  async exportData(
    results: Result[]
  ): Promise<{ jsonOut: string; csvOut: string }> {
    const folder = this.createResultFolder({ base: false });
    const jsonOut = path.join(folder, `results.json`);
    const csvOut = path.join(folder, `results.csv`);

    await fs.writeJSON(jsonOut, results, { spaces: 2 });

    const header = [
      "URL",
      "Strategy",
      "Performance",
      "Accessibility",
      "Best Practices",
      "SEO",
      "PWA",
      "CLS",
      "LCP",
      "TBT",
      "FID",
      "FCP",
      "SI",
      "Timestamp",
    ];
    const csvRows = [header.join(",")];

    for (const r of results) {
      const row = [
        `"${r.url}"`,
        r.strategy,
        r.scores["Performance"] ?? "N/A",
        r.scores["Accessibility"] ?? "N/A",
        r.scores["Best Practices"] ?? "N/A",
        r.scores["SEO"] ?? "N/A",
        r.scores["PWA"] ?? "N/A",
        r.vitals.cls ?? "N/A",
        r.vitals.lcp ?? "N/A",
        r.vitals.tbt ?? "N/A",
        r.vitals.fid ?? "N/A",
        r.vitals.fcp ?? "N/A",
        r.vitals.si ?? "N/A",
        r.timestamp,
      ];
      csvRows.push(row.join(","));
    }

    await fs.writeFile(csvOut, csvRows.join("\n"));

    console.log(chalk.white(`\n📁 Results exported:`));
    console.log("    " + chalk.gray(jsonOut));
    console.log("    " + chalk.gray(csvOut));

    return { jsonOut, csvOut };
  }

  async generateMarkdownReport(
    results: Result[],
    fileName?: string
  ): Promise<string> {
    const folder = this.createResultFolder({ base: fileName ? true : false });

    let markdown = `# PageSpeed Insights Report\n\n`;
    markdown += `**Generated:** ${new Date().toLocaleString()}\n`;
    markdown += `**Strategy:** ${results[0]?.strategy || "mobile"}\n`;
    markdown += `**Total URLs:** ${results.length}\n\n`;

    const avgScores = {
      Performance: 0,
      Accessibility: 0,
      "Best Practices": 0,
      SEO: 0,
      PWA: 0,
    };
    let validResults = 0;

    results.forEach((result) => {
      Object.keys(avgScores).forEach((key) => {
        if (typeof result.scores[key] === "number") {
          avgScores[key as keyof typeof avgScores] += result.scores[
            key
          ] as number;
          if (key === "Performance") validResults++;
        }
      });
    });

    if (validResults > 0) {
      Object.keys(avgScores).forEach((key) => {
        avgScores[key as keyof typeof avgScores] = Math.round(
          avgScores[key as keyof typeof avgScores] / validResults
        );
      });
    }

    markdown += `## Summary\n\n| Metric | Average Score | Status |\n|--------|---------------|--------|\n`;
    Object.entries(avgScores).forEach(([metric, score]) => {
      const status =
        score >= config.THRESHOLD
          ? "✅ Good"
          : score >= 50
            ? "⚠️ Needs Improvement"
            : "❌ Poor";
      markdown += `| ${metric} | ${score}% | ${status} |\n`;
    });

    markdown += `\n## Detailed Results\n\n`;
    results.forEach((result, index) => {
      markdown += `### ${index + 1}. ${result.url}\n\n`;

      markdown += `| Category | Score |\n|----------|-------|\n`;
      Object.entries(result.scores).forEach(([category, score]) => {
        const emoji =
          typeof score === "number" && score >= config.THRESHOLD
            ? "✅"
            : typeof score === "number" && score >= 50
              ? "⚠️"
              : "❌";
        markdown += `| ${category} | ${emoji} ${score}${typeof score === "number" ? "%" : ""} |\n`;
      });

      markdown += `\n**Core Web Vitals:**\n\n| Metric | Value | Status |\n|--------|-------|--------|\n`;
      const vitalsInfo = [
        { key: "cls", name: "Cumulative Layout Shift", unit: "" },
        { key: "lcp", name: "Largest Contentful Paint", unit: "ms" },
        { key: "tbt", name: "Total Blocking Time", unit: "ms" },
        { key: "fid", name: "First Input Delay", unit: "ms" },
        { key: "fcp", name: "First Contentful Paint", unit: "ms" },
        { key: "si", name: "Speed Index", unit: "ms" },
      ];

      vitalsInfo.forEach(({ key, name, unit }) => {
        const value = result.vitals[key as keyof typeof result.vitals];
        if (value !== null) {
          const displayValue =
            key === "cls" ? value.toFixed(3) : `${Math.round(value)}${unit}`;
          const [good, poor] = config.VITALS_THRESHOLDS[
            key as keyof typeof config.VITALS_THRESHOLDS
          ] || [0, 0];
          const status =
            value <= good
              ? "✅ Good"
              : value <= poor
                ? "⚠️ Needs Improvement"
                : "❌ Poor";
          markdown += `| ${name} | ${displayValue} | ${status} |\n`;
        } else {
          markdown += `| ${name} | N/A | - |\n`;
        }
      });

      markdown += `\n---\n\n`;
    });

    const filename = path.join(
      folder,
      fileName ? `${fileName}.md` : "results.md"
    );

    await fs.writeFile(filename, markdown);

    console.log(chalk.white(`\n📝 Markdown report generated:`));
    console.log("    " + chalk.gray(filename));

    return filename;
  }
}
