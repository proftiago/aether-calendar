import { TaskPanel } from '../components/TaskPanel';

/**
 * Página Tarefas dedicada — mesmo TaskPanel usado no painel compacto da
 * página Calendário, só que com mais respiro e como conteúdo principal
 * da tela, não um painel lateral encaixado.
 */
export function TarefasPage() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[560px] mx-auto px-6 py-8">
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] mb-6" style={{ color: 'var(--text)' }}>
          Tarefas
        </h1>
        <TaskPanel title="Todas as tarefas" />
      </div>
    </div>
  );
}
