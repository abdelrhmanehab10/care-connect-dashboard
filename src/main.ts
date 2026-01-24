import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import 'bootstrap/dist/css/bootstrap.min.css'
import './style.css'
import App from './App.vue'

const app = createApp(App)
app.use(PrimeVue, { unstyled: true })
app.mount('#app')
