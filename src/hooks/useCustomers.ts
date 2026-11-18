import { useCallback, useEffect, useState } from 'react';
import { db } from '../data/db';
import type { Customer } from '../types';

export function useCustomers() {
  const [rows, setRows] = useState<Customer[] | null>(null);
  const [error, setError] = useState(false);
  const reload = useCallback(() => { setError(false); db.customers().then(setRows).catch(() => setError(true)); }, []);
  useEffect(reload, [reload]);
  return { rows, error, reload };
}
