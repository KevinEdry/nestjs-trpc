# NestJS TRPC

## Introduction
**trpc-nestjs** is a library designed to integrate the capabilities of tRPC into the NestJS framework. It aims to provide native support for decorators and implement an opinionated approach that aligns with NestJS conventions.

## Installation
To install **trpc-nestjs** with your preferred package manager, you can use any of the following commands:

### npm
```bash
npm install trpc-nestjs
```

### pnpm
```bash
pnpm add trpc-nestjs
```

### yarn
```bash
yarn add trpc-nestjs
```

Make sure you are in your project directory before executing these commands.

## Features
- Seamless integration of tRPC into NestJS
- Native decorators for streamlined usage
- Opinionated implementation following NestJS standards
- AppRouter type generation


## How to use
Here's a brief example demonstrating how to use the decorators available in **nestjs-trpc**:

### Router Example

```typescript
import { Router, Query } from 'trpc-nestjs';

@Router()
class ExampleController {
  
  @Query()
  hello() {
    return 'Hello, world!';
  }
}
```

In this code snippet:
- `@Router()` is used to mark the class as a TRPC Router.
- `@Query()` declares a simple query endpoint.


## License
This project is released under the MIT License.
