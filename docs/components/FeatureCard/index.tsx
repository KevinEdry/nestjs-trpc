import clsx from 'clsx';

interface FeatureCardProps {
  Icon: React.ElementType;
  title: string;
  description: string;
  badge?: string;
  featured?: boolean;
}

export default function FeatureCard({ Icon, title, description, badge, featured }: FeatureCardProps) {
  return (
    <div
      className={clsx(
        'text-left rounded-2xl transition-all border group',
        featured
          ? 'p-8 bg-gradient-to-b from-primary/10 to-primary/5 border-primary/20 hover:border-primary/30'
          : 'p-6 bg-card-bg/50 border-card-border hover:border-border-gray/30'
      )}
    >
      <div className="flex flex-col gap-3">
        <div
          className={clsx(
            'flex items-center justify-center rounded-full',
            featured ? 'w-12 h-12 bg-primary/10' : 'w-10 h-10 bg-primary/10'
          )}
        >
          <Icon
            width={featured ? 22 : 18}
            height={featured ? 22 : 18}
            className="text-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <h3 className={clsx('font-semibold', featured ? 'text-lg' : 'text-base')}>
            {title}
          </h3>
          {badge && (
            <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wide">
              {badge}
            </span>
          )}
        </div>
        <p className={clsx('text-subtext leading-relaxed', featured ? 'text-base' : 'text-sm')}>
          {description}
        </p>
      </div>
    </div>
  );
}
