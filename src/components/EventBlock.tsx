import { eventBg } from '../lib/style';
import { hm, minutesOfDay } from '../lib/dates';
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
      className="absolute rounded-[7px] px-[7px] py-1 overflow-hidden cursor-grab select-none transition-shadow"
      style={{
        top,
        height: Math.max(24, height),
        left,
        width,
        background: eventBg(color),
        borderLeft: `3px solid ${color}`,
        outline: selected ? '2px solid var(--accent)' : 'none',
        boxShadow: dragging ? 'var(--shadow)' : undefined,
        zIndex: dragging ? 25 : 5,
        touchAction: 'none',
      }}
    >
      <div className="text-[12px] font-bold truncate" style={{ color: 'var(--text)' }}>
        {event.title}
      </div>
      {height > 34 && (
        <div className="text-[10.5px] font-mono-ae truncate" style={{ color: 'var(--text2)' }}>
          {hm(s, state.settings.timeFormat)} – {hm(e, state.settings.timeFormat)}
        </div>
      )}
      {height > 48 && (event.location || travel) && (
        <div className="text-[10.5px] truncate" style={{ color: 'var(--text2)' }}>
          {event.location}
          {travel ? ` · +${travel} min` : ''}
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
    </div>
  );
}

