import { useState, useEffect } from 'react'
import { type Product, getProductById } from '../../lib/api/products'
import { addItem } from '../../store/slices/cartSlice'
import { useAppDispatch } from '../../store/hooks'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Skeleton from '@mui/material/Skeleton'
import Chip from '@mui/material/Chip'
import { showToast } from '../../lib/toast'
import { addItem as apiCartAdd } from '../../lib/api/cart'

interface ProductModalProps {
  open: boolean
  productId: string | null
  onClose: () => void
}

export default function ProductModal({ open, productId, onClose }: ProductModalProps) {
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(false)
  const [qty, setQty] = useState(1)
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (!open || !productId) {
      setProduct(null)
      setQty(1)
      return
    }

    let active = true
    setLoading(true)
    getProductById(productId)
      .then((res) => {
        if (!active) return
        setProduct(res)
      })
      .catch(() => {
        if (!active) return
        showToast('No pudimos cargar el producto', 'error')
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [open, productId])

  async function handleAddToCart() {
    if (!product) return

    // Validar stock suficiente
    const availableStock = product.stock ?? 1
    if (qty > availableStock) {
      showToast(`Stock insuficiente. Disponibles: ${availableStock}`, 'error')
      return
    }

    showToast('Agregado al carrito', 'success')
    try {
      await apiCartAdd(product.id, qty)
      dispatch(addItem({ productId: product.id, name: product.name, price: product.price, qty, image: product.image }))
      onClose()
      setQty(1)
    } catch {
      showToast('Error al agregar al carrito', 'error')
    }
  }

  const outOfStock = (product?.stock ?? 1) <= 0
  const insufficientStock = qty > (product?.stock ?? 1)

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Detalles del Producto</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        {loading ? (
          <>
            <Skeleton variant="rounded" height={300} sx={{ mb: 2 }} />
            <Skeleton height={40} sx={{ mb: 1 }} />
            <Skeleton height={30} width="60%" sx={{ mb: 2 }} />
          </>
        ) : product ? (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Box position="relative">
                {outOfStock && (
                  <Chip
                    label="Agotado"
                    color="default"
                    size="small"
                    sx={{ position: 'absolute', top: 8, left: 8, zIndex: 1, bgcolor: 'grey.800' }}
                  />
                )}
                <Box
                  component="img"
                  src={product.image}
                  alt={product.name}
                  sx={{ width: '100%', borderRadius: 1, opacity: outOfStock ? 0.5 : 1 }}
                />
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" fontWeight={700} mb={1}>
                {product.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={1}>
                {product.description}
              </Typography>
              <Typography variant="h5" color="primary" fontWeight={700} mb={2}>
                ${product.price}
              </Typography>
              {product.category && (
                <Chip label={`Categoría: ${product.category}`} size="small" sx={{ mb: 2 }} />
              )}
              {product.stock !== undefined && (
                <Typography variant="body2" color="text.secondary">
                  Stock: {product.stock > 0 ? `${product.stock} disponibles` : 'Agotado'}
                </Typography>
              )}
            </Grid>
            <Grid item xs={12}>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography>Cantidad:</Typography>
                <TextField
                  type="number"
                  size="small"
                  inputProps={{ min: 1, max: product.stock ?? 999 }}
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, parseInt(e.target.value || '1', 10)))}
                  sx={{ width: 80 }}
                />
                {insufficientStock && (
                  <Typography variant="body2" color="error">
                    Stock insuficiente
                  </Typography>
                )}
              </Box>
            </Grid>
          </Grid>
        ) : (
          <Typography>No encontramos el producto</Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
        <Button
          variant="contained"
          onClick={handleAddToCart}
          disabled={loading || !product || outOfStock || insufficientStock}
        >
          Agregar al carrito
        </Button>
      </DialogActions>
    </Dialog>
  )
}
