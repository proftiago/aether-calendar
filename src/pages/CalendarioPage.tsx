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
 * Página Calendário — sidebar de filtros (esquerda) continua popover/
 * overlay. O painel de tarefas (direita), porém, volta a ficar fixo
 * sempre visível em telas largas (>=1280px) — o novo arquivo de
 * referência (CalendarTab.tsx) mostra exatamente isso: um painel de
 * tarefas permanente do lado do calendário, pra arrastar tarefa pra
 * dentro da grade sem precisar abrir nada. Em telas mais estreitas,
 * onde não cabe os dois lado a lado, continua como popover (mesmo
 * botão no Toolbar).
 */
export function CalendarioPage({ eventCountByCal }: { eventCountByCal: Record<string, number> }) {
  const { state, dispatch } = useStore();
  const drawerOpen = state.selected !== null;
  const showPersistentTaskPanel = state.w >= 1280 && !drawerOpen;

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

      {showPersistentTaskPanel && (
        <aside
          className="w-[280px] shrink-0 border-l p-4 overflow-y-auto"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <TaskPanel />
        </aside>
      )}

      {!showPersistentTaskPanel && state.taskPanelOpen && !drawerOpen && (
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
