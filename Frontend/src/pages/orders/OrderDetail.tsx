import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getOrder, type Order } from '../../lib/api/orders'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Skeleton from '@mui/material/Skeleton'
import TopBarProgress from '../../components/ui/TopBarProgress'

export default function OrderDetail() {
  const { orderId } = useParams()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    if (!orderId) return
    getOrder(orderId).then((o) => { if (!active) return; setOrder(o) }).finally(()=>{ if (active) setLoading(false) })
    return () => { active = false }
  }, [orderId])

  if (loading) return (
    <Box>
      <TopBarProgress show={true} />
      <Skeleton width={240} height={32} sx={{ mb: 1 }} />
      <Skeleton width={320} sx={{ mb: 2 }} />
      <Box display="grid" gap={2}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Skeleton width={220} />
                <Skeleton width={180} />
              </Box>
              <Skeleton width={120} />
            </CardContent>
          </Card>
        ))}
      </Box>
      <Box mt={2} display="flex" justifyContent="flex-end">
        <Skeleton width={160} height={32} />
      </Box>
    </Box>
  )
  if (!order) return <Box p={2}>Pedido no encontrado</Box>

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={2}>Pedido #{order.orderId?.slice(0,8)}</Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>{new Date(order.createdAt).toLocaleString()} • Estado: {order.status}</Typography>
      <Box display="grid" gap={2}>
        {order.items.map((it) => (
          <Card key={it.productId}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography>Producto: {it.productId}</Typography>
                <Typography variant="body2" color="text.secondary">Cantidad: {it.quantity} • Precio: ${it.price.toFixed(2)}</Typography>
              </Box>
              <Typography fontWeight={700}>Subtotal: ${it.subtotal.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
      <Box mt={2} display="flex" justifyContent="flex-end">
        <Typography variant="h6">Total: ${order.total.toFixed(2)}</Typography>
      </Box>
    </Box>
  )
}
