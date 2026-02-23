import Hero from '../Hero';
import DemoShowcase from '../DemoShowcase';
import FeatureGrid from '../FeatureGrid';
import CodeWalkthrough from '../CodeWalkthrough';
import ComparisonSection from '../ComparisonSection';
import Testimonials from '../Testimonials';
import FAQ from '../FAQ';
import JsonLd from '../JsonLd';

const softwareJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareSourceCode',
  name: 'NestJS tRPC',
  description:
    'Build end-to-end type-safe APIs in NestJS using tRPC decorators. Rust-powered CLI, dependency injection, Express & Fastify support.',
  codeRepository: 'https://github.com/KevinEdry/nestjs-trpc',
  programmingLanguage: ['TypeScript', 'Rust'],
  runtimePlatform: 'Node.js',
  license: 'https://opensource.org/licenses/MIT',
  author: {
    '@type': 'Person',
    name: 'Kevin Edry',
    url: 'https://kevin-edry.com',
  },
};

export default function Home() {
  return (
    <div className="home-layout flex flex-col gap-24 py-16">
      <JsonLd data={softwareJsonLd} />
      <div className="container"><Hero /></div>
      <div className="container"><DemoShowcase /></div>
      <div className="container"><FeatureGrid /></div>
      <div className="container"><CodeWalkthrough /></div>
      <div className="relative border-y border-card-border bg-card-bg overflow-hidden py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center_top,_#398CCB15_0%,_transparent_70%)]" />
        <div className="relative container">
          <ComparisonSection />
        </div>
      </div>
      <div className="container"><FAQ /></div>
      <div className="container"><Testimonials /></div>
    </div>
  );
}
