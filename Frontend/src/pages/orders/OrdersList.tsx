import { useEffect, useState } from 'react'
import { listOrders, type Order } from '../../lib/api/orders'
import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Skeleton from '@mui/material/Skeleton'
import TopBarProgress from '../../components/ui/TopBarProgress'

export default function OrdersList() {
  const [items, setItems] = useState<Order[]>([])
  const [next, setNext] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(true)

  async function load(cur?: string) {
    setLoading(true)
    try {
      const res = await listOrders(cur)
      setItems(cur ? [...items, ...res.items] : res.items)
      setNext(res.cursorNext)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(undefined) // initial
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Box>
      <TopBarProgress show={loading} />
      <Typography variant="h5" fontWeight={700} mb={2}>Mis pedidos</Typography>
      <Box display="grid" gap={2}>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Skeleton width={160} height={24} />
                  <Skeleton width={240} />
                </Box>
                <Box display="flex" alignItems="center" gap={2}>
                  <Skeleton width={64} />
                  <Skeleton variant="rounded" width={72} height={32} />
                </Box>
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            {items.map((o) => (
              <Card key={o.orderId}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography fontWeight={600}>Pedido #{o.orderId.slice(0,8)}</Typography>
                    <Typography variant="body2" color="text.secondary">{new Date(o.createdAt).toLocaleString()} • {o.items.length} artículos</Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Typography fontWeight={700}>${o.total.toFixed(2)}</Typography>
                    <Button size="small" variant="outlined" component={RouterLink} to={`/app/orders/${o.orderId}`}>Ver</Button>
                  </Box>
                </CardContent>
              </Card>
            ))}
            {items.length === 0 && (
              <Box textAlign="center" p={4}>Aún no tienes pedidos</Box>
            )}
          </>
        )}
      </Box>
      {next && (
        <Box mt={2} textAlign="center">
          <Button onClick={()=>load(next)} disabled={loading} variant="contained">{loading ? 'Cargando…' : 'Cargar más'}</Button>
        </Box>
      )}
    </Box>
  )
}
