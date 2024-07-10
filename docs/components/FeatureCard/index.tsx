import clsx from 'clsx';

export default function FeatureCard({ Icon, title, description }) {
  return (
    <div className={clsx(
      "shadow-[inset_0_0_50px_0_#ffffff29] hover:shadow-[inset_0_0_60px_0_#ffffff29]",
      "flex-1 text-left pt-20 bg-background-black p-8 rounded-xl min-h-52 transition-all basis-1/4 min-w-[300px] border border-white/20 group"
    )}>
      <div className={"flex flex-col gap-2 group-hover:-translate-y-3 transition-all"}>
        <Icon width={50} height={50} className="text-border-gray/50 group-hover:text-primary"/>
        <h3 className="text-lg">{title}</h3>
        <p className="text-sm text-subtext">{description}</p>
      </div>
    </div>
  )}