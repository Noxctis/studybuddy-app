<template>
  <v-menu location="end" transition="scale-transition">
    <template #activator="{ props: activatorProps }">
      <v-btn
        class="add-button"
        icon="mdi-plus"
        color="primary"
        :elevation="12"
        size="x-large"
        v-bind="activatorProps"
      />
    </template>

    <v-list class="mx-1">
      <v-list-item
        prepend-icon="mdi-format-list-checks"
        :title="showTodo ? t('item.hidetodo') : t('item.showtodo')"
        @click="emit('addTodo', !showTodo)"
      />
      <v-list-item
        prepend-icon="mdi-link"
        :title="t('item.link')"
        @click="emit('addLink')"
      />
      <v-list-item
        prepend-icon="mdi-note"
        :title="t('item.postit')"
        @click="emit('addPostIt')"
      />
    </v-list>
  </v-menu>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

// Use Composition API for translations
const { t } = useI18n()

// Destructure props so `showTodo` is available
const { showTodo } = defineProps<{ showTodo: boolean }>()

// Strongly-typed emits
const emit = defineEmits<{
  (e: 'addLink'): void
  (e: 'addPostIt'): void
  (e: 'addTodo', value: boolean): void
}>()
</script>

<style scoped lang="scss">
.add-button {
  position: fixed;
  bottom: 40px;
  right: 20px;
  z-index: 500;
}
</style>
