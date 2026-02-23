import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import CopyInstallButton from '../CopyInstallButton';

export default function CTAButtons() {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      <Link href="/docs">
        <button
          type="button"
          className="flex py-3 px-6 gap-2 bg-primary text-white rounded-full items-center group transition-all hover:bg-primary/90 text-sm font-medium"
        >
          Get Started
          <ArrowRight width={15} className="transition-transform group-hover:translate-x-1" />
        </button>
      </Link>
      <CopyInstallButton />
    </div>
  );
}
