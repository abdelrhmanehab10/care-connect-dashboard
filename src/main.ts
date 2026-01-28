import { createApp } from 'vue'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import PrimeVue from 'primevue/config'
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

const app = createApp(App)

const queryClient = new QueryClient()
const vuetify = createVuetify({
  components: { VCalendar },
  directives,
})

app.use(PrimeVue, { unstyled: true })
app.use(VueQueryPlugin, { queryClient })
app.use(vuetify)

app.mount('#app')
