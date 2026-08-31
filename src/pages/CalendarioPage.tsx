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
 * Página Calendário — o que já era a tela principal do Aether: sidebar de
 * filtros à esquerda, grade/mês/agenda no centro, e um painel à direita
 * que alterna entre Tarefas (padrão) e detalhes do evento selecionado —
 * os dois disputam a mesma coluna, nunca aparecem juntos.
 */
export function CalendarioPage({ eventCountByCal }: { eventCountByCal: Record<string, number> }) {
  const { state } = useStore();
  const drawerOpen = state.selected !== null;
  const showTaskPanel = state.w >= 1280 && !drawerOpen;

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
      {showTaskPanel && (
        <aside
          className="w-[260px] shrink-0 border-l p-4 overflow-y-auto"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <TaskPanel />
        </aside>
      )}
      {drawerOpen && <Drawer />}
    </>
  );
}
