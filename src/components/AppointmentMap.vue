<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
    defineProps<{
        lat: number;
        lng: number;
        zoom?: number;
        label?: string;
        height?: string;
    }>(),
    {label: "Location Map" }
);

// Google embed without key
const src = computed(() => {
    const q = `${props.lat},${props.lng}`;
    return `https://www.google.com/maps?q=${encodeURIComponent(q)}&z=${props.zoom}&output=embed`;
});
</script>

<template>
    <div class="location-map">
        <div v-if="label" class="map-label">
            <i class="fa-solid fa-map-location-dot"></i>
             <label for="address" class="cc-label">{{ label }}</label>
        </div>

        <div class="map-frame">
            <iframe class="map-iframe" :src="src" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
                allowfullscreen></iframe>
        </div>
    </div>
</template>