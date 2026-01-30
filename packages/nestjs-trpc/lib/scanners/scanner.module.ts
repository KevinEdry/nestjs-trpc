import { Module } from '@nestjs/common';
import { FileScanner } from './file.scanner';

@Module({
  imports: [],
  providers: [FileScanner],
  exports: [FileScanner],
})
export class ScannerModule {}
