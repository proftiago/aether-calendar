import { useEffect, useMemo } from 'react';
import { StoreProvider, useStore, emptyCreateForm } from './store/store';
import { useAllEvents } from './store/selectors';
import { Header } from './components/Header';
import { FloatingDock } from './components/FloatingDock';
import { NavRail } from './components/NavRail';
import { CalendarioPage } from './pages/CalendarioPage';
import { TarefasPage } from './pages/TarefasPage';
import { NotasPage } from './pages/NotasPage';
import { PaginasPage } from './pages/PaginasPage';
import { ProfilePage } from './pages/ProfilePage';
import { HojePage } from './pages/HojePage';
import { EventModal } from './components/EventModal';
import { SettingsModal } from './components/SettingsModal';
import { AIAssistant } from './components/AIAssistant';
import { RightPanel } from './components/RightPanel';
import { FocusModeView } from './components/FocusModeView';
import { CommandMenu } from './components/CommandMenu';
import { Toast } from './components/Toast';
import { StatusBar } from './components/StatusBar';
import { BottomNav } from './components/BottomNav';
import { InstallPrompt } from './components/InstallPrompt';
import { ReminderService } from './components/ReminderService';
import { useDeviceSync } from './hooks/useDeviceSync';
import type { ViewKey } from './lib/types';

function AppShell() {
  const { state, dispatch } = useStore();
  const allEvents = useAllEvents(state);
  useDeviceSync();

  // Deslizar a partir da borda esquerda da tela abre a sidebar (mobile/
  // tablet); deslizar pra esquerda com ela já aberta fecha. Só uma faixa
  // bem fina (24px) na borda conta como "início do gesto de abrir", pra
  // não brigar com outros gestos de arrastar dentro do app.
  useEffect(() => {
    if (state.w >= 980) return;
    let startX = 0;
    let startY = 0;
    let tracking = false;
    let decided = false;
    let horizontal = false;
    let fromEdge = false;

    function onDown(e: PointerEvent) {
      if (e.pointerType !== 'touch') return;
      // Na visão Dia, "puxar perto da borda esquerda pra direita" já é o
      // gesto de voltar um dia — não pode competir com abrir a sidebar.
      // Deixa essa faixa livre pro DayWeekGrid nessa visão específica.
      const edgeGestureAvailable = state.view !== 'day';
      fromEdge = edgeGestureAvailable && !state.sidebarOpen && e.clientX < 24;
      if (!fromEdge && !state.sidebarOpen) return;
      startX = e.clientX;
      startY = e.clientY;
      tracking = true;
      decided = false;
      horizontal = false;
    }
    function onMove(e: PointerEvent) {
      if (!tracking) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!decided && (Math.abs(dx) > 12 || Math.abs(dy) > 12)) {
        decided = true;
        horizontal = Math.abs(dx) > Math.abs(dy) * 1.3;
      }
      if (decided && horizontal && e.cancelable) e.preventDefault();
    }
    function onUp(e: PointerEvent) {
      if (!tracking) return;
      tracking = false;
      if (!decided || !horizontal) return;
      const dx = e.clientX - startX;
      if (fromEdge && dx > 60) dispatch({ type: 'SET_SIDEBAR', open: true });
      else if (state.sidebarOpen && dx < -60) dispatch({ type: 'SET_SIDEBAR', open: false });
    }
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp, { passive: true });
    window.addEventListener('pointercancel', onUp, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [state.w, state.sidebarOpen, state.view, dispatch]);


  const eventCountByCal = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of state.calendars) counts[String(c.id)] = 0;
    const q = state.search.trim().toLowerCase();
    for (const ev of allEvents) {
      if (q) {
        const hay = `${ev.title} ${ev.location ?? ''}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }
      counts[String(ev.calId)] = (counts[String(ev.calId)] ?? 0) + 1;
    }
    return counts;
  }, [allEvents, state.calendars, state.search]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const inField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (e.key === 'Escape') {
        if (state.form) {
          dispatch({ type: 'CLOSE_FORM' });
        } else if (state.selected) {
          dispatch({ type: 'SET_SELECTED', id: null });
        } else if (state.panel) {
          dispatch({ type: 'SET_PANEL', panel: null });
        } else if (inField) {
          target.blur();
        }
        return;
      }

      if (inField) return;
      if (state.form) return; // navegação suspensa com modal aberto

      if (e.key === 't' || e.key === 'T') {
        dispatch({ type: 'GO_TODAY' });
      } else if (e.key === 'c' || e.key === 'C' || e.key === 'n' || e.key === 'N') {
        dispatch({ type: 'OPEN_FORM', form: emptyCreateForm(state.cursor) });
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        const map: Record<string, ViewKey> = { '1': 'day', '2': 'week', '3': 'month', '4': 'agenda' };
        dispatch({ type: 'SET_VIEW', view: map[e.key] });
      } else if (e.key === 'd' || e.key === 'D') {
        dispatch({ type: 'SET_VIEW', view: 'day' });
      } else if (e.key === 'w' || e.key === 'W') {
        dispatch({ type: 'SET_VIEW', view: 'week' });
      } else if (e.key === 'ArrowLeft') {
        dispatch({ type: 'NAV', dir: -1 });
      } else if (e.key === 'ArrowRight') {
        dispatch({ type: 'NAV', dir: 1 });
      } else if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('aether:open-search'));
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state.form, state.selected, state.panel, state.cursor, dispatch]);


  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg)', height: '100dvh' }}>
      <Header />
      <InstallPrompt />
      <ReminderService />
      <div className="flex-1 flex min-h-0 relative">
        {state.focusMode ? (
          <FocusModeView />
        ) : (
          <>
            <NavRail />
            <div key={state.page} className="flex-1 flex min-h-0 animate-ae-in">
              {state.page === 'hoje' ? (
                <HojePage />
              ) : state.page === 'tarefas' ? (
                <TarefasPage />
              ) : state.page === 'notas' ? (
                <NotasPage />
              ) : state.page === 'paginas' ? (
                <PaginasPage />
              ) : state.page === 'perfil' ? (
                <ProfilePage />
              ) : (
                <CalendarioPage eventCountByCal={eventCountByCal} />
              )}
            </div>
          </>
        )}
      </div>
      <StatusBar />
      <BottomNav />
      <EventModal />
      <SettingsModal />
      <RightPanel />
      <Toast />
      <AIAssistant />
      <CommandMenu />
      <FloatingDock />
    </div>
  );
}

function App() {
  return (
    <StoreProvider>
      <AppShell />
    </StoreProvider>
  );
}

export default App;
