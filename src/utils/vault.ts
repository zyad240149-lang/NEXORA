// تشفير كلمات المرور في المتصفح: PBKDF2 (250k) → AES-GCM. الكلمة الرئيسية مابتتخزّنش في أي مكان —
// بتفضل في الذاكرة لحد ما الصفحة تتقفل. لو نسيتها، كلمات المرور المحفوظة مش ممكن تترجع.
const enc = new TextEncoder();
const dec = new TextDecoder();
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function key(master: string, salt: Uint8Array<ArrayBuffer>) {
  const base = await crypto.subtle.importKey('raw', enc.encode(master), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 250_000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
export async function seal(plain: string, master: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(master, salt), enc.encode(plain)));
  const out = new Uint8Array(28 + ct.length); out.set(salt); out.set(iv, 16); out.set(ct, 28);
  return b64(out);
}
export async function open(sealed: string, master: string): Promise<string> {
  const u = unb64(sealed);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: u.slice(16, 28) }, await key(master, u.slice(0, 16)), u.slice(28));
  return dec.decode(pt);
}

// الكلمة الرئيسية للجلسة الحالية (ذاكرة بس)
let master: string | null = null;
export const vault = { get: () => master, set: (m: string | null) => { master = m; } };
