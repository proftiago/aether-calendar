import { useMemo, useState } from 'react';
import { Search, Plus, Star, Trash2, Check, X, LayoutGrid, List as ListIcon } from 'lucide-react';
import { useStore } from '../store/store';
import { eventBg } from '../lib/style';
import { calendarOf } from '../store/selectors';
import { AccountMenu } from '../components/AccountMenu';
import { NotificationBell } from '../components/NotificationBell';
import { ResizeHandle } from '../components/ResizeHandle';
import { useResizablePanel } from '../hooks/useResizablePanel';
import { CalendarSelect } from '../components/CalendarSelect';
import type { Note, NoteChecklistItem } from '../lib/types';

const NOTE_COLOR_PALETTE = [
  'oklch(0.62 0.19 292)', // violeta
  'oklch(0.64 0.15 150)', // verde
  'oklch(0.68 0.16 62)', // âmbar
  'oklch(0.6 0.14 220)', // azul
  'oklch(0.6 0.18 25)', // rosa
];

/** Cor estável por nota (não ligada ao calendário) — mesma ideia do
 * tagColor() das tarefas: cada nota cai numa cor de um "quadro de
 * post-its" colorido, em vez de todas as notas de um calendário
 * saírem na mesma cor. */
function noteColor(noteId: string): string {
  let hash = 0;
  for (let i = 0; i < noteId.length; i++) {
    hash = (hash * 31 + noteId.charCodeAt(i)) | 0;
  }
  return NOTE_COLOR_PALETTE[Math.abs(hash) % NOTE_COLOR_PALETTE.length];
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const diffDays = Math.floor((today.setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86_400_000);
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 0) return `Hoje, ${time}`;
  if (diffDays === 1) return `Ontem, ${time}`;
  return `${d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}, ${time}`;
}

/**
 * Página Notas — nova (não existia antes). Cards em grade, busca, criar
 * nota solta, e um painel de edição à direita com checklist embutida
 * (igual ao mockup: uma nota pode ter uma lista de itens marcáveis dentro
 * dela, além do texto livre).
 */
