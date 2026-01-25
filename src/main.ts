import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import { createVuetify } from 'vuetify'
import { VCalendar } from 'vuetify/components'
import * as directives from 'vuetify/directives'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'vuetify/styles'
import './tailwind.css'
import './style.css'
import App from './App.vue'

const app = createApp(App)
const vuetify = createVuetify({
  components: { VCalendar },
  directives,
})
app.use(PrimeVue, { unstyled: true })
app.use(vuetify)
app.mount('#app')
