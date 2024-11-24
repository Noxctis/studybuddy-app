import { defineStore } from 'pinia'
import { useDBStore } from "./db";
import { useAPIStore } from "../api";
import { PomodoroState, type PomodoroTask, type StudySession } from '@/types';
import { ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';

export const usePomodoroDBStore = defineStore('pomoDBStore', () => {
  const db = useDBStore();
  const api = useAPIStore().api;


  const streak = ref(0);
  const pomodoroRecords = ref<StudySession[]>([]);

  function parsePomodoroForStorage(pomo: StudySession): StudySession {
    return {
      id: pomo.id ?? uuidv4(),
      userId: pomo.userId,
      lastUpdated: new Date(),
      version: pomo.version,

      state: PomodoroState.TERMINATED,
      start: pomo.start,
      endScheduled: pomo.endScheduled,
      endActual: pomo.endActual,

      breaksDone: pomo.breaksDone.map(b => ({ start: b.start, end: b.end ?? b.start })),
      title: pomo.title,
      freeMode: pomo.freeMode,
      deepWork: pomo.deepWork,
      tag: pomo.tag,
      rating: pomo.rating,
      tasks: pomo.tasks,

      remoteUpdated: 0,
    }
  }

  async function updatePomodoroRecords() {
    pomodoroRecords.value = (
      await db.pomodori.orderBy('start')
        .reverse()
        .limit(2000)
        .toArray()
    );
    updateStreak();
  }

  async function savePomodoro(pomo: StudySession): Promise<StudySession> {
    let p = parsePomodoroForStorage(pomo);
    try {
      p = await api.pomodori.upsertPomodoro(p);
    } catch (e) { }
    if (p.lastUpdated)
      p.lastUpdated = new Date(p.lastUpdated);
    if (p.start)
      p.start = new Date(p.start);
    await db.pomodori.put(p, p.id!);
    pomodoroRecords.value.unshift(p);
    updateStreak();
    return p;
  }

  async function updatePomodoro(id: string, updatePomo: (p: StudySession) => StudySession) {
    const pomo = await db.pomodori.get(id);
    if (pomo) {
      const newP = updatePomo(pomo);
      pomo.remoteUpdated = 0;
      try {
        api.pomodori.upsertPomodoro(newP).then(apiP => {
          if (apiP.lastUpdated)
            apiP.lastUpdated = new Date(apiP.lastUpdated);
          if (apiP.start)
            apiP.start = new Date(apiP.start);
          db.pomodori.put(apiP, id);
        });
      } catch {
        db.pomodori.put(newP, id);
      }
    }
  }

  async function deletePomodoro(id: string) {
    pomodoroRecords.value = pomodoroRecords.value.filter(p => p.id !== id);
    updateStreak();
    try {
      await api.pomodori.deletePomodoro(id);
      await db.pomodori.delete(id);
      return true;
    } catch {
      return false;
    }
  }

  // --- TAGS ---
  async function updateTag(id: string, tag: string | undefined) {
    await updatePomodoro(id, p => { p.tag = tag; return p; });
  }
  async function updateRating(id: string, rating: number) {
    await updatePomodoro(id, p => { p.rating = rating; return p; });
  }
  async function updateDeepWork(id: string, deepWork: boolean) {
    await updatePomodoro(id, p => { p.deepWork = deepWork; return p; });
  }
  async function updateName(id: string, title: string) {
    await updatePomodoro(id, p => { p.title = title; return p; });
  }

  // --- TASKS ---
  async function updateTasks(id: string, tasks?: PomodoroTask[]) {
    await updatePomodoro(id, p => { p.tasks = tasks?.map(t => ({ task: t.task, done: t.done })); return p; });
  }

  // --- STREAK ---
  function getDay(d: Date) {
    return Math.floor((
      d.getTime() - d.getTimezoneOffset() * 60 * 1000
    ) / (24 * 60 * 60 * 1000));

  }

  function updateStreak() {
    const days = pomodoroRecords.value.map(p => getDay(p.start!));
    const today = getDay(new Date());

    if (days.length === 0 || (today !== days[0] && today - 1 !== days[0])) {
      streak.value = 0;
      return;
    }

    let newStreak = 1;
    let i = 1
    while (i < days.length) {
      const d1 = days[i - 1];
      const d2 = days[i];
      if (d1 - 1 === d2) {
        newStreak++;
        i++;
      } else if (d1 === d2) {
        i++;
      } else {
        break;
      }
    }
    streak.value = newStreak;
  }

  updatePomodoroRecords();

  return {
    pomodoroRecords, streak, updatePomodoro,
    savePomodoro, deletePomodoro,
    parsePomodoroForStorage,
    updateTag, updateRating, updateTasks, updateDeepWork, updateName,
    updatePomodoroRecords
  };
});