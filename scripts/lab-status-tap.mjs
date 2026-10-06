// Lab-only preload (node --import): records the HTTP status of every appliance response on stderr, so a campaign
// can tell a 502-after-apply from other failures. Logs method, the first two path segments and the status code only:
// no query string, headers, bodies or signatures. Loaded by scripts/lab-gap-campaign.mjs when LAB_STATUS_TAP=1.
import diagnostics from 'node:diagnostics_channel';

diagnostics.subscribe('http.client.response.finish', ({ request, response }) => {
  const route = String(request?.path ?? '').split('?')[0].split('/').slice(0, 3).join('/');
  process.stderr.write(JSON.stringify({ labTap: true, method: request?.method, route, status: response?.statusCode }) + '\n');
});
