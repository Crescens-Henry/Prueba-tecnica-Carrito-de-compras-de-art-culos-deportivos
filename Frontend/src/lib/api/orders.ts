import { api } from './http'

export type OrderItem = { productId: string; quantity: number; price: number; subtotal: number }
export type Order = { userId: string; orderId: string; items: OrderItem[]; total: number; status: string; createdAt: string }

export async function checkout() {
  return api.post<{ orderId: string; total: number; items: OrderItem[]; createdAt: string }>('/checkout')
}

export async function listOrders(cursor?: string) {
  const qs = new URLSearchParams()
  if (cursor) qs.set('cursor', cursor)
  return api.get<{ items: Order[]; pageSize: number; cursorNext?: string }>(`/orders${qs.toString() ? `?${qs.toString()}` : ''}`)
}

export async function getOrder(orderId: string) {
  return api.get<Order>(`/orders/${encodeURIComponent(orderId)}`)
}
