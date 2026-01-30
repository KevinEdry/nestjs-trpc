#!/usr/bin/env node

const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const BINARY_NAME = process.platform === 'win32' ? 'nestjs-trpc.exe' : 'nestjs-trpc';

function getBinaryPath() {
  const platform = process.platform;
  const arch = process.arch;

  const platformMap = {
    darwin: 'apple-darwin',
    linux: 'unknown-linux-gnu',
    win32: 'pc-windows-msvc',
  };

  const archMap = {
    x64: 'x86_64',
    arm64: 'aarch64',
  };

  const targetPlatform = platformMap[platform];
  const targetArch = archMap[arch];

  if (!targetPlatform || !targetArch) {
    console.error(`Unsupported platform: ${platform}-${arch}`);
    process.exit(1);
  }

  // Check for pre-built native binary (npm distribution)
  const binaryDir = path.join(__dirname, '..', 'native', `${targetArch}-${targetPlatform}`);
  const binaryPath = path.join(binaryDir, BINARY_NAME);

  if (fs.existsSync(binaryPath)) {
    return binaryPath;
  }

  // Fallback to cargo build output (local development)
  const cargoBinaryPath = path.join(__dirname, '..', 'cli', 'target', 'release', BINARY_NAME);
  if (fs.existsSync(cargoBinaryPath)) {
    return cargoBinaryPath;
  }

  // Debug build fallback
  const cargoDebugPath = path.join(__dirname, '..', 'cli', 'target', 'debug', BINARY_NAME);
  if (fs.existsSync(cargoDebugPath)) {
    return cargoDebugPath;
  }

  console.error(`Binary not found. Checked:`);
  console.error(`  - ${binaryPath} (native)`);
  console.error(`  - ${cargoBinaryPath} (cargo release)`);
  console.error(`  - ${cargoDebugPath} (cargo debug)`);
  console.error('');
  console.error('For local development, run: cd packages/nestjs-trpc/cli && cargo build --release');
  process.exit(1);
}

try {
  const binaryPath = getBinaryPath();
  const args = process.argv.slice(2);

  execFileSync(binaryPath, args, {
    stdio: 'inherit',
    env: process.env,
  });
} catch (error) {
  if (error.status !== undefined) {
    process.exit(error.status);
  }
  console.error('Failed to execute nestjs-trpc CLI:', error.message);
  process.exit(1);
}
