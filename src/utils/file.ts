import * as fs from "fs-extra";

export class FileUtils {
  async parseSlugFile(filePath: string): Promise<string[]> {
    const content = await fs.readFile(filePath, "utf-8");

    if (filePath.endsWith(".json")) {
      const json = JSON.parse(content);
      return Array.isArray(json) ? json : [];
    }

    return content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  validateFile(filePath: string): boolean | string {
    return fs.existsSync(filePath) || "File does not exist.";
  }
}
