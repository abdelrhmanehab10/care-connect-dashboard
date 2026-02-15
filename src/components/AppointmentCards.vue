<script setup lang="ts">
import { computed } from "vue";
import { useAppointmentCardsQuery } from "../composables/useAppointmentCardsQuery";

type CardFilter =
  | { type: "period"; value: "today" | "this_week" }
  | { type: "state"; value: string };

interface Card {
  id: string;
  title: string;
  value: number;
  icon: string;
  theme: string;
  filter: CardFilter;
}

type CardDefinition = Omit<Card, "value">;

const normalizeKey = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const cardDefinitions: readonly CardDefinition[] = [
  {
    id: "today",
    title: "Total Appointments Today",
    icon: "fa-solid fa-notes-medical",
    theme: "theme-teal",
    filter: { type: "period", value: "today" },
  },
  {
    id: "this-week",
    title: "Total This Week",
    icon: "fa-solid fa-circle-check",
    theme: "theme-blue",
    filter: { type: "period", value: "this_week" },
  },
  {
    id: "canceled",
    title: "Canceled Appointments",
    icon: "fa-solid fa-clock",
    theme: "theme-gold",
    filter: { type: "state", value: "canceled" },
  },
  {
    id: "confirmed",
    title: "Confirmed Appointments",
    icon: "fa-solid fa-calendar-xmark",
    theme: "theme-purple",
    filter: { type: "state", value: "confirmed" },
  },
];

const props = defineProps<{
  isTodayActive?: boolean;
  isThisWeekActive?: boolean;
  activeStateFilter?: string | null;
  isDisabled?: boolean;
}>();

const emit = defineEmits<{
  (event: "toggle-week"): void;
  (event: "toggle-today"): void;
  (event: "filter-state", payload: string): void;
  (event: "clear-filters"): void;
}>();

const { cards: cardsData } = useAppointmentCardsQuery();

const isDisabled = computed(() => Boolean(props.isDisabled));
const normalizedActiveStateFilter = computed(() => normalizeKey(props.activeStateFilter));

const isCardAlreadyActive = (card: Card) => {
  if (card.filter.type === "period") {
    return card.filter.value === "today"
      ? Boolean(props.isTodayActive)
      : Boolean(props.isThisWeekActive);
  }

  return normalizedActiveStateFilter.value === normalizeKey(card.filter.value);
};

const statusCounts = computed(() => {
  const map = new Map<string, number>();
  for (const item of cardsData.value.by_status ?? []) {
    const key = normalizeKey(item.name ?? item.status);
    if (key) {
      map.set(key, Number(item.count ?? 0));
    }
  }
  return map;
});

const getStatusCount = (name: string) =>
  statusCounts.value.get(normalizeKey(name)) ?? 0;

const cards = computed<Card[]>(() => {
  const periods = cardsData.value.periods ?? {
    today: 0,
    this_week: 0,
    this_month: 0,
  };
  return cardDefinitions.map((definition) => ({
    ...definition,
    value:
      definition.filter.type === "period"
        ? Number(periods[definition.filter.value] ?? 0)
        : getStatusCount(definition.filter.value),
  }));
});

const handleCardClick = (card: Card) => {
  if (isDisabled.value) return;
  if (isCardAlreadyActive(card)) return;
  emit("clear-filters");
  if (card.filter.type === "period") {
    if (card.filter.value === "today") {
      emit("toggle-today");
      return;
    }
    emit("toggle-week");
    return;
  }

  emit("filter-state", card.filter.value);
};
</script>

<template>
  <div class="row g-3 mb-3">
    <div class="col-12 col-md-3" v-for="card in cards" :key="card.id">
      <div
        class="card-box stat-card"
        :class="[card.theme, { 'is-disabled': isDisabled }]"
        role="button"
        :tabindex="isDisabled ? -1 : 0"
        :aria-disabled="isDisabled"
        @click="handleCardClick(card)"
        @keydown.enter="handleCardClick(card)"
        @keydown.space.prevent="handleCardClick(card)"
      >
        <h6 class="mb-2">{{ card.title }}</h6>

        <div class="d-flex justify-content-between align-items-center">
          <p class="numbers mb-0">{{ card.value }}</p>

          <div class="icon-badge" :class="card.theme">
            <i :class="card.icon"></i>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>