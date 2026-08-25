import { CalendarDays, RefreshCw, Plus, ListChecks, User } from 'lucide-react';
import { useStore, emptyCreateForm } from '../store/store';
import { isGoogleConfigured, buildGoogleAuthUrl } from '../lib/googleApi';

export function BottomNav() {
  const { state, dispatch } = useStore();
  if (state.w >= 640 || state.focusMode) return null;

  function goHome() {
    dispatch({ type: 'GO_TODAY' });
    dispatch({ type: 'SET_VIEW', view: 'day' });
  }

  function handleSync() {
    if (state.google === 'on') {
      window.dispatchEvent(new CustomEvent('aether:sync-now'));
    } else if (isGoogleConfigured()) {
      window.location.href = buildGoogleAuthUrl();
    } else {
      dispatch({ type: 'GOOGLE_TOGGLE' });
    }
  }

  function openTasks() {
    dispatch({ type: 'SET_SHORTCUTS_OPEN', open: true });
    window.dispatchEvent(new CustomEvent('aether:open-tasks'));
  }

  const syncColor =
    state.google === 'off' ? 'var(--text3)' : state.google === 'sync' ? 'var(--sync-progress)' : 'var(--sync-ok)';

  return (
    <nav
      className="flex items-center justify-around border-t shrink-0"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--border)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingTop: 6,
      }}
    >
      <NavButton icon={<CalendarDays size={20} />} label="Agenda" onClick={goHome} />
      <NavButton icon={<RefreshCw size={20} style={{ color: syncColor }} className={state.google === 'sync' ? 'animate-ae-spin' : ''} />} label="Sync" onClick={handleSync} />
      <button
        onClick={() => dispatch({ type: 'OPEN_FORM', form: emptyCreateForm(state.cursor) })}
        className="w-12 h-12 rounded-full grid place-items-center -mt-5 shrink-0"
        style={{ background: 'var(--accent)', color: 'var(--accentText)', boxShadow: 'var(--shadow)' }}
        aria-label="Criar evento"
      >
        <Plus size={22} strokeWidth={2.5} />
      </button>
      <NavButton icon={<ListChecks size={20} />} label="Tarefas" onClick={openTasks} />
      <NavButton
        icon={<User size={20} />}
        label="Perfil"
        onClick={() => dispatch({ type: 'SET_SETTINGS_OPEN', open: true, tab: 'general' })}
      />
    </nav>
  );
}

function NavButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-0.5 py-1.5 px-3" style={{ color: 'var(--text2)' }}>
      {icon}
      <span className="text-[9.5px] font-medium">{label}</span>
    </button>
  );
}
