<template>
  <v-footer app class="bg-black pa-0">
    <div class="progress" :style="{
        background: `linear-gradient(to right, ${barColor} ${percentage}%, black ${percentage}%)`,
      }">
      <div class="pomodori">
        <v-icon class="icon" v-for="i in cProgress.pomodoriDone" :key="i" color="#FFD700">mdi-food-apple</v-icon>
        <v-icon class="icon" v-for="i in cProgress.studyDone" :key="i" color="red" size="x-small">mdi-food-apple</v-icon>
      </div>

      <v-sheet
        class="controls-popup d-flex"
        :height="controlHeight"
        :width="controlWidth"
        :color="controlColor">
        <div class="controls">
          <v-btn
            class="control-btn btn-play-pause"
            color="secondary"
            :icon="showBreakCommands ? 'mdi-skip-next' : 'mdi-stop'"
            v-if="cProgress.paused || showBreakCommands"
            @click="showBreakCommands ? nextState() : stop()"
            size="x-small"
          />
          <v-btn
            class="control-btn btn-play-pause"
            :class="controlsMax ? '' : (cProgress.status === EPomodoroStatus.Study ? 'pause-btn' : 'coffee-btn')"
            :color="inBreak ? 'brown' : 'secondary'"
            :icon="mainControlIcon"
            @click="toggle()"
          />
          <v-btn
            class="control-btn btn-play-pause"
            color="secondary"
            icon="mdi-cog"
            v-if="cProgress.paused || showBreakCommands"
            @click="settingsOpen = true"
            size="x-small"
          />
        </div>
        <div v-if="nextStateAvailable">
          <p class="text-center">
            {{ pomodoroDone !== null
              ? (pomodoroDone ? t('pomodoro') : t('pomo'))
              : t('work') }}
          </p>
        </div>
      </v-sheet>

      <p class="mx-3 timer">{{ timerText }}</p>
    </div>

    <v-dialog v-model="settingsOpen" width="500">
      <v-card v-on:keyup.enter="saveSettings()">
        <v-toolbar dark color="primary">
          <v-btn icon dark @click="closeSettings()"> <v-icon>mdi-close</v-icon> </v-btn>
          <v-toolbar-title>{{ t('popup.settings.title') }}</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-toolbar-items>
            <v-btn variant="text" @click="saveSettings()">
              {{ t('save') }}
            </v-btn>
          </v-toolbar-items>
        </v-toolbar>
        <v-card-text>
          <v-container>
            <v-row>
              <v-col cols="12">
                <v-text-field
                  v-model="tempSettings.studyLength"
                  type="number"
                  :label="t('pomo.studyLenght')"
                  required
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="tempSettings.shortBreakLength"
                  type="number"
                  :label="t('pomo.shortBreakLenght')"
                  required
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="tempSettings.longBreakLength"
                  type="number"
                  :label="t('pomo.longBreakLenght')"
                  required
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="tempSettings.nrStudy"
                  type="number"
                  :label="t('pomo.longBreakAfter')"
                  required
                />
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-footer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useStateStore } from "@/stores/state"
import { useSettingsStore } from "@/stores/settings"
import { EPomodoroStatus } from '@/types'
import { useTheme } from 'vuetify'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()            // ← pull in `t()`
const state = useStateStore()
const settingsStore = useSettingsStore()
const theme = useTheme()

enum ESound {
  PomoDone = 'pomo.wav',
  PomodoroDone = 'pomodoro.wav',
  BreakDone = 'break.wav',
}

// ---------- SETTINGS ------------
const settings = ref(settingsStore.settingsWithDefaults.pomodoro!.pomodoroSettings!)
const tempSettings = ref({ ...settings.value })
const settingsOpen = ref(false)

function saveSettings() {
  tempSettings.value.studyLength = +tempSettings.value.studyLength
  tempSettings.value.longBreakLength = +tempSettings.value.longBreakLength
  tempSettings.value.shortBreakLength = +tempSettings.value.shortBreakLength
  tempSettings.value.nrStudy = +tempSettings.value.nrStudy
  settings.value = { ...tempSettings.value }
  settingsOpen.value = false
  settingsStore.updatePomodoroSettings(settings.value)
}

function closeSettings() {
  tempSettings.value = { ...settings.value }
  settingsOpen.value = false
}

const barColor = computed(() => {
  if (cProgress.value.paused) return theme.current.value.colors.warning
  return cProgress.value.status === EPomodoroStatus.Study
    ? theme.current.value.colors.surface
    : theme.current.value.colors.secondary
})

// ---------- TIMER ------------
const cProgress = ref(state.getPomodoroStatus() ?? {
  pomodoroRunning: false,
  msPassed: 0,
  msStarted: 0,
  paused: true,
  status: EPomodoroStatus.Study,
  studyDone: 0,
  pomodoriDone: 0,
})

