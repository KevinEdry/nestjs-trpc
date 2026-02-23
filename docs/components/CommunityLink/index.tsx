import { ReactNode } from 'react';
import Link from 'next/link';

interface CommunityLinkProps {
  href: string;
  icon: ReactNode;
  label: string;
}

export default function CommunityLink({ href, icon, label }: CommunityLinkProps) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 px-6 py-3 rounded-xl border border-card-border bg-card-bg transition-all hover:border-primary/30"
    >
      {icon}
      <span className="text-subtext">{label}</span>
    </Link>
  );
}
