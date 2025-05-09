<template>
  <div>
    <v-list-item
      @click.prevent.stop="toggleExpanded"
      :class="{ 'bg-background': expanded }"
    >
      <template v-slot:prepend>
        <v-list-item-action start>
          <v-checkbox-btn
            :model-value="task.done"
            @click.prevent.stop="toggle"
          ></v-checkbox-btn>
        </v-list-item-action>
      </template>
      <template v-slot:append>
        <v-btn
          color="grey-lighten-1"
          :icon="expanded ? 'mdi-chevron-up' : 'mdi-chevron-down'"
          variant="text"
        ></v-btn>
      </template>
      <v-list-item-title :class="{ done: task.done }">
        {{ task.name }}
        <span v-if="task.isDeadline" class="text-medium-emphasis">
          ({{ task.deadline }})
        </span>
      </v-list-item-title>
    </v-list-item>

    <v-card class="ma-0 pa-5" v-if="expanded">
      <v-row>
        <v-col cols="12">
          <v-text-field
            label="Name"
            v-model="task.name"
            @update:model-value="state.save"
          />
        </v-col>
      </v-row>

      <v-row>
        <v-col cols="9">
          <v-text-field
            clearable
            label="Deadline"
            type="date"
            v-model="task.deadline"
            @update:model-value="state.save"
            @click:clear="task.isDeadline = false"
          />
        </v-col>
        <v-col cols="3">
          <v-btn
            :disabled="!task.deadline"
            variant="tonal"
            color="primary"
            height="58"
            @click="task.isDeadline = !task.isDeadline"
          >
            {{ task.isDeadline ? 'Remove from Deadline' : 'Move to Deadline' }}
          </v-btn>
        </v-col>
      </v-row>

      <v-row>
        <v-col cols="12">
          <v-textarea
            label="Notes"
            v-model="task.notes"
            @update:model-value="state.save"
          />
        </v-col>
      </v-row>

      <v-card-actions class="justify-end">
        <v-btn color="error" @click="remove">Delete</v-btn>
      </v-card-actions>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import type { Task } from '@/types';
import { computed } from 'vue';
import { useStateStore } from '@/stores/state';

const state = useStateStore();

const props = defineProps<{
  i: number;
  modelValue: number;
  task: Task;
}>();

const emits = defineEmits<{
  (e: 'update:modelValue', value: number): void;
  (e: 'toggle'): void;
  (e: 'remove'): void;
}>();

const expanded = computed(() => props.modelValue === props.i);

function toggleExpanded() {
  emits('update:modelValue', expanded.value ? -1 : props.i);
}

function toggle() {
  emits('toggle');
}

function remove() {
  emits('update:modelValue', -1);
  emits('remove');
}
</script>

<style scoped lang="scss">
.done {
  text-decoration: line-through;
}
</style>