const REFRESH_RATE = 25
const currentMs = ref(0)
const timerTime = ref(0)
const percentage = ref(0)
const nextStateAvailable = ref(false)
const showBreakCommands = ref(false)

const controlsMax = computed(() => cProgress.value.paused || nextStateAvailable.value || showBreakCommands.value)
const inBreak = computed(() => !nextStateAvailable.value && !cProgress.value.paused && cProgress.value.status !== EPomodoroStatus.Study)
const pomodoroDone = ref<boolean | null>(null)

const controlHeight = computed(() => {
  if (!controlsMax.value) return '0rem'
  if (nextStateAvailable.value) return '6.2rem'
  return '4.5rem'
})
const controlWidth = computed(() => (cProgress.value.paused ? '12rem' : '10rem'))
const controlColor = computed(() => {
  if (pomodoroDone.value === null) return ''
  if (pomodoroDone.value) return '#AA5200'
  return 'red'
})
const mainControlIcon = computed(() => {
  if (nextStateAvailable.value) return 'mdi-skip-next'
  if (cProgress.value.paused) return 'mdi-play'
  if (cProgress.value.status === EPomodoroStatus.Study) return 'mdi-pause'
  return 'mdi-coffee'
})

const currentLength = computed(() => {
  const mult = 60
  switch (cProgress.value.status) {
    case EPomodoroStatus.Study:
      return settings.value.studyLength * mult
    case EPomodoroStatus.ShortBreak:
      return settings.value.shortBreakLength * mult
    case EPomodoroStatus.LongBreak:
      return settings.value.longBreakLength * mult
  }
})

function formatTime(time: number) {
  const minutes = Math.floor(time / 60)
  const seconds = time % 60
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
}

const timerText = computed(() => `${formatTime(Math.floor(timerTime.value / 1000))} / ${formatTime(currentLength.value)}`)

const maxInactiveTime = 1000 * 60 * 60 * 8
setInterval(() => {
  if (cProgress.value.pomodoroRunning && currentMs.value - cProgress.value.msStarted > maxInactiveTime) {
    stop()
    return
  }
  currentMs.value = Date.now()
  timerTime.value = cProgress.value.msPassed + (cProgress.value.paused ? 0 : currentMs.value - cProgress.value.msStarted)
  percentage.value = (timerTime.value / 1000 / currentLength.value) * 100

  if (!nextStateAvailable.value && timerTime.value / 1000 > currentLength.value) {
    showBreakCommands.value = false
    nextStateAvailable.value = true

    if (cProgress.value.status === EPomodoroStatus.Study) {
      if (cProgress.value.studyDone + 1 >= settings.value.nrStudy) {
        pomodoroDone.value = true
        playSound(ESound.PomodoroDone)
      } else {
        pomodoroDone.value = false
        playSound(ESound.PomoDone)
      }
    } else {
      playSound(ESound.BreakDone)
    }
  }
}, REFRESH_RATE)

function nextState() {
  showBreakCommands.value = false
  if (cProgress.value.status === EPomodoroStatus.Study) {
    cProgress.value.studyDone += 1
    if (cProgress.value.studyDone >= settings.value.nrStudy) {
      cProgress.value.status = EPomodoroStatus.LongBreak
      cProgress.value.pomodoriDone += 1
      cProgress.value.studyDone = 0
    } else {
      cProgress.value.status = EPomodoroStatus.ShortBreak
    }
  } else {
    cProgress.value.status = EPomodoroStatus.Study
  }
  cProgress.value.msPassed = 0
  cProgress.value.msStarted = Date.now()
  cProgress.value.paused = false
  nextStateAvailable.value = false
  pomodoroDone.value = null
}

function startPomodoro() {
  cProgress.value.msPassed = 0
  cProgress.value.status = EPomodoroStatus.Study
  cProgress.value.studyDone = 0
  play()
  cProgress.value.pomodoroRunning = true
}

function play() {
  cProgress.value.msStarted = Date.now()
  cProgress.value.paused = false
}

function pause() {
  cProgress.value.paused = true
  cProgress.value.msPassed += Date.now() - cProgress.value.msStarted
}

function stop() {
  cProgress.value.msPassed = 0
  cProgress.value.msStarted = 0
  cProgress.value.paused = true
  cProgress.value.status = EPomodoroStatus.Study
  cProgress.value.studyDone = 0
  cProgress.value.pomodoriDone = 0
  cProgress.value.pomodoroRunning = false
  state.removePomodoroStatus()
}

function toggle() {
  if (inBreak.value) {
    showBreakCommands.value = !showBreakCommands.value
  } else if (!cProgress.value.pomodoroRunning) {
    startPomodoro()
  } else if (nextStateAvailable.value) {
    nextState()
  } else if (cProgress.value.paused) {
    play()
  } else {
    pause()
  }
  state.setPomodoroStatus(cProgress.value)
}

function playSound(sound: ESound) {
  new Audio(`/sounds/${sound}`).play()
}
</script>

<style lang="scss">
</style>
