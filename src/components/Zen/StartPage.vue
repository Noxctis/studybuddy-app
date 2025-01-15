<template>
  <div class="created-box">
    <div class="blur pa-7 created-box-wrapper">
      <Info :text="$t('info.welcome')" class="info-welcome" />
      <p class="text-primary font-press">{{ $t("pause.welcome") }}</p>
      <div class="title">
        <img src="/images/logo.png" alt="logo" class='logo' />
        <h1 class="text-primary">StudyBuddy</h1>
      </div>
      <h6 class="text-version">v{{ appVersion }}</h6>
      <h3 class="minecraft-sentence font-press">{{ minecraftSentence }}</h3>

      <v-checkbox
        v-if="!alreadyAccepted"
        hide-details
        v-model="acceptedTerms"
        class="text-center"
      >
        <template v-slot:label>
          <div>I agree to all <a href="https://google.com" target="_blank" class="text-primary">term and services</a></div>
        </template>
      </v-checkbox>
    </div>
  </div>
</template>
<script lang="ts" setup>
import Info from '@/components/common/Info.vue';
import minecraftSentences from '@/assets/minecraft.json';
import { ref, watch } from 'vue';

const alreadyAccepted = !!localStorage.getItem('acceptedTerms');
const acceptedTerms = ref(alreadyAccepted);
const emit = defineEmits(['accepted'])


// emit event when accepted
watch(acceptedTerms, (value) => emit('accepted', value));


const appVersion = APP_VERSION;
const minecraftSentence = minecraftSentences.sentences[Math.floor(Math.random() * minecraftSentences.sentences.length)];
</script>
<style scoped lang="scss">
p {
  max-width: 700px;
  text-align: center;
  font-size: 1rem;
}

h1 {
  font-size: 5rem;
  max-width: 700px;

  @media (max-width: 600px) {
    font-size: 3rem;
  }
}

h3 {
  font-size: 1.5rem;
  max-width: 700px;

  @media (max-width: 600px) {
    font-size: 0.8rem;
  }
}

.created-box {
  .created-box-wrapper {
    position: relative;
    border-radius: 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  @media (max-width: 600px) {
    .title {
      display: flex;
      flex-direction: column;
    }

    .minecraft-sentence {
      display: none;
    }
  }

  .minecraft-sentence {
    position: absolute;
    top: 0;
    left: 0;
    font-size: 1rem;
    color: rgba(var(--v-theme-primary));
    transform: translate(-10%, -0em) rotate(-24deg);
    animation: breath 0.5s linear infinite alternate;
    text-shadow: -2px 2px black;
  }

  @keyframes breath {
    0% {
      scale: 0.9;
    }

    100% {
      scale: 1;
    }
  }

  .text-version {
    text-align: right;
    margin-right: 3em;
    margin-top: -1.8em;
    font-size: 0.9rem;

    @media (max-width: 600px) {
      margin-top: -1.2em;
      margin-right: 2em;
    }
  }

  .info-welcome {
    position: absolute;
    margin: 1rem;
    top: 0;
    right: 0;
  }
}

.title {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: row;

  img {
    height: 7rem;
    margin-right: 0.5em;

    @media (max-width: 600px) {
      display: none;
    }
  }
}
</style>