#!/bin/bash
# Check that Rust files don't exceed 300 lines of production code
# Production code = total lines - test code - comments - blank lines
# This is a warning-only check per project guidelines

set -e

MAX_LINES=300
WARNINGS=0

cd "$(dirname "$0")/.."

echo "Checking Rust file sizes (limit: $MAX_LINES lines of production code)..."
echo ""

for file in $(find src -name "*.rs" -type f); do
    # Count lines excluding:
    # - #[cfg(test)] blocks and everything after
    # - Lines that are only comments (// or /* */)
    # - Blank lines
    lines=$(awk '
        /^[[:space:]]*#\[cfg\(test\)\]/ { in_test=1 }
        /^[[:space:]]*mod tests/ { in_test=1 }
        !in_test && !/^[[:space:]]*(\/\/|\/\*|\*|$)/ { count++ }
        END { print count+0 }
    ' "$file")

    if [ "$lines" -gt "$MAX_LINES" ]; then
        echo "WARNING: $file has ~$lines lines of production code (limit: $MAX_LINES)"
        WARNINGS=$((WARNINGS + 1))
    fi
done

echo ""

if [ "$WARNINGS" -gt 0 ]; then
    echo "$WARNINGS file(s) exceed the $MAX_LINES line limit."
    echo "Consider splitting into focused submodules."
    echo ""
    # Exit 0 - this is a warning, not a failure
    exit 0
else
    echo "All files within $MAX_LINES line limit."
fi
