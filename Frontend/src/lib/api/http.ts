export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

const BASE_URL: string = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL || 'http://localhost:3000'

export class ApiError extends Error {
  statusCode: number
  data: Record<string, unknown> | null

  constructor(statusCode: number, message: string, data: Record<string, unknown> | null = null) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.data = data
  }
}

function getToken(): string | null {
  try {
    return localStorage.getItem('auth_token')
  } catch {
    return null
  }
}

export async function apiFetch<T = unknown>(path: string, opts: { method?: HttpMethod; body?: unknown; headers?: Record<string, string> } = {}): Promise<T> {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`
  const headers: Record<string, string> = { 'content-type': 'application/json', ...(opts.headers || {}) }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(url, {
    method: opts.method || 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  })
  if (!res.ok) {
    let data: Record<string, unknown> | null = null
    try {
      data = (await res.json()) as Record<string, unknown>
    } catch {
      data = null
    }
    const message = (data?.message as string) || `HTTP ${res.status}`
    throw new ApiError(res.status, message, data)
  }
  if (res.status === 204) return undefined as unknown as T
  return (await res.json()) as T
}

export const api = {
  get: <T=unknown>(path: string) => apiFetch<T>(path, { method: 'GET' }),
  post: <T=unknown>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'POST', body }),
  patch: <T=unknown>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'PATCH', body }),
  del: <T=unknown>(path: string) => apiFetch<T>(path, { method: 'DELETE' })
}
