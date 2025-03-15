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

      <!-- New app invitation box -->
      <v-card class="mt-6 new-app-promo pa-4" variant="flat" color="surface" elevation="0" rounded="xl" style="border: 2px solid rgb(var(--v-theme-warning)); background-color: white;">
        <v-card-title class="text-center text-h4 font-weight-bold text-warning">
          
          {{ $t('newApp.title') }}
        </v-card-title>
        <v-card-text class="text-center my-2 text-primary">
          {{ $t('newApp.description') }}
          <br>
            <span class="font-weight-bold">{{ $t('newApp.subtitle') }}</span>
            <br>
            {{ $t('newApp.info') }}
        </v-card-text>
        <v-card-actions class="justify-center">
          <v-btn 
        color="warning" 
        variant="elevated"
        size="large"
        href="https://app.studybuddy.it"
        target="_blank"
        class="px-6 font-weight-bold"
        append-icon="mdi-arrow-right"
        :ripple="true"
          >  
        {{ $t('newApp.button') }}
          </v-btn>
        </v-card-actions>
        <v-chip class="position-absolute" color="error" size="small" style="top: 10px; right: 10px;">NEW!</v-chip>
      </v-card>

      <v-checkbox
        v-if="!termsStore.acceptedTerms"
        hide-details
        v-model="termsStore.acceptedTermsCheck"
        class="text-center"
      >
        <template v-slot:label>
            <div>{{ $t('agree') }} <a href="https://studybuddy.it/en/tos.html" target="_blank" class="text-primary">{{ $t('termsOfService') }}</a></div>
        </template>
      </v-checkbox>
    </div>
  </div>
</template>
<script lang="ts" setup>
import Info from '@/components/common/Info.vue';
import minecraftSentences from '@/assets/minecraft.json';
import { useTermsStore } from '@/stores/terms';

const termsStore = useTermsStore();
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