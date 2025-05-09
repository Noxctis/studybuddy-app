<template>
  <!-- MAIN MENU -->
  <v-navigation-drawer permanent :rail="!!exam">
    <template #prepend>
      <v-list-item
        prepend-avatar="/images/logo.png"
        to="/"
        nav
      >
        <template #default>
          <v-list-item class="pa-0">
            <h1 class="title font-weight-bold text-primary">
              StudyBuddy
              <span class="bg-primary pa-1">BETA</span>
            </h1>
          </v-list-item>
        </template>
      </v-list-item>
    </template>

    <v-divider />

    <MenuList
      :model-value="exams"
      @update:model-value="updateExams($event)"
      :elements-name="t('exam')"
      :are-exams="true"
      base-url="exam"
    />

    <template #append>
      <PomodoroControls v-if="!exam" />
    </template>
  </v-navigation-drawer>

  <!-- EXAM MENU -->
  <v-navigation-drawer permanent v-if="exam">
    <template #prepend>
      <v-list-item :to="`/exam/${exam.name}`" nav>
        <h1>{{ exam?.name }}</h1>
      </v-list-item>
    </template>

    <v-divider />

    <MenuList
      :model-value="chapters"
      @update:model-value="updateChapters($event)"
      :elements-name="t('chapter')"
      :choose-color="false"
      :choose-icon="false"
      :color="exam?.color ?? 'primary'"
      :base-url="`exam/${exam.name}`"
    />

    <template #append>
      <PomodoroControls />
    </template>
  </v-navigation-drawer>

  <UserSettings v-model="openUserSettings" />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useStateStore } from '@/stores/state'
import { useSettingsStore } from '@/stores/settings'
import { useI18n } from 'vue-i18n'

import MenuList from '@/components/Menus/MenuList.vue'
import UserSettings from '@/components/Popup/UserSettings.vue'
import PomodoroControls from '@/components/Pomodoro/PomodoroControls.vue'

import type { Chapter, Exam } from '@/types'

const { t } = useI18n()          // ⬅ pull in `t()`

const route = useRoute()
const state = useStateStore()
const settings = useSettingsStore()
const openUserSettings = ref(false)

const exam = computed<Exam | undefined>(
  () =>
    route.params.exam
      ? state.getExam(route.params.exam as string)
      : undefined
)
const exams = computed(() => state.getExams())
const chapters = computed(() => exam.value?.chapters ?? [])

function updateExams(newExams: Exam[]) {
  state.updateExams(newExams)
}

function updateChapters(newChapters: Chapter[]) {
  if (exam.value) {
    state.updateChapters(exam.value, newChapters)
  }
}

// optional export/import handlers
function exportData() {
  state.downloadData()
}
function importData() {
  state.uploadData()
}
</script>

<style scoped lang="scss">
.title {
  font-size: 1.2rem !important;
  span {
    border-radius: 0.5rem;
  }
}
</style>
