import type { CalendarId } from './types';
import { addDays, todayKey, dowOf } from './dates';

export type ParsedQuickAdd = {
  title: string;
  dateKey: string;
  startMin: number;
  durationMin: number;
  location?: string;
  calId: CalendarId;
};

const WEEKDAY_NAMES: Record<string, number> = {
  domingo: 0,
  segunda: 1,
  'segunda-feira': 1,
  terça: 2,
  'terça-feira': 2,
  terca: 2,
  quarta: 3,
  'quarta-feira': 3,
  quinta: 4,
  'quinta-feira': 4,
  sexta: 5,
  'sexta-feira': 5,
  sábado: 6,
  sabado: 6,
};

const WORK_KEYWORDS = ['reunião', 'reuniao', 'call', 'cliente', 'sprint', 'daily', 'standup', 'projeto', 'deploy', 'revisão', 'entrevista', 'aula', 'turma'];
const FAMILY_KEYWORDS = ['família', 'familia', 'filho', 'filha', 'mãe', 'mae', 'pai', 'aniversário', 'aniversario', 'escola'];

export function inferCalendar(title: string, location?: string): CalendarId {
  const lower = `${title} ${location ?? ''}`.toLowerCase();
  if (FAMILY_KEYWORDS.some((k) => lower.includes(k))) return 'family';
  if (WORK_KEYWORDS.some((k) => lower.includes(k))) return 'work';
  return 'personal';
}

const TAG_TO_CAL: Record<string, CalendarId> = {
  trabalho: 'work',
  work: 'work',
  pessoal: 'personal',
  personal: 'personal',
  familia: 'family',
  família: 'family',
  family: 'family',
};

/**
 * Parser heurístico de linguagem natural em pt-BR para o quick-add.
 * Não é um NLP completo — cobre os padrões mais comuns ("amanhã 14h",
 * "sexta às 10h30", "dia 28/08 9h", "#trabalho", "~60m") como no protótipo
 * original. Em produção, considerar um parser de datas dedicado (ex:
 * chrono-node com locale pt).
 *
 * A ORDEM DE EXTRAÇÃO IMPORTA e não é arbitrária:
 * 1. tag (#trabalho) — token isolado, não colide com nada
 * 2. hora (14h) — precisa rodar ANTES da duração, senão "18h" de horário
 *    seria comido pela regra de duração "Nh" (mesma sintaxe, sentido diferente)
 * 3. duração (~60m / 1h) — precisa rodar ANTES do local, porque o local é
 *    ancorado no fim da frase ($) e uma duração sobrando no final quebraria esse anchor
 * 4. local (no/na/em X) — ancorado no fim, por isso vem depois de tudo que também
 *    poderia estar no final (duração)
 * 5. data (amanhã, dia X, nome do dia) — palavras específicas, não ambíguas
 *    com números, então a posição relativa às outras etapas não importa
 */
export function parseQuickAdd(raw: string): ParsedQuickAdd {
  let text = raw.trim();
  let dateKey = todayKey();
  let startMin = 9 * 60;
  let durationMin = 60;
  let location: string | undefined;
  let explicitCalId: CalendarId | undefined;

  // 1. categoria explícita: "#trabalho", "#pessoal", "#familia"
  const tagMatch = text.match(/#(\w+)/);
  if (tagMatch) {
    const tag = tagMatch[1].toLowerCase();
    if (TAG_TO_CAL[tag]) explicitCalId = TAG_TO_CAL[tag];
    text = text.replace(tagMatch[0], '').trim();
  }

  // 2. hora: "14h", "14h30", "às 14:00", "14:00"
  // (usa lookbehind/lookahead em vez de \b — \b falha em acentos como "à",
  // já que \w no JS não inclui letras acentuadas sem a flag 'u')
  const timeMatch = text.match(/(?<=^|\s)(?:às\s+)?(\d{1,2})(?:h|:)(\d{2})?(?=$|\s)/i);
  if (timeMatch) {
    const h = parseInt(timeMatch[1], 10);
    const m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    if (h >= 0 && h <= 23) {
      startMin = h * 60 + m;
    }
    text = (text.slice(0, timeMatch.index) + text.slice(timeMatch.index! + timeMatch[0].length)).trim();
  }

  // 3. duração: "~60m", "~1h" (sintaxe explícita) — senão "1h", "30min", "2 horas"
  const tildeDurMatch = text.match(/~\s*(\d+)\s*(m|min|h|hora|horas)?\b/i);
  if (tildeDurMatch) {
    const n = parseInt(tildeDurMatch[1], 10);
    const unit = (tildeDurMatch[2] ?? 'm').toLowerCase();
    durationMin = unit.startsWith('h') ? n * 60 : n;
    text = text.replace(tildeDurMatch[0], '').trim();
  } else {
    const durMatch = text.match(/\b(\d+)\s*(?:h|hora|horas)\b/i);
    const durMinMatch = text.match(/\b(\d+)\s*min\b/i);
    if (durMatch) {
      durationMin = parseInt(durMatch[1], 10) * 60;
      text = text.replace(durMatch[0], '').trim();
    } else if (durMinMatch) {
      durationMin = parseInt(durMinMatch[1], 10);
      text = text.replace(durMinMatch[0], '').trim();
    }
  }

  // 4. local: "no/na/em <lugar>" até o fim da frase
  const locMatch = text.match(/\s+(?:no|na|em)\s+([A-Za-zÀ-ÿ0-9 .'-]+)$/i);
  if (locMatch) {
    location = locMatch[1].trim();
    text = text.slice(0, locMatch.index).trim();
  }

  // 5. data: "amanhã", "hoje", "dia DD/MM", nome do dia da semana
  if (/\bhoje\b/i.test(text)) {
    dateKey = todayKey();
    text = text.replace(/\bhoje\b/i, '').trim();
  } else if (/(?<=^|\s)amanh[ãa](?=$|\s)/i.test(text)) {
    dateKey = addDays(todayKey(), 1);
    text = text.replace(/(?<=^|\s)amanh[ãa](?=$|\s)/i, '').trim();
  } else {
    const dm = text.match(/\bdia\s+(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/i);
    if (dm) {
      const d = parseInt(dm[1], 10);
      const m = parseInt(dm[2], 10);
      const y = dm[3] ? (dm[3].length === 2 ? 2000 + parseInt(dm[3], 10) : parseInt(dm[3], 10)) : new Date().getFullYear();
      dateKey = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      text = text.replace(dm[0], '').trim();
    } else {
      const wdMatch = Object.keys(WEEKDAY_NAMES).find((name) => new RegExp(`\\b${name}\\b`, 'i').test(text));
      if (wdMatch) {
        const targetDow = WEEKDAY_NAMES[wdMatch];
        let c = todayKey();
        for (let i = 0; i < 8; i++) {
          if (dowOf(c) === targetDow) {
            dateKey = c;
            break;
          }
          c = addDays(c, 1);
        }
        text = text.replace(new RegExp(`\\b${wdMatch}\\b`, 'i'), '').trim();
      }
    }
  }

  text = text.replace(/\s{2,}/g, ' ').trim();
  const title = text.length > 0 ? text : 'Novo evento';

  return {
    title,
    dateKey,
    startMin,
    durationMin,
    location,
    calId: explicitCalId ?? inferCalendar(title, location),
  };
}
