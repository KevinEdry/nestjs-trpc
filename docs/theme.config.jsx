import { Footer } from './components/Footer';

export default {
  logo: <div className={"md:nx-inline-flex nx-gap-2 nx-items-center nx-font-bold"}><img src={'/logo.png'} width={40} /> NestJS tRPC</div>,
  primaryHue: 200,
  primarySaturation: 100,
  project: {
    link: 'https://github.com/KevinEdry/nestjs-trpc',
  },
  footer: {
    component: <Footer />
  },
  banner: {
    key: '1.0-release',
    text: (
      <a href="https://nextra.site" target="_blank">
        🎉 NestJS tRPC 1.0 is released. Read more →
      </a>
    ),
    dismissible: true
  },
  chat: {
    link: 'https://github.com/kevinedry/nestjs-chat',
  },
  docsRepositoryBase: 'https://github.com/KevinEdry/nestjs-trpc',
  sidebar: {
    toggleButton: true,
    defaultMenuCollapseLevel: 1,
  },
  nextThemes: {
    defaultTheme: 'dark',
    forcedTheme: 'dark',
  },
  themeSwitch: {
    component: null,
  },
  useNextSeoProps() {
    return {
      defaultTitle: "NestJS tRPC Documentation",
      titleTemplate: "NestJS tRPC Guide Documents - %s",
      additionalLinkTags: [
        {
          rel: "apple-touch-icon",
          sizes: "180x180",
          href: "/favicon/apple-touch-icon.png"
        },
        {
          rel: "manifest",
          href: "/favicon/site.webmanifest"
        },
        ...[16, 32].map(size => ({
          rel: "icon",
          type: "image/png",
          sizes: `${size}x${size}`,
          href: `/favicon/favicon-${size}x${size}.png`
        })),
      ],
      additionalMetaTags: [
        {
          property: "og:image",
          content: "/og.jpg"
        },
        {
          property: "og:type",
          content: "object"
        },
        {
          property: "og:title",
          content: "NestJS tRPC Adapter Documentation",
        },
        {
          property: "og:description",
          content: "NestJS Helper Libraries"
        },
        {
          property: "og:site_name",
          content: "NestJS tRPC Documentation"
        },
        {
          property: "og:url",
          content: "https://nestjs-trpc.io"
        },
        {
          name: "twitter:card",
          content: "summary"
        },
        {
          name: "twitter:image",
          content: "https://nestjs-trpc.io/banner.png"
        },
        {
          name: "twitter:title",
          content: "NestJS tRPC Documentation"
        },
        {
          name: "twitter:description",
          content: "NestJS tRPC Adapter Documentation"
        },
        {
          name: "twitter:site",
          content: "@KevinEdry"
        }
      ]
    }
  },
}