export function NotasPage() {
  const { state, dispatch } = useStore();
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [newChecklistText, setNewChecklistText] = useState('');
  const notePanelResize = useResizablePanel('aether:notepanel-width', 460, 320, 700, -1);
  const noteSheet = state.w < 640;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return state.notes;
    return state.notes.filter((n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q));
  }, [state.notes, query]);

  const selected = state.notes.find((n) => n.id === selectedId) ?? null;

  function createNote() {
    const now = new Date().toISOString();
    const note: Note = {
      id: `note-${Date.now()}`,
      title: 'Nova nota',
      content: '',
      calId: state.calendars[0]?.id ?? 'work',
      favorite: false,
      checklist: [],
      createdAt: now,
      updatedAt: now,
    };
    dispatch({ type: 'ADD_NOTE', note });
    setSelectedId(note.id);
  }

  function addChecklistItem() {
    if (!selected || !newChecklistText.trim()) return;
    const item: NoteChecklistItem = { id: `item-${Date.now()}`, text: newChecklistText.trim(), done: false };
    dispatch({ type: 'ADD_NOTE_CHECKLIST_ITEM', noteId: selected.id, item });
    setNewChecklistText('');
  }

  return (
    <div className="flex-1 flex min-h-0">
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-[22px] font-semibold tracking-[-0.02em]" style={{ color: 'var(--text)' }}>
            Notas
          </h1>
          <div className="flex items-center gap-2">
            <div className="flex items-center p-[2px] rounded-[8px]" style={{ background: 'var(--surface2)' }}>
              <button
                onClick={() => setViewMode('grid')}
                className="w-7 h-7 rounded-[6px] grid place-items-center"
                style={{ background: viewMode === 'grid' ? 'var(--surface)' : 'transparent' }}
                aria-label="Grade"
              >
                <LayoutGrid size={14} style={{ color: viewMode === 'grid' ? 'var(--text)' : 'var(--text3)' }} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className="w-7 h-7 rounded-[6px] grid place-items-center"
                style={{ background: viewMode === 'list' ? 'var(--surface)' : 'transparent' }}
                aria-label="Lista"
              >
                <ListIcon size={14} style={{ color: viewMode === 'list' ? 'var(--text)' : 'var(--text3)' }} />
              </button>
            </div>
            <button
              onClick={createNote}
              className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold"
              style={{ background: 'var(--gold)', color: 'var(--goldText)' }}
            >
              <Plus size={14} />
              Nova nota
            </button>
            <NotificationBell />
            <AccountMenu />
          </div>
        </div>

        <div className="relative mb-5 max-w-[360px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text3)' }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar notas…"
            className="w-full rounded-full pl-8 pr-3 py-2 text-[13px] outline-none"
            style={{ background: 'var(--surface2)', color: 'var(--text)' }}
          />
        </div>

        {filtered.length === 0 && (
          <p className="text-[13px] py-10 text-center" style={{ color: 'var(--text3)' }}>
            {state.notes.length === 0 ? 'Nenhuma nota ainda — cria a primeira ali em cima.' : 'Nada encontrado.'}
          </p>
        )}

        <div className={viewMode === 'grid' ? 'grid grid-cols-2 xl:grid-cols-4 gap-4' : 'flex flex-col gap-2'}>
          {filtered.map((note) => {
            const cal = calendarOf(state, note.calId);
            const nColor = noteColor(note.id);
            const doneCount = note.checklist.filter((i) => i.done).length;
            if (viewMode === 'list') {
              return (
                <button
                  key={note.id}
                  onClick={() => setSelectedId(note.id)}
                  className="text-left rounded-[10px] px-3.5 py-2.5 flex items-center gap-3"
                  style={{ background: eventBg(nColor, 8), border: '1px solid var(--border)' }}
                >
                  {note.favorite && <Star size={12} fill="var(--gold)" style={{ color: 'var(--gold)' }} className="shrink-0" />}
                  <span className="text-[13px] font-semibold flex-1 truncate" style={{ color: 'var(--text)' }}>
                    {note.title || 'Sem título'}
                  </span>
                  {cal && (
                    <span className="text-[10px] font-semibold rounded-full px-2 py-[2px] shrink-0" style={{ background: eventBg(cal.color, 22), color: cal.color }}>
                      {cal.name}
                    </span>
                  )}
                  <span className="text-[11px] shrink-0" style={{ color: 'var(--text3)' }}>
                    {formatRelative(note.updatedAt)}
                  </span>
                </button>
              );
            }
            return (
              <button
                key={note.id}
                onClick={() => setSelectedId(note.id)}
                className="text-left rounded-[14px] p-3.5 flex flex-col gap-2 hover:scale-[1.015] transition-transform w-full min-h-[190px]"
                style={{ background: eventBg(nColor, 10), border: '1px solid var(--border)' }}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[14px] font-semibold leading-snug" style={{ color: 'var(--text)' }}>
                    {note.title || 'Sem título'}
                  </span>
                  {note.favorite && <Star size={13} fill="var(--gold)" style={{ color: 'var(--gold)' }} className="shrink-0 mt-0.5" />}
                </div>
                {cal && (
                  <span
                    className="text-[10px] font-semibold rounded-full px-2 py-[2px] w-fit"
                    style={{ background: eventBg(cal.color, 22), color: cal.color }}
                  >
                    {cal.name}
                  </span>
                )}
                {note.content && (
                  <p className="text-[12px] leading-[1.5] line-clamp-5" style={{ color: 'var(--text2)' }}>
                    {note.content}
                  </p>
                )}
                {note.checklist.length > 0 && (
                  <span className="text-[11px] font-mono-ae" style={{ color: 'var(--text3)' }}>
                    {doneCount}/{note.checklist.length} feito
                  </span>
                )}
                <span className="text-[11px] mt-auto" style={{ color: 'var(--text3)' }}>
                  {formatRelative(note.updatedAt)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {selected && (
        <>
          {noteSheet && <div className="fixed inset-0 z-[60]" style={{ background: 'rgba(0,0,0,0.35)' }} onClick={() => setSelectedId(null)} />}
          <aside
            className={
              noteSheet
                ? 'fixed inset-x-0 bottom-0 z-[61] max-h-[85vh] rounded-t-[20px] overflow-y-auto p-5 flex flex-col gap-4 animate-ae-sheet'
                : 'relative shrink-0 border-l overflow-y-auto p-5 flex flex-col gap-4'
            }
            style={{
              width: noteSheet ? undefined : notePanelResize.width,
              background: 'var(--surface)',
              borderColor: 'var(--border)',
              boxShadow: noteSheet ? 'var(--shadow)' : undefined,
            }}
          >
            {noteSheet && <div className="w-9 h-1 rounded-full mx-auto mb-1" style={{ background: 'var(--border)' }} />}
            {!noteSheet && <ResizeHandle onPointerDown={notePanelResize.startDrag} dragging={notePanelResize.dragging} side="left" />}
          <div className="flex items-center justify-between">
            <button
              onClick={() => dispatch({ type: 'TOGGLE_NOTE_FAVORITE', id: selected.id })}
              className="w-7 h-7 rounded-[7px] grid place-items-center hover:[background:var(--surface2)]"
              aria-label="Favoritar"
            >
              <Star size={15} fill={selected.favorite ? 'var(--gold)' : 'none'} style={{ color: 'var(--gold)' }} />
            </button>
            <button
              onClick={() => setSelectedId(null)}
              className="w-7 h-7 rounded-[7px] grid place-items-center hover:[background:var(--surface2)]"
              aria-label="Fechar"
            >
              <X size={15} style={{ color: 'var(--text3)' }} />
            </button>
          </div>

          <input
            value={selected.title}
            onChange={(e) => dispatch({ type: 'UPDATE_NOTE', id: selected.id, changes: { title: e.target.value } })}
            placeholder="Título"
            className="text-[19px] font-semibold outline-none bg-transparent"
            style={{ color: 'var(--text)' }}
          />

          <CalendarSelect
            value={String(selected.calId)}
            onChange={(calId) => dispatch({ type: 'UPDATE_NOTE', id: selected.id, changes: { calId } })}
          />

          <span className="text-[11px]" style={{ color: 'var(--text3)' }}>
            {formatRelative(selected.updatedAt)}
          </span>

          <textarea
            value={selected.content}
            onChange={(e) => dispatch({ type: 'UPDATE_NOTE', id: selected.id, changes: { content: e.target.value } })}
            placeholder="Escreva algo…"
            rows={14}
            className="text-[14px] leading-[1.7] outline-none bg-transparent resize-none flex-1"
            style={{ color: 'var(--text)' }}
          />

          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--text3)' }}>
              Checklist
            </span>
            <div className="flex flex-col gap-1 mt-2">
              {selected.checklist.map((item) => (
                <div key={item.id} className="flex items-center gap-2 group">
                  <button
                    onClick={() => dispatch({ type: 'TOGGLE_NOTE_CHECKLIST_ITEM', noteId: selected.id, itemId: item.id })}
                    className="w-4 h-4 rounded-[4px] border grid place-items-center shrink-0"
                    style={{
                      borderColor: item.done ? 'var(--accent)' : 'var(--text3)',
                      background: item.done ? 'var(--accent)' : 'transparent',
                    }}
                  >
                    {item.done && <Check size={10} strokeWidth={3.5} color="white" />}
                  </button>
                  <span
                    className="text-[12.5px] flex-1"
                    style={{ color: 'var(--text)', textDecoration: item.done ? 'line-through' : 'none', opacity: item.done ? 0.55 : 1 }}
                  >
                    {item.text}
                  </span>
                  <button
                    onClick={() => dispatch({ type: 'REMOVE_NOTE_CHECKLIST_ITEM', noteId: selected.id, itemId: item.id })}
                    className="w-4 h-4 rounded-[4px] grid place-items-center opacity-0 group-hover:opacity-100 shrink-0"
                    style={{ color: 'var(--text3)' }}
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-1.5 mt-1">
                <input
                  value={newChecklistText}
                  onChange={(e) => setNewChecklistText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addChecklistItem()}
                  placeholder="Adicionar item…"
                  className="flex-1 rounded-[7px] px-2 py-[6px] text-[12px] outline-none min-w-0"
                  style={{ background: 'var(--surface2)', color: 'var(--text)' }}
                />
                <button
                  onClick={addChecklistItem}
                  className="w-7 h-7 rounded-[7px] grid place-items-center shrink-0"
                  style={{ background: 'var(--surface2)', color: 'var(--text2)' }}
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-auto flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
            <span className="text-[11px]" style={{ color: 'var(--text3)' }}>
              Salvo automaticamente às {new Date(selected.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <button
              onClick={() => {
                dispatch({ type: 'REMOVE_NOTE', id: selected.id });
                setSelectedId(null);
              }}
              className="w-7 h-7 rounded-[7px] grid place-items-center hover:[background:var(--surface2)]"
              style={{ color: 'var(--text3)' }}
              aria-label="Excluir nota"
              title="Excluir nota"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </aside>
        </>
      )}
    </div>
  );
}
