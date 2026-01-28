import axios from "axios";

const apiUrl =
  import.meta.env.API_URL ?? import.meta.env.VITE_API_URL ?? "-";
const token = import.meta.env.TOKEN ?? import.meta.env.VITE_TOKEN ?? "";

export const http = axios.create({
  baseURL: apiUrl,
});

http.interceptors.request.use((config) => {
  if (token && token !== "-") {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
