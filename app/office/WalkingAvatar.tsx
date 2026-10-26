'use client'

import { memo } from 'react'
import { VideoTrack } from '@livekit/components-react'
import type { TrackReference } from '@livekit/components-react'

// ---------- Gender palette helpers ----------
// Accepts wider string type since it comes from the DB / broadcast payload
type Gender = string | null | undefined

interface GenderStyle {
  bodyBg: string        // Tailwind bg class for torso
  shoulderW: number     // shoulder bar width (px)
  hipW: number          // hip bar width (px)
  armColor: string      // arm color
  legColor: string      // leg color
  headRing: string      // ring color on head
}

function getGenderStyle(gender: Gender): GenderStyle {
  switch (gender) {
    case 'female':
      return {
        bodyBg: 'bg-pink-500',
        shoulderW: 22,
        hipW: 26,
        armColor: '#ec4899',
        legColor: '#be185d',
        headRing: '#ec4899',
      }
    case 'male':
    default:
      return {
        bodyBg: 'bg-blue-500',
        shoulderW: 30,
        hipW: 18,
        armColor: '#3b82f6',
        legColor: '#1d4ed8',
        headRing: '#3b82f6',
      }
  }
}

// ---------- Component Props ----------
interface WalkingAvatarProps {
  gender: Gender
  isWalking: boolean
  facingLeft: boolean
  isMe: boolean
  isSpeaking: boolean
  /** Tailwind bg class like bg-blue-500, used as fallback head color */
  avatarColor: string
  avatar_url?: string | null
  /** When provided, renders LiveKit video inside the head */
  localCamTrackRef?: TrackReference | null
  remoteCamTrackRef?: TrackReference | null
  showVideo: boolean
  name: string
}

export const WalkingAvatar = memo(function WalkingAvatar({
  gender,
  isWalking,
  facingLeft,
  isMe,
  isSpeaking,
  avatarColor,
  avatar_url,
  localCamTrackRef,
  remoteCamTrackRef,
  showVideo,
  name,
}: WalkingAvatarProps) {
  const style = getGenderStyle(gender)

  // Walking vs idle CSS class gate
  const leftArm  = isWalking ? 'avatar-walk-left-arm'  : ''
  const rightArm = isWalking ? 'avatar-walk-right-arm' : ''
  const leftLeg  = isWalking ? 'avatar-walk-left-leg'  : ''
  const rightLeg = isWalking ? 'avatar-walk-right-leg' : ''
  const bobClass = !isWalking ? 'avatar-idle-bob' : ''

  // Speaking ring
  const speakingRing = isSpeaking
    ? 'ring-4 ring-purple-400 shadow-[0_0_18px_rgba(168,85,247,0.8)]'
    : ''

  // Head size: bigger when video is on
  const headSize = showVideo ? 'h-16 w-16' : 'h-12 w-12'

  return (
    <div
      className={`flex flex-col items-center select-none ${bobClass}`}
      style={{ transform: facingLeft ? 'scaleX(-1)' : 'scaleX(1)' }}
      aria-label={`Avatar for ${name}`}
    >
      {/* ── Head ── */}
      <div
        className={`relative flex items-center justify-center rounded-full border-2 border-white shadow-md overflow-hidden z-10 transition-[height,width] duration-150 ${avatarColor} ${headSize} ${speakingRing}`}
        style={{ borderColor: style.headRing }}
      >
        {showVideo ? (
          isMe && localCamTrackRef ? (
            <VideoTrack
              trackRef={localCamTrackRef}
              className="h-full w-full scale-x-[-1] object-cover"
            />
          ) : !isMe && remoteCamTrackRef ? (
            <VideoTrack
              trackRef={remoteCamTrackRef}
              className="h-full w-full object-cover"
            />
          ) : null
        ) : avatar_url ? (
          <img
            src={avatar_url}
            alt={name}
            className="h-full w-full object-cover"
            style={facingLeft ? { transform: 'scaleX(-1)' } : undefined}
          />
        ) : (
          <span className="font-bold text-white text-sm shadow-sm">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* ── Body ── */}
      <div className="relative flex flex-col items-center" style={{ marginTop: '-2px' }}>
        {/* Shoulder bar */}
        <div
          className={`rounded-sm ${style.bodyBg} opacity-90`}
          style={{ width: `${style.shoulderW}px`, height: '5px' }}
        />

        {/* Arms + Torso row */}
        <div className="flex items-start justify-center gap-0">
          {/* Left arm */}
          <div
            className={`rounded-full ${leftArm}`}
            style={{
              width: '5px',
              height: '18px',
              backgroundColor: style.armColor,
              marginTop: '2px',
              marginRight: '1px',
            }}
          />

          {/* Torso */}
          <div
            className={`rounded-sm ${style.bodyBg}`}
            style={{
              width: `${style.shoulderW - 10}px`,
              height: '22px',
            }}
          />

          {/* Right arm */}
          <div
            className={`rounded-full ${rightArm}`}
            style={{
              width: '5px',
              height: '18px',
              backgroundColor: style.armColor,
              marginTop: '2px',
              marginLeft: '1px',
            }}
          />
        </div>

        {/* Hip bar */}
        <div
          className={`rounded-sm ${style.bodyBg} opacity-80`}
          style={{ width: `${style.hipW}px`, height: '4px' }}
        />

        {/* Legs */}
        <div className="flex gap-1.5 mt-0.5">
          <div
            className={`rounded-full ${leftLeg}`}
            style={{
              width: '6px',
              height: '20px',
              backgroundColor: style.legColor,
            }}
          />
          <div
            className={`rounded-full ${rightLeg}`}
            style={{
              width: '6px',
              height: '20px',
              backgroundColor: style.legColor,
            }}
          />
        </div>

        {/* Feet */}
        <div className="flex gap-1 mt-0.5">
          <div
            className="rounded-sm"
            style={{
              width: '9px',
              height: '4px',
              backgroundColor: style.legColor,
              opacity: 0.9,
            }}
          />
          <div
            className="rounded-sm"
            style={{
              width: '9px',
              height: '4px',
              backgroundColor: style.legColor,
              opacity: 0.9,
            }}
          />
        </div>
      </div>

      {/* Name tag — counter-flip so it reads correctly when facingLeft */}
      <div
        className="mt-1 flex items-center gap-1 rounded bg-black/60 px-2 py-0.5 text-xs font-medium text-white shadow z-10 whitespace-nowrap"
        style={facingLeft ? { transform: 'scaleX(-1)' } : undefined}
      >
        {name}
      </div>
    </div>
  )
})

WalkingAvatar.displayName = 'WalkingAvatar'
