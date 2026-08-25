import { useEffect, useRef, useState } from 'react';
import { Settings, RefreshCw, LogOut, Sparkles } from 'lucide-react';
import { useStore } from '../store/store';
import { isGoogleConfigured } from '../lib/googleApi';

export function AccountMenu() {
  const { state, dispatch } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const connected = state.google === 'on';

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-9 h-9 rounded-full grid place-items-center font-bold text-[13px] shrink-0"
        style={{ background: 'var(--accent)', color: 'var(--accentText)' }}
        aria-label="Conta"
      >
        T
      </button>

      {open && (
        <div
          className="absolute top-11 right-0 z-50 w-[240px] rounded-[12px] border p-1.5 animate-ae-pop"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}
        >
          <div className="px-2.5 py-2 mb-1 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="text-[13px] font-bold" style={{ color: 'var(--text)' }}>
              Aether Calendar
            </div>
            <div className="text-[11.5px]" style={{ color: 'var(--text3)' }}>
              {connected ? 'Google Calendar conectado' : 'Uso local'}
            </div>
          </div>

          <MenuItem
            icon={<Settings size={14} />}
            label="Configurações"
            onClick={() => {
              dispatch({ type: 'SET_SETTINGS_OPEN', open: true, tab: 'general' });
              setOpen(false);
            }}
          />

          {isGoogleConfigured() && connected && (
            <MenuItem
              icon={<RefreshCw size={14} />}
              label="Sincronizar agora"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('aether:sync-now'));
                setOpen(false);
              }}
            />
          )}

          <MenuItem
            icon={<Sparkles size={14} />}
            label="Assistente de horários"
            onClick={() => {
              dispatch({ type: 'SET_AI_OPEN', open: true });
              setOpen(false);
            }}
          />

          {connected && (
            <MenuItem
              icon={<LogOut size={14} />}
              label="Desconectar Google"
              danger
              onClick={() => {
                dispatch({ type: 'GOOGLE_TOGGLE' });
                setOpen(false);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 text-left px-2.5 py-2 rounded-[8px] text-[13px] font-medium"
      style={{ color: danger ? 'var(--now-line)' : 'var(--text)' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface2)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <span style={{ color: danger ? 'var(--now-line)' : 'var(--text3)' }}>{icon}</span>
      {label}
    </button>
  );
}
