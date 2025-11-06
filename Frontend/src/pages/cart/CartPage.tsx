import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { removeItem, updateQty, clear, setAll } from '../../store/slices/cartSlice'
import type { CartItem } from '../../store/slices/cartSlice'
import { useNavigate } from 'react-router-dom'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'
import IconButton from '@mui/material/IconButton'
import RemoveIcon from '@mui/icons-material/Remove'
import AddIcon from '@mui/icons-material/Add'
import { showToast } from '../../lib/toast'
import { useEffect, useState } from 'react'
import { getCart as apiGetCart } from '../../lib/api/cart'
import { deleteItem as apiCartDelete, updateItem as apiCartUpdate } from '../../lib/api/cart'

export default function CartPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = useAppSelector((s: any) => s.cart.items)
  const dispatch = useAppDispatch()
  const [hydrating, setHydrating] = useState(false)
  const navigate = useNavigate()
  const subtotal = items.reduce((acc: number, it: { price: number; qty: number }) => acc + it.price * it.qty, 0)


  useEffect(() => {
    let active = true
    setHydrating(true)
    ;(async () => {
      try {
        const res = await apiGetCart()
        const enriched: CartItem[] = (res.items || []).map((it) => ({
          id: `${it.productId}`,
          productId: it.productId,
          name: it.name || it.productId,
          price: it.priceAtAdd,
          qty: it.quantity,
          image: it.image
        }))
        if (!active) return
        dispatch(setAll(enriched))
      } finally {
        if (active) setHydrating(false)
      }
    })()
    return () => { active = false }
  }, [dispatch])

  if (!hydrating && items.length === 0) {
    return (
      <Box textAlign="center" p={4}>
        <Typography>Tu carrito está vacío.</Typography>
        <Button sx={{ mt: 2 }} variant="contained" onClick={()=>navigate('/app/products')}>Ir a productos</Button>
      </Box>
    )
  }

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        {hydrating ? (
          <Box display="grid" gap={2}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Skeleton variant="rounded" width={96} height={96} />
                  <Box flex={1}>
                    <Skeleton width="60%" height={24} />
                    <Skeleton width="30%" />
                  </Box>
                  <Skeleton variant="rounded" width={96} height={40} />
                  <Skeleton variant="rounded" width={72} height={36} />
                </CardContent>
              </Card>
            ))}
          </Box>
        ) : (
          <Box display="grid" gap={2}>
            {items.map((it: CartItem) => (
              <Card key={it.id}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {it.image && <Box component="img" src={it.image} alt={it.name} sx={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 1 }} />}
                  <Box flex={1}>
                    <Typography fontWeight={600}>{it.name}</Typography>
                    <Typography color="text.secondary">${it.price}</Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    <IconButton size="small" aria-label="decrement"
                      onClick={async ()=>{
                        const newQty = it.qty - 1
                        if (newQty <= 0) {
                          // Toast inmediato
                          showToast('Producto eliminado del carrito', 'success')
                          await apiCartDelete(it.productId)
                          dispatch(removeItem(it.id))
                          return
                        }
                        // Optimista + toast inmediato
                        showToast('Cantidad actualizada', 'success')
                        dispatch(updateQty({ id: it.id, qty: newQty }))
                        try {
                          await apiCartUpdate(it.productId, newQty)
                        } catch {
                          // revertir si falla
                          dispatch(updateQty({ id: it.id, qty: it.qty }))
                          showToast('No se pudo actualizar la cantidad', 'error')
                        }
                      }}>
                      <RemoveIcon fontSize="small" />
                    </IconButton>
                    <TextField size="small" value={it.qty} sx={{ width: 72 }} disabled />
                    <IconButton size="small" aria-label="increment"
                      onClick={async ()=>{
                        const newQty = it.qty + 1
                        // Optimista + toast inmediato
                        showToast('Cantidad actualizada', 'success')
                        dispatch(updateQty({ id: it.id, qty: newQty }))
                        try {
                          await apiCartUpdate(it.productId, newQty)
                        } catch {
                          dispatch(updateQty({ id: it.id, qty: it.qty }))
                          showToast('No se pudo actualizar la cantidad', 'error')
                        }
                      }}>
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Button color="inherit" onClick={async ()=>{ showToast('Producto eliminado del carrito', 'success'); await apiCartDelete(it.productId); dispatch(removeItem(it.id)) }}>Quitar</Button>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Grid>
      <Grid item xs={12} md={4}>
        <Card sx={{ position: 'sticky', top: 16 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} mb={2}>Resumen</Typography>
            {hydrating ? (
              <>
                <Box display="flex" justifyContent="space-between" mb={1}><span>Subtotal</span><Skeleton width={80} /></Box>
                <Box display="flex" justifyContent="space-between" mb={2}><span>Total</span><Skeleton width={80} /></Box>
                <Button fullWidth variant="contained" disabled>Ir a pagar</Button>
                <Button fullWidth sx={{ mt: 1 }} disabled>Vaciar carrito</Button>
              </>
            ) : (
              <>
                <Box display="flex" justifyContent="space-between" mb={1}><span>Subtotal</span><b>${subtotal.toFixed(2)}</b></Box>
                <Box display="flex" justifyContent="space-between" mb={2}><span>Total</span><b>${subtotal.toFixed(2)}</b></Box>
                <Button fullWidth variant="contained" onClick={()=>navigate('/app/checkout')}>Ir a pagar</Button>
                <Button fullWidth sx={{ mt: 1 }} onClick={async ()=>{ await Promise.all(items.map((it: CartItem)=> apiCartDelete(it.productId))); dispatch(clear()) }}>Vaciar carrito</Button>
              </>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
