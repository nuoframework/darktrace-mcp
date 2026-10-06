#!/usr/bin/env node
import { loadConfig } from './config/load.js';
import { runStdio } from './server/stdio.js';
import { VERSION } from './server/createServer.js';
import { eligibleTools } from './tools/index.js';
import { logStartupError } from './observability/log.js';
import { CLI_HELP, isCliCommand } from './cli/help.js';
const HELP=`darktrace-mcp ${VERSION}
Usage: darktrace-mcp [--help | --version | --check-config | doctor]
Default: MCP over stdio. Configuration and credentials come from operator environment or private files.
--check-config / doctor validate local configuration without network access.
Private CA: NODE_EXTRA_CA_CERTS. TLS verification is mandatory. HTTP transport is unavailable.
This release permits consultation only. Write/writeCritical profiles and write previews are unavailable.
Advanced Search is sensitive read-only and requires DARKTRACE_SENSITIVE_READ; lab compatibility is not established.
Critical execution, email and PCAP export are blocked.
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
  else {
    const cfg=loadConfig(process.env);
    if (args.length) process.stdout.write(JSON.stringify({ok:true,transport:'stdio',registeredTools:eligibleTools(cfg).length,
      criticalExecution:false,email:false,pcapExport:false,networkProbe:false,labValidated:false})+'\n');
    else runStdio(cfg);
  }
} catch(error) {logStartupError(error);process.exitCode=1;}
