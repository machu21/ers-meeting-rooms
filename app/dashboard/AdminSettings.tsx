// app/dashboard/AdminSettings.tsx
'use client'

import React, { useState, useRef, ChangeEvent } from 'react'
import { updateProfilePicture, updateMediaSettings } from './actions'
import { CameraIcon, MicrophoneIcon, ArrowUpTrayIcon, CheckCircleIcon, ExclamationCircleIcon, Cog6ToothIcon } from '@heroicons/react/24/solid'

type ProfileData = {
  avatar_url: string | null
  camera_enabled: boolean
  microphone_enabled: boolean
}

interface AdminSettingsProps {
  initialData: ProfileData
}

function ToggleRow({
  icon: Icon,
  title,
  subtitle,
  checked,
  onChange,
  disabled
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  subtitle: string
  checked: boolean
  onChange: () => void
  disabled: boolean
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/60 bg-white/50 p-4 shadow-sm transition-all hover:bg-white/70">
      <div className="flex items-center gap-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${checked ? 'bg-indigo-100/80 text-indigo-600 shadow-sm ring-1 ring-indigo-200' : 'bg-slate-100 text-slate-400'}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">{title}</p>
          <p className="text-xs font-medium text-slate-500">{subtitle}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onChange}
        disabled={disabled}
        aria-checked={checked}
        role="switch"
        className={`relative flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors duration-300 focus:outline-none focus:ring-4 focus:ring-indigo-100 ${checked ? 'border-transparent bg-indigo-500' : 'border-slate-200 bg-slate-100 hover:bg-slate-200'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-300 ease-in-out ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  )
}

export default function AdminSettings({ initialData }: AdminSettingsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const [cameraOn, setCameraOn] = useState(initialData.camera_enabled)
  const [microphoneOn, setMicrophoneOn] = useState(initialData.microphone_enabled)
  const [avatarUrl, setAvatarUrl] = useState(initialData.avatar_url)

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setLoading(true)
    setMessage(null)

    try {
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string)
      }
      reader.readAsDataURL(file)

      const response = await updateProfilePicture(file)
      if (response.success) {
        setMessage({ type: 'success', text: response.message })
      } else {
        setAvatarUrl(initialData.avatar_url)
        setMessage({ type: 'error', text: response.message })
      }
    } catch (_error) {
      setAvatarUrl(initialData.avatar_url)
      setMessage({ type: 'error', text: 'Unexpected error uploading photo.' })
    } finally {
      setLoading(false)
      if (event.target) event.target.value = ''
    }
  }

  const handleSaveSettings = async () => {
    setLoading(true)
    setMessage(null)

    try {
      const response = await updateMediaSettings(cameraOn, microphoneOn)
      if (response.success) {
        setMessage({ type: 'success', text: response.message })
      } else {
        setMessage({ type: 'error', text: response.message })
      }
    } catch (_error) {
      setMessage({ type: 'error', text: 'Unexpected error saving settings.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full flex-col rounded-3xl border border-white/60 bg-white/40 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl transition-all duration-300 hover:bg-white/60 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">

      <div className="mb-6 flex items-center justify-between border-b border-white/50 pb-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100/80 shadow-sm ring-1 ring-indigo-200">
            <Cog6ToothIcon className="h-6 w-6 text-indigo-600" />
          </div>
          <h2 className="text-lg font-black tracking-tight text-slate-900">Admin Settings</h2>
        </div>
        <div className="flex gap-2">
          <span className="rounded-full bg-indigo-100/80 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-700 shadow-sm ring-1 ring-indigo-200">You</span>
          <span className="rounded-full bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600 shadow-sm ring-1 ring-black/5">Host</span>
        </div>
      </div>

      {message && (
        <div className={`mb-6 flex items-center gap-3 rounded-2xl p-4 text-sm font-semibold shadow-sm backdrop-blur-md ${message.type === 'success' ? 'bg-emerald-50/80 text-emerald-700 ring-1 ring-emerald-200' : 'bg-red-50/80 text-red-700 ring-1 ring-red-200'}`}>
          {message.type === 'success' ? <CheckCircleIcon className="h-5 w-5 shrink-0" /> : <ExclamationCircleIcon className="h-5 w-5 shrink-0" />}
          {message.text}
        </div>
      )}

      {/* Profile Picture */}
      <div className="mb-8 flex flex-col items-center">
        <div
          onClick={handleAvatarClick}
          title="Click to upload profile photo"
          className="group relative flex h-28 w-28 cursor-pointer items-center justify-center overflow-hidden rounded-full border-[5px] border-white bg-slate-50 shadow-md transition-all hover:scale-105 hover:border-indigo-100 hover:shadow-lg"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="Your Avatar" className="h-full w-full object-cover transition duration-300 group-hover:opacity-70 group-hover:scale-110" />
          ) : (
            <div className="text-center text-slate-300 transition-colors group-hover:text-indigo-500">
              <ArrowUpTrayIcon className="mx-auto mb-1 h-8 w-8" />
              <p className="text-[11px] font-bold uppercase tracking-wider leading-tight">Upload<br />Photo</p>
            </div>
          )}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-slate-900 border-t-transparent"></div>
            </div>
          )}
        </div>
        <p className="mt-3 text-xs font-medium text-slate-400">Click to update photo.</p>

        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          disabled={loading}
        />
      </div>

      {/* Media Toggles */}
      <div className="mb-6 space-y-3">
        <ToggleRow
          icon={CameraIcon}
          title="Camera permission"
          subtitle="Required for video chat"
          checked={cameraOn}
          onChange={() => setCameraOn(!cameraOn)}
          disabled={loading}
        />
        <ToggleRow
          icon={MicrophoneIcon}
          title="Microphone permission"
          subtitle="Required for audio calls"
          checked={microphoneOn}
          onChange={() => setMicrophoneOn(!microphoneOn)}
          disabled={loading}
        />
      </div>

      <button
        onClick={handleSaveSettings}
        disabled={loading}
        className="mt-auto flex items-center justify-center gap-2 w-full rounded-2xl bg-slate-800 px-5 py-4 text-sm font-black tracking-wide text-white shadow-lg transition-all hover:scale-[1.02] hover:bg-slate-900 hover:shadow-slate-500/30 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
      >
        {loading ? (
          <>
            <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Saving Changes...</span>
          </>
        ) : (
          'Save Permissions'
        )}
      </button>
    </div>
  )
}