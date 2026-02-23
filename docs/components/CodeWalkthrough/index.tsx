import CodeBlock from '../CodeBlock';
import SectionHeader from '../SectionHeader';

interface WalkthroughStep {
  step: number;
  title: string;
  description: string;
  code: string;
  filename: string;
}

const steps: WalkthroughStep[] = [
  {
    step: 1,
    title: 'Install & Configure',
    description:
      'Add nestjs-trpc to your NestJS app and configure the module with your preferred settings.',
    code: `import { Module } from '@nestjs/common';
import { TRPCModule } from 'nestjs-trpc';

@Module({
  imports: [
    TRPCModule.forRoot(),
  ],
})
export class AppModule {}`,
    filename: 'app.module.ts',
  },
  {
    step: 2,
    title: 'Define Your Router',
    description:
      'Use familiar NestJS decorators with full dependency injection and Zod schema validation.',
    code: `import { Router, Query } from 'nestjs-trpc';
import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { UserService } from './user.service';

@Router({ alias: 'users' })
export class UserRouter {
  constructor(
    @Inject(UserService)
    private readonly userService: UserService,
  ) {}

  @Query({
    input: z.object({ id: z.string() }),
    output: z.object({
      id: z.string(),
      name: z.string(),
    }),
  })
  getUserById(input: { id: string }) {
    return this.userService.findById(input.id);
  }
}`,
    filename: 'user.router.ts',
  },
  {
    step: 3,
    title: 'Generate & Consume',
    description:
      'Run the CLI to generate types, then enjoy full autocompletion on the client.',
    code: `// Run: npx nestjs-trpc generate

// Client-side usage with full type safety
import { createTRPCClient } from '@trpc/client';
import type { AppRouter } from './server/@generated';

const client = createTRPCClient<AppRouter>({
  links: [/* ... */],
});

// Full autocompletion & type checking
const user = await client.users.getUserById.query({
  id: '1',
});
// ^? { id: string; name: string }`,
    filename: 'client.ts',
  },
];

function StepItem({ step, title, description, code, filename }: WalkthroughStep) {
  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start">
      <div className="lg:w-2/5 flex flex-col gap-3 lg:sticky lg:top-24">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold">
            {step}
          </span>
          <h3 className="text-xl font-medium">{title}</h3>
        </div>
        <p className="text-subtext">{description}</p>
      </div>
      <div className="lg:w-3/5 w-full">
        <CodeBlock code={code} filename={filename} />
      </div>
    </div>
  );
}

export default function CodeWalkthrough() {
  return (
    <section className="flex flex-col gap-12">
      <SectionHeader
        title="Get Started in 3 Steps"
        subtitle="From install to type-safe client in under 5 minutes."
      />
      <div className="flex flex-col gap-16">
        {steps.map((step) => (
          <StepItem key={step.step} {...step} />
        ))}
      </div>
    </section>
  );
}
