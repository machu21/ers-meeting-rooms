'use client'

import React, { useState, useTransition } from 'react'
import { PixelAvatar } from '@/app/office/PixelAvatar'
import { setCharacterGender, type BinaryGender } from '@/app/office/character-actions'
import { CheckCircleIcon, SparklesIcon } from '@heroicons/react/24/solid'

interface CharacterGenderModalProps {
  isOpen: boolean
  currentGender?: string | null
  onGenderSelected: (gender: BinaryGender) => void
}

export default function CharacterGenderModal({
  isOpen,
  currentGender,
  onGenderSelected,
}: CharacterGenderModalProps) {
  const [selectedGender, setSelectedGender] = useState<BinaryGender>(() => {
    return currentGender === 'female' ? 'female' : 'male'
  })
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!isOpen) return null

  const handleConfirm = () => {
    setErrorMessage(null)
    startTransition(async () => {
      const result = await setCharacterGender(selectedGender)
      if (result.success && result.gender) {
        onGenderSelected(result.gender)
      } else {
        setErrorMessage(result.message || 'Failed to save character gender. Please try again.')
      }
    })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="character-gender-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 sm:p-6 backdrop-blur-md animate-in fade-in duration-300"
    >
      {/* Decorative ambient glowing orbs */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-blue-600/20 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-pink-600/20 blur-[100px]" />

      <div className="relative w-full max-w-lg sm:max-w-xl overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950/95 p-6 sm:p-8 shadow-2xl text-white backdrop-blur-2xl transition-all">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-300 shadow-inner">
            <SparklesIcon className="h-3.5 w-3.5 text-indigo-400" />
            Character Initialization
          </div>
          <h2
            id="character-gender-title"
            className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-sm"
          >
            Select Your Character
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
            Welcome! Before entering the virtual workspace, please select your character’s gender to initialize your avatar.
          </p>
        </div>

        {errorMessage && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-center text-xs sm:text-sm font-semibold text-red-300">
            {errorMessage}
          </div>
        )}

        {/* Character Selection Cards */}
        <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Male Option */}
          <button
            type="button"
            onClick={() => setSelectedGender('male')}
            className={`group relative flex flex-col items-center justify-between rounded-2xl border p-5 text-center transition-all duration-200 outline-none focus-visible:ring-4 focus-visible:ring-blue-400/50 ${
              selectedGender === 'male'
                ? 'border-blue-400 bg-gradient-to-b from-blue-950/60 to-slate-900 shadow-[0_0_30px_rgba(59,130,246,0.35)] ring-2 ring-blue-400'
                : 'border-white/10 bg-slate-800/40 hover:border-white/20 hover:bg-slate-800/70'
            }`}
          >
            {/* Selected Checkmark Badge */}
            {selectedGender === 'male' && (
              <span className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white shadow-md">
                <CheckCircleIcon className="h-5 w-5" />
              </span>
            )}

            {/* Character Preview Platform */}
            <div
              className={`relative flex h-32 w-32 items-center justify-center rounded-2xl border transition-transform duration-200 group-hover:scale-105 overflow-hidden ${
                selectedGender === 'male'
                  ? 'border-blue-400/50 bg-blue-900/30 shadow-inner'
                  : 'border-white/10 bg-black/30'
              }`}
            >
              <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:12px_12px] opacity-20 pointer-events-none" />
              <div className="scale-125 transform-gpu">
                <PixelAvatar
                  gender="male"
                  direction="down"
                  isWalking={selectedGender === 'male'}
                  isMe={true}
                  isSpeaking={false}
                  name="Male"
                />
              </div>
            </div>

            {/* Details */}
            <div className="mt-4 w-full">
              <span className="inline-block rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-blue-300">
                Male
              </span>
              <h3 className="mt-1 text-base font-bold text-white">Male Avatar</h3>
              <p className="mt-1 text-[11px] text-slate-400 leading-snug">
                Classic styled outfit and tailored appearance
              </p>
            </div>
          </button>

          {/* Female Option */}
          <button
            type="button"
            onClick={() => setSelectedGender('female')}
            className={`group relative flex flex-col items-center justify-between rounded-2xl border p-5 text-center transition-all duration-200 outline-none focus-visible:ring-4 focus-visible:ring-pink-400/50 ${
              selectedGender === 'female'
                ? 'border-pink-400 bg-gradient-to-b from-pink-950/60 to-slate-900 shadow-[0_0_30px_rgba(236,72,153,0.35)] ring-2 ring-pink-400'
                : 'border-white/10 bg-slate-800/40 hover:border-white/20 hover:bg-slate-800/70'
            }`}
          >
            {/* Selected Checkmark Badge */}
            {selectedGender === 'female' && (
              <span className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-pink-500 text-white shadow-md">
                <CheckCircleIcon className="h-5 w-5" />
              </span>
            )}

            {/* Character Preview Platform */}
            <div
              className={`relative flex h-32 w-32 items-center justify-center rounded-2xl border transition-transform duration-200 group-hover:scale-105 overflow-hidden ${
                selectedGender === 'female'
                  ? 'border-pink-400/50 bg-pink-900/30 shadow-inner'
                  : 'border-white/10 bg-black/30'
              }`}
            >
              <div className="absolute inset-0 bg-[radial-gradient(#ec4899_1px,transparent_1px)] [background-size:12px_12px] opacity-20 pointer-events-none" />
              <div className="scale-125 transform-gpu">
                <PixelAvatar
                  gender="female"
                  direction="down"
                  isWalking={selectedGender === 'female'}
                  isMe={true}
                  isSpeaking={false}
                  name="Female"
                />
              </div>
            </div>

            {/* Details */}
            <div className="mt-4 w-full">
              <span className="inline-block rounded-full bg-pink-500/20 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-pink-300">
                Female
              </span>
              <h3 className="mt-1 text-base font-bold text-white">Female Avatar</h3>
              <p className="mt-1 text-[11px] text-slate-400 leading-snug">
                Ponytail hairstyle and vibrant office styling
              </p>
            </div>
          </button>
        </div>

        {/* Action Button */}
        <div className="mt-6 sm:mt-8">
          <button
            type="button"
            disabled={isPending}
            onClick={handleConfirm}
            className={`w-full rounded-2xl py-3.5 sm:py-4 px-6 text-sm sm:text-base font-black tracking-wide text-white shadow-xl transition-all duration-200 active:scale-98 disabled:pointer-events-none disabled:opacity-50 ${
              selectedGender === 'female'
                ? 'bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:shadow-pink-500/30 hover:brightness-110'
                : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:shadow-blue-500/30 hover:brightness-110'
            }`}
          >
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving Character…
              </span>
            ) : (
              `Confirm ${selectedGender === 'female' ? 'Female' : 'Male'} Character & Enter Office`
            )}
          </button>
          <p className="mt-3 text-center text-[11px] text-slate-400">
            Note: You can further customize your skin tone, outfits, and accessories anytime in <span className="text-slate-200 font-semibold">Settings</span>.
          </p>
        </div>
      </div>
    </div>
  )
}
