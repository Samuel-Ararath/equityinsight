'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, KeyRound, ShieldCheck, UserRound, UserPlus, LoaderCircle } from 'lucide-react'
import { getProfile, getSession, signIn, signOut, signUp, type ElmesiaProfile, type ElmesiaSession } from '@/lib/supabase-auth'

export default function AccountPage() {
  const [mode, setMode] = useState<'signin'|'signup'>('signin')
  const [session, setSession] = useState<ElmesiaSession|null>(null)
  const [profile, setProfile] = useState<ElmesiaProfile|null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function refresh() {
    const current = getSession()
    setSession(current)
    if (!current) { setProfile(null); return }
    try { setProfile(await getProfile()) } catch (error) { setMessage(error instanceof Error ? error.message : 'Profil tidak dapat dimuat.') }
  }

  useEffect(() => {
    void refresh()
    const update = () => { void refresh() }
    window.addEventListener('elmesia-auth-change', update)
    return () => window.removeEventListener('elmesia-auth-change', update)
  }, [])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('')
    try {
      if (mode === 'signin') await signIn(email, password)
      else await signUp(name, email, password)
      setPassword('')
      await refresh()
      if (mode === 'signup' && !getSession()) setMessage('Akun berhasil didaftarkan. Periksa email untuk konfirmasi, lalu masuk.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Permintaan akun gagal.') }
    finally { setBusy(false) }
  }

  return <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#090b0d] px-5 py-12 text-[#f2f0e9]">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_10%,rgba(137,117,75,.2),transparent_38%)]" />
    <Link href="/" className="absolute left-6 top-6 inline-flex items-center gap-2 text-sm text-white/65 transition hover:text-white"><ArrowLeft className="size-4"/>Kembali ke Elmesia</Link>
    <section className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#111416]/90 p-7 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-9">
      <Link href="/" className="inline-flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl border border-[#c8ad72]/35 bg-[#c8ad72]/10 font-serif text-xl text-[#d8c18d]">E</span><span className="font-serif text-xl">Elmesia</span></Link>
      {session ? <>
        <div className="mt-9 flex size-12 items-center justify-center rounded-2xl border border-[#d3bd88]/20 bg-[#d3bd88]/[.08] text-[#d3bd88]"><UserRound className="size-5"/></div>
        <h1 className="mt-5 font-serif text-3xl">Akun Anda</h1>
        <p className="mt-2 text-sm text-white/55">{session.user.email}</p>
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[.025] p-4"><p className="text-[10px] uppercase tracking-[.18em] text-white/45">Peran saat ini</p><p className="mt-2 font-medium text-[#e2d09f]">{profile?.role?.replaceAll('_',' ') ?? 'Memuat profil…'}</p></div>
        {profile?.role === 'administrator' && <Link href="/admin" className="mt-4 flex items-center justify-between rounded-xl border border-[#d3bd88]/25 bg-[#d3bd88]/[.06] p-4 text-sm text-[#e2d09f] transition hover:bg-[#d3bd88]/[.1]">Panel Administrator<ArrowRight className="size-4"/></Link>}
        <button type="button" onClick={async()=>{await signOut();await refresh()}} className="mt-6 w-full rounded-xl border border-white/10 px-4 py-3 text-sm text-white/70 transition hover:bg-white/5">Keluar</button>
      </> : <>
        <p className="mt-9 text-[10px] font-semibold uppercase tracking-[.2em] text-[#cdb984]">Your Elmesia account</p>
        <h1 className="mt-3 font-serif text-3xl">{mode === 'signin' ? 'Selamat datang kembali.' : 'Mulai ruang kerja Anda.'}</h1>
        <p className="mt-2 text-sm leading-6 text-white/55">{mode === 'signin' ? 'Masuk untuk melanjutkan ke workspace.' : 'Akun baru dimulai dengan akses free member.'}</p>
        <form onSubmit={submit} className="mt-7 space-y-4">
          {mode === 'signup' && <label className="block text-xs text-white/65">Nama tampilan<input required value={name} onChange={e=>setName(e.target.value)} autoComplete="name" className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3.5 py-3 text-sm text-white outline-none transition focus:border-[#cdb984]/50"/></label>}
          <label className="block text-xs text-white/65">Email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3.5 py-3 text-sm text-white outline-none transition focus:border-[#cdb984]/50"/></label>
          <label className="block text-xs text-white/65">Password<input required type="password" minLength={8} value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==='signin'?'current-password':'new-password'} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3.5 py-3 text-sm text-white outline-none transition focus:border-[#cdb984]/50"/></label>
          {message && <p role="status" className="rounded-xl border border-white/10 bg-white/[.04] px-3.5 py-3 text-xs leading-5 text-white/75">{message}</p>}
          <button disabled={busy} className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#d3bd88] px-4 py-3.5 text-sm font-semibold text-[#17150f] transition hover:bg-[#e2d09f] disabled:opacity-60">{busy?<LoaderCircle className="size-4 animate-spin"/>:mode==='signin'?<KeyRound className="size-4"/>:<UserPlus className="size-4"/>}{mode==='signin'?'Masuk':'Buat akun'}<ArrowRight className="size-4 transition-transform group-hover:translate-x-1"/></button>
        </form>
        <p className="mt-5 text-center text-xs text-white/50">{mode==='signin'?'Belum punya akun?':'Sudah punya akun?'} <button type="button" onClick={()=>{setMode(mode==='signin'?'signup':'signin');setMessage('')}} className="text-[#dfce9e] hover:text-white">{mode==='signin'?'Daftar':'Masuk'}</button></p>
        <p className="mt-6 flex items-start gap-2 border-t border-white/[.08] pt-5 text-[11px] leading-5 text-white/40"><ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[#cdb984]"/>Role diberikan oleh Administrator dan diperiksa oleh database.</p>
      </>}
    </section>
  </main>
}
