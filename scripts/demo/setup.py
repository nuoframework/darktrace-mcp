#!/usr/bin/env python3
"""Drive the real setup wizard in a PTY; write only a temporary OpenCode config."""
import errno
import fcntl
import os
from pathlib import Path
import pty
import select
import shutil
import struct
import subprocess
import sys
import tempfile
import termios
import time

root = Path(__file__).resolve().parents[2]
state = tempfile.mkdtemp(prefix='darktrace-setup-', dir='/private/tmp' if Path('/private/tmp').is_dir() else None)
env = {k: v for k, v in os.environ.items() if not k.startswith('DARKTRACE_')}
env['XDG_CONFIG_HOME'] = state
env['NODE_EXTRA_CA_CERTS'] = str(Path(os.environ.get('DEMO_CA', root / 'scripts/demo/mock/ca.pem')).resolve())
steps = [('(https://...): ', os.environ.get('DEMO_URL', 'https://127.0.0.1:8443')), ('Choice [1]: ', '1'),
         ('Public token: ', 'mock-public-token'), ('Private token (hidden): ', 'mock-private-token'),
         ('Choice [1]: ', '1'), ('Install into which clients?', None), (']: ', 'opencode')]
print('\033[2J\033[H\033[1;36mDARKTRACE MCP  /  01 / SETUP\033[0m')
print('\033[2mSynthetic local appliance • temporary client configuration\033[0m\n')
print('$ node dist/src/index.js setup\n', flush=True)
time.sleep(1)
master, slave = pty.openpty()
fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack('HHHH', 32, 96, 0, 0))
child = subprocess.Popen(['node', 'dist/src/index.js', 'setup'], cwd=root, env=env, stdin=slave, stdout=slave, stderr=slave)
os.close(slave)
buffer = ''
try:
    deadline = time.monotonic() + 90
    while time.monotonic() < deadline:
        ready, _, _ = select.select([master], [], [], 0.2)
        if ready:
            try:
                chunk = os.read(master, 65536)
            except OSError as error:
                if error.errno == errno.EIO:
                    break
                raise
            if not chunk:
                break
            sys.stdout.buffer.write(chunk)
            sys.stdout.buffer.flush()
            buffer += chunk.decode(errors='replace')
            if steps and steps[0][0] in buffer:
                _, answer = steps.pop(0)
                buffer = ''
                if answer is not None:
                    time.sleep(1.1)
                    os.write(master, (answer + '\r').encode())
        elif child.poll() is not None:
            break
    if child.poll() is None:
        child.terminate()
    code = child.wait(timeout=5)
    if code or steps:
        raise RuntimeError(f'Wizard failed: exit={code}, remaining steps={len(steps)}')
    for name in ['public-token', 'private-token']:
        assert (Path(state) / 'darktrace-mcp' / name).stat().st_mode & 0o777 == 0o600
    time.sleep(4)
finally:
    child.terminate() if child.poll() is None else None
    os.close(master)
    shutil.rmtree(state)
