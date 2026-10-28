const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ubjljepundgttrohrwou.supabase.co'
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_bw6oAzB7PLadXfY3hcrMtQ_2l5SJasm'
const STORAGE_KEY = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`

export type ElmesiaRole = 'administrator' | 'sub_administrator' | 'cardinal' | 'premium_member' | 'free_member'
export type ElmesiaProfile = { id: string; display_name: string | null; role: ElmesiaRole }
export type ElmesiaSession = { access_token: string; refresh_token: string; user: { id: string; email?: string } }

function saveSession(session: ElmesiaSession | null) {
  if (typeof window === 'undefined') return
  if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  else localStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new Event('elmesia-auth-change'))
}

export function getSession(): ElmesiaSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as ElmesiaSession & { expires_at?: number; expires_in?: number; token_type?: string }
    return value
  } catch { return null }
}

async function authRequest(path: string, body?: Record<string, unknown>, token?: string) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.msg || payload.message || payload.error_description || payload.error || 'Permintaan autentikasi gagal.')
  return payload
}

export async function signIn(email: string, password: string) {
  const payload = await authRequest('token?grant_type=password', { email, password })
  saveSession(payload as ElmesiaSession)
}

export async function signUp(displayName: string, email: string, password: string) {
  const payload = await authRequest('signup', { email, password, data: { display_name: displayName } })
  if (payload.access_token) saveSession(payload as ElmesiaSession)
}

export async function signOut() {
  const session = getSession()
  if (session) await authRequest('logout', undefined, session.access_token).catch(() => undefined)
  saveSession(null)
}

export async function getProfile() {
  const session = getSession()
  if (!session) return null
  const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id,display_name,role&id=eq.${encodeURIComponent(session.user.id)}&limit=1`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}` },
  })
  if (response.status === 401) { saveSession(null); return null }
  if (!response.ok) throw new Error('Profil Elmesia gagal dimuat.')
  const rows = await response.json() as ElmesiaProfile[]
  return rows[0] ?? null
}

export async function listProfiles() {
  const session = getSession()
  if (!session) throw new Error('Sesi administrator tidak ditemukan.')
  const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id,display_name,role&order=created_at.asc`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}` },
  })
  const payload = await response.json().catch(() => [])
  if (!response.ok) throw new Error(payload.message || 'Daftar anggota hanya tersedia untuk Administrator.')
  return payload as ElmesiaProfile[]
}

export async function changeProfileRole(id: string, role: ElmesiaRole) {
  const session = getSession()
  if (!session) throw new Error('Sesi administrator tidak ditemukan.')
  const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ role, updated_at: new Date().toISOString() }),
  })
  if (!response.ok) { const payload = await response.json().catch(() => ({})); throw new Error(payload.message || 'Role tidak dapat diperbarui.') }
}
