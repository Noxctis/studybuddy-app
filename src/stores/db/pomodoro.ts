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
      lastUpdate: new Date(),
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

  // function parsePomodorDboToRecord(p: StudySession): StudySession {
  //   if (p.deepWork === undefined) p.deepWork = true;
  //   return {
  //     ...p,
  //     displayBreaks: timeUtils.getDisplayBreaksRecord(p, p.endedAt ?? 0, settings.generalSettings.showSeconds),
  //     displayStudy: timeUtils.getDisplayStudyRecord(p, p.endedAt ?? 0, settings.generalSettings.showSeconds),
  //     report: reportUtils.getStudySession(p),
  //   }
  // }

  async function updatePomodoroRecords() {
    pomodoroRecords.value = (
      await db.pomodori.orderBy('datetime')
        .reverse()
        .limit(500)
        .toArray()
    ).map(p => parsePomodoroForStorage(p));
    updateStreak();
  }

  async function addPomodoroToRecords(pomo: StudySession): Promise<StudySession> {
    const dt = new Date(pomo.start ?? Date.now());
    const pomoStorage = parsePomodoroForStorage(pomo);
    // const parsed = parsePomodorDboToRecord(p);
    const first = await db.pomodori.where('id').equals(pomoStorage.id!).first();
    if (!first) {
      await db.pomodori.add(pomoStorage);
      pomodoroRecords.value.unshift(pomoStorage);
      updateStreak();
      postRemotePomodoro(pomoStorage);
    }
    return pomoStorage;
  }
  async function deletePomodoroRecord(id: string) {
    pomodoroRecords.value = pomodoroRecords.value.filter(p => p.id !== id);
    updateStreak();
    await db.pomodori.delete(id);
    await deleteRemotePomodoro(id)
  }

  async function updatePomodoro(id: string, updatePomo: (p: StudySession) => StudySession) {
    const pomo = await db.pomodori.get(id);
    if (pomo) {
      pomo.remoteUpdated = 0;
      await db.pomodori.put(updatePomo(pomo), id);
      if (pomo.remoteUpdated === 0) {
        updateRemotePomodoro(pomo);
      }
    }
  }

  // -- REMOTE --
  async function postRemotePomodoro(pomodoro: StudySession) {
    if (!pomodoro.id) return;
    await api.pomodori.postPomodoro(pomodoro);
    await updatePomodoro(pomodoro.id, p => { p.remoteUpdated = 1; return p; });
  }
  async function updateRemotePomodoro(pomodoro: StudySession) {
    if (!pomodoro.id) return;
    await api.pomodori.updatePomodoro(pomodoro);
    await updatePomodoro(pomodoro.id, p => { p.remoteUpdated = 1; return p; });
  }
  async function deleteRemotePomodoro(id: string) {
    await api.pomodori.deletePomodoro(id);
  }

  // --- TAGS ---
  const tags = ref<string[]>([]);
  const tagColors = ref<{ [id: string]: string; }>({});
  async function updateTags() {
    const colorList = [
      '#33FFCC', '#FF1A66', '#FFFF99', '#809900', '#CC80CC',
      '#E6331A', '#CC9999', '#FFB399', '#80B300', '#E666B3',
      '#00E680', '#B33300', '#B366CC', '#6680B3', '#66994D',
      '#FF6633', '#00B3E6', '#991AFF', '#3366E6', '#B3B31A',
      '#99FF99', '#FF33FF', '#1AB399', '#B34D4D', '#4D8000',
      '#999966', '#E6B333', '#33991A', '#66664D', '#FF99E6',
      '#CCFF1A', '#E666FF', '#E6B3B3', '#66991A', '#4DB3FF'
    ];
    tags.value = (await db.pomodori.orderBy('tag').uniqueKeys()).map((t, i) => t.toString())
    tagColors.value = tags.value.reduce((acc, t, i) => {
      acc[t] = colorList[i % colorList.length];
      return acc;
    }, {} as { [id: string]: string; });
  }
  async function updateTag(id: string, tag: string | undefined) {
    await updatePomodoro(id, p => { p.tag = tag; return p; });
    await updateTags();
  }
  updateTags();

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
    pomodoroRecords, tags, tagColors, streak, updatePomodoro,
    addPomodoroToRecords, deletePomodoroRecord,
    parsePomodoroForStorage,
    updateTag, updateRating, updateTasks, updateDeepWork, updateName
  };
});