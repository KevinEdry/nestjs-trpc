# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**NestJS tRPC** is a library that integrates tRPC into the NestJS framework using an opinionated, decorator-based approach that aligns with NestJS conventions. It provides end-to-end typesafety for APIs with automatic AppRouter generation and full dependency injection support.

## Development Commands

### Build & Development
```bash
# Build all packages (uses TypeScript project references)
bun run build

# Build nestjs-trpc package only
cd packages/nestjs-trpc && bun run build

# Watch mode for development
cd packages/nestjs-trpc && bun run start:dev

# Debug with Node inspector
cd packages/nestjs-trpc && bun run debug:dev

# Clean build artifacts
bun run clean
```

### Testing
```bash
# Run all tests (workspace-wide)
bun test

# Run tests for nestjs-trpc package only
cd packages/nestjs-trpc && bun test

# Run tests with coverage
cd packages/nestjs-trpc && bun test --coverage

# Run related tests for changed files (used by lint-staged)
bun test --bail --findRelatedTests <file>
```

### Linting & Formatting
```bash
# Lint and auto-fix
bun run lint

# Lint without fixing (CI mode)
bun run lint --no-fix

# Format code
bun run format
```

### Running Examples
```bash
# Run Express example
cd examples/nestjs-express && bun run start:dev

# Run Fastify example
cd examples/nestjs-fastify && bun run start:dev

# Run Next.js example (client-side)
cd examples/nextjs-trpc && bun run dev
```

### Git Workflow
- Commits use conventional commits enforced by commitlint
- Allowed types: `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, `test`, `sample`
- Lint-staged runs on pre-commit: prettier, eslint, and related tests
- Tests must pass for affected files before committing

## Architecture

### Core Concepts

The library follows a factory-based architecture where decorators mark classes and methods, then factories extract metadata at runtime to build the tRPC router:

1. **Decorators** (`lib/decorators/`) - Metadata markers for routers and procedures:
   - `@Router()` - Marks classes as tRPC routers, stores file path and optional alias
   - `@Query()` / `@Mutation()` - Marks methods as tRPC procedures with input/output schemas
   - `@UseMiddlewares()` - Attaches middleware to routers or procedures
   - `@Context()` / `@RawInput()` - Parameter decorators for dependency injection

2. **Factories** (`lib/factories/`) - Extract metadata and build tRPC structures:
   - `RouterFactory` - Scans NestJS modules to find `@Router()` classes via reflection
   - `ProcedureFactory` - Extracts `@Query()` and `@Mutation()` methods from router instances
   - `MiddlewareFactory` - Processes `@UseMiddlewares()` metadata
   - `TRPCFactory` - Top-level orchestrator that calls `RouterFactory.serializeRoutes()`

3. **Generators** (`lib/generators/`) - TypeScript code generation for client types:
   - `TRPCGenerator` - Main entry point, orchestrates schema file generation
   - `RouterGenerator` - Generates router type definitions from metadata
   - `ProcedureGenerator` - Generates procedure type definitions with input/output schemas
   - `MiddlewareGenerator` / `ContextGenerator` - Generate context type augmentations
   - Uses `ts-morph` to build TypeScript AST and write generated files

4. **Scanners** (`lib/scanners/`) - File system and import analysis:
   - `FileScanner` - Resolves caller file paths from stack traces
   - `ImportsScanner` - Builds import dependency maps using `ts-morph`

5. **Drivers** (`lib/drivers/`) - HTTP adapter integration:
   - `ExpressDriver` - Integrates with Express via `@trpc/server/adapters/express`
   - `FastifyDriver` - Integrates with Fastify via `@trpc/server/adapters/fastify`
   - Auto-detected based on NestJS HttpAdapter

### Runtime Flow

1. **Module Initialization** (`TRPCModule.forRoot()`):
   - Accepts `TRPCModuleOptions` including `autoSchemaFile` path
   - If `autoSchemaFile` is provided, registers `GeneratorModule` for code generation
   - Registers core providers: factories, drivers, `AppRouterHost`

2. **Application Bootstrap** (`onModuleInit`):
   - `TRPCDriver.start()` initializes tRPC with `initTRPC.context().create()`
   - `TRPCFactory.serializeAppRoutes()` calls `RouterFactory` to build the router tree
   - Generated `appRouter` stored in `AppRouterHost` (injectable singleton)
   - Appropriate driver (Express/Fastify) mounts the router at `basePath` (default: `/trpc`)

3. **Schema Generation** (if `autoSchemaFile` enabled):
   - `TRPCGenerator.generateSchemaFile()` runs after module init
   - Scans all routers/procedures, extracts Zod schemas and return types
   - Generates TypeScript file with `export type AppRouter = typeof appRouter`
   - Clients import this type for end-to-end typesafety

### Key Design Patterns

- **Reflection-based Discovery**: Uses `Reflect.getMetadata()` to find decorated classes/methods across all NestJS modules
- **Metadata Keys** (`lib/trpc.constants.ts`): `ROUTER_METADATA_KEY`, `MIDDLEWARES_KEY`, etc.
- **Lazy Router Construction**: Routers built at runtime from discovered metadata, not compile-time
- **DI Integration**: Router/middleware instances resolved from NestJS DI container
- **File Path Tracking**: Each `@Router()` stores its source file path for import resolution during generation

## Monorepo Structure

This is a **Bun workspaces** monorepo with the following structure:

- **`packages/nestjs-trpc/`** - Main library package published to npm
  - `lib/` - Source code (decorators, factories, generators, drivers, etc.)
  - `dist/` - Compiled output

- **`examples/`** - Integration examples demonstrating library usage
  - `nestjs-express/` - Example using Express adapter
  - `nestjs-fastify/` - Example using Fastify adapter
  - `nextjs-trpc/` - Next.js client consuming tRPC endpoints

- **`docs/`** - Documentation website (https://nestjs-trpc.io)

- **Build System**: Uses TypeScript project references for efficient incremental compilation
  - Root `tsconfig.json` files coordinate workspace builds
  - Each package/example has its own `tsconfig.json` and `tsconfig.build.json`
  - Build command: `tsc -b -v packages`

## Testing

- **Framework**: Jest with ts-jest preset
- **Location**: Tests co-located in `__tests__` directories next to source files
- **Config**: Uses `tsconfig.spec.json` with `ignoreCodes: [151001]` for TS diagnostics
- **Coverage**: Enabled by default with `--coverage` flag
- **Patterns**: `**/__tests__/**/*.ts`, `**/*.spec.ts`, `**/*.test.ts`

## Important Implementation Notes

1. **ts-morph Usage**: The generator heavily relies on `ts-morph` (TypeScript compiler API wrapper) to parse source files and build import maps. Changes to decorator metadata must be reflected in the corresponding generator.

2. **Runtime vs Codegen**: The library has two distinct code paths:
   - **Runtime**: Factories build the actual tRPC router from decorated classes
   - **Codegen**: Generators analyze the same decorators to emit TypeScript types
   These must stay in sync - a change to how a decorator works requires updating both.

3. **Import Resolution**: `ImportsScanner` builds a map from class/type names to their source file paths by traversing import statements. This enables the generator to write correct import statements in generated files. If imports are missing, check `buildSourceFileImportsMap()` logic.

4. **File Path Tracking**: `FileScanner.getCallerFilePath()` uses stack traces to determine where decorators are applied. This is fragile - avoid deeply nested decorator factories or the path resolution may break.

5. **NestJS Module Scanning**: `RouterFactory.getRouters()` iterates `ModulesContainer` to find providers. Routers must be registered as providers in a NestJS module or they won't be discovered.

6. **v11 Migration Note**: Comment in `router.factory.ts:102` indicates the `router()` wrapping call needs removal for tRPC v11 compatibility.

## Coding Principles

### Comments Philosophy

**If code needs "how" or "what" comments to be understood, it's a sign the code needs refactoring.**

Guidelines:
- ✅ **Self-documenting code** - Use clear naming, proper abstractions, and logical structure
- ✅ **"Why" comments only** - Explain non-obvious decisions, constraints, or trade-offs
- ❌ **No "how" comments** - Don't explain step-by-step what the code does
- ❌ **No "what" comments** - Don't describe what a function/variable is (the name should do that)
- 🔧 **Refactor unclear code** - If you need to explain how/what, refactor instead

Examples:
```typescript
// ❌ BAD - "what" comment
// This function gets the user by ID
function getUserById(id: string) { ... }

