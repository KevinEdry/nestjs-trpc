import JsonLd from '../JsonLd';
import FAQItem from '../FAQItem';
import SectionHeader from '../SectionHeader';

const faqs = [
  {
    question: 'Is NestJS tRPC production-ready?',
    answer:
      'Yes. NestJS tRPC v2.0.0 is stable and used in production by multiple companies. The library has comprehensive test coverage, supports tRPC v11, and follows semantic versioning for safe upgrades.',
  },
  {
    question: 'How does it compare to using tRPC directly?',
    answer:
      'NestJS tRPC wraps tRPC with NestJS-native decorators (@Router, @Query, @Mutation) and integrates with NestJS dependency injection. You get the same end-to-end typesafety as vanilla tRPC, but with the conventions and DI system you already use in NestJS.',
  },
  {
    question: 'What versions of tRPC and Zod are supported?',
    answer:
      'NestJS tRPC v2.0.0 supports tRPC v11 and both Zod 3 and Zod 4 schemas for input/output validation. The library tracks tRPC releases closely and supports the latest stable versions.',
  },
  {
    question: 'How fast is the type generation CLI?',
    answer:
      'The CLI is written in Rust and generates types 10-50x faster than equivalent TypeScript-based tools. For most projects, generation completes in single-digit milliseconds. Watch mode keeps types in sync during development with near-zero latency.',
  },
  {
    question: 'Can I use this with my existing NestJS project?',
    answer:
      'Yes. NestJS tRPC is designed for incremental adoption. Install the package, configure TRPCModule.forRoot() in your app module, and start adding @Router classes alongside your existing controllers. It works with both Express and Fastify adapters.',
  },
  {
    question: 'Does it support real-time subscriptions?',
    answer:
      'Yes. NestJS tRPC supports real-time subscriptions using Server-Sent Events (SSE) with async generators on tRPC v11. You can stream data from the server to clients with full type safety.',
  },
];

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  })),
};

export default function FAQ() {
  return (
    <section className="flex flex-col gap-8">
      <JsonLd data={faqJsonLd} />
      <SectionHeader title="Frequently Asked Questions" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
        {faqs.map((faq) => (
          <FAQItem key={faq.question} {...faq} />
        ))}
      </div>
    </section>
  );
}
