// Aether Calendar — modelo de dados
// Segue a recomendação do handoff de design: timestamps UTC (ISO) + timeZone,
// com data/minutos locais derivados na camada de view (não é o formato "ingênuo"
// do protótipo original).

export type CalendarId = 'work' | 'personal' | 'family' | (string & {});

export type Calendar = {
  id: CalendarId;
  name: string;
  color: string; // referencia uma CSS var, ex: 'var(--cal-work)', ou hex literal
  icon?: string; // emoji opcional
  visible: boolean;
};

export type EventSource = 'google' | 'local' | 'task';

export type RRule = {
  freq: 'weekly';
  dows: number[]; // 0=dom ... 6=sáb
  until?: string; // ISO date, opcional
};

export type Event = {
  id: string;
  title: string;
  calId: CalendarId;
  /** Início em UTC, ISO 8601 completo (ex: 2026-08-24T14:00:00.000Z) */
  startsAt: string;
  /** Fim em UTC, ISO 8601 completo */
  endsAt: string;
  /** IANA timezone em que o evento foi criado, ex: 'America/Sao_Paulo' */
  timeZone: string;
  allDay: boolean;
  location?: string;
  meet?: string;
  notes?: string;
  rrule?: RRule;
  /** Datas locais (YYYY-MM-DD) excluídas da série */
  ex?: string[];
  src?: EventSource;
  /** id do evento correspondente no Google Calendar, quando sincronizado */
  googleEventId?: string;
  /** id da tarefa que originou este bloco, se houver */
  fromTaskId?: string;
  /** presente apenas em instâncias virtuais expandidas em memória */
  seriesId?: string;
  /** marcado manualmente como concluído (independe do horário já ter passado) */
  done?: boolean;
};

export type TaskPriority = 'alta' | 'média' | 'baixa';

export type Task = {
  id: string;
  title: string;
  prio: TaskPriority;
  dur: number; // minutos
  tag: string;
  calId: CalendarId;
  done: boolean;
  /** id do evento gerado ao agendar, se já agendada */
  scheduledEventId?: string;
  /** data de vencimento opcional, formato YYYY-MM-DD */
  dueDate?: string;
  /** dias da semana em que a tarefa "reaparece" (0=dom...6=sáb), se recorrente */
  recurring?: number[];
  /** última data (YYYY-MM-DD) em que foi marcada concluída — usado pra resetar tarefas recorrentes */
  lastDoneKey?: string;
  /** true quando arquivada automaticamente (concluída há muito tempo) — some da lista, mas continua salva */
  archived?: boolean;
};

export type CalendarSetKey = string; // id de um CalendarSet, ou 'custom'

export type CalendarSet = {
  id: string;
  name: string;
  calIds: string[];
  /** true para os 3 sets padrão do design original — não podem ser excluídos */
  builtin?: boolean;
};

export type ViewKey = 'day' | 'week' | 'month' | 'agenda';

export type GoogleSyncState = 'off' | 'sync' | 'on';

/** Bloco posicionado na grade, já com lane calculada — usado pela view Dia/Semana */
export type LaidOutBlock = {
  event: Event;
  /** minutos desde 00:00 local, já recortado pela janela visível */
  s: number;
  e: number;
  lane: number;
  lanes: number;
};

export type WeatherInfo = {
  icon: string;
  label: string;
  temp: number;
};
