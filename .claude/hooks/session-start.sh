#!/bin/bash
set -euo pipefail

# Only run in remote web sessions
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

SKILLS_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}/agent-skills"

# Clone agent-skills if not already present
if [ ! -d "$SKILLS_DIR/.git" ]; then
  git clone --depth=1 https://github.com/addyosmani/agent-skills.git "$SKILLS_DIR" 2>/dev/null
fi

# Install jq if missing (needed by agent-skills' session hook)
if ! command -v jq >/dev/null 2>&1; then
  apt-get install -y -q jq >/dev/null 2>&1 || true
fi

# Forward agent-skills' own session-start hook output (injects meta-skill into session)
AGENT_HOOK="$SKILLS_DIR/hooks/session-start.sh"
if [ -f "$AGENT_HOOK" ] && [ -x "$AGENT_HOOK" ]; then
  bash "$AGENT_HOOK"
else
  echo '{"priority":"INFO","message":"agent-skills cloned to agent-skills/. Run `claude --plugin-dir ./agent-skills` locally, or use /build /spec /plan /test /review /ship commands in this session."}'
fi
