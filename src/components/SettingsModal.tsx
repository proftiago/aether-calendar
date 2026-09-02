import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { useStore } from '../store/store';
import { useAllEvents, useVisibleEvents } from '../store/selectors';
import { isGoogleConfigured, buildGoogleAuthUrl, listGoogleCalendars } from '../lib/googleApi';
import type { GoogleCalendarOption } from '../lib/googleApi';
import { isSyncConfigured } from '../lib/supabaseClient';
import { weeklyTimeBreakdown, focusHeatmap, dailyTotalsSparkline, formatMinutes } from '../lib/analytics';
import { Sparkline } from './Sparkline';
import type { SettingsTab } from '../store/store';

const TABS: { key: SettingsTab; label: string }[] = [
  { key: 'google', label: 'Integrações de Calendário' },
  { key: 'general', label: 'Personalização' },
  { key: 'notifications', label: 'Notificações' },
  { key: 'shortcuts', label: 'Atalhos de teclado' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'data', label: 'Dados' },
  { key: 'about', label: 'Sobre' },
];

const ACCENT_COLOR_PRESETS = [
  '#0284c7',
  '#0891b2',
  '#0d9488',
  '#16a34a',
  '#65a30d',
  '#ca8a04',
  '#ea580c',
  '#dc2626',
  '#e11d48',
  '#db2777',
  '#c026d3',
  '#9333ea',
  '#7c3aed',
  '#4f46e5',
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
            <X size={15} style={{ color: 'var(--text2)' }} />
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
          {state.settingsTab === 'analytics' && <AnalyticsTab />}
          {state.settingsTab === 'google' && <GoogleTab />}
          {state.settingsTab === 'data' && <DataTab />}
          {state.settingsTab === 'notifications' && <NotificationsTab />}
          {state.settingsTab === 'shortcuts' && <ShortcutsTab />}
          {state.settingsTab === 'about' && <AboutTab />}
        </div>
      </div>
    </div>
  );
}

