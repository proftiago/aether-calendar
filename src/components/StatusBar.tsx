import { useStore } from '../store/store';
import { useAllEvents, useVisibleEvents } from '../store/selectors';

export function StatusBar() {
  const { state } = useStore();
  const allEvents = useAllEvents(state);
  const visibleEvents = useVisibleEvents(state, allEvents);

  let syncLabel: string;
  if (state.google === 'sync') {
    syncLabel = 'Sincronizando com o Google…';
  } else if (state.google === 'on' && state.lastSync) {
    const time = new Date(state.lastSync).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    syncLabel = `Última sincronização às ${time} · ${visibleEvents.length} eventos visíveis`;
  } else {
    syncLabel = `Google Calendar desconectado · ${visibleEvents.length} eventos locais`;
  }

  return (
    <div
      className="flex items-center gap-4 px-4 py-1.5 border-t text-[10.5px] flex-wrap shrink-0"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text3)' }}
    >
      <div className="flex items-center gap-3 flex-wrap">
        <Shortcut k="Ctrl /">comandos</Shortcut>
        <Shortcut k="T">hoje</Shortcut>
        <Shortcut k="C">criar</Shortcut>
        <Shortcut k="1 2 3 4">dia/semana/mês/agenda</Shortcut>
        <Shortcut k="←/→">navegar</Shortcut>
      </div>
      <div className="flex-1" />
      <span>{syncLabel}</span>
    </div>
  );
}

function Shortcut({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <span>
      <span className="font-mono-ae font-bold">{k}</span> {children}
    </span>
  );
}
