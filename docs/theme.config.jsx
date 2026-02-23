import { Footer } from './components/Footer';

export default {
  logo: <div className={"md:nx-inline-flex nx-gap-2 nx-items-center nx-font-bold"}><img src={'/logo.png'} alt={'nestjs-trpc logo'} width={40} /> NestJS tRPC</div>,
  primaryHue: 200,
  primarySaturation: 100,
  project: {
    link: 'https://github.com/KevinEdry/nestjs-trpc',
  },
  footer: {
    component: <Footer />
  },
  banner: {
    key: '2.0.0-release',
    text: (
      <a href="https://github.com/KevinEdry/nestjs-trpc/releases" target="_blank">
        NestJS tRPC 2.0.0 is released — Rust CLI, tRPC v11 & Zod 4 support. Read more →
      </a>
    ),
    dismissible: true
  },
  chat: {
    link: 'https://discord.gg/trpc-867764511159091230',
  },
  docsRepositoryBase: 'https://github.com/KevinEdry/nestjs-trpc',
  sidebar: {
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
      defaultTitle: "NestJS tRPC - End-to-End Type-Safe APIs for NestJS with tRPC v11",
      description: "Build end-to-end type-safe APIs in NestJS using tRPC decorators. Rust-powered CLI, dependency injection, Express & Fastify support. Zero boilerplate.",
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
        {
          rel: "canonical",
          href: "https://nestjs-trpc.io/"
        }
      ],
      additionalMetaTags: [
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1.0"
        },
        {
          charset: "utf-8",
        },
        {
          name: "keywords",
          content: "nestjs trpc, nestjs type-safe api, trpc nestjs adapter, trpc nestjs integration, nestjs api framework, type-safe node api, nestjs end-to-end typesafe, trpc decorator nestjs"
        },
        {
          name: "description",
          content: "Build end-to-end type-safe APIs in NestJS using tRPC decorators. Rust-powered CLI, dependency injection, Express & Fastify support. Zero boilerplate."
        },
        {
          property: "og:image",
          content: "https://nestjs-trpc.io/banner.png"
        },
        {
          property: "og:image:width",
          content: "1200"
        },
        {
          property: "og:image:height",
          content: "630"
        },
        {
          property: "og:image:alt",
          content: "NestJS tRPC - End-to-End Type-Safe APIs"
        },
        {
          property: "og:type",
          content: "website"
        },
        {
          property: "og:title",
          content: "NestJS tRPC - End-to-End Type-Safe APIs for NestJS with tRPC v11",
        },
        {
          property: "og:description",
          content: "Build end-to-end type-safe APIs in NestJS using tRPC decorators. Rust-powered CLI, dependency injection, Express & Fastify support. Zero boilerplate."
        },
        {
          property: "og:site_name",
          content: "NestJS tRPC"
        },
        {
          property: "og:url",
          content: "https://nestjs-trpc.io/"
        },
        {
          name: "twitter:card",
          content: "summary_large_image"
        },
        {
          name: "twitter:image",
          content: "https://nestjs-trpc.io/banner.png"
        },
        {
          name: "twitter:title",
          content: "NestJS tRPC - End-to-End Type-Safe APIs for NestJS"
        },
        {
          name: "twitter:description",
          content: "Build end-to-end type-safe APIs in NestJS using tRPC decorators. Rust-powered CLI, dependency injection, Express & Fastify support."
        },
        {
          name: "twitter:site",
          content: "@KevinEdry"
        }
      ]
    }
  },
}