function AnalyticsTab() {
  const { state } = useStore();
  const allEvents = useAllEvents(state);
  const visibleEvents = useVisibleEvents(state, allEvents);
  const buckets = weeklyTimeBreakdown(visibleEvents);
  const heatmap = focusHeatmap(visibleEvents);
  const sparkline = dailyTotalsSparkline(visibleEvents, 7);
  const totalMin = buckets.reduce((sum, b) => sum + b.minutes, 0);
  const maxHeat = Math.max(1, ...heatmap);
  const peakHour = heatmap.indexOf(maxHeat);

  return (
    <div className="flex flex-col gap-6 max-w-[440px]">
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <SectionHeading noMargin>Últimos 7 dias</SectionHeading>
          <span className="text-[11px] font-mono-ae" style={{ color: 'var(--text3)' }}>
            {formatMinutes(sparkline.reduce((a, b) => a + b, 0))} total
          </span>
        </div>
        <Sparkline values={sparkline} />
      </div>

      <div>
        <SectionHeading>Como sua semana está distribuída</SectionHeading>
        {totalMin === 0 ? (
          <p className="text-[13px]" style={{ color: 'var(--text3)' }}>
            Sem eventos com horário nesta semana ainda.
          </p>
        ) : (
          <>
            <div className="h-[5px] rounded-full overflow-hidden flex mb-3" style={{ background: 'var(--surface2)' }}>
              {buckets.map((b) => (
                <div key={b.key} style={{ width: `${b.pct}%`, background: b.color }} title={`${b.label}: ${b.pct}%`} />
              ))}
            </div>
            <div className="flex flex-col gap-2">
              {buckets.map((b) => (
                <div key={b.key} className="flex items-center justify-between text-[13px]">
                  <span className="flex items-center gap-2" style={{ color: 'var(--text)' }}>
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: b.color }} />
                    {b.label}
                  </span>
                  <span style={{ color: 'var(--text2)' }}>
                    {formatMinutes(b.minutes)} <span style={{ color: 'var(--text3)' }}>· {b.pct}%</span>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {totalMin > 0 && (
        <div>
          <SectionHeading>Horários de pico (mapa de calor)</SectionHeading>
          <p className="text-[12px] mb-2.5" style={{ color: 'var(--text3)' }}>
            Horário mais ocupado da semana: <strong style={{ color: 'var(--text)' }}>{peakHour}h</strong>
          </p>
          <div className="flex items-end gap-[3px] h-[60px]">
            {heatmap.map((min, h) => (
              <div
                key={h}
                className="flex-1 rounded-t-[2px]"
                title={`${h}h — ${formatMinutes(min)}`}
                style={{
                  height: `${Math.max(3, (min / maxHeat) * 60)}px`,
                  background: min === 0 ? 'var(--surface2)' : 'color-mix(in oklab, var(--gold) ' + Math.round(30 + (min / maxHeat) * 70) + '%, var(--surface2))',
                }}
              />
            ))}
          </div>
          <div className="flex justify-between text-[9px] mt-1" style={{ color: 'var(--text3)' }}>
            <span>0h</span>
            <span>12h</span>
            <span>23h</span>
          </div>
        </div>
      )}

      <p className="text-[11.5px] leading-[1.6]" style={{ color: 'var(--text3)' }}>
        Calculado a partir dos calendários visíveis, semana atual (segunda a domingo). "Reuniões" conta eventos com
        videochamada ou palavras como "reunião"/"call"; o resto é dividido pelos calendários Trabalho/Pessoal/Família.
      </p>
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
        <FieldRow label="Densidade da grade">
          <Select
            value={s.density}
            onChange={(v) => dispatch({ type: 'UPDATE_SETTINGS', changes: { density: v as 'compact' | 'comfortable' } })}
            options={[
              { value: 'comfortable', label: 'Confortável' },
              { value: 'compact', label: 'Compacta' },
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

      <div>
        <SectionHeading>Cor de destaque</SectionHeading>
        <div className="grid grid-cols-8 gap-1.5">
          <button
            onClick={() => dispatch({ type: 'UPDATE_SETTINGS', changes: { accentColor: null } })}
            className="w-6 h-6 rounded-full grid place-items-center border-2"
            style={{ borderColor: !s.accentColor ? 'var(--text)' : 'transparent', background: 'var(--surface2)' }}
            aria-label="Padrão do tema"
            title="Padrão"
          >
            {!s.accentColor && <Check size={11} strokeWidth={3.5} style={{ color: 'var(--text)' }} />}
          </button>
          {ACCENT_COLOR_PRESETS.map((color) => (
            <button
              key={color}
              onClick={() => dispatch({ type: 'UPDATE_SETTINGS', changes: { accentColor: color } })}
              className="w-6 h-6 rounded-full grid place-items-center"
              style={{ background: color }}
              aria-label={color}
            >
              {s.accentColor === color && <Check size={11} strokeWidth={3.5} color="white" />}
            </button>
          ))}
        </div>
      </div>

      <div>
        <SectionHeading>Preenchimento dos eventos</SectionHeading>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={5}
            max={70}
            step={1}
            value={s.eventOpacity ?? (state.theme === 'dark' ? 16 : 7)}
            onChange={(e) => dispatch({ type: 'UPDATE_SETTINGS', changes: { eventOpacity: Number(e.target.value) } })}
            className="flex-1"
          />
          <span className="text-[12px] font-mono-ae w-10 text-right" style={{ color: 'var(--text2)' }}>
            {s.eventOpacity ?? (state.theme === 'dark' ? 16 : 7)}%
          </span>
        </div>
        {s.eventOpacity != null && (
          <button
            onClick={() => dispatch({ type: 'UPDATE_SETTINGS', changes: { eventOpacity: null } })}
            className="text-[11.5px] mt-1.5"
            style={{ color: 'var(--text3)' }}
          >
            Voltar ao padrão
          </button>
        )}
      </div>
    </div>
  );
}

function CalendarPicker() {
  const { state, dispatch } = useStore();
  const [calendars, setCalendars] = useState<GoogleCalendarOption[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    listGoogleCalendars()
      .then((res) => {
        if (!cancelled) setCalendars(res.calendars);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function toggle(id: string) {
    const current = state.settings.selectedGoogleCalendarIds;
    const next = current.includes(id) ? current.filter((c) => c !== id) : [...current, id];
    if (next.length === 0) return; // sempre precisa de pelo menos um
    dispatch({ type: 'UPDATE_SETTINGS', changes: { selectedGoogleCalendarIds: next } });
    window.dispatchEvent(new CustomEvent('aether:sync-now', { detail: { forceFull: true } }));
  }

  return (
    <div>
      <SectionHeading>Calendários sincronizados</SectionHeading>
      {loading && (
        <p className="text-[13px]" style={{ color: 'var(--text3)' }}>
          Carregando calendários…
        </p>
      )}
      {error && (
        <p className="text-[13px]" style={{ color: 'var(--danger)' }}>
          Não consegui buscar seus calendários agora. Se você acabou de configurar isso no
          backend, pode ser que a Edge Function ainda não tenha o endpoint novo publicado.
        </p>
      )}
      {calendars && (
        <div className="flex flex-col gap-1">
          {calendars.map((cal) => {
            const checked = state.settings.selectedGoogleCalendarIds.includes(cal.id);
            return (
              <label
                key={cal.id}
                className="flex items-center gap-2.5 rounded-[8px] px-2 py-[7px] cursor-pointer hover:[background:var(--surface2)]"
              >
                <input type="checkbox" checked={checked} onChange={() => toggle(cal.id)} className="shrink-0" />
                {cal.color && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cal.color }} />}
                <span className="text-[13px] flex-1 truncate" style={{ color: 'var(--text)' }}>
                  {cal.name}
                </span>
                {cal.primary && (
                  <span className="text-[10px] uppercase font-semibold" style={{ color: 'var(--text3)' }}>
                    principal
                  </span>
                )}
              </label>
            );
          })}
          <p className="text-[11.5px] leading-[1.6] mt-1.5" style={{ color: 'var(--text3)' }}>
            Marcar/desmarcar já dispara uma sincronização completa. Desmarcar um calendário não
            apaga os eventos dele que já foram importados — só para de trazer atualizações novas.
          </p>
        </div>
      )}
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
              style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
            >
              Desconectar
            </button>
          </>
        )}
      </div>

      <div>
        <SectionHeading>Limitações desta versão</SectionHeading>
        <ul className="text-[13px] leading-[1.7] list-disc pl-4" style={{ color: 'var(--text2)' }}>
          <li>Eventos novos criados no Aether são sempre enviados pro calendário principal (primary), mesmo se você sincronizar outros calendários pra leitura</li>
          <li>Sincronização automática a cada 5 min, ou manual pelo botão acima</li>
        </ul>
      </div>

      {connected && configured && <CalendarPicker />}

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
  const { state, dispatch } = useStore();
  const [pasteCode, setPasteCode] = useState('');

  return (
    <div className="flex flex-col gap-5 max-w-[420px]">
      <div>
        <SectionHeading>Sincronizar entre dispositivos</SectionHeading>
        {!isSyncConfigured() ? (
          <p className="text-[13px] leading-[1.6]" style={{ color: 'var(--text3)' }}>
            Essa função ainda não está configurada nesse deploy (falta a chave do Supabase). Se você configurou
            recentemente, precisa rebuildar o app.
          </p>
        ) : (
          <>
            <ToggleRow
              label="Sincronizar tarefas e configurações"
              checked={state.settings.syncEnabled}
              onChange={(v) => {
                if (v && !state.settings.syncId) {
                  dispatch({ type: 'UPDATE_SETTINGS', changes: { syncEnabled: true, syncId: crypto.randomUUID() } });
                } else {
                  dispatch({ type: 'UPDATE_SETTINGS', changes: { syncEnabled: v } });
                }
              }}
            />
            {state.settings.syncEnabled && state.settings.syncId && (
              <div className="mt-2.5 flex flex-col gap-2">
                <p className="text-[12.5px] leading-[1.6]" style={{ color: 'var(--text2)' }}>
                  Use esse código nos seus outros dispositivos (Configurações → Dados → cole o código abaixo) pra
                  ligar todos na mesma sincronização.
                </p>
                <div className="flex gap-1.5">
                  <code
                    className="flex-1 text-[11px] font-mono-ae rounded-[7px] px-2.5 py-2 truncate"
                    style={{ background: 'var(--surface2)', color: 'var(--text2)' }}
                  >
                    {state.settings.syncId}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(state.settings.syncId ?? '')}
                    className="rounded-[7px] px-3 text-[12px] font-semibold"
                    style={{ background: 'var(--surface2)', color: 'var(--text)' }}
                  >
                    Copiar
                  </button>
                </div>
              </div>
            )}
            <div className="mt-3 flex gap-1.5">
              <input
                value={pasteCode}
                onChange={(e) => setPasteCode(e.target.value)}
                placeholder="Colar código de outro dispositivo"
                className="flex-1 text-[12px] rounded-[7px] px-2.5 py-2 outline-none"
                style={{ background: 'var(--surface2)', color: 'var(--text)' }}
              />
              <button
                onClick={() => {
                  if (!pasteCode.trim()) return;
                  dispatch({ type: 'UPDATE_SETTINGS', changes: { syncEnabled: true, syncId: pasteCode.trim() } });
                  setPasteCode('');
                }}
                className="rounded-[7px] px-3 text-[12px] font-semibold"
                style={{ background: 'var(--accent)', color: 'var(--accentText)' }}
              >
                Ligar
              </button>
            </div>
            <p className="text-[11.5px] leading-[1.6] mt-2" style={{ color: 'var(--text3)' }}>
              Sincroniza tarefas, calendários e configurações — não sincroniza eventos locais (esses vêm do Google
              Calendar em cada dispositivo). É "o último que salvar vence": editar ao mesmo tempo em dois lugares
              pode sobrescrever uma mudança sem avisar.
            </p>
          </>
        )}
      </div>

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
          style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
        >
          Apagar todos os dados locais
        </button>
      </div>
    </div>
  );
}

function NotificationsTab() {
  const { state, dispatch } = useStore();
  const s = state.settings;
  return (
    <div className="flex flex-col gap-5 max-w-[420px]">
      <div>
        <SectionHeading>Lembretes de evento</SectionHeading>
        <ToggleRow
          label="Notificar antes do evento"
          checked={s.remindersEnabled}
          onChange={(v) => dispatch({ type: 'UPDATE_SETTINGS', changes: { remindersEnabled: v } })}
        />
        {s.remindersEnabled && (
          <>
            <FieldRow label="Avisar com">
              <Select
                value={String(s.reminderMinutes)}
                onChange={(v) => dispatch({ type: 'UPDATE_SETTINGS', changes: { reminderMinutes: Number(v) } })}
                options={[
                  { value: '5', label: '5 min de antecedência' },
                  { value: '10', label: '10 min de antecedência' },
                  { value: '15', label: '15 min de antecedência' },
                  { value: '30', label: '30 min de antecedência' },
                ]}
              />
            </FieldRow>
            <p className="text-[11.5px] leading-[1.6] mt-1" style={{ color: 'var(--text3)' }}>
              Só funciona com o Aether aberto numa aba — não é uma notificação push de verdade, então não chega se o navegador estiver fechado.
            </p>
          </>
        )}
      </div>

      <div>
        <SectionHeading>Central de Alertas</SectionHeading>
        <p className="text-[13px] leading-[1.6]" style={{ color: 'var(--text2)' }}>
          O sino no topo mostra eventos de hoje que ainda vão começar, tarefas atrasadas e tarefas que vencem hoje —
          sempre calculado na hora a partir da sua agenda, não é um histórico salvo.
        </p>
      </div>
    </div>
  );
}

function ShortcutsTab() {
  const SHORTCUTS: { keys: string[]; label: string }[] = [
    { keys: ['Ctrl', '/'], label: 'Menu de comando' },
    { keys: ['T'], label: 'Ir para hoje' },
    { keys: ['C', 'N'], label: 'Criar evento' },
    { keys: ['G'], label: 'Ir para busca' },
    { keys: ['D'], label: 'Ver: Dia' },
    { keys: ['W'], label: 'Ver: Semana' },
    { keys: ['1', '2', '3', '4'], label: 'Trocar view (dia/semana/mês/agenda)' },
    { keys: ['←', '→'], label: 'Navegar' },
    { keys: ['Esc'], label: 'Fechar' },
  ];
  return (
    <div className="flex flex-col gap-[13px] max-w-[420px]">
      {SHORTCUTS.map((s, i) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <span className="text-[13px]" style={{ color: 'var(--text2)' }}>
            {s.label}
          </span>
          <span className="flex gap-1 shrink-0">
            {s.keys.map((k, j) => (
              <kbd
                key={j}
                className="text-[11px] font-mono-ae font-semibold rounded-[5px] px-[7px] py-[2px] border"
                style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text2)' }}
              >
                {k}
              </kbd>
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}

function AboutTab() {
  return (
    <div className="flex flex-col gap-5 max-w-[420px]">
      <div>
        <SectionHeading>Aether Calendar</SectionHeading>
        <p className="text-[13px] leading-[1.6]" style={{ color: 'var(--text2)' }}>
          Calendário pessoal construído sob medida — código aberto no seu repositório, sem serviço de terceiros por
          trás além do que você mesmo conectou (Google Calendar, Supabase).
        </p>
      </div>
      <div>
        <SectionHeading>Enviar feedback</SectionHeading>
        <p className="text-[13px] leading-[1.6] mb-2.5" style={{ color: 'var(--text2)' }}>
          Achou um bug ou tem uma ideia? Manda direto — não tem sistema de feedback dentro do app, mas um e-mail
          chega.
        </p>
        <a
          href="mailto:?subject=Feedback%20Aether%20Calendar"
          className="inline-block rounded-[9px] px-4 py-2 text-[13px] font-semibold"
          style={{ background: 'var(--surface2)', color: 'var(--text)' }}
        >
          Abrir e-mail
        </a>
      </div>
      <div>
        <SectionHeading>Repositório</SectionHeading>
        <a
          href="https://github.com/proftiago/aether-calendar"
          target="_blank"
          rel="noreferrer noopener"
          className="text-[13px] underline"
          style={{ color: 'var(--accent)' }}
        >
          github.com/proftiago/aether-calendar
        </a>
      </div>
    </div>
  );
}

function SectionHeading({ children, noMargin }: { children: React.ReactNode; noMargin?: boolean }) {
  return (
    <h3 className={noMargin ? 'text-[13px] font-semibold' : 'text-[13px] font-semibold mb-2.5'} style={{ color: 'var(--text)' }}>
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
        className="w-9 h-5 rounded-full relative shrink-0 transition-colors"
        style={{
          background: checked ? 'var(--accent)' : 'var(--surface2)',
          border: checked ? 'none' : '1px solid var(--border)',
        }}
        aria-pressed={checked}
        aria-label={label}
      >
        <span
          className="absolute top-1/2 w-[14px] h-[14px] rounded-full transition-transform"
          style={{
            background: 'var(--surface)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.25), 0 1px 4px rgba(0,0,0,0.12)',
            transform: checked ? 'translate(19px, -50%)' : 'translate(3px, -50%)',
          }}
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
