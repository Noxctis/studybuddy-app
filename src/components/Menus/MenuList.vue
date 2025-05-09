<template>
  <v-list nav density="compact">
    <draggable item-key="name" :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)" >
      <template #item="{element}">
        <v-list-item
          link
          :to="`/${baseUrl}/${element.name}`"
          class="rounded-lg my-2"
          :variant="element.tutorial ? 'outlined' : 'text'"
          @click="rail()"
          :prepend-icon="element.icon"
          :value="element.name"
          :color="element.color ?? props.color"
        >
          <v-list-item-title :class="areExams ? 'text-uppercase exam-title' : ''">
            {{ element.name }}
          </v-list-item-title>
          <template #append>
            <v-menu>
              <template #activator="{ props }">
                <v-btn
                  color="grey-lighten-1"
                  icon="mdi-dots-vertical"
                  variant="text"
                  v-bind="props"
                  @click.prevent.stop="$event.preventDefault()"
                />
              </template>
              <v-list>
                <v-list-item @click="editElement(element)" :title="t('edit')" />
                <v-list-item @click="removeElement(element)" :title="t('delete')" />
              </v-list>
            </v-menu>
          </template>
        </v-list-item>
      </template>
    </draggable>

    <v-list-item
      @click="addElement()"
      :class="`bg-${props.color}`"
      prepend-icon="mdi-plus"
      :title="t('add', { element: props.elementsName })"
    />
  </v-list>

  <!-- add exam/chapter dialog-->
  <v-dialog v-model="newElementDialog.open" width="500">
    <v-card v-on:keyup.enter="saveElement()">
      <v-toolbar dark :color="props.color">
        <v-btn icon dark @click="newElementDialog.open = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title>{{ props.elementsName }}</v-toolbar-title>
        <v-spacer />
        <v-toolbar-items>
          <v-btn variant="text" @click="saveElement()">
            {{ t('save') }}
          </v-btn>
        </v-toolbar-items>
      </v-toolbar>
      <v-card-text>
        <v-container>
          <v-row>
            <!-- Exam name -->
            <v-col cols="12">
              <v-text-field
                required
                autofocus
                v-model="newElementDialog.element.name"
                :label="t('name', { element: props.elementsName })"
                :error-messages="
                  state.checkValidExamName(newElementDialog.element.name, newElementDialog.original)
                    ? ''
                    : t('invalidName', { element: props.elementsName })
                "
              />
            </v-col>
            <!-- Deadline -->
            <v-col cols="12" v-if="props.elementsName === t('exam')">
              <v-text-field
                v-model="newElementDialog.element.deadline"
                label="Deadline"
                type="date"
              />
            </v-col>

            <!-- Icon -->
            <v-col cols="12" v-if="props.chooseIcon">
              <v-select
                :label="t('icon')"
                :items="mdiIconsList"
                item-title="title"
                item-value="icon"
                v-model="newElementDialog.element.icon"
                :prepend-icon="newElementDialog.element.icon"
              >
                <template #item="{ props: item }">
                  <v-list-item
                    v-bind="item as any"
                    :prepend-icon="item.value as any"
                    :title="item.title"
                  />
                </template>
              </v-select>
            </v-col>
          </v-row>
          <!-- Color -->
          <v-row>
            <v-col cols="12" v-if="props.chooseColor">
              <ColorPicker v-model="newElementDialog.element.color" />
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from "vue"
import draggable from 'vuedraggable'
import ColorPicker from '../Inputs/ColorPicker.vue'
import type { Chapter, Exam } from '@/types'
import { useStateStore } from "@/stores/state"
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const state = useStateStore()

const props = withDefaults(defineProps<{
  modelValue: Exam[] | Chapter[]
  baseUrl: string
  elementsName: string
  chooseIcon?: boolean
  color?: string
  chooseColor?: boolean
  areExams?: boolean
}>(), {
  areExams: false,
  chooseIcon: true,
  chooseColor: true,
  color: 'primary',
})

const emit = defineEmits(['rail', 'update:modelValue'])

const defaultElement = props.areExams
  ? { name: '', icon: 'mdi-account-school', color: 'primary', deadline: undefined }
  : { name: '' }

const newElementDialog = ref({
  open: false,
  original: undefined as Exam | Chapter | undefined,
  element: { ...defaultElement },
})

function addElement() {
  newElementDialog.value.element = { ...defaultElement }
  newElementDialog.value.original = undefined
  newElementDialog.value.open = true
  if (newElementDialog.value.element?.icon)
    newElementDialog.value.element.icon =
      mdiIconsList.value[Math.floor(Math.random() * mdiIconsList.value.length)].icon
  if (newElementDialog.value.element?.color)
    newElementDialog.value.element.color =
      colorList[Math.floor(Math.random() * colorList.length)].color
}

function editElement(el: any) {
  newElementDialog.value.original = el
  newElementDialog.value.element = { ...el }
  newElementDialog.value.open = true
}

function removeElement(el: Exam | Chapter) {
  emit('update:modelValue', props.modelValue.filter((e) => e.name !== el.name))
}

function saveElement() {
  if (state.checkValidExamName(newElementDialog.value.element.name, newElementDialog.value.original)) {
    if (!newElementDialog.value.original) {
      emit('update:modelValue', [...props.modelValue, newElementDialog.value.element])
    } else {
      emit(
        'update:modelValue',
        props.modelValue.map((e) =>
          e.name === newElementDialog.value.original?.name ? newElementDialog.value.element : e
        )
      )
    }
    newElementDialog.value.open = false
  }
}

function rail() {
  emit('rail')
}

const mdiIconsList = ref([
  { icon: "mdi-account-school", title: 'School' },
  /* ... */
])

const colorList = [
  { color: 'purple', title: 'Purple' },
  /* ... */
]
</script>

<style scoped>
.exam-title {
  font-weight: bold;
}
</style>
