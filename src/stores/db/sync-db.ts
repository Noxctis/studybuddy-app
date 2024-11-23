import { defineStore } from 'pinia'
import { EntitiesEnum, useDBStore } from "./db";
import { ref } from 'vue';
import { useAPIStore } from '../api';
import { usePomodoroDBStore } from './pomodoro';

export const useSyncDBStore = defineStore('sync-db', () => {
  const db = useDBStore();
  const pomoStore = usePomodoroDBStore();
  const api = useAPIStore().api;

  const synced = ref<boolean>(false);

  async function sync() {


    const synching = [
      syncExams(),
      syncPomodori(),
    ];

    await Promise.all(synching);
    synced.value = true;
  }

  async function syncExams() {
    const lastUpdated = await db.getLastUpdated(EntitiesEnum.exams);
    const newUpdatedDate = new Date();
    const newExams = await api.exams.getExamUpdates(lastUpdated);
    for (const e of newExams) {
      await db.exams.put(e, e.id);
    }
    await db.setLastUpdated(EntitiesEnum.exams, newUpdatedDate);
  }

  async function syncPomodori(loadFull = false) {
    await syncPomodoriToRemote(loadFull);
    await syncPomodoriFromRemote(loadFull);
    pomoStore.updatePomodoroRecords();
  }

  async function syncPomodoriToRemote(loadFull = false) {
    const pomi = loadFull ? 
      await db.pomodori.toArray() :
      await db.pomodori.where('remoteUpdated').notEqual(1).toArray();

    const nAtATime = 100;
    for (let i = 0; i < pomi.length; i += nAtATime) {
      const batch = pomi.slice(i, i + nAtATime);
      const newPomi = await api.pomodori.upsertPomodori(batch);
      const oldIds = batch.map(p => p.id);
      const newIds = newPomi.map(p => p.id);
      const toDelete = oldIds.filter(id => id && !newIds.includes(id)) as string[];
      for (const id of toDelete) await db.pomodori.delete(id);
      for (const newPomo of newPomi) await db.pomodori.put(newPomo, newPomo.id);
    }
  }

  async function syncPomodoriFromRemote(loadFull = false) {
    const lastUpdated = loadFull ? new Date('1970-01-01') : await db.getLastUpdated(EntitiesEnum.pomodori);
    const newUpdatedDate = new Date(); // IMPORTANT: Crate daate before update
    const newPomodori = await api.pomodori.getPomodoriUpdates(lastUpdated);
    for (const p of newPomodori) {
      if (p.deleted) {
        await db.pomodori.delete(p.id!);
      } else {
        await db.pomodori.put(p, p.id!)
      }
    }
    await db.setLastUpdated(EntitiesEnum.pomodori, newUpdatedDate);
  }

  return { sync, synced, syncPomodori };
});
