import { createApp } from 'vue'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import PrimeVue from 'primevue/config'
import { createVuetify } from 'vuetify'
import { VCalendar } from 'vuetify/components'
import * as directives from 'vuetify/directives'
import 'vuetify/styles'
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
