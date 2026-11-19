export type DurUnit = 'd' | 'm' | 'y';
export type PayStatus = 'paid' | 'partial' | 'unpaid';
export type Subscription = { id: string; customerId: string; price: number; cur: string; start: string; months: number; unit: DurUnit; end: string; pay: PayStatus; payNote: string; salesId: string | null; salesPct: number | null; commissionPaid: boolean };
export type Customer = { id: string; name: string; country: string; code: string; phone: string; biz: string; url: string; notes: string; created: string; salesId: string | null; salesPct: number | null; branches: string[]; managerName: string; managerPhone: string; contractManagerName: string; contractManagerPhone: string; subs: Subscription[] };
export type Goal = { id: string; name: string; desc: string; start: string; end: string; target: number; main: boolean };
export type Account = { id: string; service: string; email: string; projectName: string; projectRef: string; url: string; passwordEnc: string; notes: string; active: boolean; created: string };
export type SalesRep = { id: string; name: string; phone: string; defaultPct: number; active: boolean };
