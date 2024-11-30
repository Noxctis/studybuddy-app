<template>
  <div class="blur finish-box">
    <div v-if="pomo.shortPomo">
      <p class="pause font-press text-center">{{ $t("pause.pomoDoneShort") }}</p>
      <h3 class="text-primary font-press text-center">{{ $t("pause.goodjobShort") }}</h3>
    </div>
    <div v-else-if="pomo.pomodoroStatus.endForced">
      <p class="pause font-press text-center">{{ $t("pause.endForced") }}</p>
      <h3 class="text-primary font-press text-center">{{ $t("pause.goodjobForced") }}</h3>
    </div>
    <div v-else-if="pomo.pomodoroStatus.report && pomo.pomodoroStatus.report.points < 0.5">
      <p class="pause font-press text-center">{{ $t("pause.pomoDoneBad") }}</p>
      <h3 class="text-primary font-press text-center">{{ $t("pause.goodjobBad") }}</h3>
    </div>
    <div v-else>
      <p class="pause font-press text-center">{{ $t("pause.pomoDone") }}</p>
      <h2 class="text-primary font-press text-center">{{ $t("pause.goodjob") }}</h2>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { usePomodoroStore } from '@/stores/pomodoro';
const pomo =  usePomodoroStore();
</script>

<style scoped lang="scss">
.finish-box {
  padding: 1.5rem;
  position: relative;
  border-radius: 1rem;
  max-width: 900px;

  h2 {
    font-size: 3rem;
  }

  h3 {
    font-size: 2rem;
  }

  @media (max-width: 600px) {
    padding: 1rem;

    p {
      font-size: 0.7rem;
    }

    h2, h3 {
      font-size: 1rem;
    }
  }
}
</style>