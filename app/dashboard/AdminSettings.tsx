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
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${checked ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200/70 text-slate-400'}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-700">{title}</p>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onChange}
        disabled={disabled}
        aria-checked={checked}
        role="switch"
        className={`flex w-12 rounded-full border p-1 shadow-inner transition duration-300 ${checked ? 'justify-end border-indigo-600 bg-indigo-500' : 'justify-start border-slate-200 bg-slate-100'}`}
      >
        <div className={`h-5 w-5 rounded-full bg-white shadow ${disabled ? 'opacity-50' : ''}`}></div>
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
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

      <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50">
            <Cog6ToothIcon className="h-5 w-5 text-indigo-600" />
          </div>
          <h2 className="text-base font-semibold text-slate-900">Admin Settings</h2>
        </div>
        <div className="flex gap-2">
          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">You</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">Host</span>
        </div>
      </div>

      {message && (
        <div className={`mb-5 flex items-center gap-2 rounded-lg p-3 text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {message.type === 'success' ? <CheckCircleIcon className="h-4 w-4 shrink-0" /> : <ExclamationCircleIcon className="h-4 w-4 shrink-0" />}
          {message.text}
        </div>
      )}

      {/* Profile Picture */}
      <div className="mb-6 flex flex-col items-center">
        <div
          onClick={handleAvatarClick}
          title="Click to upload profile photo"
          className="group relative flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-full border-4 border-slate-100 bg-slate-50 shadow-inner transition-all hover:border-indigo-100"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="Your Avatar" className="h-full w-full object-cover transition duration-300 group-hover:opacity-80" />
          ) : (
            <div className="text-center text-slate-300 group-hover:text-indigo-500">
              <ArrowUpTrayIcon className="mx-auto mb-1 h-8 w-8" />
              <p className="text-[11px] font-medium leading-tight">Upload<br />Photo</p>
            </div>
          )}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-900 border-t-transparent"></div>
            </div>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-400">Click circle to change photo.</p>

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
      <div className="space-y-3">
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
        className="mt-5 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:bg-slate-300"
      >
        {loading ? 'Saving Changes...' : 'Save Permissions'}
      </button>
    </div>
  )
}