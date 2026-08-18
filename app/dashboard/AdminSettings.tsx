// app/dashboard/AdminSettings.tsx
'use client'

import { useState, useRef, ChangeEvent, FormEvent } from 'react'
import { updateProfilePicture, updateMediaSettings } from './actions'
import { CameraIcon, MicrophoneIcon, ArrowUpTrayIcon, HandRaisedIcon } from '@heroicons/react/24/solid'

type ProfileData = {
  avatar_url: string | null
  camera_enabled: boolean
  microphone_enabled: boolean
}

interface AdminSettingsProps {
  initialData: ProfileData
}

export default function AdminSettings({ initialData }: AdminSettingsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Local state for toggles and avatar, initialized from database values
  const [cameraOn, setCameraOn] = useState(initialData.camera_enabled)
  const [microphoneOn, setMicrophoneOn] = useState(initialData.microphone_enabled)
  const [avatarUrl, setAvatarUrl] = useState(initialData.avatar_url)

  // -- Profile Picture Upload Logic --
  const handleAvatarClick = () => {
    // Programmatically trigger the hidden file input
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setLoading(true)
    setMessage(null)

    try {
      // 1. Optimistically update UI using a Base64 preview (saves bandwidth if upload fails)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string)
      }
      reader.readAsDataURL(file)

      // 2. Call the server action to upload to Supabase Storage and update DB
      const response = await updateProfilePicture(file)
      if (response.success) {
        setMessage({ type: 'success', text: response.message })
      } else {
        // If upload failed, revert the avatar preview
        setAvatarUrl(initialData.avatar_url)
        setMessage({ type: 'error', text: response.message })
      }
    } catch (error) {
      setAvatarUrl(initialData.avatar_url) // Revert on unexpected error
      setMessage({ type: 'error', text: 'Unexpected error uploading photo.' })
    } finally {
      setLoading(false)
      // Reset input value to allow uploading the same file again if desired
      if (event.target) event.target.value = ''
    }
  }

  // -- Save Settings Logic --
  const handleSaveSettings = async () => {
    setLoading(true)
    setMessage(null)

    try {
      // Call the server action to update the profile table bools
      const response = await updateMediaSettings(cameraOn, microphoneOn)
      if (response.success) {
        setMessage({ type: 'success', text: response.message })
      } else {
        setMessage({ type: 'error', text: response.message })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Unexpected error saving settings.' })
    } finally {
      setLoading(false)
    }
  }

  // -- Render UI (Matching image_4.png visualization) --
  return (
    <div className="rounded-lg bg-white p-6 shadow-sm border space-y-6 relative">
      
      {/* Feedback Messages */}
      {message && (
        <div className={`absolute top-2 right-2 rounded p-2 text-xs ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}
      
      <div className="flex items-center justify-between border-b pb-4">
        <h2 className="text-xl font-semibold text-gray-800">Admin Settings</h2>
        <div className="flex space-x-2">
            <span className="rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800 uppercase tracking-wider">
               You
            </span>
            <span className="rounded bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800 uppercase tracking-wider">
               Host
            </span>
        </div>
      </div>

      {/* Profile Picture Section (like the circle in image_4.png) */}
      <div className="relative flex flex-col items-center">
        <div 
          onClick={handleAvatarClick}
          title="Click to upload profile photo"
          className="group relative h-28 w-28 cursor-pointer overflow-hidden rounded-full border-4 border-gray-100 bg-gray-50 shadow-inner flex items-center justify-center transition-all hover:border-blue-100"
        >
          {avatarUrl ? (
             <img src={avatarUrl} alt="Your Avatar" className="h-full w-full object-cover transition duration-300 group-hover:opacity-80" />
          ) : (
            <div className="text-center text-gray-300 group-hover:text-blue-500">
                <ArrowUpTrayIcon className="h-10 w-10 mx-auto mb-1" />
                <p className="text-xs font-medium">Upload<br/>Photo</p>
            </div>
          )}
          {loading && (
             <div className="absolute inset-0 flex items-center justify-center bg-white/70">
               <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent"></div>
             </div>
          )}
        </div>
        <p className="mt-2 text-xs text-gray-400">Click circle to change photo.</p>
        
        {/* Hidden File Input */}
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          disabled={loading}
        />
      </div>

      {/* Media Toggles Section */}
      <div className="space-y-3">
        {/* Camera Toggle */}
        <div className="flex items-center justify-between rounded-md border bg-gray-50 p-3">
          <div className="flex items-center gap-3">
             <div className={`p-2 rounded-lg ${cameraOn ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                <CameraIcon className="h-5 w-5" />
             </div>
             <div>
                <p className="text-sm font-medium text-gray-700">Camera permission</p>
                <p className="text-xs text-gray-400">Required for video chat</p>
             </div>
          </div>
          <button 
            type="button" 
            onClick={() => setCameraOn(!cameraOn)} 
            disabled={loading}
            aria-checked={cameraOn}
            role="switch"
            className={`w-14 rounded-full p-1 flex shadow-inner border transition duration-300 ${cameraOn ? 'bg-blue-500 border-blue-600 justify-end' : 'bg-gray-100 border-gray-200 justify-start'}`}>
              <div className={`h-6 w-6 rounded-full bg-white shadow ${loading ? 'opacity-50' : ''}`}></div>
          </button>
        </div>

        {/* Microphone Toggle */}
        <div className="flex items-center justify-between rounded-md border bg-gray-50 p-3">
          <div className="flex items-center gap-3">
             <div className={`p-2 rounded-lg ${microphoneOn ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                <MicrophoneIcon className="h-5 w-5" />
             </div>
             <div>
                <p className="text-sm font-medium text-gray-700">Microphone permission</p>
                <p className="text-xs text-gray-400">Required for audio calls</p>
             </div>
          </div>
          <button 
            type="button" 
            onClick={() => setMicrophoneOn(!microphoneOn)}
            disabled={loading}
            aria-checked={microphoneOn}
            role="switch"
            className={`w-14 rounded-full p-1 flex shadow-inner border transition duration-300 ${microphoneOn ? 'bg-blue-500 border-blue-600 justify-end' : 'bg-gray-100 border-gray-200 justify-start'}`}>
              <div className={`h-6 w-6 rounded-full bg-white shadow ${loading ? 'opacity-50' : ''}`}></div>
          </button>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSaveSettings}
        disabled={loading}
        className="mt-2 w-full rounded-md bg-gray-900 px-4 py-2 font-semibold text-white transition hover:bg-gray-800 disabled:bg-gray-400"
      >
        {loading ? 'Saving Changes...' : 'Save Permissions'}
      </button>
      
      {/* Invite Buttons (matching visualization bottom-right) */}
      <div className="flex gap-2 pt-4 border-t mt-4">
        <button className="flex-1 rounded-md border bg-white px-4 py-2 text-sm font-semibold text-gray-700 flex items-center justify-center gap-2 transition hover:bg-gray-50">
            <HandRaisedIcon className="h-4 w-4" />
            Invite Colleagues
        </button>
        <button className="flex-1 rounded-md border bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50">
            Copy Invite Link
        </button>
      </div>

    </div>
  )
}