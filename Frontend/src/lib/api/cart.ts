import { api } from './http'

export async function getCart() {
  return api.get<{ items: Array<{ productId: string; quantity: number; priceAtAdd: number; name?: string; image?: string; stock?: number }>; total: number }>('/cart')
}

export async function addItem(productId: string, quantity = 1) {
  return api.post<{ ok: boolean }>('/cart/items', { productId, quantity })
}

export async function updateItem(productId: string, quantity: number) {
  return api.patch(`/cart/items/${encodeURIComponent(productId)}`, { quantity })
}

export async function deleteItem(productId: string) {
  return api.del(`/cart/items/${encodeURIComponent(productId)}`)
}
