<template>
  <v-dialog width="500" v-model="model">
    <v-card v-on:keyup.enter="save()">
      <v-toolbar dark color="primary">
        <v-btn icon dark @click="cancel()"> 
          <v-icon>mdi-close</v-icon> 
        </v-btn>
        <v-toolbar-title>{{ props.title }}</v-toolbar-title>

        <template v-slot:extension v-if="props.extension">
          <slot name="extension" />
        </template>
      </v-toolbar>

      <slot :data="clonedData"></slot>

      <v-card-actions>
        <v-spacer />
        <v-btn @click="cancel()">Cancel</v-btn>
        <v-btn @click="save()" color="primary">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup generic="T extends {}">
import { computed, watch, toRaw, ref } from 'vue'

type Props<G> = {
  modelValue: boolean
  extension?: boolean
  title?: string
  data?: G
}

// read raw props…
const propsND = defineProps<Props<T>>()

// …then merge them, but only supply a default title if none was passed
const props = ref<Props<T>>({
  ...propsND,
  title: propsND.title ?? 'Dialog'
})

const emits = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'save', data: T): void
  (e: 'cancel'): void
}>()

// v-model binding
const model = computed<boolean>({
  get:  () => propsND.modelValue,
  set: v => emits('update:modelValue', v)
})

// deep-clone incoming `data` on open
const clonedData = ref<T>({} as T)
watch(
  () => propsND.modelValue,
  visible => {
    if (visible) {
      // preserve whatever shape `data` had
      clonedData.value = JSON.parse(
        JSON.stringify((propsND as any).data)
      )
    }
  }
)

function cancel() {
  emits('cancel')
  emits('update:modelValue', false)
}

function save() {
  emits(
    'save',
    JSON.parse(JSON.stringify(toRaw(clonedData.value)))
  )
  emits('update:modelValue', false)
}
</script>
