import { useStore } from '../store/store';
import { isGoogleConfigured, createGoogleEvent, updateGoogleEvent, deleteGoogleEvent } from '../lib/googleApi';
import type { Event } from '../lib/types';

/**
 * Lado da escrita da sincronização: quando o Google está conectado de
 * verdade, empurra criação/edição/exclusão de eventos pro Google Calendar.
 *
 * Limitação da v1: eventos com `rrule` (recorrência criada no Aether) não
 * são empurrados — sincronizar RRULE completo com o Google fica pra uma
 * próxima etapa. Eventos recorrentes que já existem no Google continuam
 * chegando normalmente pela sincronização de leitura.
 *
 * Falhas de rede não bloqueiam a ação local — o evento sempre fica salvo
 * no Aether mesmo se o Google estiver fora do ar; só avisamos por toast.
 */
export function useGoogleSync() {
  const { state, dispatch } = useStore();
  const active = state.google === 'on' && isGoogleConfigured();

  async function pushCreate(event: Event) {
    if (!active || event.rrule) return;
    dispatch({ type: 'ADD_PENDING_SYNC', id: event.id });
    try {
      const { googleEventId } = await createGoogleEvent(event as unknown as Record<string, unknown>);
      dispatch({ type: 'PATCH_EVENT', id: event.id, changes: { googleEventId, src: 'google' } });
    } catch (err) {
      console.error(err);
      dispatch({ type: 'TOAST', message: 'Salvo no Aether, mas não consegui enviar ao Google Calendar' });
    } finally {
      dispatch({ type: 'REMOVE_PENDING_SYNC', id: event.id });
    }
  }

  async function pushUpdate(event: Event) {
    if (!active || !event.googleEventId) return;
    dispatch({ type: 'ADD_PENDING_SYNC', id: event.id });
    try {
      await updateGoogleEvent(event.googleEventId, event as unknown as Record<string, unknown>);
    } catch (err) {
      console.error(err);
      dispatch({ type: 'TOAST', message: 'Atualizado no Aether, mas não consegui atualizar no Google Calendar' });
    } finally {
      dispatch({ type: 'REMOVE_PENDING_SYNC', id: event.id });
    }
  }

  async function pushDelete(event: Event) {
    if (!active || !event.googleEventId) return;
    try {
      await deleteGoogleEvent(event.googleEventId);
    } catch (err) {
      console.error(err);
      dispatch({ type: 'TOAST', message: 'Excluído no Aether, mas não consegui excluir no Google Calendar' });
    }
  }

  return { active, pushCreate, pushUpdate, pushDelete };
}
