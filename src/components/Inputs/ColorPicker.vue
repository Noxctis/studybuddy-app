<template>
  <v-select
    :label="t('color')"
    :items="colorList"
    item-title="title"
    item-value="color"
    :model-value="props.modelValue"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #item="{ props: item }">
      <v-icon class="ma-1 pa-2" v-bind="item as any" :color="item.value">
        mdi-circle
      </v-icon>
    </template>

    <template #prepend>
      <v-icon :color="props.modelValue">mdi-circle</v-icon>
    </template>
  </v-select>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { withDefaults, defineProps, defineEmits } from 'vue'

// 1. Define props (we keep them in `props` so we can reference `props.modelValue` in the template)
const props = withDefaults(
  defineProps<{
    modelValue?: string
  }>(),
  { modelValue: undefined }
)

// 2. Use the **array** overload so `emit(..., string)` is allowed
const emit = defineEmits(['update:modelValue'])

// 3. Pull in `t()` from the Composition API
const { t } = useI18n()

// 4. Your list of colors stays the same
const colorList = [
  { color: 'purple', title: 'Purple' },
  { color: 'pink', title: 'Pink' },
  { color: 'indigo', title: 'Indigo' },
  { color: 'blue', title: 'Blue' },
  { color: 'teal', title: 'Teal' },
  { color: 'green', title: 'Green' },
  { color: 'orange', title: 'Orange' },
  { color: 'deep-orange', title: 'Deep Orange' },
  { color: 'brown', title: 'Brown' },
  { color: 'grey', title: 'Grey' },
  { color: 'blue-grey', title: 'Blue Grey' },
  { color: 'black', title: 'Black' },
  { color: 'white', title: 'White' },
]
</script>
