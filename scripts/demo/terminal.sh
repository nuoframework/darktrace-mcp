#!/bin/bash
# Run inside VHS. The caller supplies DEMO_URL and an absolute DEMO_CA.
set -eu
: "${DEMO_URL:?Set DEMO_URL to the private mock origin}"
: "${DEMO_CA:?Set DEMO_CA to the absolute mock CA path}"
export NODE_EXTRA_CA_CERTS="$DEMO_CA"
export XDG_CONFIG_HOME
XDG_CONFIG_HOME=$(mktemp -d /private/tmp/darktrace-setup-XXXXXX)
trap 'rm -rf "$XDG_CONFIG_HOME"' EXIT
export PS1='$ '
export HISTFILE=/dev/null
asciinema rec --overwrite --return --output-format asciicast-v2 \
  --title 'darktrace-mcp / setup / synthetic mock' \
  -c 'bash --noprofile --norc' scripts/demo/setup.cast
python3 - "$XDG_CONFIG_HOME" <<'PY'
from pathlib import Path
import sys
for name in ['public-token', 'private-token']:
    assert (Path(sys.argv[1]) / 'darktrace-mcp' / name).stat().st_mode & 0o777 == 0o600
PY
