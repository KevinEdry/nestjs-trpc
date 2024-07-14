# ⚡️ Full-stack type-safe pnpm monorepo with NestJS, NextJS & tRPC

This an accompanying repo to [this tutorial](https://www.tomray.dev/nestjs-nextjs-trpc) which covers how to build a full-stack, end to end type-safe pnpm monorepo with [NestJS](https://nestjs.com/), [NextJS 13](https://nextjs.org/docs) (using the new `/app` directory) & [tRPC](https://trpc.io/).

I have fallen in love with this tech stack as the developer experience is SO good! I'm pretty sure you will too 😉.

In particular, I love that:

- It's fully end-to-end type safe
- The tRPC server is fully integrated into NestJS, so you have access to all of NestJS's wonderful functionality like dependency injection
- Fits really well with the NextJS 13 transition to server side rendering
- It keeps the frontend(s) and backend project seperate, but seamlessly working together in the monorepo

I also wrote this tutorial [as many people](https://github.com/trpc/trpc/discussions/1504) in the NestJS community are curious on how to use tRPC with NestJS!

The only pre-requisites for this tutorial is that you'll need [pnpm](https://pnpm.io/installation) and the [NestJS CLI](https://docs.nestjs.com/cli/overview) installed on your machine.

## Give it a spin:

First make sure you add an `.env.local` file inside the `web` app with the following variable:

```env
NEXT_PUBLIC_NESTJS_SERVER=http://localhost:4000
```

Then install the dependencies:

```
pnpm install
pnpm dev       # starts local server for both frontend (NextJS) and backend (NestJS)
```
