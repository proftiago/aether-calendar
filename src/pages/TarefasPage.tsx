import { useState } from 'react';
import { TaskPanel } from '../components/TaskPanel';
import { TaskDetailPanel } from '../components/TaskDetailPanel';

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
        <div className="max-w-[560px] mx-auto px-6 py-8">
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] mb-6" style={{ color: 'var(--text)' }}>
            Tarefas
          </h1>
          <TaskPanel title="Todas as tarefas" onSelectTask={setSelectedId} />
        </div>
      </div>
      {selectedId && <TaskDetailPanel taskId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
