// تنسيق — نفس أسلوب بلتاجي (أرقام لاتينية، تاريخ القاهرة)
export const toLatinDigits = (s: string) => s.replace(/[٠-٩۰-۹]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d) >= 0 ? '٠١٢٣٤٥٦٧٨٩'.indexOf(d) : '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
export const CUR_LABEL: Record<string, string> = { EGP: 'ج.م', SAR: 'ر.س' };
export const money = (n: number, cur = 'EGP') => `${n.toLocaleString('en-US')} ${CUR_LABEL[cur] ?? cur}`;
export const fmtDate = (iso: string) => (iso ? new Date(iso).toLocaleDateString('ar-EG-u-nu-latn', { timeZone: 'Africa/Cairo', day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const daysLeft = (iso: string) => Math.ceil((Date.parse(iso) - Date.now()) / 864e5);
export const initials = (name: string) => name.replace(/^د\.\s*|^دكتور\s+/, '').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('');
export const addMonths = (iso: string, m: number) => { const d = new Date(iso); d.setMonth(d.getMonth() + m); return d.toISOString(); };
export const UNIT_LABEL: Record<string, [string, string, string]> = { d: ['يوم', 'يومين', 'أيام'], m: ['شهر', 'شهرين', 'شهور'], y: ['سنة', 'سنتين', 'سنين'] };
export const fmtDuration = (n: number, u: string) => { const l = UNIT_LABEL[u] ?? UNIT_LABEL.m; return n === 1 ? l[0] : n === 2 ? l[1] : n <= 10 ? `${n} ${l[2]}` : `${n} ${l[0]}`; };
export const addDuration = (iso: string, n: number, u: string) => { const d = new Date(iso); if (u === 'd') d.setDate(d.getDate() + n); else if (u === 'y') d.setFullYear(d.getFullYear() + n); else d.setMonth(d.getMonth() + n); return d.toISOString(); };
