import { createContext, useContext, useEffect, useReducer, useRef, type ReactNode } from 'react';
import type { Calendar, CalendarSet, Event, GoogleSyncState, RRule, Task, ViewKey, Note, NoteChecklistItem, TaskPriority } from '../lib/types';
import { CALENDARS, seedEvents, seedTasks } from '../lib/mockData';
import { todayKey, nowMinutesOfDay, addDays, dateKeyOf, dowOf, daysBetween } from '../lib/dates';
import { loadJSON, saveJSON } from '../lib/persistence';
import { isGoogleConfigured, listGoogleEvents, rawToAetherEvent } from '../lib/googleApi';

export type FormState = {
  mode: 'create' | 'edit';
  /** id do evento sendo editado — pode ser instância ("serie@data") ou série/local */
  id?: string;
  /** true quando o form está editando a série inteira (não uma instância) */
  editingSeries?: boolean;
  title: string;
  calId: string;
  dateKey: string;
  startMin: number;
  endMin: number;
  allDay: boolean;
  location: string;
  notes: string;
  repeat: boolean;
  repeatDows: number[];
  repeatUntil: string; // dateKey ou ''
};

export type SettingsTab = 'general' | 'analytics' | 'google' | 'data';
export type PageKey = 'hoje' | 'calendario' | 'tarefas' | 'notas';

export type AppSettings = {
  themeMode: 'auto' | 'light' | 'dark';
  showWeekends: boolean;
  showWeekNumbers: boolean;
  weekStartsOn: 0 | 1;
  timeFormat: '12h' | '24h';
  density: 'compact' | 'comfortable';
  accentColor: string | null; // null = usa o padrão do tema (--accent original)
  eventOpacity: number | null; // null = usa o padrão do tema (--event-mix original), 5-70
  remindersEnabled: boolean;
  reminderMinutes: number;
  syncEnabled: boolean;
  syncId: string | null;
  workStart: number; // minutos desde 00:00
  workEnd: number;
  workDays: number[]; // 0=dom...6=sáb
  selectedGoogleCalendarIds: string[];
};

export const DEFAULT_SETTINGS: AppSettings = {
  themeMode: 'auto',
  showWeekends: true,
  showWeekNumbers: true,
  weekStartsOn: 1,
  timeFormat: '24h',
  density: 'comfortable',
  accentColor: null,
  eventOpacity: null,
  remindersEnabled: false,
  reminderMinutes: 10,
  syncEnabled: false,
  syncId: null,
  workStart: 8 * 60,
  workEnd: 19 * 60,
  workDays: [1, 2, 3, 4, 5],
  selectedGoogleCalendarIds: ['primary'],
};

