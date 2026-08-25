import { X } from 'lucide-react';
import { useStore } from '../store/store';
import { isGoogleConfigured, buildGoogleAuthUrl } from '../lib/googleApi';
import type { SettingsTab } from '../store/store';

const TABS: { key: SettingsTab; label: string }[] = [
  { key: 'general', label: 'Geral' },
  { key: 'google', label: 'Google Calendar' },
  { key: 'data', label: 'Dados' },
];

export function SettingsModal() {
  const { state, dispatch } = useStore();
  if (!state.settingsOpen) return null;

  function close() {
    dispatch({ type: 'SET_SETTINGS_OPEN', open: false });
  }

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center p-4 animate-ae-in"
      style={{ background: 'color-mix(in oklab, #000 50%, transparent)' }}
      onClick={close}
    >
      <div
        className="w-full flex overflow-hidden animate-ae-pop"
        style={{
          maxWidth: 760,
          height: 'min(600px, 88vh)',
          background: 'var(--surface)',
          borderRadius: 14,
          boxShadow: '0 40px 90px -20px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <nav
          className="w-[190px] shrink-0 border-r p-3 hidden sm:block"
          style={{ borderColor: 'var(--border)', background: 'var(--surface2)' }}
        >
          <div className="text-[10px] font-semibold uppercase tracking-[0.1em] px-2 mb-1.5" style={{ color: 'var(--text3)' }}>
            Configurações
          </div>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => dispatch({ type: 'SET_SETTINGS_OPEN', open: true, tab: t.key })}
              className="w-full text-left px-2.5 py-[7px] rounded-[8px] text-[13px] font-medium mb-0.5"
              style={
                state.settingsTab === t.key
                  ? { background: 'var(--surface)', color: 'var(--text)', fontWeight: 600 }
                  : { color: 'var(--text2)' }
              }
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto p-5 relative min-w-0">
          <button
            onClick={close}
            className="absolute top-4 right-4 w-7 h-7 rounded-[8px] grid place-items-center"
            style={{ background: 'var(--surface2)' }}
          >
            <X size={14} style={{ color: 'var(--text2)' }} />
          </button>

          {/* seletor de abas mobile */}
          <div className="flex gap-1.5 mb-4 sm:hidden">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => dispatch({ type: 'SET_SETTINGS_OPEN', open: true, tab: t.key })}
                className="text-[12px] font-semibold rounded-[7px] px-2.5 py-1 border"
                style={
                  state.settingsTab === t.key
                    ? { background: 'var(--accent)', color: 'var(--accentText)', borderColor: 'var(--accent)' }
                    : { background: 'var(--surface2)', color: 'var(--text2)', borderColor: 'var(--border)' }
                }
              >
                {t.label}
              </button>
            ))}
          </div>

          {state.settingsTab === 'general' && <GeneralTab />}
          {state.settingsTab === 'google' && <GoogleTab />}
          {state.settingsTab === 'data' && <DataTab />}
        </div>
      </div>
    </div>
  );
}

