#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI_DIR="$SCRIPT_DIR/../packages/nestjs-trpc/cli"
NATIVE_DIR="$SCRIPT_DIR/../packages/nestjs-trpc/native"

TARGET=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --target)
      TARGET="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$TARGET" ]]; then
  ARCH="$(uname -m)"
  OS="$(uname -s)"

  case "$OS" in
    Darwin)
      case "$ARCH" in
        arm64)   TARGET="aarch64-apple-darwin" ;;
        x86_64)  TARGET="x86_64-apple-darwin" ;;
        *)       echo "Unsupported macOS architecture: $ARCH" >&2; exit 1 ;;
      esac
      ;;
    Linux)
      case "$ARCH" in
        x86_64)  TARGET="x86_64-unknown-linux-gnu" ;;
        aarch64) TARGET="aarch64-unknown-linux-gnu" ;;
        *)       echo "Unsupported Linux architecture: $ARCH" >&2; exit 1 ;;
      esac
      ;;
    *)
      echo "Unsupported OS: $OS (pass --target explicitly)" >&2
      exit 1
      ;;
  esac

  echo "Auto-detected target: $TARGET"
fi

# Determine binary name (.exe for Windows targets)
BINARY_NAME="nestjs-trpc"
if [[ "$TARGET" == *"windows"* ]]; then
  BINARY_NAME="nestjs-trpc.exe"
fi

# Determine whether to use cross-compilation
HOST_TARGET=""
if command -v rustc &>/dev/null; then
  HOST_TARGET="$(rustc -vV | awk '/^host:/ { print $2 }')"
fi

BUILD_CMD="cargo"
BUILD_SUBCMD="build"
if [[ -n "$HOST_TARGET" && "$TARGET" != "$HOST_TARGET" ]]; then
  if command -v cargo-zigbuild &>/dev/null; then
    BUILD_SUBCMD="zigbuild"
    echo "Cross-compiling with cargo-zigbuild: host=$HOST_TARGET, target=$TARGET"
  elif command -v cross &>/dev/null; then
    BUILD_CMD="cross"
    echo "Cross-compiling with cross: host=$HOST_TARGET, target=$TARGET"
  else
    echo "Target $TARGET differs from host $HOST_TARGET but neither 'cargo-zigbuild' nor 'cross' is installed."
    echo "Falling back to cargo (make sure the target toolchain is installed)."
  fi
fi

echo "Building CLI for $TARGET..."
(cd "$CLI_DIR" && $BUILD_CMD $BUILD_SUBCMD --release --target "$TARGET")

# Place binary in native/{target}/
DEST_DIR="$NATIVE_DIR/$TARGET"
mkdir -p "$DEST_DIR"

SOURCE="$CLI_DIR/target/$TARGET/release/$BINARY_NAME"
if [[ ! -f "$SOURCE" ]]; then
  echo "Build succeeded but binary not found at: $SOURCE" >&2
  exit 1
fi

cp "$SOURCE" "$DEST_DIR/$BINARY_NAME"

if [[ "$TARGET" != *"windows"* ]]; then
  chmod +x "$DEST_DIR/$BINARY_NAME"
fi

echo "Binary placed at: $DEST_DIR/$BINARY_NAME"
