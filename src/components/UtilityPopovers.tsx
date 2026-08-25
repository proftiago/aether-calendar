import { useState } from 'react';
import { X } from 'lucide-react';
import { useStore, emptyCreateForm } from '../store/store';
import { useAllEvents, useVisibleEvents } from '../store/selectors';
import { freeSlots } from '../lib/freeSlots';
import { formatDayLabel, hm } from '../lib/dates';

export function UtilityPopovers() {
  const { state, dispatch } = useStore();
  const allEvents = useAllEvents(state);
  const visibleEvents = useVisibleEvents(state, allEvents);

  if (!state.panel) return null;

  function close() {
    dispatch({ type: 'SET_PANEL', panel: null });
  }

  function openSlotInModal(dateKey: string, startMin: number, duration: number) {
    dispatch({ type: 'OPEN_FORM', form: emptyCreateForm(dateKey, startMin, duration) });
    close();
  }

  if (state.panel === 'free') {
    const slots = freeSlots(visibleEvents, 60, 5);
    return (
      <Popover title="Encontrar horário livre" onClose={close}>
        <p className="text-[12px] leading-[1.5] mb-3" style={{ color: 'var(--text2)' }}>
          Próximos blocos de 60 min dentro do horário de trabalho, considerando os calendários visíveis.
        </p>
        <div className="flex flex-col gap-1.5">
          {slots.map((slot, i) => (
            <button
              key={i}
              onClick={() => openSlotInModal(slot.dateKey, slot.startMin, 60)}
              className="flex items-center justify-between rounded-[9px] px-[11px] py-[9px] text-left hover:[background:var(--surface2)]"
            >
              <span className="text-[12.5px] font-semibold capitalize" style={{ color: 'var(--text)' }}>
                {formatDayLabel(slot.dateKey)}
              </span>
              <span className="text-[12px] font-mono-ae" style={{ color: 'var(--text2)' }}>
                {hm(slot.startMin, state.settings.timeFormat)}
              </span>
            </button>
          ))}
          {slots.length === 0 && (
            <p className="text-[12px]" style={{ color: 'var(--text3)' }}>
              Nenhum horário livre encontrado nos próximos 14 dias.
            </p>
          )}
        </div>
      </Popover>
    );
  }

  // panel === 'link'
  const slots = freeSlots(visibleEvents, 30, 4);
  return <BookingLinkPanel onClose={close} slots={slots} onPick={openSlotInModal} timeFormat={state.settings.timeFormat} />;
}

function BookingLinkPanel({
  onClose,
  slots,
  onPick,
  timeFormat,
}: {
  onClose: () => void;
  slots: { dateKey: string; startMin: number }[];
  onPick: (dateKey: string, startMin: number, duration: number) => void;
  timeFormat: '12h' | '24h';
}) {
  const [copied, setCopied] = useState(false);
  const link = 'aether.cal/luiza-mendes/30min';

  async function copy() {
    try {
      await navigator.clipboard.writeText(`https://${link}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard indisponível — ignora silenciosamente
    }
  }

  return (
    <Popover title="Link de agendamento" onClose={onClose}>
      <div
        className="flex items-center gap-2 rounded-[9px] px-2.5 py-2 mb-3"
        style={{ background: 'var(--surface2)' }}
      >
        <span className="font-mono-ae text-[11.5px] flex-1 truncate" style={{ color: 'var(--text2)' }}>
          {link}
        </span>
        <button
          onClick={copy}
          className="text-[12px] font-semibold rounded-[7px] px-2.5 py-1 shrink-0"
          style={{ background: 'var(--accent)', color: 'var(--accentText)' }}
        >
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <div className="flex flex-col gap-1.5">
        {slots.map((slot, i) => (
          <button
            key={i}
            onClick={() => onPick(slot.dateKey, slot.startMin, 30)}
            className="flex items-center justify-between rounded-[9px] px-[11px] py-[9px] text-left hover:[background:var(--surface2)]"
          >
            <span className="text-[12.5px] font-semibold capitalize" style={{ color: 'var(--text)' }}>
              {formatDayLabel(slot.dateKey)}
            </span>
            <span className="text-[12px] font-mono-ae" style={{ color: 'var(--text2)' }}>
              {hm(slot.startMin, timeFormat)}
            </span>
          </button>
        ))}
      </div>
    </Popover>
  );
}

function Popover({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="absolute top-3 right-4 z-[45] w-[320px] rounded-[14px] border p-3.5 animate-ae-pop"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[14px] font-bold" style={{ color: 'var(--text)' }}>
          {title}
        </h3>
        <button onClick={onClose} className="w-6 h-6 rounded-[7px] grid place-items-center" style={{ background: 'var(--surface2)' }}>
          <X size={12} style={{ color: 'var(--text2)' }} />
        </button>
      </div>
      {children}
    </div>
  );
}
