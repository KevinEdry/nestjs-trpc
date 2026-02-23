import Link from 'next/link';
import SectionHeader from '../SectionHeader';

const DiscordIcon = () => (
  <svg width="24" height="20" viewBox="0 0 71 55" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M60.1 4.9A58.5 58.5 0 0045.4.2a.2.2 0 00-.2.1 40.7 40.7 0 00-1.8 3.7 54 54 0 00-16.2 0A26.4 26.4 0 0025.4.3a.2.2 0 00-.2-.1A58.4 58.4 0 0010.5 5a.2.2 0 00-.1 0C1.5 18.7-.9 32 .3 45.1v.1a58.9 58.9 0 0017.7 9 .2.2 0 00.3-.1 42.1 42.1 0 003.6-5.9.2.2 0 00-.1-.3 38.8 38.8 0 01-5.5-2.7.2.2 0 010-.4l1.1-.9a.2.2 0 01.2 0 42 42 0 0035.6 0 .2.2 0 01.2 0l1.1.9a.2.2 0 010 .4 36.4 36.4 0 01-5.5 2.6.2.2 0 00-.1.3 47.3 47.3 0 003.6 5.9.2.2 0 00.3.1A58.7 58.7 0 0070.7 45.2v-.1C72.1 30 68.1 16.8 60.2 5a.2.2 0 000 0zM23.7 37a6.9 6.9 0 01-6.4-7.2 6.9 6.9 0 016.4-7.2 6.8 6.8 0 016.4 7.2 6.9 6.9 0 01-6.4 7.2zm23.6 0a6.9 6.9 0 01-6.4-7.2 6.9 6.9 0 016.4-7.2 6.8 6.8 0 016.4 7.2 6.9 6.9 0 01-6.4 7.2z" fill="currentColor"/>
  </svg>
);

const GitHubIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.167 6.839 9.49.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844a9.59 9.59 0 012.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" fill="currentColor"/>
  </svg>
);

const communityLinks = [
  {
    href: 'https://discord.gg/trpc-867764511159091230',
    icon: <DiscordIcon />,
    title: 'Join the Discord',
    description: 'Ask questions, share ideas, and connect with other developers.',
  },
  {
    href: 'https://github.com/KevinEdry/nestjs-trpc',
    icon: <GitHubIcon />,
    title: 'Star on GitHub',
    description: 'Browse the source, report issues, and contribute to the project.',
  },
];

export default function Testimonials() {
  return (
    <section className="flex flex-col gap-8">
      <SectionHeader
        title="Community"
        subtitle="Join the growing NestJS tRPC community."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {communityLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-4 p-6 rounded-xl border border-card-border bg-card-bg transition-all hover:border-primary/30 hover:bg-card-bg-hover group"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-surface text-subtext group-hover:text-primary group-hover:bg-primary/10 transition-all flex-shrink-0">
              {link.icon}
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-medium text-white">{link.title}</span>
              <span className="text-sm text-subtext">{link.description}</span>
            </div>
          </Link>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        <p className="text-sm text-subtext">Built by contributors like you</p>
        <Link
          href="https://github.com/KevinEdry/nestjs-trpc/graphs/contributors"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://contrib.rocks/image?repo=KevinEdry/nestjs-trpc&columns=12"
            alt="NestJS tRPC contributors"
            className="rounded-xl opacity-80 hover:opacity-100 transition-opacity"
          />
        </Link>
      </div>
    </section>
  );
}
