#!/bin/sh
# darktrace-mcp source installer for macOS and Linux (POSIX sh). Fallback path.
# The primary install is the published package:  npx -y @nuoframework/darktrace-mcp@1.1.2 setup
# Usage (inside a checkout):  sh scripts/install.sh [setup options]
#        (one-liner; read the script before running it):
#   curl -fsSLO https://raw.githubusercontent.com/nuoframework/darktrace-mcp/main/scripts/install.sh
#   less install.sh && sh install.sh
# Clones the repository into $DARKTRACE_MCP_HOME (default ~/.local/share/darktrace-mcp/source)
# with git (or gh), installs locked dependencies without lifecycle scripts, builds, then runs
# `darktrace-mcp setup`. Re-running updates (git pull --ff-only) and rebuilds. Idempotent.
set -eu

REPO="nuoframework/darktrace-mcp"
TARGET="${DARKTRACE_MCP_HOME:-$HOME/.local/share/darktrace-mcp/source}"
# Checkouts made by earlier versions of this script lived one level up.
if [ -z "${DARKTRACE_MCP_HOME:-}" ] && [ -d "$HOME/.local/share/darktrace-mcp/.git" ]; then TARGET="$HOME/.local/share/darktrace-mcp"; fi

say() { printf '%s\n' "darktrace-mcp: $*"; }
die() { printf '%s\n' "darktrace-mcp: error: $*" >&2; exit 1; }

command -v node >/dev/null 2>&1 || die "Node.js 22 or newer is required (https://nodejs.org)."
command -v npm >/dev/null 2>&1 || die "npm is required (it ships with Node.js)."
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
[ "$NODE_MAJOR" -ge 22 ] 2>/dev/null || die "Node.js 22 or newer is required (found $(node --version))."

# Use the checkout this script lives in, when it is one.
SCRIPT_DIR=$(CDPATH='' cd -- "$(dirname -- "$0")" 2>/dev/null && pwd || true)
if [ -n "$SCRIPT_DIR" ] && [ -f "$SCRIPT_DIR/../package.json" ] && grep -q '"name": "@nuoframework/darktrace-mcp"' "$SCRIPT_DIR/../package.json"; then
  TARGET=$(CDPATH='' cd -- "$SCRIPT_DIR/.." && pwd)
  say "using checkout $TARGET"
elif [ -d "$TARGET/.git" ]; then
  say "updating $TARGET"
  git -C "$TARGET" pull --ff-only
else
  [ -e "$TARGET" ] && die "$TARGET exists but is not a git checkout; move it or set DARKTRACE_MCP_HOME."
  mkdir -p "$(dirname -- "$TARGET")"
  if command -v git >/dev/null 2>&1; then
    say "cloning $REPO with git into $TARGET"
    git clone "https://github.com/$REPO.git" "$TARGET"
  elif command -v gh >/dev/null 2>&1; then
    say "cloning $REPO with gh into $TARGET"
    gh repo clone "$REPO" "$TARGET"
  else
    die "install git (https://git-scm.com) or gh (https://cli.github.com) first."
  fi
fi

cd "$TARGET"
say "installing locked dependencies (no lifecycle scripts)"
npm ci --ignore-scripts --no-audit --no-fund
say "building"
npm run build --silent
say "starting setup"
# Hand the terminal to the wizard so token prompts stay hidden, even when this script itself
# arrived through a pipe. --tokens-from-stdin keeps the caller's stdin.
case " $* " in *" --tokens-from-stdin "*) exec node "$TARGET/dist/src/index.js" setup "$@" ;; esac
if [ ! -t 0 ] && [ -r /dev/tty ]; then
  exec node "$TARGET/dist/src/index.js" setup "$@" </dev/tty
fi
exec node "$TARGET/dist/src/index.js" setup "$@"
