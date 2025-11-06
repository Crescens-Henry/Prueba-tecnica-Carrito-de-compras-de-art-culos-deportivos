import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getProductById, type Product } from '../../lib/api/products'
import { addItem } from '../../store/slices/cartSlice'
import { useAppDispatch } from '../../store/hooks'
import Grid from '@mui/material/Grid'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Skeleton from '@mui/material/Skeleton'
import { showToast } from '../../lib/toast'
import { addItem as apiCartAdd } from '../../lib/api/cart'
import Chip from '@mui/material/Chip'

export default function ProductDetail() {
  const { id } = useParams()
  const [p, setP] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [qty, setQty] = useState(1)
  const dispatch = useAppDispatch()

  useEffect(() => {
    let active = true
    setLoading(true)
    getProductById(id || '')
      .then((res) => { if (!active) return; setP(res) })
      .finally(() => { if (!active) return; setLoading(false) })
    return () => { active = false }
  }, [id])

  if (loading) return <Skeleton variant="rounded" height={256} />
  if (!p) return <Box textAlign="center" p={4}>No encontramos el producto</Box>

  return (
    <Grid container spacing={3} alignItems="flex-start">
      <Grid item xs={12} md={6}>
        <Box position="relative">
          {(p.stock ?? 1) <= 0 && (
            <Chip label="Agotado" color="default" size="small" sx={{ position: 'absolute', top: 8, left: 8, zIndex: 1, bgcolor: 'grey.800' }} />
          )}
          <Box component="img" src={p.image} alt={p.name} sx={{ width: '100%', borderRadius: 2, opacity: (p.stock ?? 1) <= 0 ? 0.5 : 1 }} />
        </Box>
      </Grid>
      <Grid item xs={12} md={6}>
        <Typography variant="h5" fontWeight={700} mb={1}>{p.name}</Typography>
        <Typography variant="h6" color="text.secondary" mb={2}>${p.price}</Typography>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <Typography>Cantidad</Typography>
          <TextField type="number" size="small" inputProps={{ min: 1 }} value={qty}
            onChange={(e) => setQty(Math.max(1, parseInt(e.target.value || '1', 10)))} sx={{ width: 96 }} />
        </Box>
        <Button variant="contained" disabled={(p.stock ?? 1) <= 0} onClick={async () => { showToast('Agregado al carrito', 'success'); try { await apiCartAdd(p.id, qty) } catch {}; dispatch(addItem({ productId: p.id, name: p.name, price: p.price, qty })) }}>Agregar al carrito</Button>
      </Grid>
    </Grid>
  )
}
