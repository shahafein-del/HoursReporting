#!/bin/bash
set -euo pipefail

# Only run in Claude Code on the web (remote) environment
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

echo "Installing npm dependencies..."
npm install

echo "Generating Prisma client..."
npx prisma generate

echo "Session start hook complete."
