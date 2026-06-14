import dns from 'dns';

/**
 * Checks if a hostname or IP address is safe from SSRF (Server-Side Request Forgery).
 * It resolves the domain to an IP and validates it against loopback, private, and link-local IP subnets.
 */
export async function isSSRFSafe(hostname: string): Promise<{ safe: boolean; ip: string | null; error?: string }> {
  try {
    const resolved = await new Promise<string[]>((resolve, reject) => {
      dns.lookup(hostname, { all: true }, (err, addresses) => {
        if (err) {
          reject(err);
        } else {
          resolve(addresses.map((a) => a.address));
        }
      });
    });

    if (!resolved || resolved.length === 0) {
      return { safe: false, ip: null, error: 'Could not resolve hostname' };
    }

    // Check all resolved IPs (e.g. if dual-stacked IPv4/IPv6)
    for (const ip of resolved) {
      const isPrivate = isPrivateIP(ip);
      if (isPrivate) {
        const allowed = process.env.ALLOW_PRIVATE_IPS === 'true';
        if (!allowed) {
          return {
            safe: false,
            ip,
            error: `SSRF Protection: Connection to private IP ranges (${ip}) is blocked.`,
          };
        }
      }
    }

    return { safe: true, ip: resolved[0] };
  } catch (err: any) {
    return { safe: false, ip: null, error: err.message || 'DNS lookup failed' };
  }
}

/**
 * Checks if an IP address belongs to a private, loopback, link-local, or unspecified subnet.
 */
function isPrivateIP(ip: string): boolean {
  // Check IPv4
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipv4Match = ip.match(ipv4Regex);
  if (ipv4Match) {
    const o1 = parseInt(ipv4Match[1], 10);
    const o2 = parseInt(ipv4Match[2], 10);
    const o3 = parseInt(ipv4Match[3], 10);
    const o4 = parseInt(ipv4Match[4], 10);

    if (o1 < 0 || o1 > 255 || o2 < 0 || o2 > 255 || o3 < 0 || o3 > 255 || o4 < 0 || o4 > 255) {
      return true; // Invalid address, treat as unsafe
    }

    // 127.0.0.0/8 (Loopback)
    if (o1 === 127) return true;

    // 10.0.0.0/8 (Private)
    if (o1 === 10) return true;

    // 172.16.0.0/12 (Private)
    if (o1 === 172 && o2 >= 16 && o2 <= 31) return true;

    // 192.168.0.0/16 (Private)
    if (o1 === 192 && o2 === 168) return true;

    // 169.254.0.0/16 (Link-local)
    if (o1 === 169 && o2 === 254) return true;

    // 0.0.0.0 (Unspecified)
    if (o1 === 0 && o2 === 0 && o3 === 0 && o4 === 0) return true;

    return false;
  }

  // Check IPv6
  const cleanIp = ip.toLowerCase().trim();
  if (cleanIp === '::1' || cleanIp === '::') return true;

  // Link-local: fe80::/10 (starts with fe8, fe9, fea, feb)
  if (cleanIp.startsWith('fe8') || cleanIp.startsWith('fe9') || cleanIp.startsWith('fea') || cleanIp.startsWith('feb')) {
    return true;
  }

  // Unique Local Address: fc00::/7 (starts with fc or fd)
  if (cleanIp.startsWith('fc') || cleanIp.startsWith('fd')) {
    return true;
  }

  return false;
}
