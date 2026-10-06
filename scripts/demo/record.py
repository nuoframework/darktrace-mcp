#!/usr/bin/env python3
"""Record output only with asciinema; automatically decline the demo dialog."""
import errno
import fcntl
import tempfile
import os
from pathlib import Path
import pty
import select
import subprocess
import sys
import time

root = Path(__file__).resolve().parents[2]
name = sys.argv[1]
commands = {'setup': 'python3 scripts/demo/setup.py', 'analyst': 'node scripts/demo/analyst.mjs', 'approval': 'node scripts/demo/approval.mjs'}
command = commands[name]
lock = open(Path(tempfile.gettempdir()) / f'darktrace-readme-{name}.lock', 'w')
fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
size = '96x36' if name == 'analyst' else '96x32'
pid, master = pty.fork()
if pid == 0:
    os.chdir(root)
    os.execvp('asciinema', ['asciinema', 'rec', '--overwrite', '--return', '--output-format', 'asciicast-v2', '--window-size', size, '--idle-time-limit', '2', '--title', f'darktrace-mcp / {name} / synthetic mock', '-c', command, f'scripts/demo/{name}.cast'])
buffer = ''
try:
    deadline = time.monotonic() + 220
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
            if 'Press Enter to DECLINE: ' in buffer:
                time.sleep(4)
                os.write(master, b'\r')
                buffer = ''
    else:
        os.kill(pid, 15)
    _, status = os.waitpid(pid, 0)
    sys.exit(os.waitstatus_to_exitcode(status))
finally:
    os.close(master)
