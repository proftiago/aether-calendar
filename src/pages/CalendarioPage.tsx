import { useStore } from '../store/store';
import { Sidebar } from '../components/Sidebar';
import { Toolbar } from '../components/Toolbar';
import { DayWeekGrid } from '../components/views/DayWeekGrid';
import { MonthView } from '../components/views/MonthView';
import { AgendaView } from '../components/views/AgendaView';
import { TaskPanel } from '../components/TaskPanel';
import { Drawer } from '../components/Drawer';
import { UtilityPopovers } from '../components/UtilityPopovers';

/**
 * Página Calendário — sidebar de filtros (esquerda) e painel de tarefas
 * (direita) são os dois popovers/overlay, igual ao app de referência: a
 * grade fica em largura cheia por padrão, os dois só aparecem quando
 * abertos explicitamente (botões no Toolbar), flutuando por cima em vez
 * de ocupar espaço fixo.
 */
export function CalendarioPage({ eventCountByCal }: { eventCountByCal: Record<string, number> }) {
  const { state, dispatch } = useStore();
  const drawerOpen = state.selected !== null;

  return (
    <>
      <Sidebar eventCountByCal={eventCountByCal} />
      <div className="flex-1 flex flex-col min-w-0 relative">
        <Toolbar />
        <div
          key={state.view === 'day' || state.view === 'week' ? 'grid' : state.view}
          className="flex-1 flex flex-col min-h-0 animate-ae-in"
        >
          {state.view === 'day' || state.view === 'week' ? (
            <DayWeekGrid />
          ) : state.view === 'month' ? (
            <MonthView />
          ) : (
            <AgendaView />
          )}
        </div>
        <UtilityPopovers />
      </div>

      {state.taskPanelOpen && !drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-30"
            style={{ background: 'rgba(0,0,0,0.2)' }}
            onClick={() => dispatch({ type: 'SET_TASK_PANEL', open: false })}
          />
          <aside
            className="fixed inset-y-0 right-0 z-40 w-[280px] shrink-0 border-l p-4 overflow-y-auto animate-ae-in"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}
          >
            <TaskPanel />
          </aside>
        </>
      )}
      {drawerOpen && <Drawer />}
    </>
  );
}
