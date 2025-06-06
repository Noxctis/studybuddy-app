<template>
  <v-container>
    <h1>{{ element.name }}</h1>
    <SBalendar v-if="pageType === EStudyView.Dashboard" />

    <div class="content">
      <ToDo class="todo" :element="element" ref="todoRef" />
      <PostIt class="note" :element="element" ref="postitRef" />
      <Links class="link" :element="element" ref="linkRef" />
    </div>
  </v-container>

  <Add
    @addLink="linkRef?.openNewLink()"
    @addPostIt="postitRef?.addPostIt()"
    @addTodo="todoRef?.showHideTodo($event)"
    :showTodo="!!element?.showTasks"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SBalendar from '@/components/SBalendar/SBalendar.vue'
import Links from '@/components/Links/Links.vue'
import PostIt from '@/components/PostIt/PostIt.vue'
import ToDo from '@/components/ToDo/ToDo.vue'
import Add from '@/components/Add/Add.vue'
import { EStudyView } from '@/types'
import { useRoute } from 'vue-router'
import { useStateStore } from '@/stores/state'

// grab your element
const state = useStateStore()
const route = useRoute()

const pageType = route.meta.type as EStudyView
const element = ref(
  state.getStudyElement(
    route.params.exam as string,
    route.params.chapter as string
  )
)

// other refs stay the same
const linkRef = ref<InstanceType<typeof Links> | null>(null)
const postitRef = ref<InstanceType<typeof PostIt> | null>(null)

// ← THIS IS THE ONLY CHANGE: declare that our ToDo instance has showHideTodo()
type ToDoInstance = InstanceType<typeof ToDo> & {
  showHideTodo: (visible: boolean) => void
}
const todoRef = ref<ToDoInstance | null>(null)
</script>

<style scoped lang="scss">
.content {
  display: grid;
  grid-template-columns: 3fr 1fr;
  grid-template-rows: auto auto;
}

.link {
  grid-column: 1 / 3;
}
</style>
