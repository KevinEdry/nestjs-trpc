interface SectionHeaderProps {
  title: string;
  subtitle?: string;
}

export default function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <h2 className="text-3xl md:text-4xl font-medium">{title}</h2>
      {subtitle && <p className="text-lg text-subtext">{subtitle}</p>}
    </div>
  );
}