function GeneralTab() {
  const { state, dispatch } = useStore();
  const s = state.settings;

  return (
    <div className="flex flex-col gap-6 max-w-[420px]">
      <div>
        <SectionHeading>Visualização do calendário</SectionHeading>
        <ToggleRow label="Fins de semana" checked={s.showWeekends} onChange={(v) => dispatch({ type: 'UPDATE_SETTINGS', changes: { showWeekends: v } })} />
        <ToggleRow
          label="Números da semana"
          checked={s.showWeekNumbers}
          onChange={(v) => dispatch({ type: 'UPDATE_SETTINGS', changes: { showWeekNumbers: v } })}
        />
        <FieldRow label="Início da semana">
          <Select
            value={String(s.weekStartsOn)}
            onChange={(v) => dispatch({ type: 'UPDATE_SETTINGS', changes: { weekStartsOn: Number(v) as 0 | 1 } })}
            options={[
              { value: '1', label: 'Segunda-feira' },
              { value: '0', label: 'Domingo' },
            ]}
          />
        </FieldRow>
      </div>

      <div>
        <SectionHeading>Hora</SectionHeading>
        <FieldRow label="Formato">
          <Select
            value={s.timeFormat}
            onChange={(v) => dispatch({ type: 'UPDATE_SETTINGS', changes: { timeFormat: v as '12h' | '24h' } })}
            options={[
              { value: '24h', label: '24 horas' },
              { value: '12h', label: '12 horas (AM/PM)' },
            ]}
          />
        </FieldRow>
      </div>

      <div>
        <SectionHeading>Tema</SectionHeading>
        <div className="flex flex-col gap-1.5">
          {(['auto', 'light', 'dark'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => dispatch({ type: 'UPDATE_SETTINGS', changes: { themeMode: mode } })}
              className="flex items-center gap-2.5 text-left px-1 py-1"
            >
              <span
                className="w-4 h-4 rounded-full border grid place-items-center shrink-0"
                style={{ borderColor: s.themeMode === mode ? 'var(--accent)' : 'var(--border)' }}
              >
                {s.themeMode === mode && <span className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />}
              </span>
              <span className="text-[13px]" style={{ color: 'var(--text)' }}>
                {mode === 'auto' ? 'Automático (segue o sistema)' : mode === 'light' ? 'Claro' : 'Escuro'}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function GoogleTab() {
  const { state, dispatch } = useStore();
  const configured = isGoogleConfigured();
  const connected = state.google === 'on';

  return (
    <div className="flex flex-col gap-5 max-w-[420px]">
      <div>
        <SectionHeading>Status da conexão</SectionHeading>
        <div className="flex items-center gap-2.5 rounded-[10px] border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface2)' }}>
          <span
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${state.google === 'sync' ? 'animate-ae-spin' : ''}`}
            style={{
              background: state.google === 'off' ? 'oklch(0.7 0.02 95)' : state.google === 'sync' ? 'var(--sync-progress)' : 'var(--sync-ok)',
            }}
          />
          <div className="flex-1">
            <div className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>
              {connected ? 'Conectado' : state.google === 'sync' ? 'Conectando…' : 'Desconectado'}
            </div>
            {connected && state.lastSync && (
              <div className="text-[11px]" style={{ color: 'var(--text3)' }}>
                Última sincronização: {new Date(state.lastSync).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
            {!configured && <div className="text-[11px]" style={{ color: 'var(--text3)' }}>Backend não configurado neste ambiente — usando simulação.</div>}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {!connected ? (
          <button
            onClick={() => {
              if (configured) window.location.href = buildGoogleAuthUrl();
              else dispatch({ type: 'GOOGLE_TOGGLE' });
            }}
            className="rounded-[9px] px-4 py-2 text-[13px] font-semibold"
            style={{ background: 'var(--accent)', color: 'var(--accentText)' }}
          >
            Conectar Google Calendar
          </button>
        ) : (
          <>
            {configured && (
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('aether:sync-now'))}
                className="rounded-[9px] px-4 py-2 text-[13px] font-semibold"
                style={{ background: 'var(--surface2)', color: 'var(--text)' }}
              >
                Sincronizar agora
              </button>
            )}
            <button
              onClick={() => dispatch({ type: 'GOOGLE_TOGGLE' })}
              className="rounded-[9px] px-4 py-2 text-[13px] font-semibold border"
              style={{ borderColor: 'var(--now-line)', color: 'var(--now-line)' }}
            >
              Desconectar
            </button>
          </>
        )}
      </div>

      <div>
        <SectionHeading>Limitações desta versão</SectionHeading>
        <ul className="text-[13px] leading-[1.7] list-disc pl-4" style={{ color: 'var(--text2)' }}>
          <li>Sincroniza só o calendário principal (primary) da conta Google</li>
          <li>Eventos recorrentes criados no Aether não são enviados ao Google ainda</li>
          <li>Sincronização automática a cada 5 min, ou manual pelo botão acima</li>
        </ul>
      </div>

      {connected && configured && (
        <div>
          <SectionHeading>Recategorizar eventos</SectionHeading>
          <p className="text-[13px] leading-[1.6] mb-2.5" style={{ color: 'var(--text2)' }}>
            A sincronização automática só traz o que mudou desde a última vez. Se você quer
            reclassificar eventos já importados (por exemplo, depois de eu ajustar as regras de
            Trabalho/Pessoal/Família), força uma sincronização completa.
          </p>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('aether:sync-now', { detail: { forceFull: true } }))}
            className="rounded-[9px] px-4 py-2 text-[13px] font-semibold"
            style={{ background: 'var(--surface2)', color: 'var(--text)' }}
          >
            Forçar sincronização completa
          </button>
        </div>
      )}
    </div>
  );
}

function DataTab() {
  const { dispatch } = useStore();

  return (
    <div className="flex flex-col gap-5 max-w-[420px]">
      <div>
        <SectionHeading>Dados de exemplo</SectionHeading>
        <p className="text-[13px] leading-[1.6] mb-2.5" style={{ color: 'var(--text2)' }}>
          Na primeira vez que o app abre, ele carrega alguns eventos e tarefas de exemplo pra não ficar vazio. Se algum
          ainda estiver na sua agenda, remove aqui.
        </p>
        <button
          onClick={() => {
            if (window.confirm('Remover os eventos e tarefas de exemplo? Seus eventos reais e os sincronizados do Google não são afetados.')) {
              dispatch({ type: 'CLEAR_DEMO_DATA' });
            }
          }}
          className="rounded-[9px] px-4 py-2 text-[13px] font-semibold"
          style={{ background: 'var(--surface2)', color: 'var(--text)' }}
        >
          Remover dados de exemplo
        </button>
      </div>

      <div>
        <SectionHeading>Zona de risco</SectionHeading>
        <p className="text-[13px] leading-[1.6] mb-2.5" style={{ color: 'var(--text2)' }}>
          Apaga todos os eventos, tarefas e calendar sets salvos neste navegador. Eventos importados do Google
          continuam lá (não afeta sua conta Google), mas somem da sua agenda no Aether até uma nova sincronização.
        </p>
        <button
          onClick={() => {
            if (window.confirm('Apagar TODOS os dados locais do Aether neste navegador? Essa ação não pode ser desfeita.')) {
              dispatch({ type: 'CLEAR_ALL_LOCAL_DATA' });
            }
          }}
          className="rounded-[9px] px-4 py-2 text-[13px] font-semibold border"
          style={{ borderColor: 'var(--now-line)', color: 'var(--now-line)' }}
        >
          Apagar todos os dados locais
        </button>
      </div>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[13px] font-semibold mb-2.5" style={{ color: 'var(--text)' }}>
      {children}
    </h3>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[13px]" style={{ color: 'var(--text)' }}>
        {label}
      </span>
      <button
        onClick={() => onChange(!checked)}
        className="w-9 h-5 rounded-full relative transition-colors shrink-0"
        style={{ background: checked ? 'var(--accent)' : 'var(--border)' }}
        aria-pressed={checked}
        aria-label={label}
      >
        <span
          className="absolute top-[2px] w-4 h-4 rounded-full bg-white transition-transform"
          style={{ transform: checked ? 'translateX(18px)' : 'translateX(2px)' }}
        />
      </button>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[13px]" style={{ color: 'var(--text)' }}>
        {label}
      </span>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-[13px] rounded-[8px] px-2.5 py-1.5 border outline-none"
      style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text)' }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
