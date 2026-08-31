import { CalendarDays, FileText, Plus, ListChecks, User } from 'lucide-react';
import { useStore, emptyCreateForm } from '../store/store';

export function BottomNav() {
  const { state, dispatch } = useStore();
  if (state.w >= 640 || state.focusMode) return null;

  function goHome() {
    dispatch({ type: 'SET_PAGE', page: 'calendario' });
    dispatch({ type: 'GO_TODAY' });
    dispatch({ type: 'SET_VIEW', view: 'day' });
  }

  function openTasks() {
    dispatch({ type: 'SET_PAGE', page: 'tarefas' });
  }

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
      <NavButton icon={<FileText size={20} />} label="Notas" onClick={() => dispatch({ type: 'SET_PAGE', page: 'notas' })} />
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
