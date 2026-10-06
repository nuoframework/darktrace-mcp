#!/usr/bin/env node
import { assertEnvironmentPolicy, isUnconfigured, loadConfig } from './config/load.js';
import { runSetupStdio, runStdio } from './server/stdio.js';
import { VERSION } from './server/createServer.js';
import { SETUP_COMMAND } from './server/setupServer.js';
import { eligibleTools } from './tools/index.js';
import { logSetupRequired, logStartupError } from './observability/log.js';
import { CLI_HELP, isCliCommand } from './cli/help.js';
const HELP=`darktrace-mcp ${VERSION}
Usage: darktrace-mcp [--help | --version | --check-config | doctor]
Default: MCP over stdio. Configuration and credentials come from operator environment or private files.
--check-config / doctor validate local configuration without network access.
Private CA: NODE_EXTRA_CA_CERTS. TLS verification is mandatory. HTTP transport is unavailable.
Profiles (operator-only; the model cannot change them): DARKTRACE_PROFILES=read|sensitive|write|critical (comma list) or all.
Default: read (non-sensitive consultation). sensitive: Advanced Search, Darktrace/EMAIL content, PCAP download, audit events.
write: acknowledge, comment, tags, labels, PCAP requests, AI Analyst investigations; dryRun:true previews.
critical (needs write): RESPOND/Antigena actions, intel feed, subnets, tag deletion. Each runs only after a dryRun:true
preview repeated with confirm:true and its previewId; without them the call is refused (confirmation_required).
The email action is not available in this release. DARKTRACE_CRITICAL_APPROVAL=elicitation (default: a human accepts
an MCP elicitation dialog; refused if the host cannot elicit) or host (needs DARKTRACE_ACKNOWLEDGE_HOST_APPROVAL=true).
DARKTRACE_WRITE_APPROVAL=host (default) or elicitation for other writes.
all = read,sensitive,write,critical. Any set with sensitive and write (all included) refuses to start unless
DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE=true: untrusted appliance content could be copied into write free-text fields.
Legacy: DARKTRACE_SENSITIVE_READ=true|false, DARKTRACE_WRITE_CRITICAL=true|false. Writes are audited on stderr.
Appliance results enter the MCP host/model context; assess provider processing, retention and organizational eligibility before enabling sensitive reads.
`;
const cliArgs=process.argv.slice(2);
// Installer subcommands load lazily; the stdio server path below is unchanged.
if (isCliCommand(cliArgs)) {
  import('./cli/main.js').then(m=>m.runCli(cliArgs)).then(code=>{process.exitCode=code;},()=>{process.stderr.write('Installer failed to start.\n');process.exitCode=1;});
} else try {
  const args=cliArgs;
  if (args.length>1 || (args.length===1 && !['--help','--version','--check-config','doctor'].includes(args[0]))) {
    process.stderr.write('Unsupported arguments. Run --help; credentials are never accepted as flags.\n');process.exitCode=2;
  } else if (args[0]==='--help') process.stdout.write(HELP+CLI_HELP);
  else if (args[0]==='--version') process.stdout.write(VERSION+'\n');
  else if (args.length) {
    // --check-config / doctor keep their exit semantics: an unconfigured process is a configuration error here.
    const cfg=loadConfig(process.env);
    process.stdout.write(JSON.stringify({ok:true,transport:'stdio',registeredTools:eligibleTools(cfg).length,
      profiles:{read:cfg.profiles.read,sensitive:cfg.profiles.sensitiveRead,write:cfg.profiles.write,critical:cfg.profiles.write&&cfg.profiles.writeCritical},approval:cfg.approval,
      networkProbe:false,labValidated:false})+'\n');
  } else if (isUnconfigured(process.env)) {
    // First run (one-click install, no setup yet): same environment policy, then an MCP server whose only tool
    // explains what is missing and the one command to run. Every Darktrace tool stays hidden until configured.
    assertEnvironmentPolicy(process.env);
    logSetupRequired(SETUP_COMMAND);
    runSetupStdio();
  } else {
    const cfg=loadConfig(process.env);
    runStdio(cfg);
  }
} catch(error) {logStartupError(error);process.exitCode=1;}
