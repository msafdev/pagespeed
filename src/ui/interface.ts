import prompts from 'prompts';
import chalk from 'chalk';
import { Session, Strategy } from '../config/types';
import { FileUtils } from '../utils/file';
import { InputValidator } from '../utils/validator';

export class UserInterface {
  private fileUtils = new FileUtils();
  private validator = new InputValidator();

  async getAnalysisConfig(sessions: Session[]): Promise<{
    baseUrl: string;
    slugs: string[];
    strategy: Strategy;
    isNewSession: boolean;
  }> {
    const { action } = await prompts({
      type: 'select',
      name: 'action',
      message: chalk.white('What would you like to do?'),
      choices: [
        { title: 'New analysis', value: 'new' },
        ...(sessions.length > 0
          ? [{ title: 'Reuse previous session', value: 'reuse' }]
          : []),
      ],
    });

    if (action === 'reuse' && sessions.length > 0) {
      const { sessionIndex } = await prompts({
        type: 'select',
        name: 'sessionIndex',
        message: chalk.white('Select a previous session:'),
        choices: sessions.map((session, index) => ({
          title: `${session.baseUrl} (${session.slugs.length} URLs, ${session.strategy}) - ${new Date(session.timestamp).toLocaleDateString()}`,
          value: index,
        })),
      });

      if (sessionIndex === undefined) {
        console.log(chalk.red('❌ No session selected. Exiting.'));
        process.exit(1);
      }

      const selectedSession = sessions[sessionIndex]!;

      console.log(
        chalk.green(
          `\n✓ Loaded session: ${selectedSession.baseUrl} (${selectedSession.slugs.length} URLs)`,
        ),
      );

      return {
        baseUrl: selectedSession.baseUrl,
        slugs: selectedSession.slugs,
        strategy: selectedSession.strategy,
        isNewSession: false,
      };
    }

    // New analysis flow
    const baseUrl = await this.getBaseUrl();
    const strategy = await this.getStrategy();
    const slugs = await this.getSlugs();

    return { baseUrl, slugs, strategy, isNewSession: true };
  }

  private async getBaseUrl(): Promise<string> {
    const { input } = await prompts({
      type: 'text',
      name: 'input',
      message: chalk.white('Enter URL or domain:'),
      validate: (v) => {
        const trimmed = v.trim();
        if (!trimmed) return 'URL is required';

        const hasProtocol = /^https?:\/\//i.test(trimmed);
        const tryUrl = hasProtocol ? trimmed : `https://${trimmed}`;

        try {
          new URL(tryUrl);
          return true;
        } catch {
          return `Invalid URL: ${trimmed}`;
        }
      },
    });

    let url = input.trim();
    const hasProtocol = /^https?:\/\//i.test(url);

    if (!hasProtocol) {
      const { scheme } = await prompts({
        type: 'select',
        name: 'scheme',
        message: chalk.white('Choose a protocol:'),
        choices: [
          { title: 'https:// (recommended)', value: 'https' },
          { title: 'http://', value: 'http' },
        ],
        initial: 0,
      });

      url = `${scheme}://${url}`;
    }

    return this.validator.normalizeUrl(url);
  }

  private async getStrategy(): Promise<Strategy> {
    const { selectedStrategy } = await prompts({
      type: 'select',
      name: 'selectedStrategy',
      message: chalk.white('Select testing strategy:'),
      choices: [
        { title: '📱 Mobile', value: 'mobile' },
        { title: '🖥️  Desktop', value: 'desktop' },
      ],
    });
    return selectedStrategy;
  }

  private async getSlugs(): Promise<string[]> {
    const { useSlugFile, slugFile } = await prompts([
      {
        type: 'confirm',
        name: 'useSlugFile',
        message: chalk.white('Load URLs from a file?'),
        initial: false,
      },
      {
        type: (prev) => (prev ? 'text' : null),
        name: 'slugFile',
        message: chalk.white('Path to URL file (.txt or .json):'),
        validate: (v) => this.fileUtils.validateFile(v),
      },
    ]);

    if (useSlugFile && slugFile) {
      return await this.fileUtils.parseSlugFile(slugFile);
    }

    return await this.getManualSlugs();
  }

  private async getManualSlugs(): Promise<string[]> {
    console.log('');

    const slugs: string[] = [];
    chalk.blue('Enter URL paths/slugs (empty input to finish):');

    while (true) {
      const { slug } = await prompts({
        type: 'text',
        name: 'slug',
        message: chalk.gray('Path/Slug (e.g., /, /about, /contact):'),
      });

      if (!slug?.trim()) break;
      slugs.push(slug.trim());
    }

    if (!slugs.length) {
      slugs.push('/');
      console.log(chalk.yellow('\nNo paths provided, testing homepage only.'));
    }

    return slugs;
  }

  async getExportPreferences(): Promise<string[]> {
    console.log('');

    const { exportFormat } = await prompts({
      type: 'multiselect',
      name: 'exportFormat',
      message: chalk.white('Select export formats:'),
      choices: [
        { title: '📄 JSON & CSV', value: 'data', selected: false },
        { title: '📝 Markdown Report', value: 'markdown', selected: true },
      ],
      hint: '- Space to select. Enter to confirm\n',
    });

    if (!exportFormat || exportFormat.length === 0) {
      console.log(
        chalk.yellow('\n⚠️  No export format selected. Nothing will be saved.'),
      );
      return [];
    }

    return exportFormat;
  }

  async askToOpenReport(): Promise<boolean> {
    const { openReport } = await prompts({
      type: 'confirm',
      name: 'openReport',
      message: chalk.white('Open markdown report?'),
      initial: false,
    });

    return openReport;
  }
}
