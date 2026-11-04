import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const docsRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(docsRoot, '..', 'CHANGELOG.md');
const target = join(docsRoot, 'pages', 'docs', 'changelog.md');

// MDX cannot parse HTML comments, and commit subjects may contain
// characters MDX reads as JSX ("<") or expressions ("{"). Strip the
// comments and escape those characters outside inline code spans.
function toMdxSafeMarkdown(markdown) {
  const withoutComments = markdown.replace(/<!--[\s\S]*?-->/g, '');

  return withoutComments
    .split('\n')
    .map((line) =>
      line
        .split('`')
        .map((segment, index) =>
          index % 2 === 0
            ? segment.replace(/</g, '\\<').replace(/\{/g, '\\{')
            : segment,
        )
        .join('`'),
    )
    .join('\n')
    .trimEnd();
}

function linkVersionHeadingsToReleases(markdown) {
  return markdown.replace(
    /^## \[(\d+\.\d+\.\d+)\]/gm,
    (heading, version) =>
      `## [${version}](https://github.com/KevinEdry/nestjs-trpc/releases/tag/v${version})`,
  );
}

const changelog = readFileSync(source, 'utf8');
writeFileSync(
  target,
  `${linkVersionHeadingsToReleases(toMdxSafeMarkdown(changelog))}\n`,
);
console.log(`Synced ${source} -> ${target}`);
