import axios from "axios";

export const http = axios.create({
  baseURL: import.meta.env.DEV ? import.meta.env.VITE_API_URL ?? "" : "",
});

http.interceptors.request.use((config) => {
  const token = import.meta.env.VITE_TOKEN;
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }
  return config;
});
