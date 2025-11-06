import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import { store, persistor } from './store'

// Para evitar duplicar efectos y peticiones en desarrollo (StrictMode + rehidratación de persistencia),
// rendereamos sin StrictMode. Si quieres mantener StrictMode, podemos añadir deduplicación adicional.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </PersistGate>
  </Provider>
)
