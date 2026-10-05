import { isIP } from 'node:net';

function ipv6Words(input: string): number[] | undefined {
  let value = input.toLowerCase();
  const embeddedV4 = value.match(/(?:^|:)(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (embeddedV4) {
    const octets = embeddedV4[1].split('.').map(Number);
    if (octets.some((octet) => octet > 255)) return undefined;
    const v4 = `${((octets[0] << 8) | octets[1]).toString(16)}:${((octets[2] << 8) | octets[3]).toString(16)}`;
    value = value.slice(0, value.length - embeddedV4[1].length) + v4;
  }
  const halves = value.split('::');
  if (halves.length > 2) return undefined;
  const left = halves[0] === '' ? [] : halves[0].split(':');
  const right = halves.length === 1 || halves[1] === '' ? [] : halves[1].split(':');
  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || (halves.length === 2 && missing < 1)) return undefined;
  const parts = [...left, ...Array.from({ length: missing }, () => '0'), ...right];
  if (parts.length !== 8 || parts.some((part) => !/^[0-9a-f]{1,4}$/.test(part))) return undefined;
  return parts.map((part) => Number.parseInt(part, 16));
}

function forbiddenIpv4(value: string): boolean {
  const [a, b, c, d] = value.split('.').map(Number);
  return a === 0 || a === 127 || (a === 169 && b === 254) || a >= 224 ||
    (a === 100 && b === 100 && c === 100 && d === 200);
}

/** Return the canonical address; IPv4-mapped IPv6 is returned as IPv4. */
export function canonicalIpAddress(value: string): string | undefined {
  if (typeof value !== 'string') return undefined;
  if (isIP(value) === 4) {
    const octets = value.split('.');
    if (octets.some((octet) => String(Number(octet)) !== octet || Number(octet) > 255)) return undefined;
    return value;
  }
  if (isIP(value) !== 6) return undefined;
  const words = ipv6Words(value);
  if (!words) return undefined;
  if (words.slice(0, 5).every((word) => word === 0) && words[5] === 0xffff) {
    return `${words[6] >> 8}.${words[6] & 255}.${words[7] >> 8}.${words[7] & 255}`;
  }
  try {
    return new URL(`http://[${value}]/`).hostname.slice(1, -1).toLowerCase();
  } catch {
    return undefined;
  }
}

/** Validate a resolved destination while allowing RFC1918 and IPv6 ULA addresses. */
export function isForbiddenDestination(value: string): boolean {
  const canonical = canonicalIpAddress(value);
  if (!canonical) return true;
  if (isIP(canonical) === 4) return forbiddenIpv4(canonical);
  const words = ipv6Words(canonical);
  if (!words) return true;
  const unspecified = words.every((word) => word === 0);
  const loopback = words.slice(0, 7).every((word) => word === 0) && words[7] === 1;
  const linkLocal = (words[0] & 0xffc0) === 0xfe80;
  const siteLocal = (words[0] & 0xffc0) === 0xfec0;
  const multicast = (words[0] & 0xff00) === 0xff00;
  const ipv4CompatiblePrefix = words.slice(0, 6).every((word) => word === 0); // ::/96
  const ipv4TranslatedPrefix = words.slice(0, 4).every((word) => word === 0) && words[4] === 0xffff && words[5] === 0; // ::ffff:0:0/96
  const nat64WellKnownPrefix = words[0] === 0x0064 && words[1] === 0xff9b && words.slice(2, 6).every((word) => word === 0); // 64:ff9b::/96
  const nat64LocalUsePrefix = words[0] === 0x0064 && words[1] === 0xff9b && words[2] === 0x0001; // 64:ff9b:1::/48
  const sixToFourPrefix = words[0] === 0x2002; // 2002::/16
  const teredoPrefix = words[0] === 0x2001 && words[1] === 0x0000; // 2001::/32
  const awsMetadata = canonical === 'fd00:ec2::254';
  return unspecified || loopback || linkLocal || siteLocal || multicast || awsMetadata || ipv4CompatiblePrefix ||
    ipv4TranslatedPrefix || nat64WellKnownPrefix || nat64LocalUsePrefix || sixToFourPrefix || teredoPrefix;
}
