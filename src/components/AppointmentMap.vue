<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

type LocationValue = {
  lat: number;
  lng: number;
  address?: string;
};
type MapsLatLng = {
  lat: () => number;
  lng: () => number;
};
type MapsGeocoderResult = {
  formatted_address?: string;
};
type MapClickEvent = {
  latLng?: MapsLatLng;
};
type MapsMap = {
  panTo: (position: { lat: number; lng: number }) => void;
  addListener: (eventName: "click", handler: (event: MapClickEvent) => void) => void;
};
type MapsMarker = {
  setPosition: (position: { lat: number; lng: number }) => void;
  getPosition: () => MapsLatLng | null;
  addListener: (eventName: "dragend", handler: () => void) => void;
};
type MapsGeocoder = {
  geocode: (
    request: { location: { lat: number; lng: number } },
    callback: (results: MapsGeocoderResult[] | null, status: string) => void,
  ) => void;
};
type MapsPlace = {
  geometry?: { location?: MapsLatLng };
  formatted_address?: string;
  name?: string;
};
type MapsAutocomplete = {
  addListener: (eventName: "place_changed", handler: () => void) => void;
  getPlace: () => MapsPlace;
};
type GoogleMapsApi = {
  maps: {
    Map: new (
      element: HTMLElement,
      options: {
        center: { lat: number; lng: number };
        zoom: number;
        mapTypeControl: boolean;
        streetViewControl: boolean;
        fullscreenControl: boolean;
      },
    ) => MapsMap;
    Marker: new (options: {
      map: MapsMap;
      position: { lat: number; lng: number };
      draggable: boolean;
    }) => MapsMarker;
    Geocoder: new () => MapsGeocoder;
    places: {
      Autocomplete: new (
        element: HTMLInputElement,
        options: { fields: string[] },
      ) => MapsAutocomplete;
    };
  };
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

const mapInstance = ref<MapsMap | null>(null);
const markerInstance = ref<MapsMarker | null>(null);
const geocoderInstance = ref<MapsGeocoder | null>(null);
const autocompleteInstance = ref<MapsAutocomplete | null>(null);

const mapHeight = computed(() => props.height);

const DEFAULT_CENTER: LocationValue = { lat: 24.7136, lng: 46.6753 };

const initialCenter = computed<LocationValue>(() => {
  if (props.modelValue) return props.modelValue;
  if (typeof props.lat === "number" && typeof props.lng === "number") {
    return { lat: props.lat, lng: props.lng };
  }
  return DEFAULT_CENTER;
});

let googleMapsLoader: Promise<GoogleMapsApi> | null = null;
const loadGoogleMaps = (apiKey: string) => {
  const win = window as Window & { google?: GoogleMapsApi };
  if (win.google?.maps) {
    return Promise.resolve(win.google);
  }
  if (googleMapsLoader) return googleMapsLoader;
  googleMapsLoader = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (win.google?.maps) {
        resolve(win.google);
        return;
      }
      googleMapsLoader = null;
      reject(new Error("Google Maps API did not initialize correctly."));
    };
    script.onerror = () => {
      googleMapsLoader = null;
      reject(new Error("Failed to load Google Maps JavaScript API."));
    };
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
    (results: MapsGeocoderResult[] | null, status: string) => {
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

const finishLoading = (errorMessage?: string) => {
  mapError.value = errorMessage ?? null;
  isLoading.value = false;
};

onMounted(async () => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as
    | string
    | undefined;
  if (!apiKey) {
    finishLoading("Missing Google Maps API key.");
    return;
  }
  if (!mapEl.value) {
    finishLoading("Map container missing.");
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
      const marker = markerInstance.value;
      if (!marker) return;
      const pos = marker.getPosition();
      if (!pos) return;
      reverseGeocode(pos.lat(), pos.lng());
    });

    if (props.allowClick) {
      mapInstance.value.addListener("click", (event: MapClickEvent) => {
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
        const autocomplete = autocompleteInstance.value;
        if (!autocomplete) return;
        const place = autocomplete.getPlace();
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
    finishLoading();
  } catch (error) {
    console.error(error);
    finishLoading("Failed to load Google Maps.");
  }
});

onBeforeUnmount(() => {
  autocompleteInstance.value = null;
  geocoderInstance.value = null;
  markerInstance.value = null;
  mapInstance.value = null;
});

const hasSameSelection = (lat: number, lng: number) =>
  selected.value?.lat === lat && selected.value?.lng === lng;

watch(
  () => props.modelValue,
  (value) => {
    if (!value) return;
    if (hasSameSelection(value.lat, value.lng)) return;
    updateSelection(value, { emit: false });
  },
  { deep: true },
);

watch(
  () => [props.lat, props.lng],
  ([lat, lng]) => {
    if (props.modelValue) return;
    if (typeof lat !== "number" || typeof lng !== "number") return;
    if (hasSameSelection(lat, lng)) return;
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

<style scoped>
.location-map {
  display: grid;
  gap: 10px;
}

.map-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #374151;
  font-weight: 700;
}

.map-search {
  display: flex;
}

.map-input {
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 13px;
  color: #111827;
  background: #fff;
}

.map-input:focus {
  outline: 2px solid rgba(14, 165, 164, 0.25);
  border-color: #0ea5a4;
}

.map-frame {
  position: relative;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  background: #f8fafc;
}

.map-canvas {
  width: 100%;
  height: 100%;
  min-height: 220px;
}

.map-overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
  background: rgba(255, 255, 255, 0.85);
}

.map-error {
  color: #b91c1c;
}

.map-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 12px;
  color: #6b7280;
}
</style>
