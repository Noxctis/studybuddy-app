// src/vue-i18n.d.ts
import type { Composer } from '@/vue-i18n'
import 'vue'

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    // these two lines tell TS that `this.$t` and `this.$i18n` exist:
    $t: Composer['t']
    $i18n: Composer
  }
}