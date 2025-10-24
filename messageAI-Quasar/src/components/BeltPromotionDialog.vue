<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <q-card style="min-width: 400px;">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">Belt Promotion: {{ studentName }}</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <!-- Current Belt Display -->
      <q-card-section v-if="currentBelt" class="bg-grey-2">
        <div class="text-subtitle2 q-mb-sm">Current Belt</div>
        <div class="row items-center">
          <q-icon name="military_tech" size="32px" class="q-mr-sm" />
          <div>
            <div class="text-body1">{{ capitalize(currentBelt.beltColor) }} Belt</div>
            <div class="text-caption text-grey-7">
              {{ currentBelt.stripes }} stripe{{ currentBelt.stripes !== 1 ? 's' : '' }}
            </div>
          </div>
        </div>
      </q-card-section>

      <!-- Promotion Form -->
      <q-card-section>
        <div class="text-subtitle2 q-mb-md">New Belt</div>

        <q-select
          v-model="newBelt"
          :options="beltOptions"
          label="Belt Color"
          outlined
          class="q-mb-md"
        >
          <template #prepend>
            <q-icon name="military_tech" />
          </template>
        </q-select>

        <q-select
          v-model="newStripes"
          :options="stripeOptions"
          label="Stripes"
          outlined
          class="q-mb-md"
        >
          <template #prepend>
            <q-icon name="grade" />
          </template>
        </q-select>

        <q-input
          v-model="promotionNotes"
          type="textarea"
          label="Notes (optional)"
          placeholder="Recognition, achievements, areas to focus on..."
          outlined
          rows="3"
          class="q-mb-md"
        />

        <q-btn
          color="primary"
          label="Award Promotion"
          icon="celebration"
          @click="awardPromotion"
          :loading="loading"
          class="full-width"
          size="lg"
        />
      </q-card-section>

      <q-separator />

      <!-- Promotion History -->
      <q-card-section>
        <div class="text-subtitle2 q-mb-md">Promotion History</div>

        <div v-if="loadingHistory" class="text-center q-py-md">
          <q-spinner color="primary" size="40px" />
        </div>

        <q-timeline v-else-if="history.length > 0" color="primary" layout="dense">
          <q-timeline-entry
            v-for="promo in history"
            :key="promo.id"
            :title="`${capitalize(promo.beltColor)} Belt`"
            :subtitle="`${promo.stripes} stripe${promo.stripes !== 1 ? 's' : ''}`"
            icon="military_tech"
          >
            <div class="text-caption">{{ formatDate(promo.awardedDate) }}</div>
            <div class="text-caption text-grey-7">By {{ promo.awardedByName }}</div>
            <div v-if="promo.notes" class="text-body2 q-mt-xs">{{ promo.notes }}</div>
          </q-timeline-entry>
        </q-timeline>

        <div v-else class="text-center text-grey-6 q-py-md">
          <q-icon name="history" size="40px" />
          <div class="q-mt-sm">No promotion history</div>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useBeltProgression, type BeltColor } from '../composables/useBeltProgression'
import { Notify } from 'quasar'

const props = defineProps<{
  modelValue: boolean
  studentId: string
  studentName: string
  gymId: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'promoted'): void
}>()

const { loading, loadingHistory, getCurrentBelt, getBeltHistory, awardBelt } = useBeltProgression()

const currentBelt = ref<{ beltColor: BeltColor; stripes: number } | null>(null)
const newBelt = ref<BeltColor>('white')
const newStripes = ref(0)
const promotionNotes = ref('')
const history = ref<any[]>([])

const beltOptions = [
  { label: 'White Belt', value: 'white' },
  { label: 'Blue Belt', value: 'blue' },
  { label: 'Purple Belt', value: 'purple' },
  { label: 'Brown Belt', value: 'brown' },
  { label: 'Black Belt', value: 'black' }
]

const stripeOptions = [
  { label: '0 Stripes', value: 0 },
  { label: '1 Stripe', value: 1 },
  { label: '2 Stripes', value: 2 },
  { label: '3 Stripes', value: 3 },
  { label: '4 Stripes', value: 4 }
]

async function loadData() {
  try {
    // Load current belt
    const belt = await getCurrentBelt(props.studentId)
    currentBelt.value = belt

    // Set default new belt to current + 1 stripe or next belt
    if (belt.stripes < 4) {
      newBelt.value = belt.beltColor
      newStripes.value = belt.stripes + 1
    } else {
      // Move to next belt
      const beltProgression: BeltColor[] = ['white', 'blue', 'purple', 'brown', 'black']
      const currentIndex = beltProgression.indexOf(belt.beltColor)
      if (currentIndex < beltProgression.length - 1) {
        newBelt.value = beltProgression[currentIndex + 1]
        newStripes.value = 0
      } else {
        newBelt.value = 'black'
        newStripes.value = belt.stripes
      }
    }

    // Load history
    loadingHistory.value = true
    const historyData = await getBeltHistory(props.studentId)
    history.value = historyData
    loadingHistory.value = false

  } catch (err) {
    console.error('Error loading belt data:', err)
  }
}

async function awardPromotion() {
  try {
    loading.value = true

    await awardBelt(
      props.studentId,
      props.gymId,
      newBelt.value,
      newStripes.value,
      promotionNotes.value || undefined
    )

    Notify.create({
      type: 'positive',
      message: `${props.studentName} promoted to ${capitalize(newBelt.value)} Belt!`,
      icon: 'celebration',
      timeout: 3000
    })

    emit('promoted')
    emit('update:modelValue', false)

  } catch (err) {
    console.error('Error awarding promotion:', err)
    Notify.create({
      type: 'negative',
      message: 'Failed to award promotion'
    })
  } finally {
    loading.value = false
  }
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    loadData()
  }
})

onMounted(() => {
  if (props.modelValue) {
    loadData()
  }
})
</script>

