export default function FeatureCard({ icon, title, description }) {
  return (
    <div className="flex-1 text-left flex flex-col pt-20 bg-background-black p-8 rounded-xl min-h-52 shadow-[inset_0_0_0_rgba(220,220,220,0.6)] gap-2">
      <div className="">{icon}</div>
      <h3 className="">{title}</h3>
      <p className="text-sm">{description}</p>
    </div>
  )}