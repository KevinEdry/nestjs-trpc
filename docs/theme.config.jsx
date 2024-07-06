export default {
  logo: <div className={"md:nx-inline-flex nx-gap-2 nx-items-center"}><img src={'/logo.png'} width={40} /> NestJS tRPC</div>,
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
    text: 'Nextra Docs Template',
  },
  sidebar: {
    titleComponent({ title, type }) {
      if (type === 'separator') {
        return (
          <div style={{ background: 'cyan', textAlign: 'center' }}>{title}</div>
        )
      }
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