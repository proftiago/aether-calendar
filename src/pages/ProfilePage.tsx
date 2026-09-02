import { ArrowLeft } from 'lucide-react';
import { useStore } from '../store/store';

/**
 * Perfil — versão honesta do que o original mostra. O original tem
 * seções sociais (Goals/Virtues/Favorite Music/Places/Quotes) e um
 * programa de indicação com pagamento — nada disso existe aqui, porque
 * exigiria um sistema de contas/pagamento que o Aether não tem. O que
 * ficou é o que dá pra fazer de verdade: nome e bio editáveis, e
 * estatísticas reais do seu uso (não pontos fictícios).
 */
export function ProfilePage() {
  const { state, dispatch } = useStore();
  const name = state.settings.userName;
  const initial = (name || 'Você').charAt(0).toUpperCase();

  const tasksCompleted = state.tasks.filter((t) => t.done).length;
  const habitsCount = state.habits.length;
  const pagesCount = state.pages.filter((p) => !p.archived).length;
  const notesCount = state.notes.length;

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8">
      <div className="max-w-[560px] mx-auto">
        <button
          onClick={() => dispatch({ type: 'SET_PAGE', page: 'hoje' })}
          className="flex items-center gap-1.5 text-[13px] font-medium mb-6"
          style={{ color: 'var(--text3)' }}
        >
          <ArrowLeft size={14} />
          Voltar
        </button>

        <div className="flex items-center gap-4 mb-8">
          <span
            className="w-16 h-16 rounded-full grid place-items-center text-[26px] font-semibold shrink-0"
            style={{ background: 'var(--accent)', color: 'var(--accentText)' }}
          >
            {initial}
          </span>
          <div className="flex-1 min-w-0">
            <input
              value={name}
              onChange={(e) => dispatch({ type: 'UPDATE_SETTINGS', changes: { userName: e.target.value } })}
              placeholder="Seu nome"
              className="w-full text-[22px] font-semibold outline-none bg-transparent"
              style={{ color: 'var(--text)' }}
            />
          </div>
        </div>

        <div className="mb-8">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--text3)' }}>
            Sobre
          </span>
          <textarea
            value={state.settings.userBio}
            onChange={(e) => dispatch({ type: 'UPDATE_SETTINGS', changes: { userBio: e.target.value } })}
            placeholder="Escreva algo sobre você…"
            rows={3}
            className="w-full mt-2 text-[13.5px] leading-[1.6] outline-none bg-transparent resize-none rounded-[10px] p-3"
            style={{ color: 'var(--text)', background: 'var(--surface2)' }}
          />
        </div>

        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--text3)' }}>
            Seu uso do Aether
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
            <ProfileStat label="Tarefas concluídas" value={tasksCompleted} />
            <ProfileStat label="Hábitos criados" value={habitsCount} />
            <ProfileStat label="Páginas" value={pagesCount} />
            <ProfileStat label="Notas" value={notesCount} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[14px] p-3.5 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="text-[20px] font-semibold tracking-[-0.02em]" style={{ color: 'var(--text)' }}>
        {value}
      </div>
      <div className="text-[11px]" style={{ color: 'var(--text3)' }}>
        {label}
      </div>
    </div>
  );
}
