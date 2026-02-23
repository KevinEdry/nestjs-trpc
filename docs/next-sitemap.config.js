/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://nestjs-trpc.io',
  generateRobotsTxt: true,
  transform: async (config, path) => {
    if (path === '/') {
      return {
        loc: path,
        changefreq: 'weekly',
        priority: 1.0,
        lastmod: new Date().toISOString(),
      };
    }
    return {
      loc: path,
      changefreq: config.changefreq,
      priority: config.priority,
      lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
    };
  },
};
