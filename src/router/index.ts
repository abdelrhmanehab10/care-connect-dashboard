import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import AppointmentsPage from "../pages/AppointmentsPage.vue";
import LogPage from "../pages/LogPage.vue";

export const routes: RouteRecordRaw[] = [
  {
    path: "/",
    redirect: "/appointments",
  },
  {
    path: "/appointments",
    name: "appointments",
    component: AppointmentsPage,
  },
  {
    path: "/log/:appointmentId",
    name: "appointment-log",
    component: LogPage,
    props: false,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
