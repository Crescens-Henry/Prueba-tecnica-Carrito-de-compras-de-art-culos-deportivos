import { useEffect, useMemo, useState } from 'react'
import { fetchProducts, type Product } from '../../lib/api/products'
import { useLocation, useNavigate } from 'react-router-dom'
import { addItem } from '../../store/slices/cartSlice'
import { useAppDispatch } from '../../store/hooks'
import Pagination from '../../components/ui/Pagination'
import { SkeletonCard } from '../../components/ui/Skeleton'
import ProductModal from '../../components/ui/ProductModal'
import { showToast } from '../../lib/toast'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardMedia from '@mui/material/CardMedia'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Select from '@mui/material/Select'
import type { SelectChangeEvent } from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import LinearProgress from '@mui/material/LinearProgress'
import TextField from '@mui/material/TextField'
import { addItem as apiCartAdd } from '../../lib/api/cart'
import Chip from '@mui/material/Chip'
import TopBarProgress from '../../components/ui/TopBarProgress'

function useQuery() {
  const { search } = useLocation()
  return useMemo(() => new URLSearchParams(search), [search])
}

export default function ProductsList() {
  const q = useQuery()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const dispatch = useAppDispatch()

  const page = parseInt(q.get('page') || '1', 10)
  const search = q.get('search') || ''
  const sort = (q.get('sort') || 'price_asc') as 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc'
  const [searchInput, setSearchInput] = useState(search)
  const category = (q.get('category') || 'all') as 'all' | 'futbol' | 'baloncesto' | 'tenis' | 'running' | 'natacion' | 'ciclismo' | 'gimnasio' | 'yoga' | 'padel' | 'voleibol' | 'rugby'

  useEffect(() => {
    let active = true
    // Mostrar skeleton siempre en cambios de página/filtros
    setLoading(true)
    setIsFetching(false)
    setError(null)
    setItems([])
    fetchProducts({ page, pageSize: 12, search, sort, category: category === 'all' ? undefined : category })
      .then((res) => { if (!active) return; setItems(res.items); setTotal(res.total) })
      .catch(() => { if (!active) return; setError('No pudimos cargar productos') })
      .finally(() => { if (!active) return; setLoading(false); setIsFetching(false) })
    return () => { active = false }
  }, [page, search, sort, category])

  function onPageChange(p: number) {
    const params = new URLSearchParams(q)
    params.set('page', String(p))
    navigate(`/app/products?${params.toString()}`)
  }

  function onSortChange(e: SelectChangeEvent) {
    const params = new URLSearchParams(q)
    params.set('sort', e.target.value)
    params.set('page', '1')
    navigate(`/app/products?${params.toString()}`)
  }

  function onCategoryChange(e: SelectChangeEvent) {
    const params = new URLSearchParams(q)
    params.set('category', e.target.value)
    params.set('page', '1')
    navigate(`/app/products?${params.toString()}`)
  }

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams(q)
    params.set('search', searchInput)
    params.set('page', '1')
    navigate(`/app/products?${params.toString()}`)
  }

  async function addToCart(p: Product) {
    // Validar stock suficiente
    const availableStock = p.stock ?? 1
    if (1 > availableStock) {
      showToast(`Stock insuficiente. Disponibles: ${availableStock}`, 'error')
      return
    }

    // Toast inmediato para disimular latencia
    showToast('Agregado al carrito', 'success')
    try {
      await apiCartAdd(p.id, 1)
      dispatch(addItem({ productId: p.id, name: p.name, price: p.price, qty: 1, image: p.image }))
    } catch {
      // opcional: podríamos mostrar error o revertir; pedido: mantener toast inmediato
    }
  }

  function openProductModal(productId: string) {
    setSelectedProductId(productId)
    setModalOpen(true)
  }

  function closeProductModal() {
    setModalOpen(false)
    setSelectedProductId(null)
  }

  return (
    <div>
      <TopBarProgress show={loading} />
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2} gap={2} flexWrap="wrap">
        <Typography variant="h5" fontWeight={700}>Productos</Typography>
        <Box component="form" onSubmit={onSearchSubmit} display="flex" gap={1}>
          <TextField size="small" placeholder="Buscar productos" value={searchInput} onChange={(e)=>setSearchInput(e.target.value)} />
          <Button type="submit" variant="contained" size="small">Buscar</Button>
        </Box>
        <Box display="flex" gap={1}>
          <FormControl size="small">
            <InputLabel id="sort-label">Ordenar</InputLabel>
            <Select labelId="sort-label" label="Ordenar" value={sort} onChange={onSortChange}>
              <MenuItem value="price_asc">Precio ↑</MenuItem>
              <MenuItem value="price_desc">Precio ↓</MenuItem>
              <MenuItem value="name_asc">Nombre A-Z</MenuItem>
              <MenuItem value="name_desc">Nombre Z-A</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel id="cat-label">Categoría</InputLabel>
            <Select labelId="cat-label" label="Categoría" value={category} onChange={onCategoryChange}>
              <MenuItem value="all">Todas</MenuItem>
              <MenuItem value="futbol">Fútbol</MenuItem>
              <MenuItem value="baloncesto">Baloncesto</MenuItem>
              <MenuItem value="tenis">Tenis</MenuItem>
              <MenuItem value="running">Running</MenuItem>
              <MenuItem value="natacion">Natación</MenuItem>
              <MenuItem value="ciclismo">Ciclismo</MenuItem>
              <MenuItem value="gimnasio">Gimnasio</MenuItem>
              <MenuItem value="yoga">Yoga</MenuItem>
              <MenuItem value="padel">Pádel</MenuItem>
              <MenuItem value="voleibol">Voleibol</MenuItem>
              <MenuItem value="rugby">Rugby</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      {isFetching && <LinearProgress sx={{ mb: 2 }} />}

      {loading && (
        <Box sx={{ overflowX: 'hidden', display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Box key={i}><SkeletonCard /></Box>
          ))}
        </Box>
      )}

      {!loading && error && (
        <Alert severity="error">{error}</Alert>
      )}

      {!loading && !error && items.length === 0 && (
        <Box textAlign="center" p={4}>
          <Typography variant="body1">No encontramos productos con esos filtros</Typography>
        </Box>
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <Box sx={{ overflowX: 'hidden', display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2 }}>
            {items.map((p) => {
              const outOfStock = (p.stock ?? 1) <= 0
              return (
                <Card key={p.id} sx={{ opacity: outOfStock ? 0.5 : 1, position: 'relative', display: 'flex', flexDirection: 'column', height: '100%' }}>
                  {outOfStock && (
                    <Chip label="Agotado" color="default" size="small" sx={{ position: 'absolute', top: 8, left: 8, bgcolor: 'grey.800', zIndex: 1 }} />
                  )}
                  <CardMedia component="img" image={p.image} alt={p.name} sx={{ height: 200, objectFit: 'cover', flexShrink: 0, cursor: 'pointer' }} onClick={() => openProductModal(p.id)} />
                  <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <Typography variant="subtitle1" sx={{ cursor: 'pointer' }} onClick={() => openProductModal(p.id)}>{p.name}</Typography>
                      <Typography variant="body2" color="text.secondary">${p.price}</Typography>
                    </div>
                    <Box display="flex" gap={1}>
                      <Button sx={{ flex: 1 }} size="small" variant="outlined" onClick={() => openProductModal(p.id)}>Ver detalles</Button>
                      <Button sx={{ flex: 1 }} size="small" variant="contained" disabled={outOfStock} onClick={() => addToCart(p)}>Agregar</Button>
                    </Box>
                  </CardContent>
                </Card>
              )
            })}
          </Box>
          <Box mt={3} display="flex" justifyContent="center">
            <Pagination page={page} pageSize={12} total={total} onPageChange={onPageChange} />
          </Box>
        </>
      )}

      <ProductModal open={modalOpen} productId={selectedProductId} onClose={closeProductModal} />
    </div>
  )
}
