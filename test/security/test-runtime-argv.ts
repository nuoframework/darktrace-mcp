import { DEFAULT_CIPHERS } from 'node:tls';
// Node 24's test runner materializes its native default cipher list in each
// child execArgv. Production rejects every explicit TLS override, including
// this one. Remove ONLY the runner's exact native default in test children;
// explicit guard tests still supply their own argv and NODE_OPTIONS cases.
if (process.env.NODE_TEST_CONTEXT) {
  const injected = '--tls-cipher-list=' + DEFAULT_CIPHERS;
  process.execArgv = process.execArgv.filter(arg => arg !== injected);
}
