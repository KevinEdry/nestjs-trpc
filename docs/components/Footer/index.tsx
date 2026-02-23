import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

const productLinks = [
  { label: 'Documentation', href: '/docs' },
  { label: 'Installation', href: '/docs/nestjs' },
  { label: 'Routers', href: '/docs/routers' },
  { label: 'Middlewares', href: '/docs/middlewares' },
  { label: 'Subscriptions', href: '/docs/subscriptions' },
];

const resourceLinks = [
  { label: 'GitHub', href: 'https://github.com/KevinEdry/nestjs-trpc', external: true },
  { label: 'Releases', href: 'https://github.com/KevinEdry/nestjs-trpc/releases', external: true },
  { label: 'npm', href: 'https://www.npmjs.com/package/nestjs-trpc', external: true },
];

const communityLinks = [
  { label: 'Discord', href: 'https://discord.gg/trpc-867764511159091230', external: true },
  { label: 'Twitter/X', href: 'https://twitter.com/KevinEdry', external: true },
  { label: 'Contributors', href: 'https://github.com/KevinEdry/nestjs-trpc/graphs/contributors', external: true },
];

function FooterColumn({ title, links }: { title: string; links: typeof productLinks }) {
  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-sm font-medium text-white">{title}</h4>
      <ul className="flex flex-col gap-2">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              {...('external' in link ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className="text-sm text-muted hover:text-subtext transition-colors"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const Footer = () => {
  return (
    <footer className="w-full border-t border-card-border">
      <div className="container flex flex-col gap-10 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1 flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2">
              <Image
                className="rounded-lg"
                src="/logo.png"
                alt="NestJS tRPC logo"
                width={40}
                height={40}
              />
              <span className="font-bold">NestJS tRPC</span>
            </Link>
            <p className="text-xs text-muted">
              End-to-end type-safe APIs for NestJS with tRPC.
            </p>
          </div>
          <FooterColumn title="Product" links={productLinks} />
          <FooterColumn title="Resources" links={resourceLinks} />
          <FooterColumn title="Community" links={communityLinks} />
        </div>
        <div className="flex flex-col md:flex-row justify-between items-center gap-3 border-t border-card-border pt-6">
          <p className="text-xs text-muted">
            Made with care in Seattle by{' '}
            <Link
              href="https://kevin-edry.com/"
              className="hover:text-primary transition-all font-medium"
              target="_blank"
            >
              Kevin Edry
            </Link>
          </p>
          <span className="text-xs text-muted border border-card-border px-2 py-0.5 rounded">MIT License</span>
        </div>
      </div>
    </footer>
  );
};
