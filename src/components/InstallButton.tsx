import { useEffect, useState } from 'react';

// زرار "تثبيت التطبيق" على الموبايل: أندرويد/كروم بيظهر نافذة التثبيت،
// وآيفون (مفيهوش نافذة) بنوضّح الخطوات.
type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const standalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

export function InstallButton() {
  const [evt, setEvt] = useState<BIP | null>(null);
  const [hidden, setHidden] = useState(standalone());
  const [tip, setTip] = useState(false);

  useEffect(() => {
    const onBip = (e: Event) => { e.preventDefault(); setEvt(e as BIP); };
    const onInstalled = () => setHidden(true);
    window.addEventListener('beforeinstallprompt', onBip);
    window.addEventListener('appinstalled', onInstalled);
    return () => { window.removeEventListener('beforeinstallprompt', onBip); window.removeEventListener('appinstalled', onInstalled); };
  }, []);

  if (hidden || (!evt && !isIOS())) return null;

  const click = async () => {
    if (evt) { await evt.prompt(); const r = await evt.userChoice; if (r.outcome === 'accepted') setHidden(true); setEvt(null); }
    else setTip((t) => !t);
  };

  return (
    <>
      <button className="install-btn" onClick={click}>⬇ تثبيت التطبيق</button>
      {tip && (
        <div className="install-btn" style={{ bottom: 70, maxWidth: 280, display: 'block', fontWeight: 500 }} onClick={() => setTip(false)}>
          على الآيفون: اضغط زرار المشاركة <b>⎋</b> تحت في سفاري، وبعدين <b>«إضافة إلى الشاشة الرئيسية»</b>.
        </div>
      )}
    </>
  );
}
