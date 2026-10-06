#!/usr/bin/env python3
"""Check README recording limits and local Markdown links/heading anchors."""
import json
from pathlib import Path
import re
import subprocess
import unicodedata
from urllib.parse import unquote, urlsplit

root = Path(__file__).resolve().parents[2]
for name in ('setup', 'analyst', 'approval'):
    path = root / 'docs/assets/demo' / f'{name}.gif'
    info = json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-count_frames', '-show_entries',
        'stream=nb_read_frames,duration,width,height', '-show_entries', 'format=size',
        '-of', 'json', str(path),
    ]))
    stream = info['streams'][0]
    frames, duration, size = int(stream['nb_read_frames']), float(stream['duration']), path.stat().st_size
    assert frames >= 100, (name, frames)
    assert 10 <= duration <= 25, (name, duration)
    assert size <= 3_000_000, (name, size)
    print(f'{name}: {frames} frames, {duration:.2f}s, {size:,} bytes, {stream["width"]}x{stream["height"]}')


def anchors(path):
    found, counts = set(), {}
    for line in path.read_text().splitlines():
        match = re.match(r'^#{1,6}\s+(.+?)\s*#*$', line)
        if not match:
            continue
        heading = re.sub(r'!?\[([^]]+)\]\([^)]*\)', r'\1', match[1]).lower()
        slug = ''.join(c for c in heading if c in '-_ ' or unicodedata.category(c)[0] in 'LN').replace(' ', '-')
        count = counts.get(slug, 0)
        found.add(f'{slug}-{count}' if count else slug)
        counts[slug] = count + 1
    found.update(re.findall(r'<a\s+(?:name|id)=["\']([^"\']+)', path.read_text()))
    return found


checked = 0
for relative in ('README.md', 'README.en.md', 'scripts/demo/README.md'):
    source = root / relative
    for raw in re.findall(r'\]\(([^\s)]+)', source.read_text()):
        url = urlsplit(raw.strip('<>'))
        if url.scheme or url.netloc:
            continue
        target = (source.parent / unquote(url.path)).resolve() if url.path else source
        assert target.exists(), f'{relative}: missing {raw}'
        if url.fragment and target.suffix == '.md':
            assert unquote(url.fragment) in anchors(target), f'{relative}: missing anchor {raw}'
        checked += 1
print(f'Local documentation links and anchors: {checked} passed')
