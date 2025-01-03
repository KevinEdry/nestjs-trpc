import { Test, TestingModule } from '@nestjs/testing';
import { GeneratorModule } from '../generator.module';

describe('GeneratorModule', () => {
  let generatorModule: GeneratorModule;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        GeneratorModule.forRoot({
            rootModuleFilePath: '',
            tsConfigFilePath: './tsconfig.json',
        }),
      ],
    }).compile();

    generatorModule = module.get<GeneratorModule>(GeneratorModule);
  });

  it('should be defined', () => {
    expect(generatorModule).toBeDefined();
  });
});