function resolveTheme(mode: AppSettings['themeMode']): 'light' | 'dark' {
  if (mode === 'auto') {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return mode;
}

export type PreviewState = { id: string; dateKey: string; s: number; e: number } | null;

export type AppState = {
  settings: AppSettings;
  theme: 'light' | 'dark'; // tema resolvido (derivado de settings.themeMode)
  settingsOpen: boolean;
  settingsTab: SettingsTab;
  page: PageKey;
  view: ViewKey;
  cursor: string; // dateKey
  events: Event[];
  tasks: Task[];
  notes: Note[];
  calendars: Calendar[];
  calendarSets: CalendarSet[];
  set: string; // id de um CalendarSet ativo, ou 'custom'
  quick: string;
  search: string;
  google: GoogleSyncState;
  lastSync: number | null;
  selected: string | null;
  form: FormState | null;
  panel: 'free' | 'link' | null;
  workOnly: boolean;
  preview: PreviewState;
  toast: string | null;
  w: number;
  now: number;
  sidebarOpen: boolean;
  shortcutsOpen: boolean;
  aiOpen: boolean;
  focusMode: boolean;
  pendingSyncIds: string[];
};

type Action =
  | { type: 'UPDATE_SETTINGS'; changes: Partial<AppSettings> }
  | { type: 'SET_SETTINGS_OPEN'; open: boolean; tab?: SettingsTab }
  | { type: 'CLEAR_DEMO_DATA' }
  | { type: 'CLEAR_ALL_LOCAL_DATA' }
  | { type: 'SET_VIEW'; view: ViewKey }
  | { type: 'SET_CURSOR'; cursor: string }
  | { type: 'NAV'; dir: 1 | -1 }
  | { type: 'GO_TODAY' }
  | { type: 'TOGGLE_CAL'; id: string }
  | { type: 'SET_CAL_SET'; set: string }
  | { type: 'ADD_CALENDAR_SET'; name: string }
  | { type: 'REMOVE_CALENDAR_SET'; id: string }
  | { type: 'SET_QUICK'; value: string }
  | { type: 'SET_SEARCH'; value: string }
  | { type: 'ADD_EVENT'; event: Event; toast?: string }
  | { type: 'PATCH_EVENT'; id: string; changes: Partial<Event>; toast?: string }
  | { type: 'REMOVE_EVENT'; id: string; toast?: string }
  | { type: 'ADD_TASK'; task: Task }
  | { type: 'SET_PAGE'; page: PageKey }
  | { type: 'ADD_NOTE'; note: Note }
  | { type: 'UPDATE_NOTE'; id: string; changes: Partial<Note> }
  | { type: 'REMOVE_NOTE'; id: string }
  | { type: 'TOGGLE_NOTE_FAVORITE'; id: string }
  | { type: 'ADD_NOTE_CHECKLIST_ITEM'; noteId: string; item: NoteChecklistItem }
  | { type: 'TOGGLE_NOTE_CHECKLIST_ITEM'; noteId: string; itemId: string }
  | { type: 'REMOVE_NOTE_CHECKLIST_ITEM'; noteId: string; itemId: string }
  | { type: 'REMOVE_TASK'; id: string }
  | { type: 'UPDATE_CALENDAR_COLOR'; id: string; color: string }
  | { type: 'UPDATE_CALENDAR_ICON'; id: string; icon: string | undefined }
  | { type: 'TOGGLE_TASK'; id: string }
  | { type: 'RESET_RECURRING_TASKS' }
  | { type: 'TOGGLE_TASK_IMPORTANT'; id: string }
  | { type: 'UPDATE_TASK_NOTES'; id: string; notes: string }
  | { type: 'UPDATE_TASK_PRIORITY'; id: string; prio: TaskPriority }
  | { type: 'ADD_TASK_SUBTASK'; taskId: string; item: NoteChecklistItem }
  | { type: 'TOGGLE_TASK_SUBTASK'; taskId: string; itemId: string }
  | { type: 'REMOVE_TASK_SUBTASK'; taskId: string; itemId: string }
  | { type: 'ARCHIVE_OLD_TASKS' }
  | { type: 'ADD_PENDING_SYNC'; id: string }
  | { type: 'REMOVE_PENDING_SYNC'; id: string }
  | { type: 'APPLY_REMOTE_SYNC'; tasks: Task[]; calendars: Calendar[]; calendarSets: CalendarSet[]; settings: Partial<AppSettings> }
  | { type: 'SCHEDULE_TASK'; taskId: string; event: Event }
  | { type: 'SET_SELECTED'; id: string | null }
  | { type: 'OPEN_FORM'; form: FormState }
  | { type: 'CLOSE_FORM' }
  | { type: 'UPDATE_FORM'; changes: Partial<FormState> }
  | { type: 'SET_PANEL'; panel: 'free' | 'link' | null }
  | { type: 'TOGGLE_WORK_ONLY' }
  | { type: 'SET_PREVIEW'; preview: PreviewState }
  | { type: 'TOAST'; message: string | null }
  | { type: 'SET_WIDTH'; w: number }
  | { type: 'TICK_NOW' }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_SIDEBAR'; open: boolean }
  | { type: 'TOGGLE_SHORTCUTS' }
  | { type: 'SET_SHORTCUTS_OPEN'; open: boolean }
  | { type: 'SET_AI_OPEN'; open: boolean }
  | { type: 'SET_FOCUS_MODE'; on: boolean }
  | { type: 'GOOGLE_TOGGLE' }
  | { type: 'GOOGLE_CONNECTED_REAL' }
  | { type: 'GOOGLE_SYNC_MERGE'; events: Event[]; deletedGoogleIds: string[] }
  | { type: 'GOOGLE_SYNCED'; events: Event[] };

function navigate(view: ViewKey, cursor: string, dir: 1 | -1): string {
  if (view === 'day') return addDays(cursor, dir);
  if (view === 'week') return addDays(cursor, dir * 7);
  if (view === 'agenda') return addDays(cursor, dir * 21);
  const [y, m] = cursor.split('-').map(Number);
  const nm = m - 1 + dir;
  const ny = y + Math.floor(nm / 12);
  const rm = ((nm % 12) + 12) % 12;
  return `${ny}-${String(rm + 1).padStart(2, '0')}-01`;
}

function buildRRuleFromForm(form: FormState): RRule | undefined {
  if (!form.repeat || form.repeatDows.length === 0) return undefined;
  return {
    freq: 'weekly',
    dows: form.repeatDows,
    until: form.repeatUntil || undefined,
  };
}

export function emptyCreateForm(dateKey: string, startMin = 9 * 60, durationMin = 60, calId = 'work'): FormState {
  return {
    mode: 'create',
    title: '',
    calId,
    dateKey,
    startMin,
    endMin: startMin + durationMin,
    allDay: false,
    location: '',
    notes: '',
    repeat: false,
    repeatDows: [],
    repeatUntil: '',
  };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'UPDATE_SETTINGS': {
      const settings = { ...state.settings, ...action.changes };
      const theme = resolveTheme(settings.themeMode);
      return { ...state, settings, theme };
    }
    case 'SET_SETTINGS_OPEN':
      return { ...state, settingsOpen: action.open, settingsTab: action.tab ?? state.settingsTab };
    case 'CLEAR_DEMO_DATA': {
      const events = state.events.filter((ev) => !/^ev-\d+$/.test(ev.id));
      const tasks = state.tasks.filter((t) => !/^task-\d+$/.test(t.id));
      return { ...state, events, tasks, toast: 'Dados de exemplo removidos' };
    }
    case 'CLEAR_ALL_LOCAL_DATA': {
      return {
        ...state,
        events: state.events.filter((ev) => ev.src === 'google'),
        tasks: [],
        notes: [],
        calendarSets: DEFAULT_CALENDAR_SETS,
        // desliga a sincronização também — senão ela puxava os dados
        // "apagados" de volta do Supabase na próxima vez que rodasse
        settings: { ...state.settings, syncEnabled: false, syncId: null },
        toast: 'Dados locais apagados',
      };
    }
    case 'SET_VIEW':
      return { ...state, view: action.view };
    case 'SET_CURSOR':
      return { ...state, cursor: action.cursor };
    case 'NAV':
      return { ...state, cursor: navigate(state.view, state.cursor, action.dir) };
    case 'GO_TODAY':
      return { ...state, cursor: todayKey() };
    case 'TOGGLE_CAL': {
      const calendars = state.calendars.map((c) => (c.id === action.id ? { ...c, visible: !c.visible } : c));
      return { ...state, calendars, set: 'custom' };
    }
    case 'SET_CAL_SET': {
      const target = state.calendarSets.find((s) => s.id === action.set);
      if (!target) return state;
      const calendars = state.calendars.map((c) => ({ ...c, visible: target.calIds.includes(String(c.id)) }));
      return { ...state, set: target.id, calendars };
    }
    case 'ADD_CALENDAR_SET': {
      const calIds = state.calendars.filter((c) => c.visible).map((c) => String(c.id));
      const newSet: CalendarSet = { id: `set-${Date.now()}`, name: action.name.trim() || 'Novo set', calIds };
      return { ...state, calendarSets: [...state.calendarSets, newSet], set: newSet.id, toast: 'Calendar set criado' };
    }
    case 'REMOVE_CALENDAR_SET': {
      const calendarSets = state.calendarSets.filter((s) => s.id !== action.id);
      const set = state.set === action.id ? 'custom' : state.set;
      return { ...state, calendarSets, set, toast: 'Calendar set excluído' };
    }
    case 'SET_QUICK':
      return { ...state, quick: action.value };
    case 'SET_SEARCH':
      return { ...state, search: action.value };
    case 'ADD_EVENT':
      return { ...state, events: [...state.events, action.event], toast: action.toast ?? state.toast };
    case 'PATCH_EVENT': {
      const isInstance = action.id.includes('@');
      if (isInstance) {
        const [seriesId, dateKey] = action.id.split('@');
        const events = state.events.map((ev) => {
          if (ev.id !== seriesId) return ev;
          return { ...ev, ex: [...(ev.ex ?? []), dateKey] };
        });
        const series = state.events.find((ev) => ev.id === seriesId);
        if (!series) return { ...state, events, toast: action.toast ?? state.toast };
        const materialized: Event = {
          ...series,
          ...action.changes,
          id: `local-${Date.now()}`,
          seriesId: undefined,
          rrule: undefined,
          ex: undefined,
          src: 'local',
        };
        return { ...state, events: [...events, materialized], toast: action.toast ?? state.toast };
      }
      const events = state.events.map((ev) => {
        if (ev.id !== action.id) return ev;
        if (ev.src === 'google') {
          return { ...ev, ...action.changes, src: 'local' as const };
        }
        return { ...ev, ...action.changes };
      });
      return { ...state, events, toast: action.toast ?? state.toast };
    }
    case 'REMOVE_EVENT': {
      const isInstance = action.id.includes('@');
      if (isInstance) {
        const [seriesId, dateKey] = action.id.split('@');
        const events = state.events.map((ev) => (ev.id === seriesId ? { ...ev, ex: [...(ev.ex ?? []), dateKey] } : ev));
        return { ...state, events, selected: null, toast: action.toast ?? state.toast };
      }
      return {
        ...state,
        events: state.events.filter((ev) => ev.id !== action.id),
        selected: state.selected === action.id ? null : state.selected,
        toast: action.toast ?? state.toast,
      };
    }
    case 'ADD_TASK':
      return { ...state, tasks: [...state.tasks, action.task], toast: `Tarefa criada: ${action.task.title}` };
    case 'SET_PAGE':
      return { ...state, page: action.page };
    case 'ADD_NOTE':
      return { ...state, notes: [action.note, ...state.notes] };
    case 'UPDATE_NOTE':
      return {
        ...state,
        notes: state.notes.map((n) => (n.id === action.id ? { ...n, ...action.changes, updatedAt: new Date().toISOString() } : n)),
      };
    case 'REMOVE_NOTE':
      return { ...state, notes: state.notes.filter((n) => n.id !== action.id), toast: 'Nota excluída' };
    case 'TOGGLE_NOTE_FAVORITE':
      return { ...state, notes: state.notes.map((n) => (n.id === action.id ? { ...n, favorite: !n.favorite } : n)) };
    case 'ADD_NOTE_CHECKLIST_ITEM':
      return {
        ...state,
        notes: state.notes.map((n) =>
          n.id === action.noteId
            ? { ...n, checklist: [...n.checklist, action.item], updatedAt: new Date().toISOString() }
            : n,
        ),
      };
    case 'TOGGLE_NOTE_CHECKLIST_ITEM':
      return {
        ...state,
        notes: state.notes.map((n) =>
          n.id === action.noteId
            ? {
                ...n,
                checklist: n.checklist.map((item) => (item.id === action.itemId ? { ...item, done: !item.done } : item)),
                updatedAt: new Date().toISOString(),
              }
            : n,
        ),
      };
    case 'REMOVE_NOTE_CHECKLIST_ITEM':
      return {
        ...state,
        notes: state.notes.map((n) =>
          n.id === action.noteId
            ? { ...n, checklist: n.checklist.filter((item) => item.id !== action.itemId), updatedAt: new Date().toISOString() }
            : n,
        ),
      };
    case 'REMOVE_TASK':
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.id) };
    case 'UPDATE_CALENDAR_COLOR':
      return { ...state, calendars: state.calendars.map((c) => (c.id === action.id ? { ...c, color: action.color } : c)) };
    case 'UPDATE_CALENDAR_ICON':
      return { ...state, calendars: state.calendars.map((c) => (c.id === action.id ? { ...c, icon: action.icon } : c)) };
    case 'TOGGLE_TASK':
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.id ? { ...t, done: !t.done, lastDoneKey: !t.done ? todayKey() : t.lastDoneKey } : t,
        ),
      };
    case 'RESET_RECURRING_TASKS': {
      const today = todayKey();
      const dow = dowOf(today);
      const tasks = state.tasks.map((t) => {
        if (!t.recurring || !t.done) return t;
        if (t.lastDoneKey === today) return t; // já resetou hoje
        if (!t.recurring.includes(dow)) return t;
        return { ...t, done: false };
      });
      return { ...state, tasks };
    }
    case 'TOGGLE_TASK_IMPORTANT':
      return { ...state, tasks: state.tasks.map((t) => (t.id === action.id ? { ...t, important: !t.important } : t)) };
    case 'UPDATE_TASK_NOTES':
      return { ...state, tasks: state.tasks.map((t) => (t.id === action.id ? { ...t, notes: action.notes } : t)) };
    case 'UPDATE_TASK_PRIORITY':
      return { ...state, tasks: state.tasks.map((t) => (t.id === action.id ? { ...t, prio: action.prio } : t)) };
    case 'ADD_TASK_SUBTASK':
      return {
        ...state,
        tasks: state.tasks.map((t) => (t.id === action.taskId ? { ...t, subtasks: [...(t.subtasks ?? []), action.item] } : t)),
      };
    case 'TOGGLE_TASK_SUBTASK':
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.taskId
            ? { ...t, subtasks: (t.subtasks ?? []).map((s) => (s.id === action.itemId ? { ...s, done: !s.done } : s)) }
            : t,
        ),
      };
    case 'REMOVE_TASK_SUBTASK':
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.taskId ? { ...t, subtasks: (t.subtasks ?? []).filter((s) => s.id !== action.itemId) } : t,
        ),
      };
    case 'ARCHIVE_OLD_TASKS': {
      const today = todayKey();
      const tasks = state.tasks.map((t) => {
        if (t.archived || !t.done || !t.lastDoneKey || t.recurring) return t;
        const daysSince = daysBetween(t.lastDoneKey, today);
        return daysSince >= 5 ? { ...t, archived: true } : t;
      });
      return { ...state, tasks };
    }
    case 'ADD_PENDING_SYNC':
      return { ...state, pendingSyncIds: [...state.pendingSyncIds, action.id] };
    case 'REMOVE_PENDING_SYNC':
      return { ...state, pendingSyncIds: state.pendingSyncIds.filter((id) => id !== action.id) };
    case 'APPLY_REMOTE_SYNC': {
      // syncEnabled/syncId nunca vêm do remoto — são identidade do
      // dispositivo local, não "conteúdo" pra sincronizar
      const { syncEnabled: _se, syncId: _si, ...remoteSettings } = action.settings;
      return {
        ...state,
        tasks: action.tasks,
        calendars: action.calendars,
        calendarSets: action.calendarSets,
        settings: { ...state.settings, ...remoteSettings },
      };
    }
    case 'SCHEDULE_TASK': {
      const tasks = state.tasks.filter((t) => t.id !== action.taskId);
      return {
        ...state,
        tasks,
        events: [...state.events, action.event],
        toast: 'Tarefa agendada como bloco de tempo',
      };
    }
    case 'SET_SELECTED':
      return { ...state, selected: action.id };
    case 'OPEN_FORM':
      return { ...state, form: action.form, aiOpen: false };
    case 'CLOSE_FORM':
      return { ...state, form: null };
    case 'UPDATE_FORM':
      return state.form ? { ...state, form: { ...state.form, ...action.changes } } : state;
    case 'SET_PANEL':
      return { ...state, panel: state.panel === action.panel ? null : action.panel };
    case 'TOGGLE_WORK_ONLY':
      return { ...state, workOnly: !state.workOnly };
    case 'SET_PREVIEW':
      return { ...state, preview: action.preview };
    case 'TOAST':
      return { ...state, toast: action.message };
    case 'SET_WIDTH':
      return { ...state, w: action.w };
    case 'TICK_NOW':
      return { ...state, now: nowMinutesOfDay() };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };
    case 'SET_SIDEBAR':
      return { ...state, sidebarOpen: action.open };
    case 'TOGGLE_SHORTCUTS':
      return { ...state, shortcutsOpen: !state.shortcutsOpen };
    case 'SET_SHORTCUTS_OPEN':
      return { ...state, shortcutsOpen: action.open };
    case 'SET_AI_OPEN':
      return { ...state, aiOpen: action.open };
    case 'SET_FOCUS_MODE':
      return { ...state, focusMode: action.on, sidebarOpen: false };
    case 'GOOGLE_TOGGLE': {
      if (state.google === 'on') {
        return {
          ...state,
          google: 'off',
          events: state.events.filter((ev) => ev.src !== 'google'),
          toast: 'Google Calendar desconectado',
        };
      }
      return { ...state, google: 'sync' };
    }
    case 'GOOGLE_CONNECTED_REAL':
      return { ...state, google: 'on', toast: 'Google Calendar conectado' };
    case 'GOOGLE_SYNC_MERGE': {
      const deletedSet = new Set(action.deletedGoogleIds);
      const kept = state.events.filter((ev) => !(ev.src === 'google' && ev.googleEventId && deletedSet.has(ev.googleEventId)));
      const events = kept.slice();
      for (const incoming of action.events) {
        const idx = events.findIndex((ev) => ev.googleEventId && ev.googleEventId === incoming.googleEventId);
        if (idx >= 0) {
          events[idx] = { ...events[idx], ...incoming, id: events[idx].id };
        } else {
          events.push(incoming);
        }
      }
      return {
        ...state,
        google: 'on',
        events,
        lastSync: Date.now(),
        toast: `${action.events.length} eventos sincronizados do Google`,
      };
    }
    case 'GOOGLE_SYNCED':
      return {
        ...state,
        google: 'on',
        events: [...state.events, ...action.events],
        lastSync: Date.now(),
        toast: `${action.events.length} eventos sincronizados do Google`,
      };
    default:
      return state;
  }
}

