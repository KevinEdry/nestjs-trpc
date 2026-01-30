# Release Checklist: v2.0.0

This checklist documents the release process for nestjs-trpc v2.0.0.

## Pre-Release Validation

- [ ] All CI checks pass on main branch
  - [ ] `verify` job (lint, test, build)
  - [ ] `verify-rust-cli` job (fmt, clippy, test, build)
  - [ ] `e2e-tests` job (Express and Fastify examples)

- [ ] Local validation
  - [ ] `bun install && bun run build` succeeds
  - [ ] `bun test` passes (46 unit tests)
  - [ ] `cd packages/nestjs-trpc/cli && cargo test` passes

- [ ] Example apps work
  - [ ] `cd examples/nestjs-express && bun run start:dev` starts without errors
  - [ ] `cd examples/nestjs-fastify && bun run start:dev` starts without errors
  - [ ] `cd examples/nextjs-trpc && bun run dev` starts without errors

## Documentation

- [ ] CHANGELOG.md updated with all changes since last release
  - [ ] Breaking changes clearly marked
  - [ ] Migration guide links included
- [ ] Migration guides complete
  - [ ] docs/docs/migration/v10-to-v11.md
  - [ ] docs/docs/migration/typescript-to-rust-cli.md
- [ ] Installation docs updated (no autoSchemaFile references)
- [ ] README.md updated with CLI workflow

## Binary Publishing

Build Rust CLI for all supported platforms:

- [ ] macOS Intel (x86_64-apple-darwin)
  ```bash
  cargo build --release --target x86_64-apple-darwin
  ```
- [ ] macOS ARM (aarch64-apple-darwin)
  ```bash
  cargo build --release --target aarch64-apple-darwin
  ```
- [ ] Linux x64 (x86_64-unknown-linux-gnu)
  ```bash
  cross build --release --target x86_64-unknown-linux-gnu
  ```
- [ ] Linux ARM (aarch64-unknown-linux-gnu)
  ```bash
  cross build --release --target aarch64-unknown-linux-gnu
  ```
- [ ] Windows x64 (x86_64-pc-windows-msvc)
  ```bash
  cross build --release --target x86_64-pc-windows-msvc
  ```

- [ ] Place binaries in `packages/nestjs-trpc/native/` with correct paths:
  ```
  native/
  ├── darwin-arm64/nestjs-trpc
  ├── darwin-x64/nestjs-trpc
  ├── linux-arm64/nestjs-trpc
  ├── linux-x64/nestjs-trpc
  └── win32-x64/nestjs-trpc.exe
  ```

- [ ] Test CLI binary on at least one platform:
  ```bash
  cd examples/nestjs-express
  npx nestjs-trpc generate --input ./src --output ./src/@generated/server.ts
  ```

## npm Publishing

- [ ] Ensure you're logged into npm: `npm whoami`
- [ ] Update version in package.json:
  ```bash
  cd packages/nestjs-trpc
  npm version major  # Bumps to 2.0.0
  ```
- [ ] Verify package contents:
  ```bash
  npm pack --dry-run
  ```
- [ ] Publish to npm:
  ```bash
  npm publish
  ```
- [ ] Verify package on npmjs.com: https://www.npmjs.com/package/nestjs-trpc
- [ ] Push git tags:
  ```bash
  git push --tags
  ```

## Post-Release

- [ ] Create GitHub Release
  - Go to: https://github.com/KevinEdry/nestjs-trpc/releases/new
  - Tag: v2.0.0
  - Title: v2.0.0
  - Description: Copy from CHANGELOG.md
  - Mark as latest release

- [ ] Announcements
  - [ ] Twitter/X post
  - [ ] Discord announcement (if applicable)

- [ ] Monitor for issues
  - Watch GitHub issues for 24-48 hours after release
  - Be ready to publish patch release if critical bugs found

## Rollback Plan

If critical issues found after publish:

1. Deprecate the broken version:
   ```bash
   npm deprecate nestjs-trpc@2.0.0 "Critical bug found, please use 2.0.1"
   ```

2. Fix the issue and publish patch:
   ```bash
   npm version patch
   npm publish
   ```

## Notes

- Windows ARM64 is not supported in v2.0.0 (document if requested)
- The `autoSchemaFile` option no longer exists - users must use CLI
- Breaking changes require migration guide links in CHANGELOG
