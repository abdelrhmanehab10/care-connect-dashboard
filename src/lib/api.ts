import axios, { AxiosHeaders } from "axios";

export const http = axios.create({
  baseURL: import.meta.env.DEV ? import.meta.env.VITE_API_URL ?? "" : "",
});

http.interceptors.request.use((config) => {
  const token = import.meta.env.VITE_TOKEN;
  if (token) {
    const headers = AxiosHeaders.from(config.headers);
    headers.set("Authorization", `Bearer ${token}`);
    config.headers = headers;
  }
  return config;
});
