<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

type LocationValue = {
  lat: number;
  lng: number;
  address?: string;
};

const props = withDefaults(
  defineProps<{
    modelValue?: LocationValue | null;
    lat?: number;
    lng?: number;
    zoom?: number;
    label?: string;
    height?: string;
    allowSearch?: boolean;
    allowClick?: boolean;
    placeholder?: string;
  }>(),
  {
    label: "Location Map",
    zoom: 13,
    height: "320px",
    allowSearch: true,
    allowClick: true,
    placeholder: "Search for a location",
  },
);

const emit = defineEmits<{
  (event: "update:modelValue", value: LocationValue | null): void;
  (event: "update:lat", value: number): void;
  (event: "update:lng", value: number): void;
  (event: "selected", value: LocationValue): void;
}>();

const mapEl = ref<HTMLDivElement | null>(null);
const searchEl = ref<HTMLInputElement | null>(null);
const mapError = ref<string | null>(null);
const isLoading = ref(true);
const selected = ref<LocationValue | null>(null);

const mapInstance = ref<any>(null);
const markerInstance = ref<any>(null);
const geocoderInstance = ref<any>(null);
const autocompleteInstance = ref<any>(null);

const mapHeight = computed(() => props.height || "320px");

const initialCenter = computed<LocationValue>(() => {
  if (props.modelValue) return props.modelValue;
  if (typeof props.lat === "number" && typeof props.lng === "number") {
    return { lat: props.lat, lng: props.lng };
  }
  return { lat: 24.7136, lng: 46.6753 };
});

let googleMapsLoader: Promise<any> | null = null;
const loadGoogleMaps = (apiKey: string) => {
  const win = window as any;
  if (win.google?.maps) {
    return Promise.resolve(win.google);
  }
  if (googleMapsLoader) return googleMapsLoader;
  googleMapsLoader = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(win.google);
    script.onerror = () =>
      reject(new Error("Failed to load Google Maps JavaScript API."));
    document.head.appendChild(script);
  });
  return googleMapsLoader;
};

const updateSelection = (
  value: LocationValue,
  options: { emit?: boolean; pan?: boolean } = {},
) => {
  selected.value = value;
  if (searchEl.value) {
    const address = value.address?.trim();
    if (address) {
      searchEl.value.value = address;
    } else if (Number.isFinite(value.lat) && Number.isFinite(value.lng)) {
      searchEl.value.value = `${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`;
    } else {
      searchEl.value.value = "";
    }
  }
  if (markerInstance.value) {
    markerInstance.value.setPosition({ lat: value.lat, lng: value.lng });
  }
  if (mapInstance.value && options.pan !== false) {
    mapInstance.value.panTo({ lat: value.lat, lng: value.lng });
  }
  if (options.emit === false) return;
  emit("update:modelValue", value);
  emit("update:lat", value.lat);
  emit("update:lng", value.lng);
  emit("selected", value);
};

const reverseGeocode = (lat: number, lng: number) => {
  if (!geocoderInstance.value) {
    updateSelection({ lat, lng }, { emit: true });
    return;
  }
  geocoderInstance.value.geocode(
    { location: { lat, lng } },
    (results: any, status: string) => {
      if (status === "OK" && results?.length) {
        updateSelection(
          { lat, lng, address: results[0]?.formatted_address },
          { emit: true, pan: false },
        );
        return;
      }
      updateSelection({ lat, lng }, { emit: true, pan: false });
    },
  );
};

onMounted(async () => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as
    | string
    | undefined;
  if (!apiKey) {
    mapError.value = "Missing Google Maps API key.";
    isLoading.value = false;
    return;
  }
  if (!mapEl.value) {
    mapError.value = "Map container missing.";
    isLoading.value = false;
    return;
  }
  try {
    const google = await loadGoogleMaps(apiKey);
    mapInstance.value = new google.maps.Map(mapEl.value, {
      center: initialCenter.value,
      zoom: props.zoom,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
    markerInstance.value = new google.maps.Marker({
      map: mapInstance.value,
      position: initialCenter.value,
      draggable: true,
    });
    geocoderInstance.value = new google.maps.Geocoder();

    markerInstance.value.addListener("dragend", () => {
      const pos = markerInstance.value.getPosition();
      if (!pos) return;
      reverseGeocode(pos.lat(), pos.lng());
    });

    if (props.allowClick) {
      mapInstance.value.addListener("click", (event: any) => {
        const lat = event?.latLng?.lat?.();
        const lng = event?.latLng?.lng?.();
        if (typeof lat !== "number" || typeof lng !== "number") return;
        reverseGeocode(lat, lng);
      });
    }

    if (props.allowSearch && searchEl.value) {
      autocompleteInstance.value = new google.maps.places.Autocomplete(
        searchEl.value,
        {
          fields: ["geometry", "formatted_address", "name"],
        },
      );
      autocompleteInstance.value.addListener("place_changed", () => {
        const place = autocompleteInstance.value.getPlace();
        const location = place?.geometry?.location;
        if (!location) return;
        const lat = location.lat();
        const lng = location.lng();
        updateSelection(
          {
            lat,
            lng,
            address: place?.formatted_address || place?.name,
          },
          { emit: true },
        );
      });
    }

    updateSelection(initialCenter.value, { emit: false, pan: false });
    isLoading.value = false;
  } catch (error) {
    console.error(error);
    mapError.value = "Failed to load Google Maps.";
    isLoading.value = false;
  }
});

onBeforeUnmount(() => {
  autocompleteInstance.value = null;
  geocoderInstance.value = null;
  markerInstance.value = null;
  mapInstance.value = null;
});

watch(
  () => props.modelValue,
  (value) => {
    if (!value) return;
    if (selected.value?.lat === value.lat && selected.value?.lng === value.lng)
      return;
    updateSelection(value, { emit: false });
  },
  { deep: true },
);

watch(
  () => [props.lat, props.lng],
  ([lat, lng]) => {
    if (props.modelValue) return;
    if (typeof lat !== "number" || typeof lng !== "number") return;
    if (selected.value?.lat === lat && selected.value?.lng === lng) return;
    updateSelection({ lat, lng }, { emit: false });
  },
);
</script>

<template>
  <div class="location-map">
    <div v-if="label" class="map-label">
      <i class="fa-solid fa-map-location-dot"></i>
      <label class="cc-label">{{ label }}</label>
    </div>

    <div v-if="allowSearch" class="map-search">
      <input
        ref="searchEl"
        type="text"
        class="map-input"
        :placeholder="placeholder"
        autocomplete="off"
      />
    </div>

    <div class="map-frame" :style="{ height: mapHeight }">
      <div ref="mapEl" class="map-canvas"></div>
      <div v-if="isLoading" class="map-overlay">Loading map...</div>
      <div v-else-if="mapError" class="map-overlay map-error">
        {{ mapError }}
      </div>
    </div>

    <div v-if="selected" class="map-meta">
      <span>Lat: {{ selected.lat.toFixed(5) }}</span>
      <span>Lng: {{ selected.lng.toFixed(5) }}</span>
      <span v-if="selected.address">Address: {{ selected.address }}</span>
    </div>
  </div>
</template>