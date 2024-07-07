export default {
  logo: <div className={"md:nx-inline-flex nx-gap-2 nx-items-center"}><img src={'/logo.png'} width={40} /> NestJS tRPC</div>,
  primaryHue: 200,
  primarySaturation: 100,
  project: {
    link: 'https://github.com/KevinEdry/nestjs-trpc',
  },
  banner: {
    key: '1.0-release',
    text: (
      <a href="https://nextra.site" target="_blank">
        🎉 NestJS tRPC 1.0 is released. Read more →
      </a>
    )
  },
  chat: {
    link: 'https://github.com/kevinedry/nestjs-chat',
  },
  docsRepositoryBase: 'https://github.com/KevinEdry/nestjs-trpc',
  footer: {
    text: () => <span>
      Made in Seatlle with ❤️ by{" "}
      <a href="https://github.com/KevinEdry"
         target="_blank"
         >
        <u> Kevin Edry </u>
      </a>
    </span>
  },
  sidebar: {
    titleComponent({ title, type }) {
      if (title === 'Introduction') {
        return <>🙋🏻‍♂️&nbsp;{title}</>
      }
      if (title === "Setup") {
        return <>📦️&nbsp;{title}</>
      }
      return <>{title}</>
    }
  }
}