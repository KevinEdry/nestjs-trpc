---
sidebar_position: 2
---

# Migrating to the Rust CLI

Starting with nestjs-trpc v2.0.0, code generation is handled by a Rust-based CLI instead of the previous TypeScript-based generator.

## Why the Change?

The Rust CLI provides:

- **Faster generation**: 10-50x faster parsing and code generation
- **No runtime dependency**: Works without Node.js TypeScript compiler
- **Watch mode**: Automatic regeneration on file changes
- **Better error messages**: Rich diagnostics with file locations

## Migration Steps

### 1. Update to v2.0.0

```bash
bun add nestjs-trpc@^2.0.0
```

### 2. Update Your Generate Script

**Before (using Node.js API):**
```json
{
  "scripts": {
    "generate": "ts-node ./scripts/generate.ts"
  }
}
```

**After (using CLI):**
```json
{
  "scripts": {
    "generate": "npx nestjs-trpc generate"
  }
}
```

### 3. Remove Old Generation Scripts

If you had a custom generation script, you can delete it:

```bash
rm ./scripts/generate.ts
```

### 4. Run Generation

```bash
bun run generate
```

Or with watch mode:

```bash
npx nestjs-trpc watch
```

## CLI Options

```bash
# Basic generation
npx nestjs-trpc generate

# Specify paths
npx nestjs-trpc generate --input ./src --output ./src/@generated/server.ts

# Watch mode
npx nestjs-trpc watch --input ./src --output ./src/@generated/server.ts

# Verbose output
npx nestjs-trpc generate --verbose

# Debug mode (for bug reports)
npx nestjs-trpc generate --debug
```

## Breaking Changes

### Removed: Node.js Generation API

The following API has been removed:

```typescript
// This no longer exists
import { TRPCGenerator } from 'nestjs-trpc';
generator.generateSchemaFile();
```

Use the CLI instead:

```bash
npx nestjs-trpc generate
```

### Removed: autoSchemaFile Option

The `autoSchemaFile` option in `TRPCModule.forRoot()` has been removed:

```typescript
// Before (no longer works)
TRPCModule.forRoot({
  autoSchemaFile: './src/@generated/server.ts',
})

// After (use CLI)
// 1. Remove autoSchemaFile option
TRPCModule.forRoot({})

// 2. Add CLI to build/dev scripts
```

### Removed: ts-morph Dependency

The library no longer depends on ts-morph. If your project used it indirectly through nestjs-trpc, you may need to add it explicitly if you use it elsewhere.

## Output Differences

The Rust CLI generates equivalent TypeScript output to the previous generator. If you notice any differences:

1. **Whitespace/formatting**: Minor formatting differences are expected
2. **Import order**: May differ but functionally equivalent
3. **Type inference**: Should be identical

If you find functional differences, please [open an issue](https://github.com/KevinEdry/nestjs-trpc/issues).

## Troubleshooting

### "Command not found: nestjs-trpc"

Ensure you're on v2.0.0+:
```bash
npm list nestjs-trpc
```

### "No routers found"

Check that your router files:
- Are in the input directory (default: current directory)
- Use the `@Router()` decorator
- Export the router class

### "Parse error in file"

The CLI will show the exact file and location of the error. Common causes:
- Syntax errors in TypeScript
- Invalid decorator usage
- Missing Zod imports

### Watch mode not detecting changes

Ensure:
- You're editing files in the input directory
- Files have `.ts` extension
- The file isn't in the output directory (excluded to prevent loops)

## IDE Integration

### VS Code Task

Add to `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Generate Types",
      "type": "shell",
      "command": "npx nestjs-trpc generate",
      "problemMatcher": []
    },
    {
      "label": "Watch Types",
      "type": "shell",
      "command": "npx nestjs-trpc watch",
      "isBackground": true,
      "problemMatcher": []
    }
  ]
}
```

### Git Hooks

Add to pre-commit (optional):

```bash
# .husky/pre-commit
npx nestjs-trpc generate
git add src/@generated/server.ts
```
