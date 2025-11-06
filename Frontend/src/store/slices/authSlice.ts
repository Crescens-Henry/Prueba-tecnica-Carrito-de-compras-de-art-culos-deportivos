import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

export type User = {
  id: string
  email: string
  name: string
}

export type AuthState = {
  token: string | null
  user: User | null
}

const initialState: AuthState = {
  token: null,
  user: null
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess(state: AuthState, action: PayloadAction<{ token: string; user: User }>) {
      state.token = action.payload.token
      state.user = action.payload.user
      try { localStorage.setItem('auth_token', action.payload.token) } catch {}
    },
    logout(state: AuthState) {
      state.token = null
      state.user = null
      try { localStorage.removeItem('auth_token') } catch {}
    }
  }
})

export const { loginSuccess, logout } = authSlice.actions
export default authSlice.reducer
