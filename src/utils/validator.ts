import fs from 'fs';
import path from 'path';

interface ConfigFile {
  baseUrl?: string;
  strategy?: 'mobile' | 'desktop';
  slugs?: string;
  export?: string[];
  output?: string;
}

export class InputValidator {
  constructor(private defaultScheme: 'https' | 'http' = 'https') {}

  validateUrl(url: string): boolean | string {
    const trimmed = url.trim();
    if (!trimmed) return 'URL is required';

    const hasProtocol = /^https?:\/\//i.test(trimmed);
    const normalized = hasProtocol
      ? trimmed
      : `${this.defaultScheme}://${trimmed}`;

    try {
      new URL(normalized);
      return true;
    } catch {
      return `Invalid URL format: ${trimmed}`;
    }
  }

  normalizeUrl(url: string): string {
    const hasProtocol = /^https?:\/\//i.test(url);
    const withProtocol = hasProtocol ? url : `${this.defaultScheme}://${url}`;
    const parsed = new URL(withProtocol);
    return parsed.href.replace(/\/+$/, ''); // remove trailing slashes
  }

  buildFullUrl(baseUrl: string, slug: string): string {
    const base = baseUrl.replace(/\/+$/, '');
    const path = slug.startsWith('/') ? slug : `/${slug}`;
    return slug === '/' ? base : `${base}${path}`;
  }

  resolveSlugs(inputPath: string | undefined): string[] {
    if (!inputPath) return ['/'];

    const fullPath = path.resolve(inputPath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Slug file not found: ${inputPath}`);
    }

    const raw = fs.readFileSync(fullPath, 'utf-8');
    const slugs = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line !== '' && !line.startsWith('#')); // Support comments

    if (slugs.length === 0) {
      throw new Error('Slug list is empty.');
    }

    return slugs;
  }

  loadConfigFile(configPath?: string): ConfigFile | null {
    const possiblePaths = [
      configPath,
      './.pagespeedrc.json',
      './.pagespeedrc',
      './pagespeed.config.json',
      path.join(process.cwd(), '.pagespeedrc.json'),
    ].filter(Boolean) as string[];

    for (const filePath of possiblePaths) {
      try {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          return JSON.parse(content);
        }
      } catch (error) {
        console.warn(
          `Warning: Failed to parse config file ${filePath}:`,
          error,
        );
      }
    }

    return null;
  }

  mergeOptionsWithConfig(options: any, config?: ConfigFile): any {
    if (!config) return options;

    return {
      url: options.url || config.baseUrl,
      slugs: options.slugs || config.slugs,
      strategy: options.strategy || config.strategy || 'mobile',
      export: options.export || config.export || [],
      output: options.output || config.output,
      ...options, // CLI options take precedence
    };
  }

  validateStrategy(strategy: string): strategy is 'mobile' | 'desktop' {
    return strategy === 'mobile' || strategy === 'desktop';
  }

  validateExportFormats(formats: string[]): string[] {
    const validFormats = ['data', 'markdown'];
    return formats.filter((format) => {
      if (validFormats.includes(format)) {
        return true;
      }
      console.warn(
        `Warning: Unknown export format '${format}'. Valid formats: ${validFormats.join(', ')}`,
      );
      return false;
    });
  }

  createSlugTemplate(outputPath: string = './slugs-template.txt'): void {
    const template = `# PageSpeed URL Slugs Template
# Add one URL path per line
# Lines starting with # are comments and will be ignored

/
/about
/contact
/products
/services
/blog
/blog/latest-post
`;

    try {
      fs.writeFileSync(outputPath, template, 'utf-8');
      console.log(`✓ Slug template created at: ${outputPath}`);
    } catch (error) {
      throw new Error(`Failed to create slug template: ${error}`);
    }
  }

  createConfigTemplate(outputPath: string = './.pagespeedrc.json'): void {
    const template = {
      baseUrl: 'https://example.com',
      strategy: 'mobile',
      slugs: './slugs.txt',
      export: ['data', 'markdown'],
      output: './reports',
    };

    try {
      fs.writeFileSync(outputPath, JSON.stringify(template, null, 2), 'utf-8');
      console.log(`✓ Config template created at: ${outputPath}`);
    } catch (error) {
      throw new Error(`Failed to create config template: ${error}`);
    }
  }
}
