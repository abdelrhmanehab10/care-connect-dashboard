import axios, { AxiosHeaders } from "axios";

export const http = axios.create({
  baseURL: import.meta.env.DEV ? import.meta.env.VITE_API_URL ?? "" : "",
});

http.interceptors.request.use((config) => {
  const token = import.meta.env.VITE_TOKEN;
  if (token) {
    if (!config.headers) {
      config.headers = new AxiosHeaders();
    }
    if (config.headers instanceof AxiosHeaders) {
      config.headers.set("Authorization", `Bearer ${token}`);
    } else {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      } as AxiosHeaders;
    }
  }
  return config;
});
