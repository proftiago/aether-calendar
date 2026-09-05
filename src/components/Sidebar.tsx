import { useState } from 'react';
import { Check, Plus, X, Settings, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { useStore } from '../store/store';
import { hm } from '../lib/dates';
import { MiniCalendar } from './MiniCalendar';
import { ResizeHandle } from './ResizeHandle';
import { useResizablePanel } from '../hooks/useResizablePanel';

const DOW_SHORT_PT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

function workDaysLabel(days: number[]): string {
  if (days.length === 0) return 'nenhum dia';
  if (days.length === 7) return 'todos os dias';
  const sorted = [...days].sort();
  // caso comum: intervalo contínuo (ex: seg a sex) — mostra como faixa
  const isRange = sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
  if (isRange && sorted.length > 1) {
    return `${DOW_SHORT_PT[sorted[0]]} a ${DOW_SHORT_PT[sorted[sorted.length - 1]]}`;
  }
  return sorted.map((d) => DOW_SHORT_PT[d]).join(', ');
}

const CALENDAR_COLOR_PRESETS = [
  '#0284c7', // azul
  '#0891b2', // ciano
  '#0d9488', // teal
  '#16a34a', // verde
  '#65a30d', // lima
  '#ca8a04', // âmbar
  '#ea580c', // laranja
  '#dc2626', // vermelho
  '#e11d48', // rosa-vermelho
  '#db2777', // rosa
  '#c026d3', // magenta
  '#9333ea', // roxo
  '#7c3aed', // violeta
  '#4f46e5', // índigo
];

const CALENDAR_ICON_PRESETS = ['💼', '🏠', '👨‍👩‍👧', '❤️', '🎓', '✈️', '🏋️', '🎯', '📚', '🎉', '💰', '🐾'];

/**
 * Painel específico da página Calendário — mini-calendário, sets de
 * calendário e a lista de calendários com filtro/cor/ícone. As tarefas
 * saíram daqui (ver TaskPanel.tsx) e a navegação entre páginas também
 * (ver NavRail.tsx) — isso aqui é só o que é específico de "estou vendo o
 * calendário e quero filtrar o que aparece nele".
 */
export function Sidebar({ eventCountByCal }: { eventCountByCal: Record<string, number> }) {
  const { state, dispatch } = useStore();
  const [addingSet, setAddingSet] = useState(false);
  const [newSetName, setNewSetName] = useState('');
  const [colorPickerFor, setColorPickerFor] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [addingCalendar, setAddingCalendar] = useState(false);
  const [newCalendarName, setNewCalendarName] = useState('');
  const [workHoursOpen, setWorkHoursOpen] = useState(false);
  const resize = useResizablePanel('aether:sidebar-width', 240, 200, 420, 1);

  // sempre overlay agora — no original o painel de filtros abre/fecha por
  // cima da grade, não fica fixo ocupando espaço permanente
  const overlayMode = true;

  function confirmAddSet() {
    if (newSetName.trim()) {
      dispatch({ type: 'ADD_CALENDAR_SET', name: newSetName });
    }
    setNewSetName('');
    setAddingSet(false);
  }

  function confirmAddCalendar() {
    const name = newCalendarName.trim();
    if (name) {
      const usedColors = new Set(state.calendars.map((c) => c.color));
      const color = CALENDAR_COLOR_PRESETS.find((c) => !usedColors.has(c)) ?? CALENDAR_COLOR_PRESETS[0];
      dispatch({
        type: 'ADD_CALENDAR',
        calendar: { id: `cal-${Date.now()}`, name, color, visible: true },
      });
    }
    setNewCalendarName('');
    setAddingCalendar(false);
  }

  return (
    <>
      {overlayMode && state.sidebarOpen && (
        <div
          className="fixed inset-0 z-20"
          style={{ background: 'rgba(0,0,0,0.3)' }}
          onClick={() => dispatch({ type: 'SET_SIDEBAR', open: false })}
        />
      )}
      <aside
        className={`relative shrink-0 overflow-y-auto flex flex-col p-4 border-r ${
          overlayMode ? 'fixed inset-y-0 left-0 z-30 transition-transform' : ''
        }`}
        style={{
          width: resize.width,
          background: 'var(--surface)',
          borderColor: 'var(--border)',
          boxShadow: overlayMode ? 'var(--shadow)' : undefined,
          transform: overlayMode ? (state.sidebarOpen ? 'translateX(0)' : 'translateX(-100%)') : undefined,
          display: overlayMode && !state.sidebarOpen ? 'none' : 'flex',
        }}
      >
        <ResizeHandle onPointerDown={resize.startDrag} dragging={resize.dragging} side="right" />
        <MiniCalendar />

        <SectionDivider />

        <section>
          <div className="flex items-center justify-between mb-0.5">
            <SectionTitle>Filtro</SectionTitle>
            <button
              onClick={() => dispatch({ type: 'SET_SETTINGS_OPEN', open: true, tab: 'general' })}
              className="w-5 h-5 rounded-[5px] grid place-items-center hover:[background:var(--surface2)]"
              aria-label="Configurações de filtro"
              title="Configurações"
            >
              <Settings size={11} style={{ color: 'var(--text3)' }} />
            </button>
          </div>
          <div className="mt-2 flex flex-col gap-0.5">
            <FilterToggle
              label="Tarefas"
              checked={state.settings.calFilterTasks}
              onChange={(v) => dispatch({ type: 'UPDATE_SETTINGS', changes: { calFilterTasks: v } })}
            />
            <FilterToggle
              label="Eventos"
              checked={state.settings.calFilterEvents}
              onChange={(v) => dispatch({ type: 'UPDATE_SETTINGS', changes: { calFilterEvents: v } })}
            />
            <FilterToggle
              label="Hábitos"
              checked={state.settings.calFilterHabits}
              onChange={(v) => dispatch({ type: 'UPDATE_SETTINGS', changes: { calFilterHabits: v } })}
            />
            <FilterToggle
              label="Eventos de dia inteiro"
              checked={state.settings.calFilterAllDay}
              onChange={(v) => dispatch({ type: 'UPDATE_SETTINGS', changes: { calFilterAllDay: v } })}
            />
            <FilterToggle
              label="Ocultar concluídas"
              checked={state.settings.calHideCompletedTasks}
              onChange={(v) => dispatch({ type: 'UPDATE_SETTINGS', changes: { calHideCompletedTasks: v } })}
            />
          </div>
        </section>

        <SectionDivider />

        <section>
          <SectionTitle>Calendar sets</SectionTitle>
          <div className="mt-2 flex flex-col gap-0.5">
            {state.calendarSets.map((s) => {
              const active = state.set === s.id;
              return (
                <div key={s.id} className="relative group">
                  <button
                    onClick={() => dispatch({ type: 'SET_CAL_SET', set: s.id })}
                    className="w-full text-left rounded-[7px] pl-2.5 pr-2.5 py-[6px] text-[13px] font-medium"
                    style={
                      active
                        ? { background: 'var(--accent)', color: 'var(--accentText)' }
                        : { color: 'var(--text2)' }
                    }
                    onMouseEnter={(e) => {
                      if (!active) e.currentTarget.style.background = 'var(--surface2)';
                    }}
                    onMouseLeave={(e) => {
                      if (!active) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {s.name}
                  </button>
                  {!s.builtin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatch({ type: 'REMOVE_CALENDAR_SET', id: s.id });
                      }}
                      className="absolute top-1/2 -translate-y-1/2 right-1.5 w-5 h-5 rounded-[5px] grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: active ? 'var(--accentText)' : 'var(--text3)' }}
                      aria-label={`Excluir set ${s.name}`}
                    >
                      <X size={12} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              );
            })}
            {addingSet ? (
              <input
                autoFocus
                value={newSetName}
                onChange={(e) => setNewSetName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmAddSet();
                  if (e.key === 'Escape') {
                    setAddingSet(false);
                    setNewSetName('');
                  }
                }}
                onBlur={confirmAddSet}
                placeholder="Nome do set"
                className="rounded-[7px] px-2.5 py-[6px] text-[13px] outline-none"
                style={{ background: 'var(--surface2)', color: 'var(--text)' }}
              />
            ) : (
              <button
                onClick={() => setAddingSet(true)}
                className="text-left rounded-[7px] px-2.5 py-[6px] text-[12px] font-medium flex items-center gap-1.5"
                style={{ color: 'var(--text3)' }}
                title="Salvar seleção atual de calendários como um novo set"
              >
                <Plus size={12} />
                Novo set
              </button>
            )}
          </div>
        </section>

        <SectionDivider />

        <section>
          <div className="flex items-center justify-between mb-0.5">
            <SectionTitle>Calendários</SectionTitle>
            <button
              onClick={() => setAddingCalendar(true)}
              className="w-5 h-5 rounded-[5px] grid place-items-center hover:[background:var(--surface2)]"
              aria-label="Novo calendário"
              title="Novo calendário"
            >
              <Plus size={12} style={{ color: 'var(--text3)' }} />
            </button>
          </div>
          <div className="mt-2 flex flex-col">
            {state.calendars.map((c, i) => (
              <div key={c.id} className="relative flex items-center gap-1.5 rounded-[7px] px-1.5 py-[7px] hover:[background:var(--surface2)] group">
                <button
                  onClick={() => dispatch({ type: 'TOGGLE_CAL', id: c.id })}
                  className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                  style={{ opacity: c.visible ? 1 : 0.5 }}
                >
                  <span
                    className="w-4 h-4 rounded-[5px] grid place-items-center shrink-0"
                    style={{
                      border: `1.5px solid ${c.color}`,
                      background: c.visible ? c.color : 'transparent',
                    }}
                  >
                    {c.visible && <Check size={12} strokeWidth={3.5} color="white" />}
                  </span>
                  <span className="text-[13px] font-medium flex-1 truncate flex items-center gap-1.5" style={{ color: 'var(--text)' }}>
                    {c.icon && <span aria-hidden="true">{c.icon}</span>}
                    {c.name}
                  </span>
                </button>

                <span className="hidden group-hover:flex items-center shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch({ type: 'MOVE_CALENDAR', id: c.id, direction: 'up' });
                    }}
                    disabled={i === 0}
                    className="w-5 h-5 rounded-[5px] grid place-items-center disabled:opacity-25"
                    aria-label={`Mover ${c.name} pra cima`}
                  >
                    <ChevronUp size={12} style={{ color: 'var(--text3)' }} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch({ type: 'MOVE_CALENDAR', id: c.id, direction: 'down' });
                    }}
                    disabled={i === state.calendars.length - 1}
                    className="w-5 h-5 rounded-[5px] grid place-items-center disabled:opacity-25"
                    aria-label={`Mover ${c.name} pra baixo`}
                  >
                    <ChevronDown size={12} style={{ color: 'var(--text3)' }} />
                  </button>
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setColorPickerFor(colorPickerFor === c.id ? null : c.id);
                    setRenameDraft(c.name);
                  }}
                  className="w-4 h-4 rounded-full shrink-0"
                  style={{ background: c.color, boxShadow: '0 0 0 2px var(--surface)' }}
                  aria-label={`Personalizar ${c.name}`}
                  title="Cor, ícone e nome"
                />
                <span className="text-[11px] font-mono-ae shrink-0 group-hover:hidden" style={{ color: 'var(--text3)' }}>
                  {eventCountByCal[c.id] ?? 0}
                </span>

                {state.calendars.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const fallback = state.calendars.find((other) => other.id !== c.id);
                      if (!fallback) return;
                      if (
                        window.confirm(
                          `Excluir "${c.name}"? Os eventos, tarefas e notas que estavam nele vão pro calendário "${fallback.name}".`,
                        )
                      ) {
                        dispatch({ type: 'REMOVE_CALENDAR', id: c.id, fallbackId: String(fallback.id) });
                      }
                    }}
                    className="hidden group-hover:grid w-5 h-5 rounded-[5px] place-items-center shrink-0"
                    aria-label={`Excluir ${c.name}`}
                    title="Excluir calendário"
                  >
                    <Trash2 size={12} style={{ color: 'var(--danger)' }} />
                  </button>
                )}

                {colorPickerFor === c.id && (
                  <div
                    className="absolute right-0 top-full mt-1 z-30 rounded-[10px] border p-2.5 w-[192px]"
                    style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}
                  >
                    <div className="text-[10px] font-semibold uppercase tracking-[0.1em] mb-1.5" style={{ color: 'var(--text3)' }}>
                      Nome
                    </div>
                    <input
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onBlur={() => {
                        if (renameDraft.trim() && renameDraft.trim() !== c.name) {
                          dispatch({ type: 'RENAME_CALENDAR', id: c.id, name: renameDraft.trim() });
                        }
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                      className="w-full rounded-[7px] px-2 py-1.5 text-[12.5px] outline-none mb-3"
                      style={{ background: 'var(--surface2)', color: 'var(--text)' }}
                    />
                    <div className="text-[10px] font-semibold uppercase tracking-[0.1em] mb-1.5" style={{ color: 'var(--text3)' }}>
                      Cor
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 mb-3">
                      {CALENDAR_COLOR_PRESETS.map((color) => (
                        <button
                          key={color}
                          onClick={() => dispatch({ type: 'UPDATE_CALENDAR_COLOR', id: c.id, color })}
                          className="w-6 h-6 rounded-full grid place-items-center"
                          style={{ background: color }}
                          aria-label={color}
                        >
                          {c.color === color && <Check size={12} strokeWidth={3.5} color="white" />}
                        </button>
                      ))}
                    </div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.1em] mb-1.5" style={{ color: 'var(--text3)' }}>
                      Ícone
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      <button
                        onClick={() => dispatch({ type: 'UPDATE_CALENDAR_ICON', id: c.id, icon: undefined })}
                        className="w-6 h-6 rounded-[6px] grid place-items-center text-[11px]"
                        style={{ background: !c.icon ? 'var(--surface2)' : 'transparent', color: 'var(--text3)' }}
                        aria-label="Nenhum ícone"
                        title="Nenhum"
                      >
                        <X size={12} />
                      </button>
                      {CALENDAR_ICON_PRESETS.map((icon) => (
                        <button
                          key={icon}
                          onClick={() => dispatch({ type: 'UPDATE_CALENDAR_ICON', id: c.id, icon })}
                          className="w-6 h-6 rounded-[6px] grid place-items-center text-[13px]"
                          style={{ background: c.icon === icon ? 'var(--surface2)' : 'transparent' }}
                          aria-label={icon}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {addingCalendar ? (
              <input
                autoFocus
                value={newCalendarName}
                onChange={(e) => setNewCalendarName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmAddCalendar();
                  if (e.key === 'Escape') {
                    setAddingCalendar(false);
                    setNewCalendarName('');
                  }
                }}
                onBlur={confirmAddCalendar}
                placeholder="Nome do calendário"
                className="mt-1 rounded-[7px] px-2.5 py-[6px] text-[13px] outline-none"
                style={{ background: 'var(--surface2)', color: 'var(--text)' }}
              />
            ) : null}
          </div>
        </section>

        <div className="mt-auto pt-4 relative">
          <SectionDivider />
          <button
            onClick={() => setWorkHoursOpen((v) => !v)}
            className="w-full text-left rounded-[7px] -mx-1.5 px-1.5 py-1 hover:[background:var(--surface2)]"
          >
            <div className="text-[11px] font-semibold mb-1" style={{ color: 'var(--text2)' }}>
              Horário de trabalho
            </div>
            <div className="text-[11px] font-mono-ae mb-2" style={{ color: 'var(--text3)' }}>
              {hm(state.settings.workStart)} – {hm(state.settings.workEnd)} · {workDaysLabel(state.settings.workDays)}
            </div>
          </button>
          <button
            onClick={() => dispatch({ type: 'TOGGLE_WORK_ONLY' })}
            className="w-full rounded-[7px] px-2.5 py-[7px] text-[12px] font-medium"
            style={
              state.workOnly
                ? { background: 'var(--accent)', color: 'var(--accentText)' }
                : { background: 'var(--surface2)', color: 'var(--text2)' }
            }
          >
            {state.workOnly ? 'Mostrar 24 horas' : 'Colapsar fora do horário'}
          </button>

          {workHoursOpen && (
            <div
              className="absolute bottom-full left-0 mb-2 z-30 w-full rounded-[12px] border p-3"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="time"
                  value={hm(state.settings.workStart)}
                  onChange={(e) => {
                    const [h, m] = e.target.value.split(':').map(Number);
                    if (!isNaN(h)) dispatch({ type: 'UPDATE_SETTINGS', changes: { workStart: h * 60 + m } });
                  }}
                  className="flex-1 min-w-0 text-[12px] rounded-[7px] px-2 py-1.5 outline-none"
                  style={{ background: 'var(--surface2)', color: 'var(--text)' }}
                />
                <span className="text-[11px]" style={{ color: 'var(--text3)' }}>
                  até
                </span>
                <input
                  type="time"
                  value={hm(state.settings.workEnd)}
                  onChange={(e) => {
                    const [h, m] = e.target.value.split(':').map(Number);
                    if (!isNaN(h)) dispatch({ type: 'UPDATE_SETTINGS', changes: { workEnd: h * 60 + m } });
                  }}
                  className="flex-1 min-w-0 text-[12px] rounded-[7px] px-2 py-1.5 outline-none"
                  style={{ background: 'var(--surface2)', color: 'var(--text)' }}
                />
              </div>
              <div className="flex gap-1">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((label, dow) => {
                  const active = state.settings.workDays.includes(dow);
                  return (
                    <button
                      key={dow}
                      onClick={() => {
                        const next = active
                          ? state.settings.workDays.filter((d) => d !== dow)
                          : [...state.settings.workDays, dow].sort();
                        dispatch({ type: 'UPDATE_SETTINGS', changes: { workDays: next } });
                      }}
                      className="flex-1 h-7 rounded-[6px] text-[10px] font-semibold"
                      style={
                        active
                          ? { background: 'var(--accent)', color: 'var(--accentText)' }
                          : { background: 'var(--surface2)', color: 'var(--text3)' }
                      }
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setWorkHoursOpen(false)}
                className="w-full mt-3 text-[12px] font-medium rounded-[7px] py-1.5"
                style={{ background: 'var(--surface2)', color: 'var(--text2)' }}
              >
                Pronto
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function FilterToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between rounded-[7px] px-1.5 py-[6px] hover:[background:var(--surface2)]"
    >
      <span className="text-[13px] font-medium" style={{ color: 'var(--text2)' }}>
        {label}
      </span>
      <span
        className="w-8 h-[18px] rounded-full relative transition-colors shrink-0"
        style={{ background: checked ? 'var(--accent)' : 'var(--surface2)', border: checked ? 'none' : '1px solid var(--border)' }}
      >
        <span
          className="absolute top-1/2 -translate-y-1/2 w-[14px] h-[14px] rounded-full transition-all"
          style={{ left: checked ? 16 : 2, background: checked ? 'white' : 'var(--text3)' }}
        />
      </span>
    </button>
  );
}

function SectionDivider() {
  return <div className="h-px my-4" style={{ background: 'var(--border)', opacity: 0.6 }} />;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--text3)' }}>
      {children}
    </div>
  );
}
