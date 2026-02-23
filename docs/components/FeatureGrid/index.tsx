import {
  ZapIcon,
  ShieldCheckIcon,
  BlocksIcon,
  CodeIcon,
  RadioIcon,
  ServerIcon,
  ShieldIcon,
  RefreshCwIcon,
} from 'lucide-react';
import FeatureCard from '../FeatureCard';
import SectionHeader from '../SectionHeader';

const highlighted = [
  {
    Icon: ShieldCheckIcon,
    title: 'End-to-End Type Safety',
    description:
      'Full static typesafety and autocompletion for inputs, outputs, and errors — from server to client. Zero runtime overhead.',
    featured: true,
  },
  {
    Icon: ZapIcon,
    title: 'Rust-Powered CLI',
    description:
      'Type generation in milliseconds, not seconds. 10-50x faster than TypeScript-based tools with rich error messages.',
    featured: true,
  },
];

const features = [
  {
    Icon: BlocksIcon,
    title: 'NestJS Dependency Injection',
    description: 'Routers, middlewares, and error handlers are first-class NestJS providers.',
  },
  {
    Icon: CodeIcon,
    title: 'Zero Boilerplate',
    description: '@Router, @Query, @Mutation decorators replace manual router wiring.',
  },
  {
    Icon: RadioIcon,
    title: 'Real-Time Subscriptions',
    description: 'Stream data with SSE using async generators on tRPC v11.',
  },
  {
    Icon: ServerIcon,
    title: 'Express & Fastify',
    description: 'Auto-detected HTTP adapter. Works out of the box with both.',
  },
  {
    Icon: ShieldIcon,
    title: 'Typed Middlewares & Context',
    description: 'Global and per-route middlewares with full DI support and auto-typed context.',
  },
  {
    Icon: RefreshCwIcon,
    title: 'Watch Mode',
    description: 'Automatic type regeneration during development.',
  },
];

export default function FeatureGrid() {
  return (
    <section className="flex flex-col gap-8">
      <SectionHeader
        title="Why NestJS tRPC?"
        subtitle="Everything you need to build type-safe APIs in NestJS."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {highlighted.map((feature) => (
          <FeatureCard key={feature.title} {...feature} />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((feature) => (
          <FeatureCard key={feature.title} {...feature} />
        ))}
      </div>
    </section>
  );
}
