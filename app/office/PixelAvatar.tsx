'use client'

import { memo, useState, useEffect } from 'react'
import { VideoTrack } from '@livekit/components-react'
import type { TrackReference } from '@livekit/components-react'

export type Direction = 'down' | 'up' | 'left' | 'right'
type Gender = string | null | undefined

// ── Customization Type Definitions ──
export type SkinToneId = 'fair' | 'peach' | 'tan' | 'olive' | 'bronze' | 'dark'
export type HeadwearId = 'cap_red' | 'cap_black' | 'beanie_green' | 'beanie_purple' | 'hair_parted' | 'hair_spiky' | 'hair_ponytail' | 'headband'
export type OutfitId = 'vest_orange' | 'vest_red' | 'vest_coral' | 'hoodie_emerald' | 'suit_navy' | 'suit_charcoal' | 'shirt_white'
export type PantsId = 'jeans_blue' | 'jeans_light' | 'trousers_charcoal' | 'trousers_black' | 'chinos_tan' | 'slacks_charcoal' | 'slacks_black'
export type ShoesId = 'sneakers_red' | 'sneakers_white' | 'sneakers_emerald' | 'shoes_leather'
export type AccessoryId = 'backpack_yellow' | 'backpack_purple' | 'backpack_black' | 'none'
export type GlassesId = 'none' | 'glasses_retro' | 'sunglasses'

export interface AvatarConfig {
  skinTone?: SkinToneId
  headwear?: HeadwearId
  outfit?: OutfitId
  pants?: PantsId
  shoes?: ShoesId
  accessory?: AccessoryId
  glasses?: GlassesId
}

// ── Selection Option Metadata for Settings UI ──
export const SKIN_OPTIONS: { id: SkinToneId; label: string; color: string }[] = [
  { id: 'fair', label: 'Fair', color: '#fff1f2' },
  { id: 'peach', label: 'Peach', color: '#fed7aa' },
  { id: 'tan', label: 'Warm Tan', color: '#f59e0b' },
  { id: 'olive', label: 'Olive', color: '#d4a373' },
  { id: 'bronze', label: 'Bronze', color: '#b07d62' },
  { id: 'dark', label: 'Rich Dark', color: '#593c28' },
]

export const HEADWEAR_OPTIONS: { id: HeadwearId; label: string; icon: string }[] = [
  { id: 'cap_red', label: 'Red Cap', icon: '🧢' },
  { id: 'cap_black', label: 'Black Cap', icon: '🧢' },
  { id: 'beanie_green', label: 'Green Beanie', icon: '🧶' },
  { id: 'beanie_purple', label: 'Purple Beanie', icon: '🧶' },
  { id: 'hair_parted', label: 'Office Parted', icon: '💼' },
  { id: 'hair_spiky', label: 'Anime Spiky', icon: '⚡' },
  { id: 'hair_ponytail', label: 'Ponytail', icon: '🎀' },
  { id: 'headband', label: 'Sports Band', icon: '🥋' },
]

export const OUTFIT_OPTIONS: { id: OutfitId; label: string; icon: string }[] = [
  { id: 'vest_orange', label: 'Adventure Vest', icon: '🦺' },
  { id: 'vest_red', label: 'Crimson Vest', icon: '🦺' },
  { id: 'vest_coral', label: 'Coral Vest', icon: '🦺' },
  { id: 'suit_navy', label: 'Navy Suit & Tie', icon: '👔' },
  { id: 'suit_charcoal', label: 'Charcoal Suit', icon: '👔' },
  { id: 'hoodie_emerald', label: 'Green Hoodie', icon: '🧥' },
  { id: 'shirt_white', label: 'White Collared', icon: '👕' },
]

export const PANTS_OPTIONS: { id: PantsId; label: string; color: string }[] = [
  { id: 'jeans_blue', label: 'Classic Denim', color: '#3b82f6' },
  { id: 'jeans_light', label: 'Light Denim', color: '#38bdf8' },
  { id: 'trousers_charcoal', label: 'Charcoal Trousers', color: '#475569' },
  { id: 'trousers_black', label: 'Midnight Black', color: '#18181b' },
  { id: 'chinos_tan', label: 'Khaki Chinos', color: '#d97706' },
]

