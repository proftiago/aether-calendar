import { useState } from 'react';
import { Plus } from 'lucide-react';
import { TaskPanel } from '../components/TaskPanel';
import { TaskDetailPanel } from '../components/TaskDetailPanel';
import { AccountMenu } from '../components/AccountMenu';
import { NotificationBell } from '../components/NotificationBell';

/**
 * Página Tarefas dedicada — mesmo TaskPanel usado no painel compacto da
 * página Calendário, com mais respiro, e agora com um painel de detalhe
 * (subtarefas, prioridade, notas, "importante") ao clicar numa tarefa.
 */
export function TarefasPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="flex-1 flex min-h-0">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[880px] mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-[22px] font-semibold tracking-[-0.02em]" style={{ color: 'var(--text)' }}>
              Tarefas
            </h1>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <AccountMenu />
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('aether:add-task'))}
                className="flex items-center gap-1.5 rounded-[9px] px-3.5 py-2 text-[13px] font-semibold"
                style={{ background: 'var(--gold)', color: 'var(--goldText)' }}
              >
                <Plus size={14} />
                Adicionar tarefa
              </button>
            </div>
          </div>
          <TaskPanel title="Todas as tarefas" onSelectTask={setSelectedId} full />
        </div>
      </div>
      {selectedId && <TaskDetailPanel taskId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
