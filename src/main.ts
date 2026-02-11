import { createApp } from 'vue'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import Toast from 'primevue/toast'
import { createVuetify } from 'vuetify'
import { VCalendar } from 'vuetify/components'
import * as directives from 'vuetify/directives'
import 'vuetify/styles'

/** ✅ Bootstrap (CSS + JS) */
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

/** ✅ Your SCSS (عندك بالفعل Styles/main.scss) */
import './Styles/main.scss'

/** (اختياري) باقي ستايلاتك */
import './style.css'

import App from './App.vue'
import AppointmentMap from './components/AppointmentMap.vue'
import router from './router'

const app = createApp(App)

const queryClient = new QueryClient()
const vuetify = createVuetify({
  components: { VCalendar },
  directives,
})

app.use(PrimeVue, { unstyled: true })
app.use(ToastService)
app.use(VueQueryPlugin, { queryClient })
app.use(vuetify)
app.use(router)
app.component('Toast', Toast)
app.component('AppointmentMap', AppointmentMap)

app.mount('#app')
