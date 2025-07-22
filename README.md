# PageSpeed Insights Checker

A simple command-line tool for analyzing website performance using Google PageSpeed Insights API.

## NEW: Github Action

<!-- PAGESPEED_START -->

```typescript
const pagespeed = {
  'https://example.com': {
    strategy: 'mobile',
    language: 'en',
    scores: {
      Performance: 100, // ▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰
      Accessibility: 88, // ▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▱▱▱
      'Best Practices': 100, // ▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰
      SEO: 90, // ▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▱▱
      PWA: 0, // ▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱
    },
  },
};
```

<!-- PAGESPEED_END -->

## Installation

```bash
npm install @msafdev/pagespeed
```

## CLI Usage

The tool supports both yargs and commander parsers and offers multiple ways to analyze your websites.

### Basic Commands

#### Analyze a single URL

```bash
npx @msafdev/pagespeed analyze https://example.com
npx @msafdev/pagespeed analyze example.com --strategy desktop
```

#### Analyze multiple URLs from a file

To analyze multiple pages under the same domain, provide a .txt file containing one slug (path) per line.

- The file must be plain text (`.txt` extension).
- Each line should contain a single path, relative to the base URL.
- Do not include the domain or protocol.
- Make sure each slug starts with `/`.

Example: `urls.txt`

```text
/
/about
/contact
/lab/toolbar
```

```bash
npx @msafdev/pagespeed analyze https://example.com --slugs ./urls.txt
npx @msafdev/pagespeed analyze example.com -s ./pages.txt -t mobile
```

#### Interactive Mode

```bash
npx @msafdev/pagespeed interactive
# or
npx @msafdev/pagespeed i
```

### Command Options

#### `analyze [url]`

Analyze PageSpeed for given URL(s)

**Options:**

- `-s, --slugs <file>`: Path to file containing URL slugs
- `-t, --strategy <strategy>`: Testing strategy (`mobile` | `desktop`) [default: mobile]
- `-e, --export <formats...>`: Export formats (`data` | `markdown`)
- `-f, --filename <dir>`: Output directory for exports
- `--open`: Open markdown report after generation
- `--silent`: Suppress progress output

**Examples:**

```bash
# Basic analysis
npx @msafdev/pagespeed analyze https://example.com

# Desktop strategy with exports ("csv | json | md")
npx @msafdev/pagespeed analyze https://example.com -t desktop -e data markdown

# Multiple URLs with custom output (./custom.md)
npx @msafdev/pagespeed analyze https://example.com -s ./slugs.txt -f custom --open

# Silent mode for scripting
npx @msafdev/pagespeed analyze https://example.com --silent -e data
```

#### `interactive`

Run the tool in interactive mode with guided prompts

```bash
npx @msafdev/pagespeed interactive
npx @msafdev/pagespeed i
```

#### `sessions`

Manage saved analysis sessions

**Subcommands:**

- `list`: List all saved sessions
- `run <name>`: Run a saved session

**Examples:**

```bash
# List saved sessions
npx @msafdev/pagespeed sessions list

# Run a specific session (by number or URL fragment)
npx @msafdev/pagespeed sessions run 1
npx @msafdev/pagespeed sessions run example.com

# Run session with exports
npx @msafdev/pagespeed sessions run 1 -e markdown data
```

### Export Formats

#### Data Export (JSON)

```bash
npx @msafdev/pagespeed analyze https://example.com -e data
```

Generates: `./results/TIMESTAMP/results.["json | csv"]`

#### Markdown Report

```bash
pagespeed analyze https://example.com -e markdown --open
```

Generates: `./results/TIMESTAMP/results.md`

### Advanced Usage

#### Environment Variables

```bash
# Use yargs parser instead of commander
CLI_PARSER=yargs @msafdev/pagespeed analyze https://example.com

# Set default API key
PAGESPEED_API_KEY=your-api-key @msafdev/pagespeed analyze https://example.com
```

#### Scripting Examples

**Batch processing with different strategies:**

```bash
#!/bin/bash
sites=("example-1.com" "example-2.com" "example-3.com")

for site in "${sites[@]}"; do
  echo "Analyzing $site..."
  npx @msafdev/pagespeed analyze "$site" -s ./common-pages.txt -e data --silent
done
```

**Weekly performance monitoring:**

```bash
#!/bin/bash
# weekly-check.sh
npx @msafdev/pagespeed analyze https://production.example.com \
  -s ./critical-pages.txt \
  -e markdown \
  -f $(date +%Y-%m-%d) \
  --open
```

#### Configuration File Support

Create `.pagespeedrc.json` in your project root:

```json
{
  "baseUrl": "https://my-site.com",
  "strategy": "mobile",
  "slugs": "./pages.txt",
  "export": ["data", "markdown"],
  "filename": "custom-report"
}
```

### CLI Development Scripts

```bash
# Development with TypeScript
npm run dev analyze https://example.com

# Use yargs parser
npm run cli:yargs analyze https://example.com

# Use commander parser (default)
npm run cli:commander analyze https://example.com

# Interactive mode
npm run interactive
```

### Error Handling

The CLI provides detailed error messages and exits with appropriate codes:

- `0`: Success
- `1`: General error (invalid URL, API failure, etc.)
- `130`: User cancellation (Ctrl+C)

### Performance Tips

1. **Use slug files** for testing multiple pages efficiently
2. **Enable silent mode** for automated scripts
3. **Save sessions** for repeated analysis
4. **Use appropriate strategies** (mobile for mobile-first, desktop for desktop analysis)
5. **Export data** for further processing and historical tracking

### Troubleshooting

**Common Issues:**

1. **API Key Issues:**

   ```bash
   # Set API key in config or environment
   export PAGESPEED_API_KEY=your-api-key
   ```

2. **Invalid URLs:**

   ```bash
   # Ensure URLs are properly formatted
   pagespeed analyze https://example.com  # ✓ Good
   pagespeed analyze example.com          # ✓ Also works
   pagespeed analyze /invalid/path        # ✗ Bad
   ```

3. **File Not Found:**

   ```bash
   # Check slug file path
   pagespeed analyze https://example.com -s ./slugs.txt
   ```

4. **Network Issues:**
   ```bash
   # Use --silent to reduce output and check logs
   pagespeed analyze https://example.com --silent
   ```
