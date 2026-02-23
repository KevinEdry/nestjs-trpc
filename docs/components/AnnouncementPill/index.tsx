import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface AnnouncementPillProps {
  text: string;
  href: string;
}

export default function AnnouncementPill({ text, href }: AnnouncementPillProps) {
  return (
    <Link href={href} target="_blank" rel="noopener noreferrer">
      <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-sm text-primary transition-all hover:bg-primary/10 hover:border-primary/50">
        <span>{text}</span>
        <ArrowRight width={14} />
      </span>
    </Link>
  );
}
