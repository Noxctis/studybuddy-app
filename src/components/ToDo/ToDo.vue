<template>
  <v-card class="todo" v-if="element.showTasks">
    <v-toolbar dark color="primary">
      <v-toolbar-title>TODOs</v-toolbar-title>
      <v-text-field
        v-model="newTodo"
        label="New Task"
        type="text"
        density="compact"
        required
        :hide-details="true"
        :bg-color="'surface'"
        @keyup.enter="addTodo"
      />
      <v-toolbar-items>
        <v-btn variant="text" @click="addTodo">Add</v-btn>
      </v-toolbar-items>
    </v-toolbar>

    <div class="list-container">
      <!-- Deadlines -->
      <v-list v-if="deadlineTasks.length > 0" select-strategy="classic" :opened="['deadlines']">
        <v-list-group value="deadlines">
          <template v-slot:activator="{ props }">
            <v-list-item
              v-bind="props"
              prepend-icon="mdi-calendar-check"
              :title="`Deadlines (${deadlineTasks.length})`"
            />
          </template>
          <ToDoListItem
            v-for="t in deadlineTasks"
            :key="t.index"
            :i="t.index"
            v-model="expandedIndex"
            :task="t.task"
            @toggle="toggleTask(t.task, true)"
            @remove="removeTask(t.task)"
          />
        </v-list-group>
      </v-list>

      <!-- Tasks without deadlines -->
      <v-list v-if="noDeadlineTasks.length > 0" select-strategy="classic" :opened="['tasks']">
        <v-list-group value="tasks">
          <template v-slot:activator="{ props }">
            <v-list-item
              v-bind="props"
              prepend-icon="mdi-format-list-bulleted-triangle"
              :title="`Tasks (${noDeadlineTasks.length})`"
            />
          </template>
          <ToDoListItem
            v-for="t in noDeadlineTasks"
            :key="t.index"
            :i="t.index"
            v-model="expandedIndex"
            :task="t.task"
            @toggle="toggleTask(t.task, true)"
            @remove="removeTask(t.task)"
          />
        </v-list-group>
      </v-list>
    </div>

    <!-- Completed tasks -->
    <v-list v-if="doneTasks.length > 0" select-strategy="classic">
      <v-list-group value="done">
        <template v-slot:activator="{ props }">
          <v-list-item
            v-bind="props"
            prepend-icon="mdi-check-bold"
            :title="`Done (${doneTasks.length})`"
          />
        </template>
        <ToDoListItem
          v-for="t in doneTasks"
          :key="t.index"
          :i="t.index"
          v-model="expandedIndex"
          :task="t.task"
          @toggle="toggleTask(t.task, false)"
          @remove="removeTask(t.task)"
        />
      </v-list-group>
    </v-list>
  </v-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Task, WithTask } from '@/types';
import ToDoListItem from './ToDoListItem.vue';
import { useStateStore } from '@/stores/state';

const state = useStateStore();

const props = defineProps<{
  element: WithTask;
}>();

const expandedIndex = ref(-1);
const newTodo = ref('');

const taskNumbered = computed(() =>
  props.element.tasks?.map((t, i) => ({ task: t, index: i })) ?? []
);
const doneTasks = computed(() => taskNumbered.value.filter((t) => t.task.done));
const deadlineTasks = computed(() =>
  taskNumbered.value.filter((t) => !t.task.done && t.task.isDeadline)
);
const noDeadlineTasks = computed(() =>
  taskNumbered.value.filter((t) => !t.task.done && !t.task.isDeadline)
);

function addTodo() {
  const trimmedTodo = newTodo.value.trim();
  if (!trimmedTodo) return;

  if (!props.element.tasks) {
    props.element.tasks = [];
  }

  props.element.tasks.push({
    name: trimmedTodo,
    done: false,
  });

  newTodo.value = '';
  state.save();
}

function toggleTask(task: Task, value: boolean) {
  task.done = value;
  state.save();
}

function removeTask(task: Task) {
  props.element.tasks = props.element.tasks?.filter((t) => t !== task) ?? [];
  state.save();
}
</script>

<style scoped lang="scss">
.done {
  text-decoration: line-through;
}

.list-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>