const DEFAULT_CALENDAR_SETS: CalendarSet[] = [
  { id: 'all', name: 'Tudo', calIds: ['work', 'personal', 'family'], builtin: true },
  { id: 'work', name: 'Só Trabalho', calIds: ['work'], builtin: true },
  { id: 'personal', name: 'Só Pessoal', calIds: ['personal', 'family'], builtin: true },
];

function initialState(): AppState {
  const hasWindow = typeof window !== 'undefined';
  const w = hasWindow ? window.innerWidth : 1440;

  const storedEvents = loadJSON<Event[]>('events');
  const storedTasks = loadJSON<Task[]>('tasks');
  const storedNotes = loadJSON<Note[]>('notes');
  const storedCalendars = loadJSON<Calendar[]>('calendars');
  const storedCalendarSets = loadJSON<CalendarSet[]>('calendarSets');
  const storedGoogleConnected = loadJSON<boolean>('googleConnected');
  const storedSettings = loadJSON<AppSettings>('settings');
  const settings = { ...DEFAULT_SETTINGS, ...storedSettings };

  return {
    settings,
    theme: resolveTheme(settings.themeMode),
    settingsOpen: false,
    settingsTab: 'general',
    page: 'calendario',
    view: w < 900 ? 'agenda' : 'week',
    cursor: todayKey(),
    events: storedEvents ?? seedEvents(),
    tasks: storedTasks ?? seedTasks(),
    notes: storedNotes ?? [],
    calendars: storedCalendars ?? CALENDARS,
    calendarSets: storedCalendarSets ?? DEFAULT_CALENDAR_SETS,
    set: 'all',
    quick: '',
    search: '',
    google: storedGoogleConnected && isGoogleConfigured() ? 'on' : 'off',
    lastSync: null,
    selected: null,
    form: null,
    panel: null,
    workOnly: false,
    preview: null,
    toast: null,
    w,
    now: nowMinutesOfDay(),
    sidebarOpen: false,
    shortcutsOpen: w >= 1024,
    aiOpen: false,
    focusMode: false,
    pendingSyncIds: [],
  };
}

