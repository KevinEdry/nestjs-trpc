import ComparisonCard from '../ComparisonCard';
import SectionHeader from '../SectionHeader';

const comparisons = [
  {
    without: 'Manual router wiring with nested function calls',
    with: 'Declarative @Router, @Query, @Mutation decorators',
  },
  {
    without: 'Separate dependency injection system or none at all',
    with: 'Native NestJS DI — inject services directly into routers',
  },
  {
    without: 'Manual type generation scripts or no generation at all',
    with: 'Rust CLI generates types in milliseconds with watch mode',
  },
];

export default function ComparisonSection() {
  return (
    <section className="flex flex-col gap-8">
      <SectionHeader
        title="Built for the NestJS Ecosystem"
        subtitle="NestJS tRPC works the way you'd expect a NestJS library to work."
      />
      <div className="flex flex-col gap-4">
        {comparisons.map((item, i) => (
          <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ComparisonCard variant="without" text={item.without} />
            <ComparisonCard variant="with" text={item.with} />
          </div>
        ))}
      </div>
    </section>
  );
}
