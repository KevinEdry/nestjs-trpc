import { XIcon, CheckIcon } from 'lucide-react';

interface ComparisonCardProps {
  variant: 'without' | 'with';
  text: string;
}

export default function ComparisonCard({ variant, text }: ComparisonCardProps) {
  const isWith = variant === 'with';

  return (
    <div
      className={`flex items-start gap-3 p-5 rounded-xl border ${
        isWith
          ? 'border-primary/20 bg-primary/5'
          : 'border-card-border bg-card-bg'
      }`}
    >
      {isWith ? (
        <CheckIcon width={18} className="text-success mt-0.5 shrink-0" />
      ) : (
        <XIcon width={18} className="text-[#EF4444] mt-0.5 shrink-0" />
      )}
      <div className="flex flex-col gap-1">
        <p
          className={`text-xs font-medium uppercase tracking-wide ${
            isWith ? 'text-primary' : 'text-muted'
          }`}
        >
          {isWith ? 'With NestJS tRPC' : 'Without NestJS tRPC'}
        </p>
        <p className="text-subtext text-sm">{text}</p>
      </div>
    </div>
  );
}
