import CTAButtons from '../CTAButtons';

export default function BottomCTA() {
  return (
    <section className="relative flex flex-col items-center gap-6 text-center py-16 px-8 rounded-2xl border border-[#1A1A1A] bg-[#0D0D0D] overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center_top,_#398CCB15_0%,_transparent_70%)]" />
      <h2 className="relative text-3xl md:text-4xl font-medium bg-gradient-to-b from-white to-[#7EC7FF] inline-block text-[RGBA(0,0,0,0)] bg-clip-text">
        Start building type-safe APIs today
      </h2>
      <div className="relative">
        <CTAButtons />
      </div>
    </section>
  );
}
