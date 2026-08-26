import { useEffect, useRef } from 'react';
import { useStore } from '../store/store';
import { supabase } from '../lib/supabaseClient';

/**
 * Sincronização "por último que escreveu vence" — não tem resolução de
 * conflito de verdade. Pensado pra alguém usando o Aether em 2-3
 * dispositivos próprios, não editando ao mesmo tempo nos dois. Se editar
 * simultaneamente em dois lugares, o que sincronizar por último apaga a
 * mudança do outro silenciosamente — limitação conhecida, documentada
 * aqui e na tela de Configurações.
 */
export function useDeviceSync() {
  const { state, dispatch } = useStore();
  const lastPushedHash = useRef<string>('');
  const pulledOnce = useRef<string | null>(null);

  useEffect(() => {
    if (!supabase || !state.settings.syncEnabled || !state.settings.syncId) return;
    if (pulledOnce.current === state.settings.syncId) return;
    pulledOnce.current = state.settings.syncId;

    (async () => {
      const { data, error } = await supabase
        .from('aether_sync_data')
        .select('*')
        .eq('sync_id', state.settings.syncId)
        .maybeSingle();
      if (error) {
        dispatch({ type: 'TOAST', message: 'Não consegui buscar os dados sincronizados — confira o código' });
        return;
      }
      if (!data) return;
      dispatch({
        type: 'APPLY_REMOTE_SYNC',
        tasks: data.tasks ?? [],
        calendars: data.calendars ?? [],
        calendarSets: data.calendar_sets ?? [],
        settings: data.settings ?? {},
      });
      dispatch({ type: 'TOAST', message: 'Dados sincronizados carregados' });
    })();
  }, [state.settings.syncEnabled, state.settings.syncId, dispatch]);

  useEffect(() => {
    if (!supabase || !state.settings.syncEnabled || !state.settings.syncId) return;
    const payload = {
      tasks: state.tasks,
      calendars: state.calendars,
      calendar_sets: state.calendarSets,
      settings: state.settings,
    };
    const hash = JSON.stringify(payload);
    if (hash === lastPushedHash.current) return;

    const timer = window.setTimeout(async () => {
      lastPushedHash.current = hash;
      await supabase!.from('aether_sync_data').upsert({
        sync_id: state.settings.syncId,
        ...payload,
        updated_at: new Date().toISOString(),
      });
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [state.tasks, state.calendars, state.calendarSets, state.settings]);
}
