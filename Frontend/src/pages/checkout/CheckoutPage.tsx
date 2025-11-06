import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { clear } from '../../store/slices/cartSlice'
import { showToast } from '../../lib/toast'
import Paper from '@mui/material/Paper'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import { checkout as apiCheckout } from '../../lib/api/orders'
import { useState } from 'react'

export default function CheckoutPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = useAppSelector((s: any) => s.cart.items)
  const total = items.reduce((acc: number, it: { price: number; qty: number }) => acc + it.price * it.qty, 0)
  const dispatch = useAppDispatch()
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function onPay() {
    setIsSubmitting(true)
    try {
      showToast('Pedido confirmado. ¡Gracias!', 'success')
      await apiCheckout()
      dispatch(clear())
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Box display="flex" justifyContent="center">
      <Paper elevation={3} sx={{ p: 3, width: '100%', maxWidth: 560 }}>
        <Typography variant="h6">Checkout</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>Total: <b>${total.toFixed(2)}</b></Typography>
        <Box mt={2} display="grid" gap={2}>
          <Typography variant="body2">No pedimos tarjeta: el pago se confirma directamente para esta prueba.</Typography>
          <Button variant="contained" disabled={isSubmitting || items.length === 0} fullWidth onClick={onPay}>
            {isSubmitting ? 'Procesando…' : 'Confirmar pedido'}
          </Button>
        </Box>
      </Paper>
    </Box>
  )
}