export const SHOES_OPTIONS: { id: ShoesId; label: string; color: string }[] = [
  { id: 'sneakers_red', label: 'Red Sneakers', color: '#dc2626' },
  { id: 'sneakers_white', label: 'White Kicks', color: '#f8fafc' },
  { id: 'sneakers_emerald', label: 'Green Runners', color: '#10b981' },
  { id: 'shoes_leather', label: 'Leather Oxfords', color: '#18181b' },
]

export const ACCESSORY_OPTIONS: { id: AccessoryId; label: string; icon: string }[] = [
  { id: 'backpack_yellow', label: 'Yellow Pack', icon: '🎒' },
  { id: 'backpack_purple', label: 'Purple Pack', icon: '🎒' },
  { id: 'backpack_black', label: 'Black Pack', icon: '🎒' },
  { id: 'none', label: 'No Pack', icon: '🚫' },
]

export const GLASSES_OPTIONS: { id: GlassesId; label: string; icon: string }[] = [
  { id: 'none', label: 'No Glasses', icon: '👁️' },
  { id: 'glasses_retro', label: 'Retro Spectacles', icon: '👓' },
  { id: 'sunglasses', label: 'Aviator Shades', icon: '🕶️' },
]

interface PixelAvatarProps {
  gender?: Gender
  avatarConfig?: AvatarConfig | null
  direction?: Direction
  isWalking: boolean
  isSitting?: boolean
  isMe: boolean
  isSpeaking: boolean
  avatarColor?: string
  avatar_url?: string | null
  localCamTrackRef?: TrackReference | null
  remoteCamTrackRef?: TrackReference | null
  showVideo?: boolean
  name: string
}

// ── Palette Generation from Config / Gender Defaults ──
function resolveConfig(config: AvatarConfig | null | undefined, gender: Gender) {
  const isFemale = gender === 'female'
  const isNonBinary = gender === 'non_binary'

  const skinTone: SkinToneId = config?.skinTone || 'peach'
  const headwear: HeadwearId = config?.headwear || (isFemale ? 'hair_ponytail' : isNonBinary ? 'beanie_green' : 'cap_red')
  const outfit: OutfitId = config?.outfit || (isFemale ? 'vest_coral' : isNonBinary ? 'hoodie_emerald' : 'vest_orange')
  const pants: PantsId = config?.pants || (isFemale ? 'jeans_light' : isNonBinary ? 'trousers_charcoal' : 'jeans_blue')
  const shoes: ShoesId = config?.shoes || (isFemale ? 'sneakers_red' : isNonBinary ? 'sneakers_emerald' : 'sneakers_red')
  const accessory: AccessoryId = config?.accessory || (isFemale ? 'backpack_yellow' : isNonBinary ? 'backpack_purple' : 'backpack_yellow')
  const glasses: GlassesId = config?.glasses || 'none'

  // Skin tones
  let skin = '#fed7aa'
  let skinShadow = '#fdba74'
  if (skinTone === 'fair') { skin = '#fff1f2'; skinShadow = '#fecdd3' }
  else if (skinTone === 'tan') { skin = '#f59e0b'; skinShadow = '#d97706' }
  else if (skinTone === 'olive') { skin = '#d4a373'; skinShadow = '#bc8a5f' }
  else if (skinTone === 'bronze') { skin = '#b07d62'; skinShadow = '#8d5b4c' }
  else if (skinTone === 'dark') { skin = '#593c28'; skinShadow = '#3d2617' }

  // Pants
  let pantsCol = '#3b82f6'; let pantsShad = '#1d4ed8'; let cuffCol = '#93c5fd'
  if (pants === 'jeans_light') { pantsCol = '#38bdf8'; pantsShad = '#0284c7'; cuffCol = '#bae6fd' }
  else if (pants === 'trousers_charcoal' || (pants as string) === 'slacks_charcoal') { pantsCol = '#475569'; pantsShad = '#334155'; cuffCol = '#64748b' }
  else if (pants === 'trousers_black' || (pants as string) === 'slacks_black') { pantsCol = '#18181b'; pantsShad = '#09090b'; cuffCol = '#27272a' }
  else if (pants === 'chinos_tan') { pantsCol = '#d97706'; pantsShad = '#b45309'; cuffCol = '#f59e0b' }

  // Shoes
  let shoeCol = '#dc2626'; let soleCol = '#f8fafc'
  if (shoes === 'sneakers_white') { shoeCol = '#f8fafc'; soleCol = '#cbd5e1' }
  else if (shoes === 'sneakers_emerald') { shoeCol = '#10b981'; soleCol = '#f8fafc' }
  else if (shoes === 'shoes_leather') { shoeCol = '#18181b'; soleCol = '#78350f' }

  // Backpack
  let backpackCol: string | null = '#eab308'; let backpackShad = '#ca8a04'
  if (accessory === 'backpack_purple') { backpackCol = '#8b5cf6'; backpackShad = '#6d28d9' }
  else if (accessory === 'backpack_black') { backpackCol = '#27272a'; backpackShad = '#18181b' }
  else if (accessory === 'none') { backpackCol = null; backpackShad = 'transparent' }

  return {
    skin,
    skinShadow,
    headwear,
    outfit,
    pantsCol,
    pantsShad,
    cuffCol,
    shoeCol,
    soleCol,
    backpackCol,
    backpackShad,
    glasses,
  }
}

