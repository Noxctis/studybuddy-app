import { Analytics } from '@june-so/analytics-node';
import { defineStore } from 'pinia'
import { useAuth0 } from "@auth0/auth0-vue";
import { watch } from 'vue';

export const useJuneStore = defineStore('june', () => {
  const analytics = new Analytics('85ySr13HdTuDm2Pv');

  const { user, isLoading } = useAuth0();

  console.log('isLoading',isLoading.value)
  if (!isLoading.value) {
    identify();
  } else {
    watch(isLoading, (loading) => { if (!loading) identify() });
  }

  function getUserId() {
    return user.value?.sub ?? 'IGNOTO';
  }

  function getTraits() {
    return {
      email: user.value?.email ?? 'IGNOTO@IGNOTO.acme',
      name: user.value?.name ?? 'IGNOTO',
      avatar: user.value?.picture ?? 'https://en.meming.world/images/en/thumb/6/6d/Jim_Halpert_Smiling_Through_Blinds.jpg/300px-Jim_Halpert_Smiling_Through_Blinds.jpg'
    }
  }

  function identify() {
    analytics.identify({
      userId: getUserId(),
      traits: getTraits()
    });
  }

  function trackStudySession(duration: number) {
    analytics.track({
      userId: getUserId(),
      event: 'Pomodoro Completed WebApp',
      properties: {
        duration: Math.floor(duration / 60000)
      }
    })
  }

  return { trackStudySession }

});