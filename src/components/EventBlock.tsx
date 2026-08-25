import { useRef, useState } from 'react';
import { MapPin, Video, Repeat } from 'lucide-react';
import { eventBg } from '../lib/style';
import { hmRange, minutesOfDay, formatDayLabel, dateKeyOf } from '../lib/dates';
import { travelOf } from '../lib/estimates';
import { useStore } from '../store/store';
import type { Event } from '../lib/types';

export function EventBlock({
  event,
  top,
  height,
  left,
  width,
  color,
  calendarName,
  lanes,
  selected,
  dragging,
  onSelect,
  onPointerDownMove,
  onPointerDownResize,
}: {
  event: Event;
  top: number;
  height: number;
  left: string;
  width: string;
  color: string;
  calendarName?: string;
  lanes: number;
  selected: boolean;
  dragging: boolean;
  onSelect: () => void;
  onPointerDownMove: (e: React.PointerEvent) => void;
  onPointerDownResize: (e: React.PointerEvent) => void;
}) {
  const { state } = useStore();
  const s = minutesOfDay(event.startsAt);
  const e = minutesOfDay(event.endsAt);
  const travel = travelOf(event);
  const [hovered, setHovered] = useState(false);
  const hoverTimer = useRef<number | null>(null);
  const showHoverPreview = state.w >= 900 && !dragging;
  // colunas estreitas (2+ eventos sobrepostos) não têm espaço pra terceira
  // linha de detalhe sem truncar feio — some com ela nesse caso
  const showDetailLine = lanes <= 1 || height > 84;

  function onMouseEnter() {
    if (!showHoverPreview) return;
    hoverTimer.current = window.setTimeout(() => setHovered(true), 380);
  }
  function onMouseLeave() {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    setHovered(false);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(ev) => {
        ev.stopPropagation();
        onSelect();
      }}
      onKeyDown={(ev) => {
        if (ev.key === 'Enter') onSelect();
      }}
      onPointerDown={onPointerDownMove}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="absolute rounded-[8px] px-[9px] py-[7px] overflow-hidden cursor-grab select-none transition-shadow"
      style={{
        top,
        height: Math.max(24, height),
        left,
        width,
        background: eventBg(color),
        borderLeft: `3px solid ${color}`,
        outline: selected ? '2px solid var(--accent)' : 'none',
        boxShadow: dragging ? 'var(--shadow)' : undefined,
        zIndex: dragging ? 25 : hovered ? 30 : 5,
        touchAction: 'none',
      }}
    >
      <div className="flex items-center gap-1 min-w-0">
        {!!event.seriesId && <Repeat size={11} className="shrink-0" style={{ color: 'var(--text2)' }} />}
        <div className="text-[12px] font-semibold truncate min-w-0" style={{ color: 'var(--text)' }}>
          {event.title}
        </div>
      </div>
      {height > 34 && (
        <div className="text-[10px] font-mono-ae truncate" style={{ color: 'var(--text2)' }}>
          {hmRange(s, e, state.settings.timeFormat)}
        </div>
      )}
      {height > 48 && showDetailLine && (event.location || event.meet || travel) && (
        <div className="flex items-center gap-1 text-[10px] min-w-0" style={{ color: 'var(--text2)' }}>
          {event.meet ? (
            <Video size={11} className="shrink-0" style={{ color: 'var(--accent)' }} />
          ) : event.location ? (
            <MapPin size={11} className="shrink-0" />
          ) : null}
          <span className="truncate min-w-0 flex-1">
            {event.meet ? 'Videochamada' : event.location}
            {travel ? ` · +${travel} min` : ''}
          </span>
        </div>
      )}
      <div
        onPointerDown={(ev) => {
          ev.stopPropagation();
          onPointerDownResize(ev);
        }}
        className="absolute left-0 right-0 bottom-0 flex items-end justify-center pb-[2px]"
        style={{ cursor: 'ns-resize', height: 16, touchAction: 'none' }}
      >
        <span className="w-6 h-[3px] rounded-full opacity-0 hover:opacity-40" style={{ background: color }} />
      </div>

      {hovered && (
        <div
          className="absolute top-full left-0 mt-1.5 rounded-[10px] border p-3 animate-ae-in pointer-events-none"
          style={{
            width: 220,
            background: 'var(--surface)',
            borderColor: 'var(--border)',
            boxShadow: 'var(--shadow)',
            zIndex: 60,
          }}
        >
          <div className="flex items-start gap-1.5 mb-1.5">
            <span className="w-2 h-2 rounded-sm mt-1 shrink-0" style={{ background: color }} />
            <span className="text-[13px] font-semibold leading-tight" style={{ color: 'var(--text)' }}>
              {event.title}
            </span>
          </div>
          <div className="text-[12px] font-mono-ae mb-0.5" style={{ color: 'var(--text2)' }}>
            {event.allDay ? 'Dia inteiro' : hmRange(s, e, state.settings.timeFormat)}
          </div>
          <div className="text-[11px] capitalize mb-1" style={{ color: 'var(--text3)' }}>
            {formatDayLabel(dateKeyOf(event.startsAt))}
          </div>
          {calendarName && (
            <div className="text-[11px] mb-1" style={{ color: 'var(--text3)' }}>
              {calendarName}
            </div>
          )}
          {event.location && (
            <div className="text-[11px] truncate" style={{ color: 'var(--text3)' }}>
              {event.location}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

