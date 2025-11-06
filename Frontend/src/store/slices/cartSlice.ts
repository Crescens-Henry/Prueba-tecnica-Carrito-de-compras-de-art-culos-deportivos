import { createSlice, nanoid } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

export type CartItem = {
  id: string // internal id for cart row
  productId: string
  name: string
  price: number
  qty: number
  image?: string
}

export type CartState = {
  items: CartItem[]
}

const initialState: CartState = {
  items: []
}

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    setAll(state: CartState, action: PayloadAction<CartItem[]>) {
      state.items = action.payload
    },
    addItem: {
      reducer(state: CartState, action: PayloadAction<CartItem>) {
        const existing = state.items.find(
          (i: CartItem) => i.productId === action.payload.productId
        )
        if (existing) {
          existing.qty += action.payload.qty
        } else {
          state.items.push(action.payload)
        }
      },
      prepare(input: Omit<CartItem, 'id'>) {
        return { payload: { ...input, id: nanoid() } }
      }
    },
    updateQty(state: CartState, action: PayloadAction<{ id: string; qty: number }>) {
      const item = state.items.find((i: CartItem) => i.id === action.payload.id)
      if (item) item.qty = Math.max(1, action.payload.qty)
    },
    removeItem(state: CartState, action: PayloadAction<string>) {
      state.items = state.items.filter((i: CartItem) => i.id !== action.payload)
    },
    clear(state: CartState) {
      state.items = []
    }
  }
})

export const { setAll, addItem, updateQty, removeItem, clear } = cartSlice.actions
export default cartSlice.reducer
