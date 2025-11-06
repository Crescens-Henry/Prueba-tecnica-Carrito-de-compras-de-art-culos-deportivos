import { api } from './http'

export type Product = {
  id: string
  name: string
  price: number
  category?: string
  description?: string
  image?: string
  stock?: number
}

export type ProductQuery = {
  page?: number
  pageSize?: number
  search?: string
  sort?: 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc'
  category?: string | 'all'
  min?: number
  max?: number
}

function mapItem(it: any): Product {
  return {
    id: it.productId,
    name: it.name,
    price: it.price,
    category: it.category,
    description: it.description,
    image: it.image || `https://source.unsplash.com/400x300/?${encodeURIComponent(it.category || 'sports')}`,
    stock: it.stock
  }
}

export async function fetchProducts(q: ProductQuery = {}) {
  // Cache y de-duplicación en memoria para evitar múltiples llamadas por StrictMode/PersistGate y mejorar latencia
  const key = JSON.stringify({
    page: q.page ?? 1,
    pageSize: q.pageSize ?? 12,
    search: q.search || '',
    sort: q.sort || 'price_asc',
    category: q.category || 'all',
    min: q.min ?? null,
    max: q.max ?? null
  })
  const now = Date.now()
  const TTL = 15_000 // 15s
  if (!('__cache' in fetchProducts)) {
    ;(fetchProducts as any).__cache = new Map<string, { t: number; v: any }>()
    ;(fetchProducts as any).__pending = new Map<string, Promise<any>>()
  }
  const cache: Map<string, { t: number; v: any }> = (fetchProducts as any).__cache
  const pending: Map<string, Promise<any>> = (fetchProducts as any).__pending
  const cached = cache.get(key)
  if (cached && now - cached.t < TTL) return cached.v
  const inflight = pending.get(key)
  if (inflight) return inflight

  const p = (async () => {
    // Estrategia: pedir en lotes (máx 50 por backend) hasta cubrir la página solicitada
    const page = q.page ?? 1
    const pageSize = q.pageSize ?? 12
    const needed = page * pageSize
    let cursor: string | undefined
    let acc: Product[] = []
    const params = new URLSearchParams()
    // Para una buena UX y paginación, pedimos 100 por lote (cap del backend)
    params.set('pageSize', '100')
    // Importante: buscamos en cliente para que sea case-insensitive y traer suficientes datos
    // por lo que NO enviamos 'search' al backend
    if (q.category && q.category !== 'all') params.set('category', q.category)
    if (q.min != null) params.set('min', String(q.min))
    if (q.max != null) params.set('max', String(q.max))
    if (q.sort) params.set('sort', q.sort)

    // Traer páginas en lotes hasta cubrir lo necesario (o un poco más) o no haya más
    for (let i = 0; i < 10; i++) { // hard cap para evitar loops
      const qs = new URLSearchParams(params)
      if (cursor) qs.set('cursor', cursor)
      const res = await api.get<{ items: any[]; pageSize: number; cursorNext?: string }>(`/products?${qs.toString()}`)
      acc = acc.concat((res.items || []).map(mapItem))
      cursor = res.cursorNext
      // Trae un colchón para que el filtrado por búsqueda no se quede corto
      const target = Math.max(needed, 100)
      if (!cursor || acc.length >= target) break
    }
    let list = acc
    // Filtrar por búsqueda en cliente (case-insensitive)
    if (q.search && q.search.trim().length > 0) {
      const needle = q.search.toLowerCase()
      list = list.filter(p => p.name.toLowerCase().includes(needle))
    }

    // Ordenar en cliente si es necesario
    switch (q.sort) {
      case 'price_asc':
        list.sort((a, b) => a.price - b.price)
        break
      case 'price_desc':
        list.sort((a, b) => b.price - a.price)
        break
      case 'name_asc':
        list.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'name_desc':
        list.sort((a, b) => b.name.localeCompare(a.name))
        break
    }

    const total = list.length
    const start = (page - 1) * pageSize
    const items = list.slice(start, start + pageSize)
    const value = { items, total, page, pageSize }
    cache.set(key, { t: now, v: value })
    return value
  })()

  pending.set(key, p)
  try {
    return await p
  } finally {
    pending.delete(key)
  }
}

export async function getProductById(id: string) {
  const res = await api.get<any>(`/products/${id}`)
  return mapItem(res)
}
