import type { Subscription } from '../types';
import { daysLeft } from '../utils/format';

export const PAY: Record<string, { label: string; tone: string }> = {
  paid: { label: 'مدفوع', tone: 'ok' }, partial: { label: 'مدفوع جزئيًا', tone: 'warn' }, unpaid: { label: 'غير مدفوع', tone: 'danger' },
};
export const SOON_DAYS = 30;
export function subState(s?: Subscription) {
  if (!s) return { key: 'none', label: 'بدون اشتراك', tone: 'muted' };
  const d = daysLeft(s.end);
  if (d < 0) return { key: 'expired', label: 'منتهي', tone: 'danger' };
  if (d <= SOON_DAYS) return { key: 'soon', label: `ينتهي خلال ${d} يوم`, tone: 'warn' };
  return { key: 'active', label: 'نشط', tone: 'ok' };
}
