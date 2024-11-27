import { defineStore } from 'pinia'
import { type Break, PomodoroState, type DisplaySession, type StudySession } from '@/types';
import { useSettingsStore } from "@/stores/settings";
import { computed, ref, watch } from 'vue';
import { usePomodoroDBStore } from "@/stores/db/pomodoro";
import { v4 as uuidv4 } from 'uuid';

import * as timeUtils from '@/utils/time';
import config from '@/config/config';
import { io, type Socket } from 'socket.io-client';
import { useAPIStore } from './api';
import { useJuneStore } from './june';

const TICK_TIME = 100;
const SECONDS_MULTIPLIER = 1000;
const MINUTE_MULTIPLIER = 60 * SECONDS_MULTIPLIER * config.timer.speedMultiplier;
const POMO_VERSION = 4;

const SHORT_POMO_THRESHOLD          = MINUTE_MULTIPLIER * config.timer.shortPomoMinutes;
const LONG_BREAK_THRESHOLD          = MINUTE_MULTIPLIER * config.timer.longBreakMinutes;
const FORCE_STOP_THRESHOLD          = MINUTE_MULTIPLIER * config.timer.forceStopMinutes;
const POSTPONE_FORCE_STOP_THRESHOLD = MINUTE_MULTIPLIER * config.timer.postponeforceStopMinutes;
const FORCE_STOP_ALERT_BEFORE       = MINUTE_MULTIPLIER * config.timer.forceStopAlertMinutesBefore;

enum ENotification {
  BreakStart = 'pomo.wav',
  BreakDone = 'break.wav',
  PomodoroDone = 'pomodoro.wav',
}

