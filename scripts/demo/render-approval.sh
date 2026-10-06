#!/bin/bash
set -eu
# Keep the native model/account banner out of the public documentation.
# This is a geometric crop; tool output and the dialog are never rewritten.
vhs scripts/demo/approval.tape
ffmpeg -y -v error -i /private/tmp/darktrace-approval-raw.gif \
  -filter_complex 'crop=iw:ih-108:0:108,split[a][b];[a]palettegen[p];[b][p]paletteuse' \
  -fps_mode passthrough docs/assets/demo/approval.gif
