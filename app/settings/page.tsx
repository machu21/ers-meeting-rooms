'use client'

import { useState, useTransition, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateEmployeeProfile } from './actions'
import Link from 'next/link'
import { UserCircleIcon, ArrowLeftIcon } from '@heroicons/react/24/solid'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  
  // Form State
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(data)
        setDisplayName(data?.display_name || '')
        if (data?.avatar_url) setPreviewImage(data.avatar_url)
      }
      setLoading(false)
    }
    loadProfile()
  }, [supabase])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setPreviewImage(URL.createObjectURL(file))
  }

  const handleSubmit = async (formData: FormData) => {
    if (password && password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' })
      return
    }

    setMessage(null)
    startTransition(async () => {
      const result = await updateEmployeeProfile(formData)
      setMessage({ type: result.success ? 'success' : 'error', text: result.message })
      
      if (result.success) {
        setProfile((prev: any) => ({ ...prev, display_name: displayName }))
        setPassword('')
        setConfirmPassword('')
        router.refresh()
      }
    })
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050914]">
        <svg className="h-8 w-8 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen w-full justify-center overflow-hidden bg-[#050914] p-6 sm:p-12">
      
      {/* Ambient Background Glows */}
      <div className="pointer-events-none absolute top-[-10%] left-[-10%] h-[600px] w-[600px] animate-[spin_15s_linear_infinite] rounded-full bg-blue-600/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] animate-[spin_20s_linear_infinite_reverse] rounded-full bg-purple-600/10 blur-[120px]" />

      <div className="relative z-10 w-full max-w-2xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">My Settings</h1>
            <p className="mt-1 text-sm text-gray-400">Customize how you appear on the virtual map.</p>
          </div>
          <Link 
            href="/office" 
            className="flex w-fit items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Office
          </Link>
        </header>

        {/* Frosted Glass Card */}
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#ffffff0a] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl sm:p-10">
          
          {message && (
            <div className={`mb-8 rounded-xl border p-4 text-sm font-medium ${
              message.type === 'success' 
                ? 'border-green-500/20 bg-green-500/10 text-green-400' 
                : 'border-red-500/20 bg-red-500/10 text-red-400'
            }`}>
              {message.text}
            </div>
          )}

          <form action={handleSubmit} className="flex flex-col gap-10">
            
            {/* --- PROFILE SECTION --- */}
            <div className="flex flex-col gap-6">
              <h2 className="border-b border-gray-800 pb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
                Profile Information
              </h2>
              
              <div>
                <label className="mb-4 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Profile Photo
                </label>
                <div className="flex items-center gap-6">
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-black/40 shadow-inner">
                    {previewImage ? (
                      <img src={previewImage} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <UserCircleIcon className="h-16 w-16 text-gray-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      name="avatar"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="block w-full text-sm text-gray-400 file:mr-4 file:cursor-pointer file:rounded-xl file:border-0 file:bg-blue-600/20 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-blue-400 transition hover:file:bg-blue-600/30"
                    />
                    <p className="mt-2.5 text-xs text-gray-500">JPG, PNG or GIF. Max size 2MB.</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-400" htmlFor="display_name">
                  Screen Name
                </label>
                <input
                  id="display_name"
                  name="display_name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g., Brian P."
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white shadow-inner outline-none transition-all placeholder:text-gray-600 focus:border-blue-500/50 focus:bg-black/40 focus:ring-4 focus:ring-blue-500/10"
                />
                <p className="mt-2 text-xs text-gray-500">This name will appear under your avatar on the map.</p>
              </div>
            </div>

            {/* --- SECURITY SECTION --- */}
            <div className="flex flex-col gap-6">
              <h2 className="border-b border-gray-800 pb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
                Security
              </h2>
              
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-400" htmlFor="password">
                    New Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Leave blank to keep current"
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white shadow-inner outline-none transition-all placeholder:text-gray-600 focus:border-blue-500/50 focus:bg-black/40 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>
                
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-400" htmlFor="confirm_password">
                    Confirm Password
                  </label>
                  <input
                    id="confirm_password"
                    name="confirm_password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white shadow-inner outline-none transition-all placeholder:text-gray-600 focus:border-blue-500/50 focus:bg-black/40 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 border-t border-gray-800 pt-6">
              <button
                type="submit"
                disabled={isPending}
                className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-all duration-300 hover:bg-blue-500 hover:shadow-[0_0_25px_rgba(37,99,235,0.5)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-70"
              >
                {isPending ? (
                  <>
                    <svg className="mr-2 h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving Changes...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
            
          </form>
        </div>
      </div>
    </div>
  )
}