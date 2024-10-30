import axios from 'axios';
import type { StudySession } from '@/types';

export function getPomodoriAPI(endpoint: string, getOptions: () => Promise<{ headers: { Authorization: string; }; }>) {
  const API_ENDPOINT = `${endpoint}/pomodori`;

  function parsePomo(pomo: StudySession): StudySession {
    pomo.start = new Date(pomo.start!);
    if (pomo.lastUpdate) pomo.lastUpdate = new Date(pomo.lastUpdate);
    return pomo;
  }

  async function getPomodoro(pomoId: string): Promise<StudySession> {
    const p = (await axios.get(`${API_ENDPOINT}/${pomoId}`, await getOptions())).data;
    return parsePomo(p);
  }

  async function getPomodoriUpdates(fromDate: Date): Promise<StudySession[]> {
    const pp = (await axios.get(`${API_ENDPOINT}/updates/${fromDate.toISOString()}`, await getOptions())).data;
    return pp.map(parsePomo);
  }

  async function postPomodoro(pomodoro: StudySession): Promise<string> {
    return (await axios.post(API_ENDPOINT, pomodoro, await getOptions())).data;
  }

  async function updatePomodoro(pomodoro: StudySession): Promise<void> {
    await axios.put(`${API_ENDPOINT}/${pomodoro.id}`, pomodoro, await getOptions());
  }

  async function deletePomodoro(pomoId: string): Promise<void> {
    await axios.delete(`${API_ENDPOINT}/${pomoId}`, await getOptions());
  }

  return { getPomodoro, getPomodoriUpdates, postPomodoro, updatePomodoro, deletePomodoro }
}