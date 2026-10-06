import catalogue from '../api/catalogue.generated.json' with { type: 'json' };
/**
 * Code-owned release ceiling. Every non-excluded catalogue operation may be enabled, but only by
 * operator profiles (read, sensitive, write, critical). No model argument can raise a profile.
 */
export const RELEASE_CAPABILITY = Object.freeze({ read: true, sensitiveRead: true, write: true, writeCritical: true } as const);
/** Route binding: id -> fixed method/path/tier from the generated catalogue, frozen at module load. */
const ROUTES: ReadonlyMap<string, Readonly<{ method: string; pathTemplate: string; tier: string; status: string; sensitivity: string }>> = new Map(
  (catalogue.operations as Array<{ operationId: string; method: string; pathTemplate: string; tier: string; status: string; sensitivity: string }>)
    .map(row => [row.operationId, Object.freeze({ method: row.method, pathTemplate: row.pathTemplate, tier: row.tier, status: row.status, sensitivity: row.sensitivity })]));
/** Deprecated endpoints stay excluded. A forged descriptor (changed method, route, tier, sensitivity or status) is denied. */
export function releaseAllowsOperation(op: { operationId: string; method: string; pathTemplate: string; status: string; tier: string; sensitivity?: string }): boolean {
  const route = ROUTES.get(op.operationId);
  return route !== undefined && route.status === 'implemented' && op.status === 'implemented' &&
    route.method === op.method && route.pathTemplate === op.pathTemplate && route.tier === op.tier &&
    (op.sensitivity === undefined || route.sensitivity === op.sensitivity);
}
/** Code-owned route row for policy decisions; never derived from a caller-supplied descriptor. */
export function catalogueRoute(operationId: string) { return ROUTES.get(operationId); }
