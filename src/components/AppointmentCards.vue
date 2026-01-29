<script setup lang="ts"></script>
<template>
  <div class="row g-3 mb-3">
    <div class="col-12 col-md-3" v-for="(card, i) in cards" :key="i">
      <div class="card-box stat-card" :class="card.theme">
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
<script>
export default {
  name: "AppointmentCards",
  data() {
    return {
      cards: [
        {
          title: "Total Visits Today",
          value: "0 / 0",
          icon: "fa-solid fa-notes-medical",
          theme: "theme-teal",
        },
        {
          title: "Total This Week",
          value: "19",
          icon: "fa-solid fa-circle-check",
          theme: "theme-blue",
        },
        {
          title: "Canceled Appointments",
          value: "2",
          icon: "fa-solid fa-clock",
          theme: "theme-gold",
        },
        {
          title: "Confirmed Appointments",
          value: "29",
          icon: "fa-solid fa-calendar-xmark",
          theme: "theme-purple",
        },
      ],
    };
  },
};
</script>