// ❌ BAD - "how" comment
// This function:
// 1. Validates the input
// 2. Queries the database
// 3. Transforms the result
function processUser(data) { ... }

// ✅ GOOD - "why" comment
// Using setTimeout instead of setImmediate because Node.js
// event loop phases cause race conditions with DB connections
setTimeout(checkConnection, 0);

// ✅ GOOD - no comment needed, self-documenting
function getUserById(id: string) { ... }
function validateAndTransformUser(rawData: unknown): User { ... }
```

This principle applies to both the TypeScript library code and the Rust CLI.

### File Size Limits

**Keep files focused and maintainable by limiting file size to ~200-300 lines of production code.**

Guidelines:
- ✅ **Target: 200-300 lines** - Aim for files in this range (excluding tests)
- ✅ **Split at logical boundaries** - Break large files into cohesive submodules
- ✅ **Single Responsibility** - Each file should have one clear purpose
- ❌ **Avoid mega-files** - Files over 500 lines are usually doing too much
- 🔧 **Refactor when needed** - If a file grows beyond 300 lines, look for natural split points

When counting:
- Count only production code (exclude tests in `#[cfg(test)]` blocks)
- Blank lines and imports don't count toward cognitive load
- Focus on keeping the logic focused and navigable

Example structure:
```
parser/
├── mod.rs (~150 lines)      - Public API + core orchestration
├── router.rs (~220 lines)   - Router extraction logic
├── procedure.rs (~200 lines)- Procedure extraction logic
└── schema/
    ├── mod.rs (~150 lines)  - Schema public API
    ├── flatten.rs (~200 lines)- Flattening logic
    └── traverse.rs (~200 lines)- AST traversal
```

This guideline applies primarily to the Rust CLI. TypeScript files can be larger if needed.

## Package Manager

- This project uses **Bun** as specified in `packageManager` field
- `bun.lock` contains dependency lock information
- Bun provides fast package installation and native TypeScript/JSX support

## Publishing

The library uses Lerna for version management and publishing:

```bash
# Prepare release (builds and copies changelog)
bun run prepublish:npm

# Publish to npm
bun run publish:npm

# Publish next/canary version
bun run publish:next
```

The library is published as `nestjs-trpc` on npm with the main entry point at `./dist/index.js`.
