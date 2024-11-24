<template>
  <v-dialog width="500" v-model="pomo.forceStopAlert">
    <v-card class="py-5">
      <v-card-title class="text-center">
        <span>{{ $t('longAway') }}</span>
      </v-card-title>
      <v-card-text class="text-center pt-0">
        <p>Your session has been running for a while, if you don't do anything it will automatically stop in {{ minutesToEnd }} minutes.</p>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="flat" color="primary" @click="pomo.postponeForceStop()">{{ $t('yes') }}</v-btn>
        <v-spacer />
      </v-card-actions>
    </v-card>
  </v-dialog>

</template>

<script lang="ts" setup>
import { usePomodoroStore } from '@/stores/pomodoro';
import { computed, ref } from 'vue';
const pomo = usePomodoroStore();
const now = ref(new Date().getTime());
setInterval(() => { now.value = new Date().getTime() }, 100);
const minutesToEnd = computed(() => {
  const timeOfEnd = new Date((pomo.pomodoroStatus.start?.getTime() ?? 0) + (pomo.pomodoroStatus.endForced ?? 0));
  const diff = timeOfEnd.getTime() - now.value;
  if (diff <= 0) return 0;
  return Math.floor(diff / (1000 * 60));
});
</script>