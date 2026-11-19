import { useEffect, useState } from 'react';
import { SOON_DAYS } from '../data/status';

// عداد تنازلي حيّ لنهاية الاشتراك: أيام : ساعات : دقائق : ثواني
export function Countdown({ end }: { end: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const ms = Date.parse(end) - now;
  if (!end || isNaN(ms)) return null;
  if (ms <= 0) return <div className="cd cd-over">انتهى</div>;
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const tone = d < 7 ? 'cd-danger' : d < SOON_DAYS ? 'cd-warn' : 'cd-ok';
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    <div className={`cd ${tone}`} title="الوقت الباقي على انتهاء الاشتراك">
      <span><b>{d}</b>يوم</span><span><b>{p(h)}</b>س</span><span><b>{p(m)}</b>د</span><span><b>{p(sec)}</b>ث</span>
    </div>
  );
}
