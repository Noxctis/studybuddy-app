<script setup lang="ts">
import { ref, computed } from 'vue'
import type { WithTask } from '@/types'

// your existing props / setup…
const props = defineProps<{ element: WithTask }>()
const showTasks = ref(props.element.showTasks ?? false)

function showHideTodo(visible: boolean) {
  showTasks.value = visible
}

// ← ADD THIS:
defineExpose({ showHideTodo })
</script>
