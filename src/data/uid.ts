/** Generate a UUID v4 using the Web Crypto API. */
export function uid(): string {
  return crypto.randomUUID();
}
