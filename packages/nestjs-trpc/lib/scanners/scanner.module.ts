import { Module } from '@nestjs/common';
import { FileScanner } from './file.scanner';
import { ImportsScanner } from './imports.scanner';

@Module({
  imports: [],
  providers: [FileScanner, ImportsScanner],
  exports: [FileScanner, ImportsScanner],
})
export class ScannerModule {}
