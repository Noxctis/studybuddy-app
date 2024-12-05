<template>
  <v-card class="pomo-details-end blur blur-strong">
    <PomodoroDone :pomo="pomo.pomodoroStatus" />
    <div class="pomo-details-actions">
      <v-btn
        color="primary"
        class="pomo-edit-btn ma-2"
        variant="flat"
        @click="emits('done')">{{ $t('done') }}</v-btn>
    </div>
  </v-card>
</template>
<script lang="ts" setup>
import PomodoroDone from '../Pomodoro/PomodoroDone/PomodoroDone.vue';
import { usePomodoroStore } from '@/stores/pomodoro';
const pomo =  usePomodoroStore();
const emits = defineEmits<
  (e: 'done') => void
>()
</script>
<style scoped lang="scss">
.pomo-details-end {
  border-radius: 1rem;
  display: flex;
  flex-direction: column;
}
.pomo-details-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin: 0.5rem;
}
</style>

