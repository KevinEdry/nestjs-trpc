import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const docsRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const pagesDir = join(docsRoot, 'pages', 'docs');
const publicDir = join(docsRoot, 'public');
const siteUrl = 'https://nestjs-trpc.io';

const siteSummary =
  'NestJS tRPC integrates tRPC into the NestJS framework with a decorator-based ' +
  'API, providing end-to-end typesafety, automatic AppRouter type generation, ' +
  'and full dependency injection support.';

function resolveHref(href) {
  return href.startsWith('/') ? `${siteUrl}${href}` : href;
}

function convertTables(text) {
  return text.replace(
    /<Table\b([^>]*)>([\s\S]*?)<\/Table>/g,
    (table, attrs, body) => {
      const columnsMatch = attrs.match(/columns=\{\[([\s\S]*?)\]\}/);
      const columns = columnsMatch
        ? columnsMatch[1]
            .split(',')
            .map((column) => column.trim().replace(/^["']|["']$/g, ''))
            .filter(Boolean)
        : null;

      const rows = [...body.matchAll(/<Table\.Row>([\s\S]*?)<\/Table\.Row>/g)].map(
        ([, row]) =>
          [...row.matchAll(/<Table\.Cell>([\s\S]*?)<\/Table\.Cell>/g)].map(
            ([, cell]) => cell.replace(/\s+/g, ' ').trim().replace(/\|/g, '\\|'),
          ),
      );
      if (rows.length === 0) return '';

      const width = columns?.length ?? Math.max(...rows.map((row) => row.length));
      const header = columns ?? Array(width).fill(' ');
      return [
        '',
        `| ${header.join(' | ')} |`,
        `| ${Array(width).fill('---').join(' | ')} |`,
        ...rows.map((row) => `| ${row.join(' | ')} |`),
        '',
      ].join('\n');
    },
  );
}

function convertJsxToMarkdown(text) {
  let result = text
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/^import .*$/gm, '')
    .replace(/<JsonLd[\s\S]*?\/>/g, '');

  result = convertTables(result);

  return result
    .replace(/\w+=\{<[^>]*\/>\}/g, '')
    .replace(
      /<Link\s[^>]*href=\{?["']([^"']+)["']\}?[^>]*>([\s\S]*?)<\/Link>/g,
      (link, href, label) =>
        `[${label.replace(/\s+/g, ' ').trim()}](${resolveHref(href)})`,
    )
    .replace(/<FileTree\.Folder\s[^>]*name=\{?["']([^"']+)["']\}?[^>]*>/g, '- $1/')
    .replace(/<FileTree\.File\s[^>]*name=\{?["']([^"']+)["']\}?[^>]*\/>/g, '- $1')
    .replace(/<Card\b([^>]*?)\/?>/g, (card, attrs) => {
      const title = attrs.match(/title=\{?["']([^"']+)["']\}?/)?.[1];
      if (!title) return '';
      const href = attrs.match(/href=\{?["']([^"']+)["']\}?/)?.[1];
      return href ? `- [${title}](${resolveHref(href)})` : `- ${title}`;
    })
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<\/?[A-Z][\w.]*(\s[^>]*?)?\/?>/g, '')
    .replace(/<\/?div(\s[^>]*?)?>/g, '')
    .replace(/\n{3,}/g, '\n\n');
}

// JSX cleanup must not touch code samples, so transform only the
// segments between fences.
function mdxToMarkdown(source) {
  const withoutFrontmatter = source.replace(/^---\n[\s\S]*?\n---\n/, '');
  return withoutFrontmatter
    .split(/(```[\s\S]*?```)/)
    .map((segment, index) =>
      index % 2 === 0 ? convertJsxToMarkdown(segment) : segment,
    )
    .join('')
    .trim();
}

function extractSummary(markdown) {
  const paragraph = markdown
    .split('\n')
    .map((line) => line.trim())
    .find(
      (line) =>
        line &&
        !line.startsWith('#') &&
        !line.startsWith('```') &&
        !line.startsWith('|') &&
        !line.startsWith('-') &&
        !line.startsWith('['),
    );
  if (!paragraph) return '';

  const plain = paragraph
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_]/g, '');
  return plain.length > 160 ? `${plain.slice(0, 157).trimEnd()}...` : plain;
}

function collectSections() {
  const meta = JSON.parse(readFileSync(join(pagesDir, '_meta.json'), 'utf8'));
  const sections = [];
  let current = { title: 'Docs', pages: [] };

  for (const [key, value] of Object.entries(meta)) {
    if (value?.type === 'separator') {
      if (current.pages.length > 0) sections.push(current);
      current = { title: value.title, pages: [] };
      continue;
    }

    const file = ['md', 'mdx']
      .map((extension) => join(pagesDir, `${key}.${extension}`))
      .find(existsSync);
    if (!file) continue;

    const title = typeof value === 'string' ? value : value.title;
    const markdown = mdxToMarkdown(readFileSync(file, 'utf8'));
    current.pages.push({
      title,
      markdown,
      summary: extractSummary(markdown),
      pageUrl: `${siteUrl}/docs${key === 'index' ? '' : `/${key}`}`,
      markdownUrl: `${siteUrl}/docs/${key}.md`,
      markdownPath: join(publicDir, 'docs', `${key}.md`),
    });
  }
  if (current.pages.length > 0) sections.push(current);
  return sections;
}

const sections = collectSections();
mkdirSync(join(publicDir, 'docs'), { recursive: true });

for (const page of sections.flatMap((section) => section.pages)) {
  writeFileSync(page.markdownPath, `${page.markdown}\n`);
}

const llmsTxt = [
  '# NestJS tRPC',
  '',
  `> ${siteSummary}`,
  '',
  `The complete documentation is available as a single file at ${siteUrl}/llms-full.txt`,
  '',
  ...sections.flatMap((section) => [
    `## ${section.title}`,
    '',
    ...section.pages.map(
      (page) =>
        `- [${page.title}](${page.markdownUrl})${page.summary ? `: ${page.summary}` : ''}`,
    ),
    '',
  ]),
].join('\n');

const llmsFullTxt = [
  '# NestJS tRPC Documentation',
  '',
  `> ${siteSummary}`,
  ...sections.flatMap((section) =>
    section.pages.flatMap((page) => [
      '',
      '---',
      '',
      `Source: ${page.pageUrl}`,
      '',
      page.markdown,
    ]),
  ),
  '',
].join('\n');

writeFileSync(join(publicDir, 'llms.txt'), llmsTxt);
writeFileSync(join(publicDir, 'llms-full.txt'), llmsFullTxt);

const pageCount = sections.reduce((count, section) => count + section.pages.length, 0);
console.log(`Generated llms.txt, llms-full.txt, and ${pageCount} markdown pages`);