const StoreContext = createContext<{ state: AppState; dispatch: React.Dispatch<Action> } | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  // syncFromGoogle é chamado de dentro de efeitos com dependências
  // estreitas (ex: só [state.google]) — sem essa ref, ele enxergaria uma
  // foto antiga de state.events sempre que rodasse via intervalo/foco/
  // sincronização manual, o que reintroduziria a duplicação de série
  // recorrente que o filtro abaixo existe pra evitar.
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', state.theme === 'dark');
  }, [state.theme]);

  useEffect(() => {
    if (state.settings.accentColor) {
      document.documentElement.style.setProperty('--accent', state.settings.accentColor);
      // as cores da paleta (ACCENT_COLOR_PRESETS) são todas saturadas/escuras
      // o bastante pra precisar de texto branco em cima — força isso,
      // porque o --accentText padrão do tema escuro assume um azul claro
      // (--accent original ali é bem mais claro que as opções da paleta).
      document.documentElement.style.setProperty('--accentText', '#ffffff');
    } else {
      document.documentElement.style.removeProperty('--accent');
      document.documentElement.style.removeProperty('--accentText');
    }
  }, [state.settings.accentColor]);

  useEffect(() => {
    if (state.settings.eventOpacity != null) {
      document.documentElement.style.setProperty('--event-mix', `${state.settings.eventOpacity}%`);
    } else {
      document.documentElement.style.removeProperty('--event-mix');
    }
  }, [state.settings.eventOpacity]);

  useEffect(() => {
    dispatch({ type: 'RESET_RECURRING_TASKS' });
    dispatch({ type: 'ARCHIVE_OLD_TASKS' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (state.settings.themeMode !== 'auto' || typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => dispatch({ type: 'UPDATE_SETTINGS', changes: {} });
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [state.settings.themeMode]);

  useEffect(() => {
    saveJSON('settings', state.settings);
  }, [state.settings]);

  useEffect(() => {
    const onResize = () => dispatch({ type: 'SET_WIDTH', w: window.innerWidth });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const id = setInterval(() => dispatch({ type: 'TICK_NOW' }), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!state.toast) return;
    const id = setTimeout(() => dispatch({ type: 'TOAST', message: null }), 2200);
    return () => clearTimeout(id);
  }, [state.toast]);

  useEffect(() => {
    if (state.google !== 'sync') return;
    if (isGoogleConfigured()) return; // fluxo real cuida disso via redirect, não via este efeito
    const id = setTimeout(() => {
      dispatch({ type: 'GOOGLE_SYNCED', events: buildGoogleMockEvents(state.cursor) });
    }, 1200);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.google]);

  // --- Google Calendar real: detecta o retorno do OAuth e sincroniza -----

  async function syncFromGoogle(forceFull = false) {
    try {
      const result = await listGoogleEvents(forceFull, stateRef.current.settings.selectedGoogleCalendarIds);
      // instâncias de série cujo "mestre" já é um evento nativo do Aether
      // (rrule + o mesmo googleEventId) não entram — o Aether já expande
      // essa série localmente; importar as instâncias de novo duplicaria
      // visualmente cada ocorrência
      const nativeSeriesGoogleIds = new Set(
        stateRef.current.events.filter((ev) => ev.rrule && ev.googleEventId).map((ev) => ev.googleEventId),
      );
      const filtered = result.events.filter((raw) => {
        const recurringEventId = raw.recurringEventId as string | undefined;
        return !recurringEventId || !nativeSeriesGoogleIds.has(recurringEventId);
      });
      const events = filtered.map(rawToAetherEvent);
      dispatch({ type: 'GOOGLE_SYNC_MERGE', events, deletedGoogleIds: result.deletedIds ?? [] });
    } catch (err) {
      console.error('Falha ao sincronizar com o Google:', err);
      dispatch({ type: 'TOAST', message: 'Não consegui sincronizar com o Google agora' });
    }
  }

  useEffect(() => {
    if (!isGoogleConfigured()) return;
    const params = new URLSearchParams(window.location.search);
    const status = params.get('google');
    if (!status) return;
    window.history.replaceState({}, '', window.location.pathname);
    if (status === 'connected') {
      dispatch({ type: 'GOOGLE_CONNECTED_REAL' });
      syncFromGoogle();
    } else if (status === 'error') {
      dispatch({ type: 'TOAST', message: 'Não consegui conectar ao Google Calendar. Tente de novo.' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isGoogleConfigured() || state.google !== 'on') return;
    const id = setInterval(syncFromGoogle, 5 * 60_000);
    const onFocus = () => syncFromGoogle();
    const onManualSync = (e: globalThis.Event) => syncFromGoogle((e as CustomEvent).detail?.forceFull === true);
    window.addEventListener('focus', onFocus);
    window.addEventListener('aether:sync-now', onManualSync);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('aether:sync-now', onManualSync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.google]);

  useEffect(() => {
    saveJSON('googleConnected', state.google === 'on' && isGoogleConfigured());
  }, [state.google]);

  // Persistência local — é o que torna o app usável de verdade entre sessões.
  useEffect(() => {
    saveJSON('events', state.events);
  }, [state.events]);
  useEffect(() => {
    saveJSON('tasks', state.tasks);
  }, [state.tasks]);
  useEffect(() => {
    saveJSON('notes', state.notes);
  }, [state.notes]);
  useEffect(() => {
    saveJSON('calendars', state.calendars);
  }, [state.calendars]);
  useEffect(() => {
    saveJSON('calendarSets', state.calendarSets);
  }, [state.calendarSets]);

  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore deve ser usado dentro de StoreProvider');
  return ctx;
}

/** Simula ~15 eventos importados do Google, marcados src:'google'. */
function buildGoogleMockEvents(_cursorKey: string): Event[] {
  const monday = todayKey();
  const titles = [
    'Reunião de diretoria',
    'Almoço com fornecedor',
    'Call — parceria educacional',
    'Webinar de marketing',
    'Consulta médica',
    'Aula de violão',
    'Manutenção do carro',
    'Jantar de aniversário',
    'Workshop de vendas',
    'Check-in semanal',
    'Sessão de fotos',
    'Feira de livros',
    'Visita ao escritório',
    'Curso de inglês avançado',
    'Reunião com contador',
  ];
  return titles.map((title, i) => {
    const dateKey = addDays(monday, (i % 10) - 3);
    const startH = 8 + (i % 9);
    return {
      id: `google-${i}`,
      title,
      calId: i % 3 === 0 ? 'work' : i % 3 === 1 ? 'personal' : 'family',
      startsAt: new Date(`${dateKey}T${String(startH).padStart(2, '0')}:00:00-03:00`).toISOString(),
      endsAt: new Date(`${dateKey}T${String(startH + 1).padStart(2, '0')}:00:00-03:00`).toISOString(),
      timeZone: 'America/Sao_Paulo',
      allDay: false,
      src: 'google' as const,
    };
  });
}

export { dateKeyOf, buildRRuleFromForm };
