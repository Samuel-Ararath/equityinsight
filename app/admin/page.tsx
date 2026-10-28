'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowLeft, ShieldCheck, Users, LoaderCircle } from 'lucide-react'
import { changeProfileRole, getProfile, getSession, listProfiles, type ElmesiaProfile, type ElmesiaRole } from '@/lib/supabase-auth'

const roles: { value: ElmesiaRole; label: string }[] = [
  { value: 'administrator', label: 'Administrator' },
  { value: 'sub_administrator', label: 'Sub-Administrator' },
  { value: 'cardinal', label: 'Cardinal' },
  { value: 'premium_member', label: 'Luminary · Premium' },
  { value: 'free_member', label: 'Initiate · Free' },
]

export default function AdminPage() {
  const [profiles, setProfiles] = useState<ElmesiaProfile[]>([])
  const [authorized, setAuthorized] = useState(false)
  const [busy, setBusy] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function load() {
      try {
        if (!getSession()) { window.location.assign('/akun/'); return }
        const profile = await getProfile()
        if (profile?.role !== 'administrator') { setMessage('Halaman ini hanya dapat diakses oleh Administrator.'); setBusy(false); return }
        setAuthorized(true)
        setProfiles(await listProfiles())
      } catch (error) { setMessage(error instanceof Error ? error.message : 'Data anggota gagal dimuat.') }
      finally { setBusy(false) }
    }
    void load()
  }, [])

  async function updateRole(id: string, role: ElmesiaRole) {
    setBusy(true); setMessage('')
    try { await changeProfileRole(id, role); setProfiles(await listProfiles()); setMessage('Role berhasil diperbarui.') }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Role gagal diperbarui.') }
    finally { setBusy(false) }
  }

  return <main className="min-h-screen bg-[#090b0d] px-5 py-10 text-[#f2f0e9] sm:px-8"><div className="mx-auto max-w-5xl">
    <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-white/55 hover:text-white"><ArrowLeft className="size-4"/>Kembali ke workspace</Link>
    <div className="mt-9 flex items-center gap-4"><div className="grid size-12 place-items-center rounded-2xl border border-[#cdb984]/25 bg-[#cdb984]/[.08] text-[#d5c18c]"><ShieldCheck className="size-5"/></div><div><p className="text-[10px] uppercase tracking-[.2em] text-[#cdb984]">Elmesia control</p><h1 className="mt-1 font-serif text-3xl">Administrator</h1></div></div>
    <section className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-[#111416]"><div className="flex items-center justify-between border-b border-white/[.08] p-5"><div><h2 className="font-medium">Anggota & akses</h2><p className="mt-1 text-xs text-white/45">Hak tertinggi untuk mengelola peran platform.</p></div><Users className="size-5 text-[#cdb984]"/></div>
      {busy ? <div className="flex items-center gap-2 p-6 text-sm text-white/55"><LoaderCircle className="size-4 animate-spin"/>Memuat data anggota…</div> : !authorized ? <p className="p-6 text-sm text-white/65">{message}</p> : <div className="divide-y divide-white/[.07]">{profiles.map(profile=><div key={profile.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium">{profile.display_name || 'Anggota Elmesia'}</p><p className="mt-1 font-mono text-[10px] text-white/35">{profile.id}</p></div><select value={profile.role} onChange={event=>void updateRole(profile.id,event.target.value as ElmesiaRole)} className="rounded-lg border border-white/10 bg-[#090b0d] px-3 py-2 text-xs text-white outline-none focus:border-[#cdb984]/50">{roles.map(role=><option key={role.value} value={role.value}>{role.label}</option>)}</select></div>)}</div>}
      {message && authorized && <p role="status" className="border-t border-white/[.08] px-5 py-3 text-xs text-[#d9c990]">{message}</p>}
    </section>
  </div></main>
}
