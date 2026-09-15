'use client'

import { useState, useTransition, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateEmployeeProfile } from './actions'
import Link from 'next/link'
import { UserCircleIcon, ArrowLeftIcon, SparklesIcon } from '@heroicons/react/24/solid'
import { useRouter } from 'next/navigation'
import {
  PixelAvatar,
  type AvatarConfig,
  type Direction,
  SKIN_OPTIONS,
  HEADWEAR_OPTIONS,
  OUTFIT_OPTIONS,
  PANTS_OPTIONS,
  SHOES_OPTIONS,
  ACCESSORY_OPTIONS,
  GLASSES_OPTIONS,
} from '@/app/office/PixelAvatar'

type Gender = 'male' | 'female' | 'non_binary' | 'prefer_not_to_say' | ''

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: '', label: 'Select gender…' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
]

type WardrobeTab = 'skin' | 'headwear' | 'outfit' | 'pants' | 'shoes' | 'accessory' | 'glasses'

export default function SettingsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  
  // Form State — Profile
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  // Form State — Extended Profile
  const [gender, setGender] = useState<Gender>('')
  const [birthDate, setBirthDate] = useState('')
  const [address, setAddress] = useState('')

  // Form State — Avatar Customizer
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>({
    skinTone: 'peach',
    headwear: 'cap_red',
    outfit: 'vest_orange',
    pants: 'jeans_blue',
    shoes: 'sneakers_red',
    accessory: 'backpack_yellow',
    glasses: 'none',
  })
  const [previewDirection, setPreviewDirection] = useState<Direction>('down')
  const [previewWalking, setPreviewWalking] = useState(false)
  const [activeTab, setActiveTab] = useState<WardrobeTab>('skin')
  
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setDisplayName(data?.display_name || '')
        if (data?.avatar_url) setPreviewImage(data.avatar_url)
        setGender((data?.gender as Gender) || '')
        setBirthDate(data?.birth_date || '')
        setAddress(data?.address || '')
        if (data?.avatar_config && typeof data.avatar_config === 'object') {
          setAvatarConfig((prev) => ({ ...prev, ...(data.avatar_config as AvatarConfig) }))
        }
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
    <div className="relative flex min-h-screen w-full justify-center overflow-hidden bg-[#050914] p-4 sm:p-8 lg:p-12">
      {/* Ambient Background Glows */}
      <div className="pointer-events-none absolute top-[-10%] left-[-10%] h-[600px] w-[600px] animate-[spin_15s_linear_infinite] rounded-full bg-blue-600/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] animate-[spin_20s_linear_infinite_reverse] rounded-full bg-purple-600/10 blur-[120px]" />

      <div className="relative z-10 w-full max-w-4xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <span>My Settings</span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <SparklesIcon className="w-3.5 h-3.5" /> Retro Wardrobe
              </span>
            </h1>
            <p className="mt-1 text-sm text-gray-400">Customize your retro avatar look and profile information.</p>
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
            {/* Hidden JSON input for avatar_config */}
            <input type="hidden" name="avatar_config" value={JSON.stringify(avatarConfig)} />
            
            {/* ═══════════════════════════════════════════════════════════ */}
            {/* --- AVATAR WARDROBE STUDIO (Retro Character Customizer) --- */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-300 flex items-center gap-2">
                  <span>🎨</span> Retro Avatar Wardrobe &amp; Studio
                </h2>
                <span className="text-xs text-gray-400 font-mono">Real-time preview</span>
              </div>

              {/* Studio Grid: Stage (Left) & Controls (Right) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                
                {/* ── Left Column: Interactive Pedestal Stage ── */}
                <div className="md:col-span-5 flex flex-col items-center gap-3">
                  <div
                    className="relative w-full aspect-square max-w-[280px] rounded-2xl border border-amber-900/60 shadow-[0_8px_24px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center overflow-hidden"
                    style={{
                      backgroundColor: '#8d5b43',
                      backgroundImage: `radial-gradient(ellipse at center, rgba(255,255,255,0.12) 0%, rgba(0,0,0,0.4) 100%), url('/isometric_parquet.svg')`,
                      backgroundSize: '48px 48px',
                      imageRendering: 'pixelated',
                    }}
                  >
                    {/* Retro Stage Spot Ring */}
                    <div className="absolute w-36 h-36 rounded-full border border-yellow-400/30 bg-yellow-400/10 blur-[1px] pointer-events-none" />

                    {/* Live PixelAvatar in Pedestal */}
                    <div className="relative z-10 scale-125">
                      <PixelAvatar
                        gender={gender}
                        avatarConfig={avatarConfig}
                        direction={previewDirection}
                        isWalking={previewWalking}
                        isMe={true}
                        isSpeaking={false}
                        name={displayName || 'You'}
                      />
                    </div>

                    {/* Retro Platform Label */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-black/60 text-[10px] text-amber-200 font-mono tracking-wider">
                      PARQUET STAGE
                    </div>
                  </div>

                  {/* Stage Direction & Animation Controls */}
                  <div className="flex items-center gap-1.5 bg-black/40 p-1.5 rounded-xl border border-white/10 text-xs">
                    <button
                      type="button"
                      onClick={() => setPreviewDirection('down')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition ${previewDirection === 'down' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                      title="Face Down"
                    >
                      Front
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDirection('up')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition ${previewDirection === 'up' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                      title="Face Up"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDirection('left')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition ${previewDirection === 'left' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                      title="Face Side Profile"
                    >
                      Side
                    </button>
                    <div className="w-px h-4 bg-gray-700 mx-0.5" />
                    <button
                      type="button"
                      onClick={() => setPreviewWalking(!previewWalking)}
                      className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1 ${previewWalking ? 'bg-amber-600 text-white animate-pulse' : 'text-gray-400 hover:text-white'}`}
                      title="Toggle Walk Cycle"
                    >
                      <span>👟</span>
                      <span>{previewWalking ? 'Walking' : 'Idle'}</span>
                    </button>
                  </div>
                </div>

                {/* ── Right Column: Wardrobe Category Tabs & Swatches ── */}
                <div className="md:col-span-7 flex flex-col gap-4">
                  {/* Category Nav Tabs */}
                  <div className="flex flex-wrap gap-1.5 p-1 bg-black/30 rounded-xl border border-white/10">
                    {(
                      [
                        { key: 'skin', label: 'Skin', icon: '🎨' },
                        { key: 'headwear', label: 'Head', icon: '🧢' },
                        { key: 'outfit', label: 'Outfit', icon: '👔' },
                        { key: 'pants', label: 'Pants', icon: '👖' },
                        { key: 'shoes', label: 'Shoes', icon: '👟' },
                        { key: 'accessory', label: 'Pack', icon: '🎒' },
                        { key: 'glasses', label: 'Eyes', icon: '👓' },
                      ] as { key: WardrobeTab; label: string; icon: string }[]
                    ).map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setActiveTab(t.key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          activeTab === t.key
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-gray-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <span>{t.icon}</span>
                        <span>{t.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Wardrobe Options Selector Body */}
                  <div className="p-4 rounded-2xl bg-black/20 border border-white/10 min-h-[190px]">
                    
                    {/* 1. Skin Tone Swatches */}
                    {activeTab === 'skin' && (
                      <div className="flex flex-col gap-3">
                        <span className="text-xs font-medium text-gray-400">Select Skin Tone:</span>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                          {SKIN_OPTIONS.map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setAvatarConfig((prev) => ({ ...prev, skinTone: opt.id }))}
                              className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${
                                avatarConfig.skinTone === opt.id
                                  ? 'border-blue-500 bg-blue-500/20 ring-2 ring-blue-500/40 shadow-sm'
                                  : 'border-white/10 hover:border-white/30 bg-white/5'
                              }`}
                            >
                              <div
                                className="w-8 h-8 rounded-full border border-black/30 shadow-inner"
                                style={{ backgroundColor: opt.color }}
                              />
                              <span className="text-[11px] font-medium text-gray-300">{opt.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 2. Headwear / Hair Options */}
                    {activeTab === 'headwear' && (
                      <div className="flex flex-col gap-3">
                        <span className="text-xs font-medium text-gray-400">Select Headwear &amp; Hair:</span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {HEADWEAR_OPTIONS.map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setAvatarConfig((prev) => ({ ...prev, headwear: opt.id }))}
                              className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                                avatarConfig.headwear === opt.id
                                  ? 'border-blue-500 bg-blue-500/20 text-white ring-2 ring-blue-500/40'
                                  : 'border-white/10 hover:border-white/30 text-gray-300 bg-white/5'
                              }`}
                            >
                              <span className="text-lg">{opt.icon}</span>
                              <span className="text-xs font-medium leading-tight">{opt.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 3. Outfits / Tops */}
                    {activeTab === 'outfit' && (
                      <div className="flex flex-col gap-3">
                        <span className="text-xs font-medium text-gray-400">Select Tops &amp; Outfits:</span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {OUTFIT_OPTIONS.map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setAvatarConfig((prev) => ({ ...prev, outfit: opt.id }))}
                              className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                                avatarConfig.outfit === opt.id
                                  ? 'border-blue-500 bg-blue-500/20 text-white ring-2 ring-blue-500/40'
                                  : 'border-white/10 hover:border-white/30 text-gray-300 bg-white/5'
                              }`}
                            >
                              <span className="text-lg">{opt.icon}</span>
                              <span className="text-xs font-medium leading-tight">{opt.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 4. Pants / Bottoms */}
                    {activeTab === 'pants' && (
                      <div className="flex flex-col gap-3">
                        <span className="text-xs font-medium text-gray-400">Select Pants &amp; Denim:</span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {PANTS_OPTIONS.map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setAvatarConfig((prev) => ({ ...prev, pants: opt.id }))}
                              className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                                avatarConfig.pants === opt.id
                                  ? 'border-blue-500 bg-blue-500/20 text-white ring-2 ring-blue-500/40'
                                  : 'border-white/10 hover:border-white/30 text-gray-300 bg-white/5'
                              }`}
                            >
                              <div
                                className="w-5 h-5 rounded-md border border-white/20 shadow-sm shrink-0"
                                style={{ backgroundColor: opt.color }}
                              />
                              <span className="text-xs font-medium leading-tight">{opt.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 5. Shoes */}
                    {activeTab === 'shoes' && (
                      <div className="flex flex-col gap-3">
                        <span className="text-xs font-medium text-gray-400">Select Footwear:</span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {SHOES_OPTIONS.map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setAvatarConfig((prev) => ({ ...prev, shoes: opt.id }))}
                              className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                                avatarConfig.shoes === opt.id
                                  ? 'border-blue-500 bg-blue-500/20 text-white ring-2 ring-blue-500/40'
                                  : 'border-white/10 hover:border-white/30 text-gray-300 bg-white/5'
                              }`}
                            >
                              <div
                                className="w-5 h-5 rounded-md border border-white/20 shadow-sm shrink-0"
                                style={{ backgroundColor: opt.color }}
                              />
                              <span className="text-xs font-medium leading-tight">{opt.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 6. Accessories (Backpack) */}
                    {activeTab === 'accessory' && (
                      <div className="flex flex-col gap-3">
                        <span className="text-xs font-medium text-gray-400">Select Adventure Backpack:</span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {ACCESSORY_OPTIONS.map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setAvatarConfig((prev) => ({ ...prev, accessory: opt.id }))}
                              className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                                avatarConfig.accessory === opt.id
                                  ? 'border-blue-500 bg-blue-500/20 text-white ring-2 ring-blue-500/40'
                                  : 'border-white/10 hover:border-white/30 text-gray-300 bg-white/5'
                              }`}
                            >
                              <span className="text-lg">{opt.icon}</span>
                              <span className="text-xs font-medium leading-tight">{opt.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 7. Eyewear / Glasses */}
                    {activeTab === 'glasses' && (
                      <div className="flex flex-col gap-3">
                        <span className="text-xs font-medium text-gray-400">Select Eyewear:</span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {GLASSES_OPTIONS.map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setAvatarConfig((prev) => ({ ...prev, glasses: opt.id }))}
                              className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                                avatarConfig.glasses === opt.id
                                  ? 'border-blue-500 bg-blue-500/20 text-white ring-2 ring-blue-500/40'
                                  : 'border-white/10 hover:border-white/30 text-gray-300 bg-white/5'
                              }`}
                            >
                              <span className="text-lg">{opt.icon}</span>
                              <span className="text-xs font-medium leading-tight">{opt.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* --- PROFILE INFORMATION SECTION --- */}
            {/* ═══════════════════════════════════════════════════════════ */}
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

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-400" htmlFor="gender">
                  Gender
                </label>
                <select
                  id="gender"
                  name="gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value as Gender)}
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white shadow-inner outline-none transition-all focus:border-blue-500/50 focus:bg-black/40 focus:ring-4 focus:ring-blue-500/10 appearance-none cursor-pointer"
                >
                  {GENDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-gray-900">
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-gray-500">Self-identified gender preference.</p>
              </div>

              {/* Birthday */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-400" htmlFor="birth_date">
                  Date of Birth
                </label>
                <input
                  id="birth_date"
                  name="birth_date"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white shadow-inner outline-none transition-all focus:border-blue-500/50 focus:bg-black/40 focus:ring-4 focus:ring-blue-500/10 [color-scheme:dark]"
                />
                <p className="mt-2 text-xs text-gray-500">Optional. Used for birthday celebrations in the office.</p>
              </div>

              {/* Address */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-400" htmlFor="address">
                  Address
                </label>
                <textarea
                  id="address"
                  name="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g., 123 Main St, Kuala Lumpur, Malaysia"
                  rows={2}
                  className="w-full resize-none rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white shadow-inner outline-none transition-all placeholder:text-gray-600 focus:border-blue-500/50 focus:bg-black/40 focus:ring-4 focus:ring-blue-500/10"
                />
                <p className="mt-2 text-xs text-gray-500">Optional. Shown on your profile card.</p>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* --- SECURITY SECTION --- */}
            {/* ═══════════════════════════════════════════════════════════ */}
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