export const usePomodoroStore = defineStore('pomodoro', () => {

  // ---------- STORES ----------
  const settings = useSettingsStore();
  const pomoDB = usePomodoroDBStore();
  const api = useAPIStore();
  const june = useJuneStore();

  // ---------- Settings ----------
  watch(settings.pomoSettings, () => { // TODO
    if (pomodoroStatus.value?.state === PomodoroState.CREATED)
      createPomodoro();
  });

  // ---------- WebSocket ----------
  let socket: Socket | null = null;
  (async () => {
    socket = io(`${config.api.wsEndpoint}/status`, { auth: { token: await api.getToken() } });
    socket.on('connect', () => {
      socket?.emit('register');
    });
    socket.on('updates', loadStatus);
  })();
  function loadStatus(status: StudySession | null) {
    if (!status) return;

    if (status.lastUpdated)
      status.lastUpdated = new Date(status.lastUpdated);
    if (status.start)
      status.start = new Date(status.start);

    pomodoroStatus.value = status;
    if (interval) clearInterval(interval);
    if (status.state !== PomodoroState.CREATED && status.state !== PomodoroState.TERMINATED) {
      resumePomodoro();
    }
  }
  function saveStatus() {
    savePomodoroStatusToLocalStorage();
    socket?.emit('broadcast', pomodoroStatus.value);
  }


  // ---------- LOCAL STORAGE ----------
  function getPomodoroStatusFromLocalStorage(): StudySession | null {
    const ls = localStorage.getItem('timer-status');
    if (!ls) return null;
    const status = JSON.parse(ls);
    if (status.lastUpdated)
      status.lastUpdated = new Date(status.lastUpdated);
    if (status.start)
      status.start = new Date(status.start);
    return status;
  }
  function savePomodoroStatusToLocalStorage() {
    localStorage.setItem('timer-status', JSON.stringify(pomodoroStatus.value));
  }

  // ---------- Init ----------
  const pomodoroStatus = ref<StudySession>(getPomodoroStatusFromLocalStorage() ?? generatePomoStatus());
  if (pomodoroStatus.value.lastUpdated)
    pomodoroStatus.value.lastUpdated = new Date(pomodoroStatus.value.lastUpdated);
  if (pomodoroStatus.value.start)
    pomodoroStatus.value.start = new Date(pomodoroStatus.value.start);
  let interval: number | undefined;
  const now = ref(Date.now());
  init();

  function init() {
    const pomo = pomodoroStatus.value;
    if (!pomo || pomo.version !== POMO_VERSION || pomo.state === PomodoroState.TERMINATED || pomo.state === PomodoroState.CREATED) {
      createPomodoro();
    } else {
      resumePomodoro();
    }
  }

  // ---------- POMODORO ----------
  function getNow(start: Date | undefined) {
    return now.value - (start?.getTime() ?? 0);
  }

  function resumePomodoro() {
    interval = setInterval(tick, TICK_TIME);
  }
  function generatePomoStatus(defaults?: Partial<StudySession>): StudySession {
    const free = !!settings.pomoSettings.freeMode;
    const totalLength = free ? 0 : settings.pomoSettings.totalLength * MINUTE_MULTIPLIER;
    const breaksLength = free ? 0 : settings.pomoSettings.breaksLength * MINUTE_MULTIPLIER;
    const nrOfBreaks = free ? 0 : settings.pomoSettings.numberOfBreak;

    const newPomo: StudySession = {
      deepWork: true,
      version: POMO_VERSION,
      endScheduled: totalLength,
      breaksDone: [],
      breaksTodo: generateBreaks(totalLength, breaksLength, nrOfBreaks),
      state: PomodoroState.CREATED,
      soundEnd: totalLength <= 1000,
      freeMode: free,
      id: uuidv4(),
    }
    if (defaults) {
      if (defaults.tag) newPomo.tag = defaults.tag;
    }
    return newPomo;
  }
  function createPomodoro(defaults?: Partial<StudySession>) { 
    clearStuff();
    pomodoroStatus.value = generatePomoStatus(defaults);
    // saveStatus();
  }
  function startPomodoro(noCountdown: boolean = false, defaults?: Partial<StudySession>) {
    clearStuff();
    settingUp.value = false;
    if (countdownRunning.value) {
      clearTimeout(countDownTimerout);
      countdownRunning.value = false;
      _startPomodoro(defaults)
    } else {
      if (noCountdown) {
        _startPomodoro(defaults);
      } else {
        startCountdown(() => _startPomodoro(defaults));
      }
    }
  }
  function _startPomodoro(defaults?: Partial<StudySession>) {
    let pomo = pomodoroStatus.value;
    if (!pomo || pomo.state === PomodoroState.TERMINATED) {
      createPomodoro(defaults);
    }
    pomo = pomodoroStatus.value;
    pomo.start = new Date();
    pomo.state = PomodoroState.STUDY;
    pomo.endOriginal = pomo!.endScheduled;
    pomo.endForced = FORCE_STOP_THRESHOLD;

    interval = setInterval(tick, TICK_TIME);
    settingUp.value = false;
    saveStatus();
  }
  function stopPomodoro(forcedStop: number | undefined = undefined) {
    const pomo = pomodoroStatus.value;
    if (countdownRunning.value) {
      clearTimeout(countDownTimerout);
      countdownRunning.value = false;
      return;
    }

    if (pomo) {
      const now = forcedStop === undefined ? getNow(pomo.start) : forcedStop;
      if (forcedStop === undefined) {
        delete pomo.endForced;
      }

      pomo.endActual = now;
      if (pomo.state === PomodoroState.BREAK) {
        const lastBreak = pomo.breaksDone.pop();
        if (lastBreak) {
          pomo.endActual = lastBreak.start;
          if ((pomo.endOriginal ?? 0) < pomo.endScheduled) {
            pomo.endActual = Math.max(pomo.endOriginal ?? 0, lastBreak.start)
          }
        }
      }
      pomo.state = PomodoroState.TERMINATED;
      if (pomo.endActual > SHORT_POMO_THRESHOLD) {
        pomoDB.savePomodoro(pomo).then((newPomo: StudySession) => {
          if (pomo.state === PomodoroState.TERMINATED && pomo.id === newPomo.id)
            pomo.report = newPomo.report;
        });
      }
      saveStatus();
      june.trackStudySession(pomo.endActual)
    }
  }
  function togglePauseStudy(noCountdown: boolean = false) {
    const pomo = pomodoroStatus.value;
    if (!pomo) return;

    if (pomo.state === PomodoroState.STUDY) {
      pause();
    } else if (pomo.state === PomodoroState.BREAK) {
      study(noCountdown);
    }
  }
  function pause() {
    const pomo = pomodoroStatus.value;
    if (!pomo) {
      stopPomodoro();
      return;
    }
    adjustPomo();

    const now = getNow(pomo.start);
    pomo.state = PomodoroState.BREAK;

    const nextBreak = pomo.breaksTodo?.[0]; // get next break
    if (nextBreak && 2 * nextBreak.start - (nextBreak.end ?? now) < now) {  // if next break is close to now (within one break distance)
      nextBreak.end = now + ((nextBreak.end ?? now) - nextBreak.start); // shift break
      nextBreak.start = now;
      pomo.breaksDone.push(pomo.breaksTodo?.shift()!); // Move break from todo to done
    } else {
      pomo.breaksDone.push({ start: now, end: now, soundStart: true, soundEnd: true });     // create new break
    }

    _postponeForceStop();
    saveStatus();
  }
  function study(noCountdown: boolean = false) {
    const pomo = pomodoroStatus.value;
    if (!pomo) {
      stopPomodoro();
      return;
    }
    if (pomo.onLongBreak) {
      const defaults: Partial<StudySession> = { tag: pomo.tag };
      stopPomodoro();
      startPomodoro(noCountdown, defaults);
      return;
    }
    adjustPomo();

    const now = getNow(pomo.start);
    pomo.state = PomodoroState.STUDY; // set state to study

    const lastBreak = pomo.breaksDone[pomo.breaksDone.length - 1]; // get last break and set the end 
    lastBreak.end = now;

    if (lastBreak.end - lastBreak.start < 5000) {
      pomo.breaksDone.pop();
      pauseShortSnack.value = true;
    }

    _postponeForceStop();
    saveStatus();
  }

  function postponeForceStop() {
    _postponeForceStop();
    saveStatus();
  }

  function _postponeForceStop() {
    const pomo = pomodoroStatus.value;
    if (!pomo || !pomo.endForced) return;
    const newEndForced = getNow(pomo.start) + FORCE_STOP_THRESHOLD
    if (pomo.endForced < newEndForced) {
      pomo.endForced = newEndForced;
    }
  }

  
  function tick() { 
    const pomo = pomodoroStatus.value
    if (pomo && (pomo.state === PomodoroState.BREAK || pomo.state === PomodoroState.STUDY)) {
      adjustPomo();
    } else {
      if (interval)
        clearInterval(interval);
    }
    now.value = Date.now(); // TOMOVE
  }

  function adjustPomo() {
    const pomo = pomodoroStatus.value;
    if (!pomo) {
      stopPomodoro();
      return;
    }
    const now = getNow(pomo.start);

    if (pomo.endForced && now > pomo.endForced) {
      stopPomodoro(FORCE_STOP_THRESHOLD);
      return
    }

    if (pomo.endScheduled < now) {

      // add next slot
      if (!freeMode.value && pomo.state === PomodoroState.BREAK) {
        const pSettings = settings.pomoSettings;
        const pauseLength = (pSettings.breaksLength * MINUTE_MULTIPLIER) / pSettings.numberOfBreak;
        const studyLength = ((pSettings.totalLength - pSettings.breaksLength) * MINUTE_MULTIPLIER) / (pSettings.numberOfBreak + 1);

        const currBreak = pomo.breaksDone[pomo.breaksDone.length - 1];
        const currBreakLength = (currBreak.end ?? currBreak.start) - currBreak.start;
        if (currBreakLength < pauseLength) {
          currBreak.end = currBreak.start + pauseLength;
        }
        pomo.endScheduled = (currBreak.end ?? currBreak.start) + studyLength;
      } else {
        pomo.endScheduled = now;
        if (!pomo.soundEnd) {
          pomo.soundEnd = true;
          playNotification(ENotification.PomodoroDone);
        }
      }
    }

    if (pomo.state === PomodoroState.BREAK) {                           // PAUSE
      const currBreak = pomo.breaksDone[pomo.breaksDone.length - 1];    // get current break
      if (currBreak.end) {                                              // if break is done
        let toSteal = now - currBreak.end;                              // time to steal from next break
        if (toSteal > 0) {                                              // if there is time to stea
          currBreak.end = now;                                          // set current break end to now ( if you are in a new break you are moving the break end every second)
          if (!currBreak.soundEnd) {                                    // if sound is not played yet
            currBreak.soundEnd = true;                                  // set sound played to true
            playNotification(ENotification.BreakDone);                  // play sound 
          }
        }
        while (toSteal > 0) {                                          // while there is time to steal
          const nextPause = pomo.breaksTodo?.[0];                        // get next break
          if (!nextPause) break;
          nextPause.start += toSteal;

          if (nextPause.end && nextPause.start > nextPause.end) {
            toSteal = nextPause.start - nextPause.end;
            pomo.breaksTodo?.shift();
          } else {
            toSteal = 0;
          }

        }
      } else {
        currBreak.end = now;
      }

      // check pausa lunga
      if (pomo.onLongBreak || currBreak.end - currBreak.start > LONG_BREAK_THRESHOLD) {
        pomo.onLongBreak = true;
        pomo.breaksTodo = [];
        pomo.endScheduled = now;
      }

    } else if (pomo.state === PomodoroState.STUDY) {                                    // STUDY
      let nextBreak = pomo.breaksTodo?.[0];
      let curEndProgress = now

      if (nextBreak && curEndProgress > nextBreak.start && !nextBreak.soundStart) {
        nextBreak.soundStart = true;
        playNotification(ENotification.BreakStart);
      }

      if (nextBreak && curEndProgress > nextBreak.start) {
        nextBreak.end = curEndProgress + ((nextBreak.end ?? now) - nextBreak.start)
        nextBreak.start = now;
        curEndProgress = nextBreak.end;

        let nextNextBreak = pomo.breaksTodo?.[1];
        while (nextNextBreak) {
          if (curEndProgress > nextNextBreak.start) {
            nextBreak.end = (nextBreak.end ?? nextBreak.start) + breakLength(nextNextBreak);
            pomo.breaksTodo?.splice(1, 1);
            nextNextBreak = pomo.breaksTodo?.[1];
          } else {
            nextNextBreak = undefined;
          }
        }
      }
    }
  }
  function clearStuff() {
    if (interval) {
      clearInterval(interval);
    }
  }
  function getNowInPercentage() {
    const pomo = pomodoroStatus.value;
    if (!pomo || pomo.state === PomodoroState.CREATED)
      return 0;
    return 100 * Math.min(getNow(pomo.start) / pomo.endScheduled, 1);
  }

  // ---------- Utils ----------
  function generateBreaks(remainingLenght: number, breaksLength: number, nrOfBreaks: number) {
    if (breaksLength <= 0) return [];

    const singleBreakLength = breaksLength / nrOfBreaks;
    const singleStudyPeriod = (remainingLenght - breaksLength) / (nrOfBreaks + 1);
    const breaks: Break[] = [];
    for (let i = 0; i < nrOfBreaks; i++) {
      const start = singleStudyPeriod + (i * (singleBreakLength + singleStudyPeriod));
      breaks.push({ start, end: start + singleBreakLength })
    }
    return breaks;
  }
  function getBreaks() {
    const pomo = pomodoroStatus.value;
    if (!pomo) return [];
    return [
      ...(pomo?.breaksDone.map(x => ({ ...x, done: true })) ?? []),
      ...(pomo?.breaksTodo?.map(x => ({ ...x, done: false })) ?? [])
    ];
  }
  function breakLength(b: Break) {
    return (b.end ?? b.start) - b.start;
  }
  function getCurrentStatePercentage() {
    const pomo = pomodoroStatus.value;
    if (!pomo) return 0;

    const now = getNow(pomo.start);
    let lastPoint = 0;
    let nextPoint = pomo.endScheduled;

    if (pomo.state === PomodoroState.STUDY) {
      lastPoint = pomo.breaksDone.at(-1)?.end ?? 0;
      nextPoint = pomo.breaksTodo?.[0]?.start ?? pomo.endScheduled;
    } else if (pomo.state === PomodoroState.BREAK) {
      const currBreak = pomo.breaksDone.at(-1);
      lastPoint = currBreak?.start ?? 0;
      nextPoint = currBreak?.end ?? now;
    }

    return Math.min((now - lastPoint) / (nextPoint - lastPoint), 100);
  }

  // ---------- Time ----------
  function getDisplayBreaksCurrent(): DisplaySession[] {
    const pomo = pomodoroStatus.value;
    if (!pomo) return [];
    const breaks = getBreaks();
    const now = getNow(pomo.start);
    return timeUtils.parseDisplaySession(breaks, now, pomo.endScheduled, settings.generalSettings.showSeconds);
  }
  function getDisplayStudyCurrent(): DisplaySession[] {
    const pomo = pomodoroStatus.value;
    if (!pomo || pomo.state === PomodoroState.CREATED) return [];
    return timeUtils.getDisplayStudyRecord(
      pomo,
      pomo.endScheduled,
      settings.generalSettings.showSeconds,
      getNow(pomo.start)
    );
  }
  function timeSinceStartFormatted() {
    const pomo = pomodoroStatus.value
    if (!pomo) return '0:00';
    const start = pomo.start ? Math.floor(getNow(pomo.start) / SECONDS_MULTIPLIER) : 0;
    return timeUtils.timeFormatted(start);
  }
  function timeInCurrentBreakFormatted(html: boolean = true, showSeconds: boolean = true) {
    const pomo = pomodoroStatus.value
    const startLastPause = pomo?.breaksDone.at(-1)?.start;
    if (!pomo || !startLastPause) return '0:00';
    const startS = Math.floor(getNow(pomo.start) / SECONDS_MULTIPLIER)
    const startLastPauseS = Math.floor(startLastPause / SECONDS_MULTIPLIER)
    return timeUtils.timeFormatted(startS - startLastPauseS, { html, showSeconds });
  }
  function timeInCurrentStudyFormatted(html: boolean = true, showSeconds: boolean = true) {
    const pomo = pomodoroStatus.value
    if (!pomo) return '0:00';
    const startLastStudy = pomo?.breaksDone.at(-1)?.end ?? 0;
    const startS = Math.floor(getNow(pomo.start) / SECONDS_MULTIPLIER)
    const startLastStudyS = Math.floor(startLastStudy / SECONDS_MULTIPLIER)
    return timeUtils.timeFormatted(startS - startLastStudyS, { html, showSeconds });
  }
  function timeFormatted(seconds: number, options: {
    html?: boolean,
    showSeconds?: boolean,
    format?: 'hms' | 'semicolon'
  } = {}) {
    return timeUtils.timeFormatted(seconds, options);
  }
  function parseTime(t: number) {
    return timeUtils.parseTime(t);
  }

  // ---------- Notification ----------
  let oneSoundLimit = false;

  async function playNotification(type: ENotification) {
    if (Notification.permission === "granted") {
      let text = '';
      if (ENotification.BreakStart === type) text = 'Time to break';
      else if (ENotification.BreakDone === type) text = 'Time to study';
      else if (ENotification.PomodoroDone === type) text = 'Nice job!';

      let body = '';
      if (ENotification.BreakStart === type) text = 'You studied enough, take a break!';
      else if (ENotification.BreakDone === type) text = 'Your break is over, get back to work!';
      else if (ENotification.PomodoroDone === type) text = 'You completed your pomodoro!';

      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(text, { body });
      });
    }

    // sound
    if (!oneSoundLimit && !settings.generalSettings.soundMute) {
      const audio = new Audio(`/sounds/${type}`);
      let volume = settings.generalSettings.soundVolume;
      if (volume === undefined) volume = 0.5;
      audio.volume = volume / 100;
      audio.play();
      oneSoundLimit = true;
      setTimeout(() => oneSoundLimit = false, 1000);
    }
  }

  // ---------- COUNTDOWN ----------
  const countdownRunning = ref(false);
  let countDownTimerout = -1;
  function startCountdown(callback: () => void, ms: number = 3000) {
    if (countdownRunning.value) return;
    if (settings.generalSettings.disableCountdown) {
      callback();
    } else {
      countdownRunning.value = true;
      countDownTimerout = setTimeout(() => {
        countdownRunning.value = false;
        callback();
        countDownTimerout = -1;
      }, ms);
    }
  }

  // ---------- SETUP ----------
  const settingUp = ref(false);
  function setup() {
    settingUp.value = true;
  }
  function exitSetup() {
    settingUp.value = false;
  }


  // ---------- COMPUTED ----------
  const forceStopAlert = computed(() => going.value && pomodoroStatus.value?.endForced && (pomodoroStatus.value?.endForced - FORCE_STOP_ALERT_BEFORE <= getNow(pomodoroStatus.value?.start)));
  const created = computed(() => pomodoroStatus.value?.state === PomodoroState.CREATED);
  const studing = computed(() => pomodoroStatus.value?.state === PomodoroState.STUDY);
  const pauseing = computed(() => pomodoroStatus.value?.state === PomodoroState.BREAK);
  const terminated = computed(() => pomodoroStatus.value?.state === PomodoroState.TERMINATED);
  const going = computed(() => studing.value || pauseing.value || countdownRunning.value);
  const onLongPause = computed(() => !terminated.value && (pomodoroStatus.value?.onLongBreak ?? false));
  const shortPomo = computed(() => terminated && ((pomodoroStatus.value.endActual ?? 0) < SHORT_POMO_THRESHOLD));
  const timeToBreak = computed(() => {
    if (!studing.value) return false;
    const pomo = pomodoroStatus.value;
    const nextStart = pomo?.breaksTodo?.[0]?.start;
    if (!pomo || !nextStart) return false;
    return nextStart - 500 < getNow(pomo?.start);
  });
  const timeToStudy = computed(() => {
    if (!pauseing.value) return false;
    const pomo = pomodoroStatus.value;
    const nextStop = pomo?.breaksDone.at(-1)?.end;
    if (!pomo || !nextStop) return false;
    return nextStop - 500 < getNow(pomo?.start);
  });
  const displayBreaks = computed(getDisplayBreaksCurrent);
  const displayStudy = computed(getDisplayStudyCurrent);
  const percentage = computed(getNowInPercentage);
  const timeSinceStart = computed(() => timeSinceStartFormatted());
  const timeInCurrentBreak = computed(() => timeInCurrentBreakFormatted());
  const timeInCurrentStudy = computed(() => timeInCurrentStudyFormatted());
  const percInCurrentState = computed(() => getCurrentStatePercentage());
  const timeInTitle = computed(() => {
    if (!going.value) return 'StudyBuddy';
    return pauseing.value ? `StudyBuddy | ⏸ ${timeInCurrentBreakFormatted(false, true)}` : `StudyBuddy | ▶ ${timeInCurrentStudyFormatted(false, true)}`;
  })
  const done = computed(() => {
    const pomo = pomodoroStatus.value;
    if (!pomo) return false;
    return pomo.endScheduled <= getNow(pomo.start);
  });
  const freeMode = computed(() => pomodoroStatus.value?.freeMode ?? false);

  const pauseShortSnack = ref(false);

  // ---------- RETURN ----------
  return {
    pomodoroStatus, saveStatus,
    init,
    createPomodoro, startPomodoro, stopPomodoro, togglePauseStudy, pause, study, resumePomodoro,
    getBreaks, percentage, displayBreaks, displayStudy,
    created, going, studing, pauseing, terminated, done, freeMode, timeToBreak, timeToStudy, onLongPause, shortPomo,
    timeSinceStart, timeInCurrentBreak, timeInCurrentStudy, percInCurrentState,
    timeFormatted, timeInTitle,
    startCountdown, countdownRunning,
    parseTime,
    setup, settingUp, exitSetup,
    pauseShortSnack,
    forceStopAlert, postponeForceStop, SHORT_POMO_THRESHOLD
  }

})