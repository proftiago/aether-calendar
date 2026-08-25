import type { Calendar, Event, Task } from './types';
import { addDays, startOfWeekKey, todayKey, toUtcIso } from './dates';

export const CALENDARS: Calendar[] = [
  { id: 'work', name: 'Trabalho', color: 'var(--cal-work)', visible: true },
  { id: 'personal', name: 'Pessoal', color: 'var(--cal-personal)', visible: true },
  { id: 'family', name: 'Família', color: 'var(--cal-family)', visible: true },
];

let idCounter = 1;
function nextId(prefix: string) {
  return `${prefix}-${idCounter++}`;
}

/** Popula ~20 eventos ancorados na semana corrente, para o calendário nunca parecer vazio. */
export function seedEvents(): Event[] {
  const monday = startOfWeekKey(todayKey());
  const events: Event[] = [];

  const ev = (partial: Omit<Event, 'id' | 'timeZone'> & { id?: string }): Event => ({
    timeZone: 'America/Sao_Paulo',
    ...partial,
    id: partial.id ?? nextId('ev'),
  });

  // Recorrentes
  events.push(
    ev({
      title: 'Terapia',
      calId: 'personal',
      startsAt: toUtcIso(addDays(monday, 1), 18 * 60 + 30),
      endsAt: toUtcIso(addDays(monday, 1), 19 * 60 + 30),
      allDay: false,
      rrule: { freq: 'weekly', dows: [2] },
      location: 'Consultório · Rua Voluntários da Pátria, 190',
      src: 'local',
    }),
  );
  events.push(
    ev({
      title: 'Academia',
      calId: 'personal',
      startsAt: toUtcIso(monday, 6 * 60 + 30),
      endsAt: toUtcIso(monday, 7 * 60 + 30),
      allDay: false,
      rrule: { freq: 'weekly', dows: [1, 3, 5] },
      src: 'local',
    }),
  );
  events.push(
    ev({
      title: 'Daily Standup',
      calId: 'work',
      startsAt: toUtcIso(monday, 9 * 60),
      endsAt: toUtcIso(monday, 9 * 60 + 15),
      allDay: false,
      rrule: { freq: 'weekly', dows: [1, 2, 3, 4, 5] },
      meet: 'https://meet.google.com/aether-daily',
      src: 'local',
    }),
  );
  events.push(
    ev({
      title: 'Planejamento semanal',
      calId: 'work',
      startsAt: toUtcIso(monday, 10 * 60),
      endsAt: toUtcIso(monday, 11 * 60),
      allDay: false,
      rrule: { freq: 'weekly', dows: [1] },
      src: 'local',
    }),
  );
  events.push(
    ev({
      title: 'Futebol',
      calId: 'personal',
      startsAt: toUtcIso(addDays(monday, 3), 19 * 60 + 30),
      endsAt: toUtcIso(addDays(monday, 3), 21 * 60),
      allDay: false,
      rrule: { freq: 'weekly', dows: [4] },
      location: 'Quadra Society Barra',
      src: 'local',
    }),
  );

  // Dia inteiro
  events.push(
    ev({
      title: 'Aniversário da Sofia',
      calId: 'family',
      startsAt: toUtcIso(addDays(monday, 4), 0),
      endsAt: toUtcIso(addDays(monday, 4), 24 * 60),
      allDay: true,
      src: 'local',
    }),
  );
  events.push(
    ev({
      title: 'Viagem SP → Porto Alegre',
      calId: 'personal',
      startsAt: toUtcIso(addDays(monday, 6), 0),
      endsAt: toUtcIso(addDays(monday, 7), 24 * 60),
      allDay: true,
      src: 'local',
    }),
  );

  // Com videochamada
  events.push(
    ev({
      title: '1:1 com Marina',
      calId: 'work',
      startsAt: toUtcIso(addDays(monday, 1), 11 * 60),
      endsAt: toUtcIso(addDays(monday, 1), 11 * 60 + 30),
      allDay: false,
      meet: 'https://meet.google.com/aether-1-1',
      src: 'local',
    }),
  );
  events.push(
    ev({
      title: 'Revisão de Sprint',
      calId: 'work',
      startsAt: toUtcIso(addDays(monday, 4), 15 * 60),
      endsAt: toUtcIso(addDays(monday, 4), 16 * 60),
      allDay: false,
      meet: 'https://meet.google.com/aether-sprint',
      src: 'local',
    }),
  );
  events.push(
    ev({
      title: 'Retro',
      calId: 'work',
      startsAt: toUtcIso(addDays(monday, 4), 16 * 60 + 15),
      endsAt: toUtcIso(addDays(monday, 4), 17 * 60),
      allDay: false,
      meet: 'https://meet.google.com/aether-retro',
      src: 'local',
    }),
  );
  events.push(
    ev({
      title: 'Entrevista — vaga Frontend',
      calId: 'work',
      startsAt: toUtcIso(addDays(monday, 2), 14 * 60),
      endsAt: toUtcIso(addDays(monday, 2), 15 * 60),
      allDay: false,
      meet: 'https://meet.google.com/aether-entrevista',
      src: 'local',
    }),
  );
  events.push(
    ev({
      title: 'Deploy — release 2.4',
      calId: 'work',
      startsAt: toUtcIso(addDays(monday, 3), 17 * 60,),
      endsAt: toUtcIso(addDays(monday, 3), 17 * 60 + 45),
      allDay: false,
      meet: 'https://meet.google.com/aether-deploy',
      src: 'local',
    }),
  );

  // Com endereço físico (geram deslocamento)
  events.push(
    ev({
      title: 'Cliente Nexa — apresentação',
      calId: 'work',
      startsAt: toUtcIso(addDays(monday, 2), 10 * 60),
      endsAt: toUtcIso(addDays(monday, 2), 11 * 60 + 30),
      allDay: false,
      location: 'Av. Presidente Vargas, 3131',
      src: 'local',
    }),
  );
  events.push(
    ev({
      title: 'Reunião de pais',
      calId: 'family',
      startsAt: toUtcIso(addDays(monday, 2), 18 * 60),
      endsAt: toUtcIso(addDays(monday, 2), 19 * 60),
      allDay: false,
      location: 'Colégio Santa Mônica',
      src: 'local',
    }),
  );
  events.push(
    ev({
      title: 'Jantar — restaurante',
      calId: 'personal',
      startsAt: toUtcIso(addDays(monday, 5), 20 * 60),
      endsAt: toUtcIso(addDays(monday, 5), 22 * 60),
      allDay: false,
      location: 'Aprazível, Santa Teresa',
      src: 'local',
    }),
  );
  events.push(
    ev({
      title: 'Consulta — dermatologista',
      calId: 'personal',
      startsAt: toUtcIso(addDays(monday, 0), 16 * 60),
      endsAt: toUtcIso(addDays(monday, 0), 16 * 60 + 30),
      allDay: false,
      location: 'Consultório Botafogo',
      src: 'local',
    }),
  );

  // Alguns extras espalhados p/ preencher a semana
  events.push(
    ev({
      title: 'Almoço com Rafael',
      calId: 'personal',
      startsAt: toUtcIso(addDays(monday, 1), 12 * 60 + 30),
      endsAt: toUtcIso(addDays(monday, 1), 13 * 60 + 30),
      allDay: false,
      location: 'Zona Sul',
      src: 'local',
    }),
  );
  events.push(
    ev({
      title: 'Revisão de contrato',
      calId: 'work',
      startsAt: toUtcIso(addDays(monday, 5), 9 * 60 + 30),
      endsAt: toUtcIso(addDays(monday, 5), 10 * 60 + 30),
      allDay: false,
      src: 'local',
    }),
  );
  events.push(
    ev({
      title: 'Compras da semana',
      calId: 'family',
      startsAt: toUtcIso(addDays(monday, 6), 11 * 60),
      endsAt: toUtcIso(addDays(monday, 6), 12 * 60),
      allDay: false,
      src: 'local',
    }),
  );
  events.push(
    ev({
      title: 'Leitura — 30 min',
      calId: 'personal',
      startsAt: toUtcIso(addDays(monday, 0), 22 * 60),
      endsAt: toUtcIso(addDays(monday, 0), 22 * 60 + 30),
      allDay: false,
      src: 'local',
    }),
  );

  return events;
}

export function seedTasks(): Task[] {
  const t = (partial: Omit<Task, 'id' | 'done'>): Task => ({
    ...partial,
    id: nextId('task'),
    done: false,
  });
  return [
    t({ title: 'Fechar proposta comercial', prio: 'alta', dur: 60, tag: 'Estratégia', calId: 'work' }),
    t({ title: 'Revisar copy do site', prio: 'média', dur: 45, tag: 'Produto', calId: 'work' }),
    t({ title: '1:1 com o time', prio: 'média', dur: 30, tag: 'Time', calId: 'work' }),
    t({ title: 'Organizar recibos do mês', prio: 'baixa', dur: 30, tag: 'Admin', calId: 'personal' }),
    t({ title: 'Planejar fim de semana', prio: 'baixa', dur: 20, tag: 'Pessoal', calId: 'personal' }),
  ];
}
