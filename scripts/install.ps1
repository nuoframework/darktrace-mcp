# darktrace-mcp source installer for Windows (PowerShell 5+). Fallback path.
# The primary install is the published package:  npx -y @nuoframework/darktrace-mcp@1.1.2 setup
# Usage: powershell -ExecutionPolicy Bypass -File scripts\install.ps1 [setup options]
# Windows cannot enforce owner-only token files, so the server rejects token files there.
# Setup will ask for explicit consent before writing token VALUES into client configs
# (or pass --inline-tokens-windows). Prefer the Claude Desktop extension (.mcpb), Docker,
# or WSL with scripts/install.sh when possible.
$ErrorActionPreference = 'Stop'
$Repo = 'nuoframework/darktrace-mcp'
$Target = if ($env:DARKTRACE_MCP_HOME) { $env:DARKTRACE_MCP_HOME } else { Join-Path $env:LOCALAPPDATA 'darktrace-mcp\source' }
# Checkouts made by earlier versions of this script lived one level up.
if (-not $env:DARKTRACE_MCP_HOME -and (Test-Path (Join-Path $env:LOCALAPPDATA 'darktrace-mcp\.git'))) { $Target = Join-Path $env:LOCALAPPDATA 'darktrace-mcp' }

function Fail($msg) { Write-Error "darktrace-mcp: $msg"; exit 1 }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Fail 'Node.js 22 or newer is required (https://nodejs.org).' }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { Fail 'npm is required.' }
$major = [int](node -p "process.versions.node.split('.')[0]")
if ($major -lt 22) { Fail "Node.js 22 or newer is required (found $(node --version))." }

$here = Split-Path -Parent $PSScriptRoot
if ((Test-Path (Join-Path $here 'package.json')) -and (Select-String -Quiet -Path (Join-Path $here 'package.json') -Pattern '"name": "@nuoframework/darktrace-mcp"')) {
  $Target = $here
  Write-Host "darktrace-mcp: using checkout $Target"
} elseif (Test-Path (Join-Path $Target '.git')) {
  Write-Host "darktrace-mcp: updating $Target"
  git -C $Target pull --ff-only
  if ($LASTEXITCODE -ne 0) { Fail 'git pull failed' }
} else {
  if (Test-Path $Target) { Fail "$Target exists but is not a git checkout." }
  if (Get-Command git -ErrorAction SilentlyContinue) { git clone "https://github.com/$Repo.git" $Target }
  elseif (Get-Command gh -ErrorAction SilentlyContinue) { gh repo clone $Repo $Target }
  else { Fail 'install git (https://git-scm.com) or gh (https://cli.github.com) first.' }
  if ($LASTEXITCODE -ne 0) { Fail 'clone failed' }
}

Push-Location $Target
try {
  npm ci --ignore-scripts --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { Fail 'npm ci failed' }
  npm run build --silent
  if ($LASTEXITCODE -ne 0) { Fail 'build failed' }
  node (Join-Path $Target 'dist\src\index.js') setup @args
  exit $LASTEXITCODE
} finally { Pop-Location }
