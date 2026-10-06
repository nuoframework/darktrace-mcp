/** Operator profile vocabulary. Only operator configuration grants these; model arguments never do. */
export type ProfileName = 'read' | 'sensitive' | 'write' | 'critical';
export const PROFILE_NAMES: readonly ProfileName[] = Object.freeze(['read', 'sensitive', 'write', 'critical'] as const);
/** High-sensitivity reads: Advanced Search, all Darktrace/EMAIL reads and any read classified high (PCAP/email content, audit events). */
export const SENSITIVE_READ_PREFIXES: readonly string[] = Object.freeze(['/advancedsearch/', '/agemail/']);
interface ProfileSubject { readonly method: string; readonly pathTemplate: string; readonly tier: string; readonly sensitivity?: string; }
export function isSensitiveRead(op: ProfileSubject): boolean {
  return op.tier === 'read' && (op.sensitivity === 'high' || SENSITIVE_READ_PREFIXES.some(prefix => op.pathTemplate.startsWith(prefix)));
}
/** Every profile listed must be enabled. Critical additionally needs write. Pure: also used by the catalogue generator. */
export function requiredProfiles(op: ProfileSubject): ProfileName[] {
  if (op.tier === 'read') return isSensitiveRead(op) ? ['read', 'sensitive'] : ['read'];
  return op.tier === 'critical' ? ['write', 'critical'] : ['write'];
}
