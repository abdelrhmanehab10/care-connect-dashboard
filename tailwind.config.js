/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts}"],
  prefix: "tw-",
  important: ".cc-tailwind",
  corePlugins: {
    preflight: false,
  },
};
