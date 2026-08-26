import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISS_KEY = 'aether:installDismissedUntil';
const DISMISS_DAYS = 14;

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || !!nav.standalone;
}

function isRecentlyDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  const until = Number(localStorage.getItem(DISMISS_KEY) || 0);
  return Date.now() < until;
}

function snooze() {
  localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 86_400_000));
}

/**
 * Banner de "instalar como app". Só aparece quando o navegador dispara
 * beforeinstallprompt (Chrome/Edge no Android e desktop, principalmente) —
 * no iOS Safari esse evento nunca existe, porque não há prompt programático
 * lá; instalar continua sendo Compartilhar → Adicionar à Tela de Início,
 * manual, sem como acionar isso via código.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    function onPrompt(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (!deferred || dismissed || isStandalone() || isRecentlyDismissed()) return null;

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    if (choice.outcome !== 'accepted') snooze();
  }

  function dismiss() {
    setDismissed(true);
    snooze();
  }

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 border-b shrink-0"
      style={{ background: 'color-mix(in oklab, var(--accent) 10%, var(--surface))', borderColor: 'var(--border)' }}
    >
      <Download size={16} style={{ color: 'var(--accent)' }} className="shrink-0" />
      <span className="text-[13px] flex-1" style={{ color: 'var(--text)' }}>
        Instale o Aether como app pra abrir mais rápido e usar em tela cheia.
      </span>
      <button
        onClick={install}
        className="text-[12.5px] font-semibold rounded-[8px] px-3 py-1.5 shrink-0"
        style={{ background: 'var(--accent)', color: 'var(--accentText)' }}
      >
        Instalar
      </button>
      <button onClick={dismiss} className="w-7 h-7 rounded-[7px] grid place-items-center shrink-0" aria-label="Dispensar">
        <X size={14} style={{ color: 'var(--text3)' }} />
      </button>
    </div>
  );
}
