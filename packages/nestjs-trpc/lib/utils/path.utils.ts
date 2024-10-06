import * as fs from 'node:fs';
import * as path from 'node:path';

const SOURCE_MAP_REGEX = /\/\/# sourceMappingURL=(.*\.map)$/m;

interface SourceMapping {
  version: number;
  file: string;
  sourceRoot: string;
  sources: Array<string>;
  mappings: string;
}

function normalizePath(p: string): string {
  let pathName = path.resolve(p.replace(/\\/g, '/'));

  // Windows drive letter must be prefixed with a slash
  if (pathName[0] !== '/') {
    pathName = `/${pathName}`;
  }

  return pathName;
}

function getPlatformPath(path: string): string {
  const exec = /^\/(\w*):(.*)/.exec(path);

  return /^win/.test(process.platform) && exec
    ? `${exec[1]}:\\${exec[2].replace(/\//g, '\\')}`
    : path;
}

function getSourceMapFromJSPath(sourcePath: string): SourceMapping {
  const filePath = getPlatformPath(sourcePath);

  const content = fs.readFileSync(filePath, { encoding: 'utf8' });
  const exec = SOURCE_MAP_REGEX.exec(content);

  if (exec == null) {
    throw new Error(
      `Could not find source file for path ${sourcePath}, make sure "sourceMap" is enabled in your tsconfig.`,
    );
  }
  const sourceMapPath = path.resolve(filePath, '..', exec[1]);
  const sourceMapContent = fs.readFileSync(sourceMapPath, {
    encoding: 'utf8',
  });
  return JSON.parse(sourceMapContent);
}

export function getCallerFilePath(skip: number = 2): string {
  const originalPrepareStackTrace = Error.prepareStackTrace;

  Error.prepareStackTrace = (_, stack) => stack;
  const error = new Error();
  const stack = error.stack as unknown as NodeJS.CallSite[];

  Error.prepareStackTrace = originalPrepareStackTrace;

  // Skip the given number of frames
  const caller = stack[skip];

  const jsFilePath = caller?.getFileName();

  if (jsFilePath == null) {
    throw new Error(`Could not find caller file: ${caller}`);
  }
  const sourceMap = getSourceMapFromJSPath(jsFilePath);

  return normalizePath(path.resolve(jsFilePath, '..', sourceMap.sources[0]));
}