export const PixelAvatar = memo(function PixelAvatar({
  gender = 'male',
  avatarConfig,
  direction = 'down',
  isWalking = false,
  isSitting = false,
  isMe = false,
  isSpeaking = false,
  avatarColor: _avatarColor,
  avatar_url: _avatar_url,
  localCamTrackRef,
  remoteCamTrackRef,
  showVideo = false,
  name,
}: PixelAvatarProps) {
  const p = resolveConfig(avatarConfig, gender)
  const [walkFrame, setWalkFrame] = useState(0)

  // 4-step walk cycle timer when moving
  useEffect(() => {
    if (!isWalking || isSitting) {
      setWalkFrame(0)
      return
    }
    const interval = setInterval(() => {
      setWalkFrame((prev) => (prev + 1) % 4)
    }, 140)
    return () => clearInterval(interval)
  }, [isWalking, isSitting])

  const isFacingLeft = direction === 'left'
  const isFacingRight = direction === 'right'
  const isSide = isFacingLeft || isFacingRight

  // Walk leg offsets
  const effectiveWalking = isWalking && !isSitting
  const leftLegOffset = effectiveWalking ? (walkFrame === 1 ? -2 : walkFrame === 3 ? 1 : 0) : 0
  const rightLegOffset = effectiveWalking ? (walkFrame === 3 ? -2 : walkFrame === 1 ? 1 : 0) : 0
  const armSwing = effectiveWalking ? (walkFrame === 1 ? -1 : walkFrame === 3 ? 1 : 0) : 0

  return (
    <div className="relative flex flex-col items-center select-none" style={{ width: '64px', height: '80px' }}>
      {/* Seated Badge Indicator */}
      {isSitting && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-40 rounded-full bg-amber-600/90 border border-amber-300 px-1.5 py-0.5 text-[8px] font-black text-white shadow-sm flex items-center gap-0.5 tracking-wider uppercase">
          <span>🪑</span>
          <span>SEATED</span>
        </div>
      )}

      <div 
        className="relative w-full h-full flex flex-col items-center transition-transform duration-200"
        style={{
          transform: isSitting ? 'translateY(6px) scaleY(0.94)' : 'none'
        }}
      >
      {/* ── 1. Realistic 45° Directional Cast Ground Shadow ── */}
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '4px',
          left: '50%',
          width: '32px',
          height: '46px',
          transformOrigin: 'bottom left',
          transform: 'translateX(-30%) skewX(-52deg) scaleY(0.42)',
          background: 'linear-gradient(to top right, rgba(20, 14, 30, 0.45) 0%, rgba(20, 14, 30, 0.25) 60%, rgba(20, 14, 30, 0.05) 100%)',
          borderRadius: '12px 16px 20px 8px',
          filter: 'blur(0.6px)',
          zIndex: 0,
        }}
      />

      {/* ── 2. Floating Live Video / Retro Pixel CRT Monitor ── */}
      {showVideo && (
        <div
          className="absolute -top-16 z-30 flex flex-col items-center animate-bounce-short pointer-events-auto"
          style={{ width: '80px' }}
        >
          <div className="relative w-16 h-12 rounded bg-gray-900 border-2 border-yellow-400 shadow-[0_4px_12px_rgba(0,0,0,0.6)] overflow-hidden">
            {isMe && localCamTrackRef ? (
              <VideoTrack trackRef={localCamTrackRef} className="h-full w-full scale-x-[-1] object-cover" />
            ) : !isMe && remoteCamTrackRef ? (
              <VideoTrack trackRef={remoteCamTrackRef} className="h-full w-full object-cover" />
            ) : (
              <div className="w-full h-full bg-slate-800 flex items-center justify-center text-xs text-white">Live</div>
            )}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none opacity-40" />
          </div>
          <div className="w-1.5 h-2 bg-yellow-500" />
        </div>
      )}

      {/* ── 3. Speaking Indicator ── */}
      {isSpeaking && (
        <div className="absolute -top-3 z-20 flex items-center gap-0.5 bg-purple-900/80 border border-purple-400 px-1.5 py-0.5 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.8)]">
          <span className="w-1 h-2 bg-purple-300 rounded-full animate-pulse" />
          <span className="w-1 h-3.5 bg-purple-200 rounded-full animate-pulse" />
          <span className="w-1 h-2 bg-purple-300 rounded-full animate-pulse" />
        </div>
      )}

      {/* ── 4. Character Pixel Art Sprite (SVG 24x34 Grid) ── */}
      <div
        className={`relative z-10 transition-transform ${isWalking ? '' : 'avatar-idle-bob'}`}
        style={{
          width: '54px',
          height: '66px',
          transform: isFacingLeft ? 'scaleX(-1)' : 'scaleX(1)',
          filter: isSpeaking ? 'drop-shadow(0 0 6px rgba(192,132,252,0.9))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))',
        }}
      >
        <svg
          viewBox="0 0 24 34"
          className="w-full h-full"
          style={{
            imageRendering: 'pixelated',
            shapeRendering: 'crispEdges',
          }}
        >
          {/* ══════════════ DOWN (Facing Camera) ══════════════ */}
          {direction === 'down' && (
            <g>
              {/* ─ Headwear / Hair Options ─ */}
              {p.headwear === 'cap_red' && (
                <g>
                  <rect x="7" y="3" width="10" height="4" fill="#dc2626" />
                  <rect x="6" y="5" width="12" height="3" fill="#dc2626" />
                  <rect x="8" y="4" width="8" height="3" fill="#ffffff" />
                  <rect x="5" y="7" width="14" height="2" fill="#ffffff" />
                  <rect x="6" y="9" width="12" height="1" fill="#cbd5e1" />
                </g>
              )}
              {p.headwear === 'cap_black' && (
                <g>
                  <rect x="7" y="3" width="10" height="4" fill="#18181b" />
                  <rect x="6" y="5" width="12" height="3" fill="#18181b" />
                  <rect x="11" y="4" width="2" height="2" fill="#fbbf24" />
                  <rect x="5" y="7" width="14" height="2" fill="#27272a" />
                  <rect x="6" y="9" width="12" height="1" fill="#fbbf24" />
                </g>
              )}
              {p.headwear === 'beanie_green' && (
                <g>
                  <rect x="7" y="2" width="10" height="6" fill="#047857" />
                  <rect x="6" y="4" width="12" height="4" fill="#059669" />
                  <rect x="5" y="7" width="14" height="2" fill="#10b981" />
                </g>
              )}
              {p.headwear === 'beanie_purple' && (
                <g>
                  <rect x="7" y="2" width="10" height="6" fill="#6d28d9" />
                  <rect x="6" y="4" width="12" height="4" fill="#7c3aed" />
                  <rect x="5" y="7" width="14" height="2" fill="#a78bfa" />
                </g>
              )}
              {p.headwear === 'hair_parted' && (
                <g>
                  <rect x="7" y="3" width="10" height="5" fill="#292524" />
                  <rect x="6" y="5" width="12" height="4" fill="#292524" />
                  <rect x="8" y="4" width="4" height="2" fill="#57534e" />
                </g>
              )}
              {p.headwear === 'hair_spiky' && (
                <g>
                  <rect x="7" y="2" width="2" height="3" fill="#78350f" />
                  <rect x="11" y="1" width="2" height="4" fill="#9a3412" />
                  <rect x="15" y="2" width="2" height="3" fill="#78350f" />
                  <rect x="6" y="4" width="12" height="5" fill="#78350f" />
                </g>
              )}
              {p.headwear === 'hair_ponytail' && (
                <g>
                  <rect x="7" y="3" width="10" height="5" fill="#92400e" />
                  <rect x="6" y="5" width="12" height="5" fill="#92400e" />
                  {/* Ponytail puff side */}
                  <rect x="17" y="4" width="3" height="4" fill="#92400e" />
                  <rect x="17" y="5" width="1" height="2" fill="#f43f5e" /> {/* hair tie */}
                </g>
              )}
              {p.headwear === 'headband' && (
                <g>
                  <rect x="7" y="3" width="10" height="5" fill="#334155" />
                  <rect x="6" y="5" width="12" height="4" fill="#334155" />
                  <rect x="5" y="6" width="14" height="2" fill="#f8fafc" />
                  <rect x="5" y="7" width="14" height="1" fill="#ef4444" />
                </g>
              )}

              {/* ─ Side Hair ─ */}
              <rect x="5" y="8" width="2" height="4" fill="#451a03" />
              <rect x="17" y="8" width="2" height="4" fill="#451a03" />

              {/* ─ Face / Skin ─ */}
              <rect x="7" y="8" width="10" height="6" fill={p.skin} />

              {/* Eyes */}
              <rect x="8" y="10" width="2" height="2" fill="#1e293b" />
              <rect x="14" y="10" width="2" height="2" fill="#1e293b" />
              <rect x="8" y="10" width="1" height="1" fill="#ffffff" />
              <rect x="14" y="10" width="1" height="1" fill="#ffffff" />
              {/* Cheeks */}
              <rect x="7" y="12" width="2" height="1" fill={p.skinShadow} />
              <rect x="15" y="12" width="2" height="1" fill={p.skinShadow} />
              {/* Mouth */}
              <rect x="11" y="13" width="2" height="1" fill="#b91c1c" />

              {/* Glasses Overlay */}
              {p.glasses === 'glasses_retro' && (
                <g>
                  <rect x="7" y="9" width="4" height="3" fill="none" stroke="#09090b" strokeWidth="1" />
                  <rect x="13" y="9" width="4" height="3" fill="none" stroke="#09090b" strokeWidth="1" />
                  <line x1="11" y1="10" x2="13" y2="10" stroke="#09090b" strokeWidth="1" />
                </g>
              )}
              {p.glasses === 'sunglasses' && (
                <g>
                  <rect x="7" y="9" width="4" height="3" fill="#0f172a" />
                  <rect x="13" y="9" width="4" height="3" fill="#0f172a" />
                  <line x1="11" y1="10" x2="13" y2="10" stroke="#0f172a" strokeWidth="1" />
                  <rect x="8" y="10" width="1" height="1" fill="#38bdf8" />
                  <rect x="14" y="10" width="1" height="1" fill="#38bdf8" />
                </g>
              )}

              {/* ─ Neck ─ */}
              <rect x="10" y="14" width="4" height="2" fill={p.skinShadow} />

              {/* ─ Torso / Outfits ─ */}
              {p.outfit === 'suit_navy' && (
                <g>
                  <rect x="5" y="16" width="14" height="8" fill="#1e3a8a" />
                  <rect x="10" y="16" width="4" height="6" fill="#ffffff" />
                  <polygon points="12,17 11,23 13,23" fill="#dc2626" /> {/* Red tie */}
                  <line x1="10" y1="16" x2="8" y2="21" stroke="#172554" strokeWidth="1" />
                  <line x1="14" y1="16" x2="16" y2="21" stroke="#172554" strokeWidth="1" />
                </g>
              )}
              {p.outfit === 'suit_charcoal' && (
                <g>
                  <rect x="5" y="16" width="14" height="8" fill="#334155" />
                  <rect x="10" y="16" width="4" height="6" fill="#bae6fd" />
                  <polygon points="12,17 11,23 13,23" fill="#eab308" /> {/* Gold tie */}
                </g>
              )}
              {p.outfit === 'hoodie_emerald' && (
                <g>
                  <rect x="5" y="16" width="14" height="8" fill="#059669" />
                  <rect x="7" y="20" width="10" height="4" fill="#047857" /> {/* Pouch */}
                  <rect x="10" y="17" width="1" height="3" fill="#34d399" /> {/* String */}
                  <rect x="13" y="17" width="1" height="3" fill="#34d399" />
                </g>
              )}
              {p.outfit === 'shirt_white' && (
                <g>
                  <rect x="5" y="16" width="14" height="8" fill="#f8fafc" />
                  <rect x="11" y="16" width="2" height="8" fill="#e2e8f0" />
                  <rect x="11.5" y="18" width="1" height="1" fill="#475569" />
                  <rect x="11.5" y="21" width="1" height="1" fill="#475569" />
                </g>
              )}
              {p.outfit === 'vest_red' && (
                <g>
                  <rect x="5" y="16" width="14" height="8" fill="#dc2626" />
                  <rect x="10" y="16" width="4" height="7" fill="#ffffff" />
                </g>
              )}
              {p.outfit === 'vest_coral' && (
                <g>
                  <rect x="5" y="16" width="14" height="8" fill="#fb7185" />
                  <rect x="10" y="16" width="4" height="7" fill="#ffffff" />
                </g>
              )}
              {p.outfit === 'vest_orange' && (
                <g>
                  <rect x="5" y="16" width="14" height="8" fill="#ea580c" />
                  <rect x="10" y="16" width="4" height="7" fill="#f8fafc" />
                </g>
              )}

              {/* Backpack straps if equipped */}
              {p.backpackCol && (
                <g>
                  <rect x="7" y="16" width="2" height="8" fill={p.backpackCol} />
                  <rect x="15" y="16" width="2" height="8" fill={p.backpackCol} />
                </g>
              )}

              {/* ─ Arms & Hands ─ */}
              <rect x="3" y={17 + armSwing} width="2" height="5" fill={p.skin} />
              <rect x="3" y={22 + armSwing} width="2" height="2" fill={p.pantsShad} />
              <rect x="3" y={24 + armSwing} width="2" height="2" fill={p.skin} />

              <rect x="19" y={17 - armSwing} width="2" height="5" fill={p.skin} />
              <rect x="19" y={22 - armSwing} width="2" height="2" fill={p.pantsShad} />
              <rect x="19" y={24 - armSwing} width="2" height="2" fill={p.skin} />

              {/* ─ Pants ─ */}
              <rect x="7" y="24" width="10" height="2" fill={p.pantsShad} />
              <rect x="7" y={26 + leftLegOffset} width="4" height="5" fill={p.pantsCol} />
              <rect x="7" y={30 + leftLegOffset} width="4" height="1" fill={p.cuffCol} />

              <rect x="13" y={26 + rightLegOffset} width="4" height="5" fill={p.pantsCol} />
              <rect x="13" y={30 + rightLegOffset} width="4" height="1" fill={p.cuffCol} />

              {/* ─ Shoes ─ */}
              <rect x="6" y={31 + leftLegOffset} width="5" height="2" fill={p.shoeCol} />
              <rect x="6" y={33 + leftLegOffset} width="5" height="1" fill={p.soleCol} />

              <rect x="13" y={31 + rightLegOffset} width="5" height="2" fill={p.shoeCol} />
              <rect x="13" y={33 + rightLegOffset} width="5" height="1" fill={p.soleCol} />
            </g>
          )}

          {/* ══════════════ UP (Back View) ══════════════ */}
          {direction === 'up' && (
            <g>
              {/* Back Headwear */}
              {p.headwear === 'cap_red' && (
                <g>
                  <rect x="7" y="3" width="10" height="5" fill="#dc2626" />
                  <rect x="6" y="5" width="12" height="5" fill="#dc2626" />
                </g>
              )}
              {p.headwear === 'cap_black' && (
                <g>
                  <rect x="7" y="3" width="10" height="5" fill="#18181b" />
                  <rect x="6" y="5" width="12" height="5" fill="#18181b" />
                </g>
              )}
              {p.headwear === 'beanie_green' && (
                <g>
                  <rect x="7" y="2" width="10" height="6" fill="#047857" />
                  <rect x="6" y="5" width="12" height="5" fill="#059669" />
                </g>
              )}
              {p.headwear === 'beanie_purple' && (
                <g>
                  <rect x="7" y="2" width="10" height="6" fill="#6d28d9" />
                  <rect x="6" y="5" width="12" height="5" fill="#7c3aed" />
                </g>
              )}
              {p.headwear === 'hair_parted' && (
                <rect x="6" y="4" width="12" height="8" fill="#292524" />
              )}
              {p.headwear === 'hair_spiky' && (
                <g>
                  <rect x="7" y="2" width="2" height="3" fill="#78350f" />
                  <rect x="11" y="1" width="2" height="4" fill="#9a3412" />
                  <rect x="15" y="2" width="2" height="3" fill="#78350f" />
                  <rect x="6" y="4" width="12" height="8" fill="#78350f" />
                </g>
              )}
              {p.headwear === 'hair_ponytail' && (
                <g>
                  <rect x="6" y="4" width="12" height="7" fill="#92400e" />
                  <rect x="11" y="5" width="2" height="7" fill="#92400e" />
                  <rect x="11" y="4" width="2" height="2" fill="#f43f5e" /> {/* Tie */}
                </g>
              )}
              {p.headwear === 'headband' && (
                <g>
                  <rect x="6" y="4" width="12" height="7" fill="#334155" />
                  <rect x="5" y="6" width="14" height="2" fill="#f8fafc" />
                </g>
              )}

              {/* Back Hair Underneath */}
              <rect x="9" y="10" width="6" height="2" fill="#451a03" />
              <rect x="6" y="8" width="3" height="4" fill="#451a03" />
              <rect x="15" y="8" width="3" height="4" fill="#451a03" />

              <rect x="10" y="13" width="4" height="2" fill={p.skinShadow} />

              {/* Back Outfits */}
              <rect x="5" y="15" width="14" height="9" fill={
                p.outfit === 'suit_navy' ? '#1e3a8a' :
                p.outfit === 'suit_charcoal' ? '#334155' :
                p.outfit === 'hoodie_emerald' ? '#059669' :
                p.outfit === 'shirt_white' ? '#f8fafc' :
                p.outfit === 'vest_red' ? '#dc2626' :
                p.outfit === 'vest_coral' ? '#fb7185' : '#ea580c'
              } />

              {/* Backpack mounted on back if equipped */}
              {p.backpackCol && (
                <g>
                  <rect x="7" y="16" width="10" height="8" fill={p.backpackCol} />
                  <rect x="8" y="18" width="8" height="4" fill={p.backpackShad} />
                  <rect x="11" y="16" width="2" height="3" fill="#451a03" />
                </g>
              )}

              {/* Arms Back */}
              <rect x="3" y={16 - armSwing} width="2" height="6" fill={p.skin} />
              <rect x="3" y={22 - armSwing} width="2" height="2" fill={p.pantsShad} />
              <rect x="19" y={16 + armSwing} width="2" height="6" fill={p.skin} />
              <rect x="19" y={22 + armSwing} width="2" height="2" fill={p.pantsShad} />

              {/* Pants Back */}
              <rect x="7" y="24" width="10" height="2" fill={p.pantsShad} />
              <rect x="7" y={26 + leftLegOffset} width="4" height="5" fill={p.pantsCol} />
              <rect x="13" y={26 + rightLegOffset} width="4" height="5" fill={p.pantsCol} />

              {/* Shoes Back */}
              <rect x="7" y={31 + leftLegOffset} width="4" height="2" fill={p.shoeCol} />
              <rect x="7" y={33 + leftLegOffset} width="4" height="1" fill={p.soleCol} />
              <rect x="13" y={31 + rightLegOffset} width="4" height="2" fill={p.shoeCol} />
              <rect x="13" y={33 + rightLegOffset} width="4" height="1" fill={p.soleCol} />
            </g>
          )}

          {/* ══════════════ SIDE (Profile) ══════════════ */}
          {isSide && (
            <g>
              {/* Cap / Headwear Side */}
              {p.headwear === 'cap_red' && (
                <g>
                  <rect x="7" y="3" width="9" height="5" fill="#dc2626" />
                  <rect x="6" y="5" width="11" height="4" fill="#dc2626" />
                  <rect x="14" y="7" width="5" height="2" fill="#ffffff" />
                  <rect x="15" y="9" width="4" height="1" fill="#94a3b8" />
                </g>
              )}
              {p.headwear === 'cap_black' && (
                <g>
                  <rect x="7" y="3" width="9" height="5" fill="#18181b" />
                  <rect x="6" y="5" width="11" height="4" fill="#18181b" />
                  <rect x="14" y="7" width="5" height="2" fill="#27272a" />
                  <rect x="15" y="9" width="4" height="1" fill="#fbbf24" />
                </g>
              )}
              {p.headwear === 'beanie_green' && (
                <g>
                  <rect x="7" y="2" width="9" height="6" fill="#047857" />
                  <rect x="6" y="5" width="11" height="5" fill="#059669" />
                </g>
              )}
              {p.headwear === 'beanie_purple' && (
                <g>
                  <rect x="7" y="2" width="9" height="6" fill="#6d28d9" />
                  <rect x="6" y="5" width="11" height="5" fill="#7c3aed" />
                </g>
              )}
              {(p.headwear === 'hair_parted' || p.headwear === 'hair_spiky' || p.headwear === 'hair_ponytail' || p.headwear === 'headband') && (
                <g>
                  <rect x="6" y="4" width="10" height="6" fill="#451a03" />
                  {p.headwear === 'hair_ponytail' && (
                    <rect x="4" y="5" width="3" height="5" fill="#92400e" />
                  )}
                  {p.headwear === 'headband' && (
                    <rect x="6" y="6" width="11" height="2" fill="#f8fafc" />
                  )}
                </g>
              )}

              {/* Side Hair */}
              <rect x="5" y="7" width="3" height="5" fill="#451a03" />

              {/* Side Face */}
              <rect x="10" y="8" width="5" height="6" fill={p.skin} />
              <rect x="15" y="9" width="2" height="3" fill={p.skin} />
              <rect x="13" y="9" width="2" height="2" fill="#1e293b" />
              <rect x="14" y="9" width="1" height="1" fill="#ffffff" />

              {/* Side Eyewear */}
              {p.glasses === 'glasses_retro' && (
                <g>
                  <rect x="12" y="9" width="4" height="3" fill="none" stroke="#09090b" strokeWidth="1" />
                  <line x1="8" y1="10" x2="12" y2="10" stroke="#09090b" strokeWidth="1" />
                </g>
              )}
              {p.glasses === 'sunglasses' && (
                <g>
                  <rect x="12" y="9" width="4" height="3" fill="#0f172a" />
                  <line x1="8" y1="10" x2="12" y2="10" stroke="#0f172a" strokeWidth="1" />
                  <rect x="13" y="10" width="1" height="1" fill="#38bdf8" />
                </g>
              )}

              {/* Side Backpack if equipped */}
              {p.backpackCol && (
                <g>
                  <rect x="4" y="15" width="4" height="8" fill={p.backpackCol} />
                  <rect x="3" y="17" width="2" height="5" fill={p.backpackShad} />
                </g>
              )}

              {/* Side Torso */}
              <rect x="8" y="15" width="8" height="9" fill={
                p.outfit === 'suit_navy' ? '#1e3a8a' :
                p.outfit === 'suit_charcoal' ? '#334155' :
                p.outfit === 'hoodie_emerald' ? '#059669' :
                p.outfit === 'shirt_white' ? '#f8fafc' :
                p.outfit === 'vest_red' ? '#dc2626' :
                p.outfit === 'vest_coral' ? '#fb7185' : '#ea580c'
              } />

              {/* Side Arm */}
              <rect x={10 + armSwing} y="16" width="3" height="6" fill={p.skin} />
              <rect x={10 + armSwing} y="22" width="3" height="2" fill={p.pantsShad} />
              <rect x={10 + armSwing} y="24" width="3" height="2" fill={p.skin} />

              {/* Side Legs */}
              <rect x="8" y="24" width="7" height="2" fill={p.pantsShad} />
              <rect x={10 + leftLegOffset * 1.5} y="26" width="4" height="5" fill={p.pantsCol} />
              <rect x={10 + leftLegOffset * 1.5} y="31" width="6" height="2" fill={p.shoeCol} />
              <rect x={10 + leftLegOffset * 1.5} y="33" width="6" height="1" fill={p.soleCol} />

              <rect x={6 - leftLegOffset * 1.5} y="26" width="4" height="5" fill={p.pantsShad} />
              <rect x={5 - leftLegOffset * 1.5} y="31" width="5" height="2" fill={p.shoeCol} />
              <rect x={5 - leftLegOffset * 1.5} y="33" width="5" height="1" fill={p.soleCol} />
            </g>
          )}
        </svg>
      </div>
      </div>

      {/* ── 5. Crisp Retro Name Tag ── */}
      <div
        className="mt-1 flex items-center justify-center rounded px-2 py-0.5 text-[11px] font-semibold tracking-wide text-white shadow-md z-20 whitespace-nowrap"
        style={{
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          fontFamily: 'monospace, sans-serif',
          letterSpacing: '0.02em',
        }}
      >
        {isMe && <span className="mr-1 text-[9px] text-amber-300 font-bold">★</span>}
        {name}
      </div>
    </div>
  )
})

PixelAvatar.displayName = 'PixelAvatar'
