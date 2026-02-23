import { useEffect, useState } from 'react';
import { LazyMotion, domAnimation, m } from 'framer-motion';
import { DownloadIcon, StarIcon, UsersIcon, ScaleIcon } from 'lucide-react';
import AnnouncementPill from '../AnnouncementPill';
import CTAButtons from '../CTAButtons';

interface Stats {
  weeklyDownloads: number;
  stars: number;
  contributors: number;
}

const FALLBACK: Stats = {
  weeklyDownloads: 5000,
  stars: 1000,
  contributors: 20,
};

function formatNumber(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`;
  }
  return n.toLocaleString();
}

function useProjectStats(): Stats {
  const [stats, setStats] = useState<Stats>(FALLBACK);

  useEffect(() => {
    async function fetchStats() {
      const [npmRes, repoRes, contribRes] = await Promise.allSettled([
        fetch('https://api.npmjs.org/downloads/point/last-week/nestjs-trpc'),
        fetch('https://api.github.com/repos/KevinEdry/nestjs-trpc'),
        fetch('https://api.github.com/repos/KevinEdry/nestjs-trpc/contributors?per_page=1&anon=true'),
      ]);

      const next = { ...FALLBACK };

      if (npmRes.status === 'fulfilled' && npmRes.value.ok) {
        const data = await npmRes.value.json();
        if (data.downloads) next.weeklyDownloads = data.downloads;
      }

      if (repoRes.status === 'fulfilled' && repoRes.value.ok) {
        const data = await repoRes.value.json();
        if (data.stargazers_count) next.stars = data.stargazers_count;
      }

      if (contribRes.status === 'fulfilled') {
        const linkHeader = contribRes.value.headers.get('link');
        if (linkHeader) {
          const match = linkHeader.match(/page=(\d+)>; rel="last"/);
          if (match) next.contributors = parseInt(match[1], 10);
        }
      }

      setStats(next);
    }

    fetchStats();
  }, []);

  return stats;
}

export default function Hero() {
  const stats = useProjectStats();

  const statItems = [
    { icon: DownloadIcon, label: `${formatNumber(stats.weeklyDownloads)} weekly downloads` },
    { icon: StarIcon, label: `${formatNumber(stats.stars)} GitHub stars` },
    { icon: UsersIcon, label: `${stats.contributors} contributors` },
    { icon: ScaleIcon, label: 'MIT Licensed' },
  ];

  return (
    <LazyMotion features={domAnimation}>
      <header className="flex flex-col items-center gap-7 text-center">
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <AnnouncementPill
            text="v2.0.0 — Rust CLI, tRPC v11 & Zod 4 support"
            href="https://github.com/KevinEdry/nestjs-trpc/releases"
          />
        </m.div>

        <m.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="text-5xl md:text-6xl lg:text-7xl font-semibold bg-gradient-to-b from-white to-[#7EC7FF] inline-block text-[RGBA(0,0,0,0)] bg-clip-text leading-tight max-w-4xl"
        >
          End-to-End Type-Safe APIs for NestJS
        </m.h1>

        <m.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="text-subtext text-lg md:text-xl max-w-2xl"
        >
          The missing bridge between NestJS and tRPC. Decorators you already know,
          types that write themselves, powered by a Rust CLI that generates in milliseconds.
        </m.p>

        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className=""
        >
          <CTAButtons />
        </m.div>

        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-muted"
        >
          {statItems.map((stat) => (
            <div key={stat.label} className="flex items-center gap-2">
              <stat.icon width={14} />
              <span>{stat.label}</span>
            </div>
          ))}
        </m.div>
      </header>
    </LazyMotion>
  );
}
