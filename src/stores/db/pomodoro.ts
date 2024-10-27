import { defineStore } from 'pinia'
import { useDBStore } from "./db";
import { useAPIStore } from "../api";
import type { PomodoroDBO, PomodoroRecord, PomodoroTask, PomodotoStatus } from '@/types';
import * as timeUtils from '@/utils/time';
import * as reportUtils from '@/utils/report';
import { useSettingsStore } from "@/stores/settings";
import { ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';

export const usePomodoroDBStore = defineStore('pomoDBStore', () => {
  const db = useDBStore();
  const settings = useSettingsStore();
  const api = useAPIStore().api;


  const streak = ref(0);
  const pomodoroRecords = ref<PomodoroRecord[]>([]);

  function parsePomodoroStatusToDbo(pomo: PomodotoStatus): PomodoroDBO {
    const dt = new Date(pomo.startedAt ?? Date.now());
    return {
      end: pomo.end,
      endedAt: pomo.endedAt,
      breaksDone: pomo.breaksDone.map(b => ({ start: b.start, end: b.end ?? b.start })),
      freeMode: pomo.freeMode,
      datetime: dt,
      deepWork: pomo.deepWork,
      name: pomo.name,
      tasks: pomo.tasks?.map(t => ({ task: t.task, done: t.done })),
      rating: pomo.rating,
      tag: pomo.tag,
      remoteUpdated: 0,
      id: uuidv4(),
    }
  }

  function parsePomodorDboToRecord(p: PomodoroDBO): PomodoroRecord {
    if (p.deepWork === undefined) p.deepWork = true;
    return {
      ...p,
      displayBreaks: timeUtils.getDisplayBreaksRecord(p, p.endedAt ?? 0, settings.generalSettings.showSeconds),
      displayStudy: timeUtils.getDisplayStudyRecord(p, p.endedAt ?? 0, settings.generalSettings.showSeconds),
      report: reportUtils.getPomoReport(p),
    }
  }

  function parsePomodoroStatusToRecord(pomo: PomodotoStatus): PomodoroRecord {
    const p = parsePomodoroStatusToDbo(pomo);
    return parsePomodorDboToRecord(p);
  }

  async function updatePomodoroRecords() {
    pomodoroRecords.value = (
      await db.pomodori.orderBy('datetime')
        .reverse()
        .limit(500)
        .toArray()
    ).map(p => parsePomodorDboToRecord(p));
    updateStreak();
  }

  async function addPomodoroToRecords(pomo: PomodotoStatus): Promise<PomodoroRecord> {
    const dt = new Date(pomo.startedAt ?? Date.now());
    const p = parsePomodoroStatusToDbo(pomo);
    const parsed = parsePomodorDboToRecord(p);
    const first = await db.pomodori.where('datetime').equals(dt).first();
    if (!first) {
      await db.pomodori.add(p);
      pomodoroRecords.value.unshift(parsed);
      updateStreak();
      postRemotePomodoro(p);
    }
    return parsed;
  }
  async function deletePomodoroRecord(id: string) {
    pomodoroRecords.value = pomodoroRecords.value.filter(p => p.id !== id);
    updateStreak();
    await db.pomodori.delete(id);
    await deleteRemotePomodoro(id)
  }

  async function updatePomodoro(id: string, updatePomo: (p: PomodoroDBO) => PomodoroDBO) {
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
  async function postRemotePomodoro(pomodoro: PomodoroDBO) {
    if (!pomodoro.id) return;
    await api.pomodori.postPomodoro(pomodoro);
    await updatePomodoro(pomodoro.id, p => { p.remoteUpdated = 1; return p; });
  }
  async function updateRemotePomodoro(pomodoro: PomodoroDBO) {
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
  async function updateName(id: string, name: string) {
    await updatePomodoro(id, p => { p.name = name; return p; });
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
    const days = pomodoroRecords.value.map(p => getDay(p.datetime));
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
    parsePomodoroStatusToDbo, parsePomodorDboToRecord, parsePomodoroStatusToRecord,
    addPomodoroToRecords,
    deletePomodoroRecord,
    updateTag, updateRating, updateTasks, updateDeepWork, updateName
  };
});