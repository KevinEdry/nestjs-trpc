import { SourceFile } from 'ts-morph';

export async function saveOrOverrideFile(
  sourceFile: SourceFile,
): Promise<void> {
  sourceFile.formatText({ indentSize: 2 });
  await sourceFile.save();
}
