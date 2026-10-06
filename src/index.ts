#!/usr/bin/env node
import { loadConfig } from './config/load.js';
import { runStdio } from './server/stdio.js';
import { VERSION } from './server/createServer.js';
import { eligibleTools } from './tools/index.js';
import { logStartupError } from './observability/log.js';
const HELP=`darktrace-mcp ${VERSION}
Usage: darktrace-mcp [--help | --version | --check-config | doctor]
Default: MCP over stdio. Configuration and credentials come from operator environment or private files.
--check-config / doctor validate local configuration without network access.
Private CA: NODE_EXTRA_CA_CERTS. TLS verification is mandatory. HTTP transport is unavailable.
Profiles (operator-only; the model cannot change them): DARKTRACE_PROFILES=read|sensitive|write|critical (comma list) or all.
Default: read (non-sensitive consultation). sensitive: Advanced Search, Darktrace/EMAIL, PCAP download, audit events.
write: state-changing actions run directly (dryRun:true previews). critical (needs write): RESPOND/Antigena, intel feed,
subnets, tag deletion and email actions need confirm:true AND a human accept in an MCP elicitation dialog; otherwise
only a preview is returned. DARKTRACE_CRITICAL_APPROVAL=elicitation (default; refused if the host cannot elicit) or host
(rely on the host's own tool-approval prompt). DARKTRACE_WRITE_APPROVAL=host (default) or elicitation for other writes.
Legacy: DARKTRACE_SENSITIVE_READ=true|false, DARKTRACE_WRITE_CRITICAL=true|false. Writes are audited on stderr.
Appliance results enter the MCP host/model context; assess provider processing, retention and organizational eligibility before enabling sensitive reads.
`;
try {
  const args=process.argv.slice(2);
  if (args.length>1 || (args.length===1 && !['--help','--version','--check-config','doctor'].includes(args[0]))) {
    process.stderr.write('Unsupported arguments. Run --help; credentials are never accepted as flags.\n');process.exitCode=2;
  } else if (args[0]==='--help') process.stdout.write(HELP);
  else if (args[0]==='--version') process.stdout.write(VERSION+'\n');
  else {
    const cfg=loadConfig(process.env);
    if (args.length) process.stdout.write(JSON.stringify({ok:true,transport:'stdio',registeredTools:eligibleTools(cfg).length,
      profiles:{read:cfg.profiles.read,sensitive:cfg.profiles.sensitiveRead,write:cfg.profiles.write,critical:cfg.profiles.write&&cfg.profiles.writeCritical},approval:cfg.approval,
      networkProbe:false,labValidated:false})+'\n');
    else runStdio(cfg);
  }
} catch(error) {logStartupError(error);process.exitCode=1;}
