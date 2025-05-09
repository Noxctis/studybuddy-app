// types/shims-vue-i18n.d.ts
import 'vue'
import type { Composer } from 'vue-i18n'

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $t: Composer['t']
    $i18n: Composer
  }
}

// ensure TS treats this file as a module
export {}
