'use client'

import { useState, useTransition, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateEmployeeProfile } from './actions'
import Link from 'next/link'
import { UserCircleIcon } from '@heroicons/react/24/solid'

export default function SettingsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  // Fetch current user data on load
  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(data)
        if (data?.avatar_url) setPreviewImage(data.avatar_url)
      }
      setLoading(false)
    }
    loadProfile()
  }, [supabase])

  // Handle local image preview before uploading
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPreviewImage(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (formData: FormData) => {
    setMessage(null)
    startTransition(async () => {
      const result = await updateEmployeeProfile(formData)
      setMessage({ type: result.success ? 'success' : 'error', text: result.message })
    })
  }

  if (loading) return <div className="min-h-screen bg-gray-50 p-8 flex justify-center items-center">Loading settings...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 flex items-center justify-between border-b pb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Settings</h1>
            <p className="text-gray-600">Customize how you appear on the virtual map.</p>
          </div>
          <Link href="/office" className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50">
            Back to Office
          </Link>
        </header>

        <div className="rounded-lg bg-white p-6 shadow-sm border">
          {message && (
            <div className={`mb-6 rounded p-3 text-sm ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {message.text}
            </div>
          )}

          <form action={handleSubmit} className="flex flex-col gap-6">
            
            {/* Avatar Upload */}
            <div>
              <label className="mb-3 block text-sm font-medium text-gray-700">Profile Photo</label>
              <div className="flex items-center gap-6">
                <div className="h-24 w-24 overflow-hidden rounded-full border-2 border-gray-200 bg-gray-100 shadow-sm flex-shrink-0">
                  {previewImage ? (
                    <img src={previewImage} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <UserCircleIcon className="h-full w-full text-gray-400 p-2" />
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    name="avatar"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="mt-2 text-xs text-gray-400">JPG, PNG or GIF. Max size 2MB.</p>
                </div>
              </div>
            </div>

            {/* Display Name */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="display_name">
                Screen Name
              </label>
              <input
                className="w-full rounded-md border px-4 py-2 text-black focus:border-blue-500 focus:outline-none"
                name="display_name"
                type="text"
                defaultValue={profile?.display_name || ''}
                placeholder="e.g., Brian P."
              />
              <p className="mt-1 text-xs text-gray-400">This name will appear under your avatar on the map.</p>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="mt-4 w-full rounded-md bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}