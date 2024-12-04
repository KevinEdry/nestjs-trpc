import { Injectable } from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { SourceMapping } from '../interfaces/scanner.interface';

/**
 * For this specific file, using a static reference is desirable since `getCallerFilePath` uses a stack-trace to figure out the caller.
 * If this clas is injected through dependency injection, that stack-trace will vary!
 */
@Injectable()
export class FileScanner {
  public getCallerFilePath(skip: number = 2): string {
    const originalPrepareStackTrace = Error.prepareStackTrace;

    Error.prepareStackTrace = (_, stack) => stack;
    const error = new Error();
    const stack = error.stack as unknown as NodeJS.CallSite[];

    Error.prepareStackTrace = originalPrepareStackTrace;

    const caller = stack[skip];

    const jsFilePath = caller?.getFileName();

    if (jsFilePath == null) {
      throw new Error(`Could not find caller file: ${caller}`);
    }

    if (typeof Bun !== "undefined") {
      return jsFilePath
    } else {
      const sourceMap = this.getSourceMapFromJSPath(jsFilePath);
      return this.normalizePath(path.resolve(jsFilePath, '..', sourceMap.sources[0]));
     }
  }

  private normalizePath(p: string): string {
    return path.resolve(p.replace(/\\/g, '/'));
  }

  private getPlatformPath(path: string): string {
    const exec = /^\/(\w*):(.*)/.exec(path);

    return /^win/.test(process.platform) && exec
      ? `${exec[1]}:\\${exec[2].replace(/\//g, '\\')}`
      : path;
  }

  private getSourceMapFromJSPath(sourcePath: string): SourceMapping {
    const SOURCE_MAP_REGEX = /\/\/# sourceMappingURL=(.*\.map)$/m;
    const filePath = this.getPlatformPath(sourcePath);

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
}
