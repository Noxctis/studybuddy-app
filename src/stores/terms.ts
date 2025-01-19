import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useTermsStore = defineStore('terms', () => {

  const acceptedTerms = ref(!!localStorage.getItem('acceptedTerms'));
  const acceptedTermsCheck = ref(acceptedTerms.value);

  function acceptTerms() {
    acceptedTermsCheck.value = true;
    if (acceptedTerms.value) return;
    localStorage.setItem('acceptedTerms', 'true');
    acceptedTerms.value = true;
  }

  return {
    acceptedTerms, acceptedTermsCheck, acceptTerms
  };
});
