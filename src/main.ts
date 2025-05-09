// src/main.ts
import '@mdi/font/css/materialdesignicons.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import messages from '@intlify/unplugin-vue-i18n/messages'

import App from './App.vue'
import router from './router'

// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import { themes } from '@/assets/themes'

// Calendar
import { setupCalendar } from 'v-calendar'

// --- 1) Create Vuetify instance ---
const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi },
  },
  theme: {
    defaultTheme:
      JSON.parse(localStorage.getItem('state') ?? '{}')?.settings?.user
        ?.theme ?? 'verdone',
    themes,
  },
})

// --- 2) Detect browser locale or fall back to 'en' ---
const browserLocale = navigator.language.split('-')[0] || 'en'

// --- 3) Create Vue-I18n instance ---
const i18n = createI18n({
  legacy: true,          // enable `this.$t(...)`
  globalInjection: true,  // inject `$t` & `$i18n` into ALL components
  locale: browserLocale,  // e.g. 'en', 'fr', 'zh'
  fallbackLocale: 'en',   // if a key is missing in `locale`, use 'en'
  messages,               // loaded from your `locales/` via the Vite plugin
})

// --- 4) Bootstrap the app ---
const app = createApp(App)

app
  .use(router)
  .use(createPinia())
  .use(vuetify)
  .use(i18n)
  .use(setupCalendar, {})  // v-calendar
  .mount('#app')
