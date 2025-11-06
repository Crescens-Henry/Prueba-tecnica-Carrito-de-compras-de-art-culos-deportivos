import Toastify from 'toastify-js'
import 'toastify-js/src/toastify.css'

export function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  Toastify({
    text: message,
    duration: 2500,
    gravity: 'bottom',
    position: 'right',
    stopOnFocus: true,
    close: true,
    style: {
      background: type === 'success' ? '#222222ff' : type === 'error' ? '#dc2626' : '#2563eb',
      boxShadow: 'rgba(0,0,0,0.3) 0px 4px 12px'
    }
  }).showToast()
}
