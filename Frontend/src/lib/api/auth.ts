import { api } from './http'

export type LoginInput = { email: string; password: string }
export type RegisterInput = { name: string; email: string; password: string }

export async function login(input: LoginInput) {
  const res = await api.post<{ token: string; user: { userId: string; email: string; name: string } }>('/auth/login', input)
  return { token: res.token, user: { id: res.user.userId, email: res.user.email, name: res.user.name } }
}

export async function register(input: RegisterInput) {
  const res = await api.post<{ token: string; user: { userId: string; email: string; name: string } }>('/auth/register', input)
  return { token: res.token, user: { id: res.user.userId, email: res.user.email, name: res.user.name } }
}
