import { useState } from 'react';
import { Search, Plus, Inbox, ListTree, Trash2, Clock, Tag as TagIcon, Calendar as CalendarIcon, Flag } from 'lucide-react';
import { useStore } from '../store/store';
import type { Page } from '../lib/types';

const PAGE_ICON_PRESETS = ['📄', '📝', '💡', '📚', '🎯', '✅', '🗒️', '📌'];

/**
 * Páginas — editor de workspace simplificado. O ByDesign real tem um
 * editor de texto rico com blocos aninhados; aqui é deliberadamente mais
 * simples (título + texto livre + propriedades), sem fingir ser um editor
 * completo estilo Notion, que exigiria uma biblioteca de edição de texto
 * rica — engenharia bem maior que "montar mais uma página".
 */
export function PaginasPage() {
  const { state, dispatch } = useStore();
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [smartView, setSmartView] = useState<'inbox' | 'timeline' | null>(null);

  const activePages = state.pages.filter((p) => !p.archived);
  const filtered = activePages.filter((p) => {
    if (query.trim() && !p.title.toLowerCase().includes(query.toLowerCase()) && !p.content.toLowerCase().includes(query.toLowerCase())) {
      return false;
    }
    if (smartView === 'inbox') return !p.scheduleDate;
    if (smartView === 'timeline') return !!p.scheduleDate;
    return true;
  });
  const sorted = [...filtered].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const selected = state.pages.find((p) => p.id === selectedId) ?? null;

  function createPage() {
    const now = new Date().toISOString();
    const page: Page = {
      id: `page-${Date.now()}`,
      title: '',
      icon: '📄',
      content: '',
      createdAt: now,
      updatedAt: now,
    };
    dispatch({ type: 'ADD_WORKSPACE_PAGE', page });
    setSelectedId(page.id);
  }

  return (
    <div className="flex-1 flex min-h-0">
      <div className="w-[240px] shrink-0 border-r overflow-y-auto p-3" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-1.5 mb-3">
          <div className="relative flex-1">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text3)' }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar…"
              className="w-full rounded-[8px] pl-7 pr-2 py-1.5 text-[12.5px] outline-none"
              style={{ background: 'var(--surface2)', color: 'var(--text)' }}
            />
          </div>
          <button
            onClick={createPage}
            className="w-7 h-7 rounded-[8px] grid place-items-center shrink-0"
            style={{ background: 'var(--surface2)', color: 'var(--text2)' }}
            aria-label="Nova página"
          >
            <Plus size={14} />
          </button>
        </div>

        <button
          onClick={() => setSmartView(smartView === 'inbox' ? null : 'inbox')}
          className="w-full flex items-center gap-2 rounded-[8px] px-2 py-1.5 mb-0.5"
          style={{ background: smartView === 'inbox' ? 'var(--surface2)' : 'transparent' }}
        >
          <Inbox size={14} style={{ color: 'var(--text2)' }} />
          <span className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>
            Inbox
          </span>
        </button>
        <button
          onClick={() => setSmartView(smartView === 'timeline' ? null : 'timeline')}
          className="w-full flex items-center gap-2 rounded-[8px] px-2 py-1.5 mb-2"
          style={{ background: smartView === 'timeline' ? 'var(--surface2)' : 'transparent' }}
        >
          <ListTree size={14} style={{ color: 'var(--text2)' }} />
          <span className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>
            Timeline
          </span>
        </button>

        <div className="h-px my-2" style={{ background: 'var(--border)' }} />

        <div className="flex flex-col gap-0.5">
          {sorted.length === 0 && (
            <p className="text-[12px] px-2 py-3 text-center" style={{ color: 'var(--text3)' }}>
              Nenhuma página ainda.
            </p>
          )}
          {sorted.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              className="w-full flex items-center gap-2 rounded-[8px] px-2 py-1.5 text-left"
              style={{ background: selectedId === p.id ? 'var(--surface2)' : 'transparent' }}
            >
              <span className="shrink-0">{p.icon || '📄'}</span>
              <span className="text-[13px] truncate" style={{ color: 'var(--text)' }}>
                {p.title || 'Sem título'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {selected ? (
        <PageEditor page={selected} onDelete={() => setSelectedId(null)} />
      ) : (
        <div className="flex-1 grid place-items-center">
          <div className="text-center">
            <p className="text-[14px] mb-3" style={{ color: 'var(--text3)' }}>
              Selecione uma página ou crie uma nova
            </p>
            <button
              onClick={createPage}
              className="rounded-full px-4 py-2 text-[13px] font-semibold"
              style={{ background: 'var(--accent)', color: 'var(--accentText)' }}
            >
              + Nova página
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PageEditor({ page, onDelete }: { page: Page; onDelete: () => void }) {
  const { dispatch } = useStore();
  const [propsOpen, setPropsOpen] = useState(false);

  function update(changes: Partial<Page>) {
    dispatch({ type: 'UPDATE_WORKSPACE_PAGE', id: page.id, changes });
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-1.5 flex-wrap">
          {PAGE_ICON_PRESETS.map((icon) => (
            <button
              key={icon}
              onClick={() => update({ icon })}
              className="w-6 h-6 rounded-[6px] grid place-items-center text-[14px]"
              style={{ background: page.icon === icon ? 'var(--surface2)' : 'transparent' }}
            >
              {icon}
            </button>
          ))}
        </div>
        <button
          onClick={() => setPropsOpen((v) => !v)}
          className="text-[12px] font-medium rounded-[7px] px-2.5 py-1.5"
          style={{ background: propsOpen ? 'var(--surface2)' : 'transparent', color: 'var(--text2)' }}
        >
          Propriedades
        </button>
      </div>

      {propsOpen && (
        <div className="flex flex-wrap gap-2 px-6 py-3 border-b" style={{ borderColor: 'var(--border)', background: 'var(--surface2)' }}>
          <PropField icon={<TagIcon size={12} />} label="Tag">
            <input
              value={page.tag ?? ''}
              onChange={(e) => update({ tag: e.target.value })}
              placeholder="Sem tag"
              className="bg-transparent outline-none text-[12px] w-20"
              style={{ color: 'var(--text)' }}
            />
          </PropField>
          <PropField icon={<Clock size={12} />} label="Duração">
            <input
              type="number"
              value={page.duration ?? ''}
              onChange={(e) => update({ duration: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="min"
              className="bg-transparent outline-none text-[12px] w-14"
              style={{ color: 'var(--text)' }}
            />
          </PropField>
          <PropField icon={<CalendarIcon size={12} />} label="Agendar">
            <input
              type="date"
              value={page.scheduleDate ?? ''}
              onChange={(e) => update({ scheduleDate: e.target.value || undefined })}
              className="bg-transparent outline-none text-[12px]"
              style={{ color: 'var(--text)' }}
            />
          </PropField>
          <PropField icon={<Flag size={12} />} label="Prazo">
            <input
              type="date"
              value={page.deadline ?? ''}
              onChange={(e) => update({ deadline: e.target.value || undefined })}
              className="bg-transparent outline-none text-[12px]"
              style={{ color: 'var(--text)' }}
            />
          </PropField>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-8 py-6">
        <input
          value={page.title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="Sem título"
          className="w-full text-[26px] font-bold outline-none bg-transparent mb-4"
          style={{ color: 'var(--text)' }}
        />
        <textarea
          value={page.content}
          onChange={(e) => update({ content: e.target.value })}
          placeholder="Comece a escrever…"
          rows={20}
          className="w-full text-[14px] leading-[1.7] outline-none bg-transparent resize-none"
          style={{ color: 'var(--text)' }}
        />
      </div>

      <div className="px-6 py-2.5 border-t flex justify-end" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={() => {
            dispatch({ type: 'REMOVE_WORKSPACE_PAGE', id: page.id });
            onDelete();
          }}
          className="flex items-center gap-1.5 text-[12.5px] font-medium rounded-[7px] px-2.5 py-1.5"
          style={{ color: 'var(--danger)' }}
        >
          <Trash2 size={13} />
          Excluir página
        </button>
      </div>
    </div>
  );
}

function PropField({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 rounded-[8px] px-2.5 py-1.5" style={{ background: 'var(--surface)' }}>
      <span style={{ color: 'var(--text3)' }}>{icon}</span>
      <span className="text-[11px]" style={{ color: 'var(--text3)' }}>
        {label}
      </span>
      {children}
    </div>
  );
}
