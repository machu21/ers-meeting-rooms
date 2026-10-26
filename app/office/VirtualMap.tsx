'use client'

import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { PixelAvatar, type Direction, type AvatarConfig } from './PixelAvatar'
import { createClient } from '@/lib/supabase/client'
import MeetingMinutesModal from './MeetingMinutesModal'
import { generateMeetingMinutes, getLatestMeetingMinutes, saveTranscript } from './ai-actions'
import { getZones, saveZone, deleteZone } from './zone-actions'
import {
  VideoCameraIcon,
  VideoCameraSlashIcon,
  MicrophoneIcon,
  ChatBubbleLeftRightIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  RectangleGroupIcon,
  TrashIcon,
  SparklesIcon,
  TvIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon
} from '@heroicons/react/24/solid'
import ChatPanel from './ChatPanel'
import OfficeChannelsSidebar from '@/components/channels/OfficeChannelsSidebar'
import { HashtagIcon } from '@heroicons/react/24/outline'
import ScreenShareViewer from './ScreenShareViewer'
import DeviceSelector from './DeviceSelector'
import { useLocalParticipant, useRemoteParticipants, AudioTrack, useTrackVolume } from '@livekit/components-react'
import { Track, RemoteAudioTrack, LocalAudioTrack } from 'livekit-client'
import CharacterGenderModal from '@/components/CharacterGenderModal'

type MapUser = {
  id: string
  name: string
  x: number
  y: number
  avatarColor: string
  avatar_url?: string | null
  gender?: string | null
  avatarConfig?: AvatarConfig | null
  isWalking?: boolean
  isSitting?: boolean
  direction?: Direction
  facingLeft?: boolean
}

type CurrentUser = {
  id: string
  name: string
  avatar_url: string | null
  camera_enabled: boolean
  microphone_enabled: boolean
  role: string
  gender?: string | null
  avatar_config?: AvatarConfig | null
}

interface VirtualMapProps {
  currentUser: CurrentUser
  roomId: string
  mapBackground: string
  ambientAudio?: string
  disableMic?: boolean
}

const PROXIMITY_RADIUS = 150
const MAP_WIDTH = 1600
const MAP_HEIGHT = 900
const AVATAR_RADIUS = 24
const MOVE_SPEED = 260
const GLIDE_SPEED = 340
const BROADCAST_INTERVAL = 60

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(v, max))

const MapAvatar = memo(({
  user,
  isMe,
  isInZone,
  shouldConnect,
}: {
  user: MapUser
  isMe: boolean
  isInZone: boolean
  shouldConnect: boolean
}) => {
  const remoteParticipants = useRemoteParticipants()
  const participant = isMe ? null : remoteParticipants.find(p => p.identity.startsWith(user.id + '#'))

  const camPub = participant?.getTrackPublication(Track.Source.Camera)
  const micPub = participant?.getTrackPublication(Track.Source.Microphone)
  
  const remoteVolume = useTrackVolume(micPub?.track as RemoteAudioTrack | undefined)
  
  const { localParticipant } = useLocalParticipant()
  const localMicTrack = localParticipant?.getTrackPublication(Track.Source.Microphone)?.track
  const localVolume = useTrackVolume(localMicTrack as LocalAudioTrack | undefined)

  const volume = isMe ? localVolume : remoteVolume
  const isSpeaking = !!(volume && volume > 0.05)

  const showVideo = !!(isMe 
    ? localParticipant?.isCameraEnabled 
    : (shouldConnect && camPub?.track && !camPub.isMuted))

  // Build track refs for PixelAvatar
  const localCamPub = localParticipant?.getTrackPublication(Track.Source.Camera)
  const localCamTrackRef = isMe && localParticipant && localCamPub
    ? { participant: localParticipant, source: Track.Source.Camera as const, publication: localCamPub }
    : null
  const remoteCamTrackRef = !isMe && participant && camPub
    ? { participant, source: Track.Source.Camera as const, publication: camPub }
    : null

  // 2.5D Isometric depth sorting: sprites lower on the map (higher y) appear in front
  const depthZIndex = Math.floor(user.y)

  return (
    <div
      className="absolute flex flex-col items-center pointer-events-none"
      style={{
        left: `${user.x - 32}px`,
        top: `${user.y - 68}px`,
        transformOrigin: 'bottom center',
        zIndex: depthZIndex
      }}
    >
      {isMe && !isInZone && (
        <div
          className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-blue-400/30 bg-blue-400/10 pointer-events-none"
          style={{ width: `${PROXIMITY_RADIUS * 2}px`, height: `${PROXIMITY_RADIUS * 2}px` }}
        />
      )}

      <PixelAvatar
        gender={user.gender}
        avatarConfig={user.avatarConfig}
        direction={user.direction || (user.facingLeft ? 'left' : 'down')}
        isWalking={!!user.isWalking}
        isSitting={!!user.isSitting}
        isMe={isMe}
        isSpeaking={isSpeaking}
        avatarColor={user.avatarColor}
        avatar_url={user.avatar_url}
        localCamTrackRef={localCamTrackRef}
        remoteCamTrackRef={remoteCamTrackRef}
        showVideo={showVideo}
        name={user.name}
      />

      {!isMe && shouldConnect && participant && micPub?.track && !micPub.isMuted && (
        <AudioTrack trackRef={{ participant: participant, source: Track.Source.Microphone, publication: micPub }} />
      )}
    </div>
  )
})
MapAvatar.displayName = 'MapAvatar'

type PlayerMeta = {
  name: string
  avatarColor: string
  avatar_url?: string | null
  gender?: string | null
  avatarConfig?: AvatarConfig | null
  targetX: number
  targetY: number
  renderX: number
  renderY: number
  isWalking?: boolean
  isSitting?: boolean
  direction?: Direction
  facingLeft?: boolean
}
type Zone = { id: string; name: string; x: number; y: number; width: number; height: number }

export default function VirtualMap({ currentUser, roomId, mapBackground, ambientAudio, disableMic = false }: VirtualMapProps) {
  const supabase = createClient()
  
  const outerContainerRef = useRef<HTMLDivElement>(null)
  const mapBoardRef = useRef<HTMLDivElement>(null)

  const [containerSize, setContainerSize] = useState({ width: 1600, height: 900 })
  const [zoomLevel, setZoomLevel] = useState(1.0)

  const handleZoomIn = () => setZoomLevel(prev => clamp(prev + 0.15, 1.0, 3.0))
  const handleZoomOut = () => setZoomLevel(prev => clamp(prev - 0.15, 1.0, 3.0))
  const handleResetZoom = () => setZoomLevel(1.0)

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (isChannelsOpen || isChatOpen) return
    if (e.deltaY < 0) {
      setZoomLevel(prev => clamp(prev + 0.06, 1.0, 3.0))
    } else if (e.deltaY > 0) {
      setZoomLevel(prev => clamp(prev - 0.06, 1.0, 3.0))
    }
  }

  const [zones, setZones] = useState<Zone[]>([])
  const [isEditingZones, setIsEditingZones] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [draftZone, setDraftZone] = useState<{ x: number, y: number, w: number, h: number } | null>(null)

  const [generatingZoneId, setGeneratingZoneId] = useState<string | null>(null)
  const [activeMinutes, setActiveMinutes] = useState<{ summary: string; action_items: string; zoneName: string } | null>(null)
  const [isTogglingCamera, setIsTogglingCamera] = useState(false)
  const [isTogglingMic, setIsTogglingMic] = useState(false)
  const [isTogglingScreen, setIsTogglingScreen] = useState(false)
  const [deletingZoneId, setDeletingZoneId] = useState<string | null>(null)

  const handleGenerateMinutes = async (e: React.MouseEvent, zoneId: string, zoneName: string) => {
    e.stopPropagation()
    setGeneratingZoneId(zoneId)
    const res = await generateMeetingMinutes(zoneId)
    if (res.success) {
      const latest = await getLatestMeetingMinutes(zoneId)
      if (latest) setActiveMinutes({ ...latest, zoneName })
    } else {
      alert(res.message)
    }
    setGeneratingZoneId(null)
  }

  const ambientAudioRef = useRef<HTMLAudioElement>(null)
  const [isAmbientPlaying, setIsAmbientPlaying] = useState(false)

  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isChannelsOpen, setIsChannelsOpen] = useState(false)
  const [chatMounted, setChatMounted] = useState(false)
  const [chatEntered, setChatEntered] = useState(false)
  const chatCloseTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const CHAT_TRANSITION_MS = 220

  const { localParticipant } = useLocalParticipant()
  const screenShareActive = localParticipant?.isScreenShareEnabled ?? false

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const isChannelJoined = useRef(false)

  const playersRef = useRef<Map<string, PlayerMeta>>(
    new Map([[currentUser.id, { name: currentUser.name || 'You', avatarColor: 'bg-blue-500', avatar_url: currentUser.avatar_url, gender: currentUser.gender, avatarConfig: currentUser.avatar_config, targetX: 800, targetY: 450, renderX: 800, renderY: 450, isWalking: false, direction: 'down', facingLeft: false }]])
  )
  const pressedKeys = useRef<Set<string>>(new Set())
  const clickTarget = useRef<{ x: number; y: number } | null>(null)
  const lastBroadcastAt = useRef(0)
  const lastBroadcastPos = useRef({ x: 800, y: 450 })
  const syncUsersToStateRef = useRef<() => void>(() => {})

  const [users, setUsers] = useState<MapUser[]>(() =>
    Array.from(playersRef.current.entries()).map(([id, p]) => ({ id, name: p.name, x: p.renderX, y: p.renderY, avatarColor: p.avatarColor, avatar_url: p.avatar_url, gender: p.gender, avatarConfig: p.avatarConfig, isWalking: p.isWalking, isSitting: p.isSitting, direction: p.direction, facingLeft: p.facingLeft }))
  )

  const [showGenderModal, setShowGenderModal] = useState<boolean>(() => {
    return !currentUser.gender || (currentUser.gender !== 'male' && currentUser.gender !== 'female')
  })

  const me = users.find(u => u.id === currentUser.id) || { x: 800, y: 450, id: currentUser.id, name: currentUser.name, avatarColor: 'bg-blue-500' }
  const myCurrentZone = zones.find(z => me.x >= z.x && me.x <= z.x + z.width && me.y >= z.y && me.y <= z.y + z.height)
  
  const usersInMyZone = users.filter(u => 
    myCurrentZone &&
    u.x >= myCurrentZone.x && u.x <= myCurrentZone.x + myCurrentZone.width &&
    u.y >= myCurrentZone.y && u.y <= myCurrentZone.y + myCurrentZone.height
  ).map(u => u.id)

  const W_c = containerSize.width
  const H_c = containerSize.height

  const baseScale = W_c > 0 && H_c > 0
    ? Math.max(W_c / MAP_WIDTH, H_c / MAP_HEIGHT)
    : 1
  const fitScale = Math.max(baseScale * zoomLevel, baseScale)

  // Camera tracking & Strict Boundary Clamping
  const renderedMapW = MAP_WIDTH * fitScale
  const renderedMapH = MAP_HEIGHT * fitScale

  const minX = W_c - renderedMapW
  const maxX = 0
  const minY = H_c - renderedMapH
  const maxY = 0

  const targetTx = (W_c / 2) - (me.x * fitScale)
  const targetTy = (H_c / 2) - (me.y * fitScale)

  const translateX = W_c > 0 ? clamp(targetTx, minX, maxX) : 0
  const translateY = H_c > 0 ? clamp(targetTy, minY, maxY) : 0

  useEffect(() => {
    if (!myCurrentZone && screenShareActive && localParticipant) {
      localParticipant.setScreenShareEnabled(false).catch(console.error)
    }
  }, [myCurrentZone, screenShareActive, localParticipant])

  const toggleScreenShare = async (e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (!localParticipant) return
    try {
      await localParticipant.setScreenShareEnabled(!screenShareActive)
    } catch (error) {
      console.error('Failed to toggle screen share', error)
    }
  }

  type SpeechRec = {
    continuous: boolean
    interimResults: boolean
    lang: string
    onresult: ((e: { results: { [i: number]: { [j: number]: { transcript: string } } }; resultIndex: number }) => void) | null
    onend: (() => void) | null
    start(): void
    stop(): void
  }
  const recognitionRef = useRef<SpeechRec | null>(null)
  const [isListening, setIsListening] = useState(false)
  const myZoneRef = useRef<Zone | undefined>(myCurrentZone)
  
  const micActive = localParticipant?.isMicrophoneEnabled ?? false
  const cameraActive = localParticipant?.isCameraEnabled ?? false

  const micActiveRef = useRef<boolean>(micActive)

  useEffect(() => { myZoneRef.current = myCurrentZone }, [myCurrentZone])
  useEffect(() => { micActiveRef.current = micActive }, [micActive])

  useEffect(() => {
    type SpeechRecCtor = new () => SpeechRec
    const win = window as Window & { SpeechRecognition?: SpeechRecCtor; webkitSpeechRecognition?: SpeechRecCtor }
    const SpeechRecognitionAPI = win.SpeechRecognition || win.webkitSpeechRecognition
    if (!SpeechRecognitionAPI) return

    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onresult = async (event) => {
      const currentZone = myZoneRef.current
      if (currentZone && micActiveRef.current) {
        const transcript = event.results[event.resultIndex][0].transcript.trim()
        if (transcript.length > 0) await saveTranscript(currentZone.id, transcript)
      }
    }

    recognition.onend = () => {
      if (myZoneRef.current && micActiveRef.current) {
        try { recognition.start() } catch (_e) {}
      } else {
        setIsListening(false)
      }
    }
    recognitionRef.current = recognition
    return () => recognition.stop()
  }, [currentUser.name])

  useEffect(() => {
    if (!recognitionRef.current) return
    const shouldListen = !!myCurrentZone && micActive
    if (shouldListen && !isListening) {
      try { recognitionRef.current.start(); setIsListening(true) } catch(_e) {}
    } else if (!shouldListen && isListening) {
      try { recognitionRef.current.stop(); setIsListening(false) } catch(_e) {}
    }
  }, [myCurrentZone, micActive, isListening])

  const broadcastPosition = useCallback((x: number, y: number, force = false, direction: Direction = 'down', isWalking = false, isSitting = false) => {
    if (!isChannelJoined.current) return

    const now = Date.now()
    if (!force && now - lastBroadcastAt.current < BROADCAST_INTERVAL) return
    lastBroadcastAt.current = now
    lastBroadcastPos.current = { x, y }

    channelRef.current?.send({
      type: 'broadcast',
      event: 'cursor-move',
      payload: { 
        id: currentUser.id, 
        name: currentUser.name, 
        avatar_url: currentUser.avatar_url, 
        avatarColor: 'bg-indigo-500', 
        gender: currentUser.gender, 
        avatarConfig: currentUser.avatar_config, 
        x, 
        y, 
        direction,
        isWalking,
        isSitting
      }
    })
  }, [currentUser.id, currentUser.name, currentUser.avatar_url, currentUser.gender, currentUser.avatar_config])

  // Keep a stable ref so RAF loop & channel handlers can call sync without touching deps arrays
  const syncUsersToState = useCallback(() => {
    setUsers(
      Array.from(playersRef.current.entries()).map(([id, p]) => ({
        id,
        name: p.name,
        x: Math.round(p.renderX * 10) / 10,
        y: Math.round(p.renderY * 10) / 10,
        avatarColor: p.avatarColor,
        avatar_url: p.avatar_url,
        gender: p.gender,
        avatarConfig: p.avatarConfig,
        isWalking: !!p.isWalking,
        isSitting: !!p.isSitting,
        direction: p.direction,
        facingLeft: p.facingLeft,
      }))
    )
  }, [])

  // Update the ref every render so it's always fresh inside closed-over effects
  syncUsersToStateRef.current = syncUsersToState

  const handleStop = useCallback(() => {
    clickTarget.current = null
    pressedKeys.current.clear()
    const me = playersRef.current.get(currentUser.id)
    if (me) {
      me.isWalking = false
      me.isSitting = false
      broadcastPosition(me.targetX, me.targetY, true, me.direction, false, false)
      syncUsersToStateRef.current()
    }
  }, [currentUser.id, broadcastPosition])

  const handleToggleSit = useCallback(() => {
    clickTarget.current = null
    pressedKeys.current.clear()
    const me = playersRef.current.get(currentUser.id)
    if (me) {
      me.isWalking = false
      me.isSitting = !me.isSitting
      broadcastPosition(me.targetX, me.targetY, true, me.direction, false, me.isSitting)
      syncUsersToStateRef.current()
    }
  }, [currentUser.id, broadcastPosition])

  useEffect(() => {
    if (!outerContainerRef.current) return
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) {
        setContainerSize({ width, height })
      }
    })
    observer.observe(outerContainerRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => { getZones(roomId).then(setZones) }, [roomId])

  useEffect(() => {
    const MOVE_KEYS = new Set(['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'])
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return
      if (showGenderModal) return
      if (!e.key) return
      const key = e.key.toLowerCase()

      if (key === 'x') {
        e.preventDefault()
        handleToggleSit()
        return
      }

      if (key === 'escape' || key === ' ') {
        e.preventDefault()
        handleStop()
        return
      }

      if (!MOVE_KEYS.has(key)) return
      e.preventDefault()
      clickTarget.current = null
      pressedKeys.current.add(key)
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.key) return
      pressedKeys.current.delete(e.key.toLowerCase())
    }
    const handleBlur = () => pressedKeys.current.clear()

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
    }
  }, [handleStop, handleToggleSit, showGenderModal])

  useEffect(() => {
    const roomChannel = supabase.channel(roomId, { config: { broadcast: { self: false } } })
    channelRef.current = roomChannel

    roomChannel
      .on('broadcast', { event: 'cursor-move' }, (payload) => {
        const { 
          id, 
          x, 
          y, 
          name, 
          avatarColor, 
          avatar_url, 
          gender, 
          avatarConfig, 
          direction, 
          isWalking: remoteIsWalking, 
          isSitting: remoteIsSitting 
        } = payload.payload

        if (!id || id === currentUser.id) return

        const existing = playersRef.current.get(id)
        if (existing) {
          existing.targetX = x
          existing.targetY = y

          const dist = Math.hypot(x - existing.renderX, y - existing.renderY)
          // Teleport snap only if jumping across the screen
          if (dist > 400) {
            existing.renderX = x
            existing.renderY = y
          }

          existing.name = name || existing.name
          existing.avatarColor = avatarColor || existing.avatarColor
          if (avatar_url !== undefined) existing.avatar_url = avatar_url
          if (gender !== undefined) existing.gender = gender
          if (avatarConfig !== undefined) existing.avatarConfig = avatarConfig
          if (direction) {
            existing.direction = direction
            existing.facingLeft = direction === 'left'
          }

          const postureChanged = existing.isSitting !== !!remoteIsSitting
          existing.isSitting = !!remoteIsSitting
          existing.isWalking = remoteIsWalking !== undefined ? remoteIsWalking : (dist > 2)

          if (postureChanged) {
            syncUsersToStateRef.current()
          }
        } else {
          // Discovered an existing player through movement broadcast
          playersRef.current.set(id, {
            name: name || 'Colleague',
            avatarColor: avatarColor || 'bg-indigo-500',
            avatar_url,
            gender,
            avatarConfig,
            targetX: x,
            targetY: y,
            renderX: x,
            renderY: y,
            isWalking: !!remoteIsWalking,
            isSitting: !!remoteIsSitting,
            direction: direction || 'down',
            facingLeft: direction === 'left',
          })
          syncUsersToStateRef.current()
        }
      })
      .on('broadcast', { event: 'user-joined' }, (payload) => {
        const { id, x, y, name, avatarColor, avatar_url, gender, avatarConfig, direction, isWalking, isSitting } = payload.payload
        if (!id || id === currentUser.id) return

        playersRef.current.set(id, {
          name: name || 'Colleague',
          avatarColor: avatarColor || 'bg-indigo-500',
          avatar_url,
          gender,
          avatarConfig,
          targetX: x,
          targetY: y,
          renderX: x,
          renderY: y,
          isWalking: !!isWalking,
          isSitting: !!isSitting,
          direction: direction || 'down',
          facingLeft: direction === 'left',
        })
        syncUsersToStateRef.current()

        // Respond with our own position so newcomer receives our avatar immediately
        const me = playersRef.current.get(currentUser.id)
        if (me) {
          broadcastPosition(me.targetX, me.targetY, true, me.direction, me.isWalking, me.isSitting)
        }
      })
      .on('broadcast', { event: 'user-left' }, (payload) => {
        const { id } = payload.payload
        if (!id || id === currentUser.id) return
        playersRef.current.delete(id)
        syncUsersToStateRef.current()
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          isChannelJoined.current = true
          let me = playersRef.current.get(currentUser.id)
          if (!me) {
            me = { 
              name: currentUser.name || 'You', 
              avatarColor: 'bg-blue-500', 
              avatar_url: currentUser.avatar_url, 
              gender: currentUser.gender, 
              avatarConfig: currentUser.avatar_config, 
              targetX: 800, 
              targetY: 450, 
              renderX: 800, 
              renderY: 450, 
              isWalking: false, 
              isSitting: false,
              direction: 'down', 
              facingLeft: false 
            }
            playersRef.current.set(currentUser.id, me)
            syncUsersToStateRef.current()
          }

          // Announce ourselves to existing participants
          roomChannel.send({
            type: 'broadcast',
            event: 'user-joined',
            payload: {
              id: currentUser.id,
              name: currentUser.name,
              avatar_url: currentUser.avatar_url,
              avatarColor: 'bg-indigo-500',
              gender: currentUser.gender,
              avatarConfig: currentUser.avatar_config,
              x: me.targetX,
              y: me.targetY,
              direction: me.direction,
              isWalking: me.isWalking,
              isSitting: me.isSitting,
            }
          })
          broadcastPosition(me.targetX, me.targetY, true, me.direction, false, me.isSitting)
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          isChannelJoined.current = false
        }
      })

    return () => {
      if (isChannelJoined.current) roomChannel.send({ type: 'broadcast', event: 'user-left', payload: { id: currentUser.id } })
      isChannelJoined.current = false
      supabase.removeChannel(roomChannel)
    }
  }, [supabase, roomId, currentUser.id, currentUser.name, currentUser.avatar_url, currentUser.gender, currentUser.avatar_config, broadcastPosition])

  useEffect(() => {
    const me = playersRef.current.get(currentUser.id)
    if (me) { me.name = currentUser.name || me.name; me.avatar_url = currentUser.avatar_url }
  }, [currentUser.id, currentUser.name, currentUser.avatar_url])

  useEffect(() => {
    const announceLeave = () => {
      if (isChannelJoined.current && channelRef.current) channelRef.current.send({ type: 'broadcast', event: 'user-left', payload: { id: currentUser.id } })
    }
    window.addEventListener('pagehide', announceLeave)
    return () => window.removeEventListener('pagehide', announceLeave)
  }, [currentUser.id])

  const getMapCoords = (e: React.MouseEvent | React.PointerEvent) => {
    const rect = mapBoardRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return {
      x: clamp((e.clientX - rect.left) / fitScale, 0, MAP_WIDTH),
      y: clamp((e.clientY - rect.top) / fitScale, 0, MAP_HEIGHT)
    }
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (showGenderModal) return
    if (isEditingZones) {
      const coords = getMapCoords(e)
      setIsDrawing(true)
      setDraftZone({ x: coords.x, y: coords.y, w: 0, h: 0 })
      return
    }
    const coords = getMapCoords(e)
    clickTarget.current = { x: coords.x, y: coords.y }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawing || !draftZone || !isEditingZones) return
    const coords = getMapCoords(e)
    setDraftZone(prev => ({ ...prev!, w: coords.x - prev!.x, h: coords.y - prev!.y }))
  }

  const handlePointerUp = async () => {
    if (!isDrawing || !draftZone || !isEditingZones) return
    setIsDrawing(false)

    const finalX = draftZone.w < 0 ? draftZone.x + draftZone.w : draftZone.x
    const finalY = draftZone.h < 0 ? draftZone.y + draftZone.h : draftZone.y
    const finalW = Math.abs(draftZone.w)
    const finalH = Math.abs(draftZone.h)

    if (finalW > 20 && finalH > 20) {
      const name = window.prompt("Enter a name for this Audio Zone (e.g., 'Conference Table'):")
      if (name) {
        await saveZone(roomId, name, finalX, finalY, finalW, finalH)
        const updatedZones = await getZones(roomId)
        setZones(updatedZones)
      }
    }
    setDraftZone(null)
  }

  useEffect(() => {
    const intervalId = setInterval(() => {
      const me = playersRef.current.get(currentUser.id)
      if (me) {
        const dx = Math.abs(me.targetX - lastBroadcastPos.current.x)
        const dy = Math.abs(me.targetY - lastBroadcastPos.current.y)
        const timeSinceLast = Date.now() - lastBroadcastAt.current
        if (dx > 2 || dy > 2 || timeSinceLast > 2500) {
          broadcastPosition(me.targetX, me.targetY, true, me.direction, me.isWalking, me.isSitting)
        }
      }
    }, 2000)
    return () => clearInterval(intervalId)
  }, [currentUser.id, broadcastPosition])

  useEffect(() => {
    let rafId: number
    let lastTime = performance.now()
    let lastReactSync = 0

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1)
      lastTime = now
      const me = playersRef.current.get(currentUser.id)
      let moved = false
      
      if (me) {
        const keys = pressedKeys.current
        let dx = 0, dy = 0
        if (keys.has('arrowup') || keys.has('w')) dy -= 1
        if (keys.has('arrowdown') || keys.has('s')) dy += 1
        if (keys.has('arrowleft') || keys.has('a')) dx -= 1
        if (keys.has('arrowright') || keys.has('d')) dx += 1

        if (dx !== 0 || dy !== 0) {
          moved = true
          me.isSitting = false
          const len = Math.hypot(dx, dy) || 1
          me.targetX = clamp(me.targetX + (dx / len) * MOVE_SPEED * dt, AVATAR_RADIUS, MAP_WIDTH - AVATAR_RADIUS)
          me.targetY = clamp(me.targetY + (dy / len) * MOVE_SPEED * dt, AVATAR_RADIUS, MAP_HEIGHT - AVATAR_RADIUS)
          me.renderX = me.targetX
          me.renderY = me.targetY
          me.isWalking = true
          if (Math.abs(dy) > Math.abs(dx)) {
            me.direction = dy > 0 ? 'down' : 'up'
          } else {
            me.direction = dx > 0 ? 'right' : 'left'
          }
          me.facingLeft = me.direction === 'left'
          broadcastPosition(me.targetX, me.targetY, false, me.direction, true, false)
        } else if (clickTarget.current) {
          moved = true
          me.isSitting = false
          const { x: tx, y: ty } = clickTarget.current
          const dist = Math.hypot(tx - me.targetX, ty - me.targetY)
          if (dist < 2) {
            me.targetX = tx; me.targetY = ty; clickTarget.current = null
            me.isWalking = false
            broadcastPosition(me.targetX, me.targetY, true, me.direction, false, false)
          } else {
            const dX = tx - me.targetX
            const dY = ty - me.targetY
            const step = Math.min(GLIDE_SPEED * dt, dist)
            me.targetX += (dX / dist) * step
            me.targetY += (dY / dist) * step
            me.isWalking = true
            if (Math.abs(dY) > Math.abs(dX)) {
              me.direction = dY > 0 ? 'down' : 'up'
            } else {
              me.direction = dX > 0 ? 'right' : 'left'
            }
            me.facingLeft = me.direction === 'left'
          }
          me.renderX = me.targetX
          me.renderY = me.targetY
          broadcastPosition(me.targetX, me.targetY, false, me.direction, me.isWalking, false)
        } else {
          if (me.isWalking) {
            moved = true
            me.isWalking = false
            broadcastPosition(me.targetX, me.targetY, true, me.direction, false, me.isSitting)
          }
        }
      }

      // Smooth remote player interpolation
      playersRef.current.forEach((p, id) => {
        if (id === currentUser.id) return
        const diffX = p.targetX - p.renderX
        const diffY = p.targetY - p.renderY
        const dist = Math.hypot(diffX, diffY)
        if (dist > 0.5) {
          moved = true
          const factor = Math.min(1, 14 * dt)
          p.renderX += diffX * factor
          p.renderY += diffY * factor
          if (dist > 2) {
            if (Math.abs(diffY) > Math.abs(diffX)) {
              p.direction = diffY > 0 ? 'down' : 'up'
            } else {
              p.direction = diffX > 0 ? 'right' : 'left'
            }
            p.facingLeft = p.direction === 'left'
          }
        } else if (dist > 0) {
          p.renderX = p.targetX
          p.renderY = p.targetY
          moved = true
        }
      })

      if (moved && (now - lastReactSync > 25)) {
        lastReactSync = now
        syncUsersToStateRef.current()
      }

      rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [currentUser.id, broadcastPosition])

  useEffect(() => {
    const audioEl = ambientAudioRef.current;
    if (ambientAudio && audioEl) {
      audioEl.volume = 0.2
      audioEl.play().then(() => setIsAmbientPlaying(true)).catch(() => setIsAmbientPlaying(false))
    }
    return () => { if (audioEl) { audioEl.pause(); audioEl.currentTime = 0; } }
  }, [ambientAudio]);

  const toggleAmbientAudio = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!ambientAudioRef.current) return
    if (isAmbientPlaying) { ambientAudioRef.current.pause(); setIsAmbientPlaying(false) } 
    else { ambientAudioRef.current.play(); setIsAmbientPlaying(true) }
  }

  useEffect(() => {
    if (isChatOpen) {
      if (chatCloseTimeout.current) { clearTimeout(chatCloseTimeout.current); chatCloseTimeout.current = null }
      setChatMounted(true)
      const raf = requestAnimationFrame(() => setChatEntered(true))
      return () => cancelAnimationFrame(raf)
    } else {
      setChatEntered(false)
      chatCloseTimeout.current = setTimeout(() => setChatMounted(false), CHAT_TRANSITION_MS)
      return () => { if (chatCloseTimeout.current) clearTimeout(chatCloseTimeout.current) }
    }
  }, [isChatOpen])

  return (
    <div className="flex h-full w-full relative items-center justify-center overflow-hidden bg-transparent">
      
      <div 
        ref={outerContainerRef} 
        onWheel={handleWheel}
        className="relative w-full h-full flex items-center justify-center overflow-hidden select-none"
      >

        <ScreenShareViewer 
          currentZoneId={myCurrentZone?.id}
          usersInCurrentZone={usersInMyZone}
          currentUserId={currentUser.id}
        />

        <div className="absolute right-6 top-6 flex flex-col gap-4 z-40 items-end">
          {myCurrentZone && !isEditingZones && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => handleGenerateMinutes(e, myCurrentZone.id, myCurrentZone.name)}
              disabled={generatingZoneId === myCurrentZone.id}
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:from-purple-500 hover:to-blue-500 disabled:pointer-events-none disabled:opacity-70"
            >
              {generatingZoneId === myCurrentZone.id ? (
                <>
                  <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Summarizing...
                </>
              ) : (
                <>
                  <SparklesIcon className="h-5 w-5 text-yellow-300" />
                  Generate Minutes
                </>
              )}
            </button>
          )}

          {currentUser.role === 'admin' && (
            <div className="bg-white/60 rounded-xl p-2 backdrop-blur-2xl border border-purple-100 shadow-[0_8px_32px_rgba(107,33,168,0.05)]">
              <button
                onClick={() => setIsEditingZones(!isEditingZones)}
                title="Edit Audio Zones"
                className={`p-2 rounded-lg transition-colors ${isEditingZones ? 'bg-yellow-500 text-white shadow-md' : 'text-purple-600 hover:bg-purple-100 hover:text-purple-900'}`}
              >
                <RectangleGroupIcon className="w-6 h-6" />
              </button>
            </div>
          )}
        </div>

        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-4 rounded-full border border-gray-700 bg-gray-900/90 px-6 py-3 shadow-xl backdrop-blur-md z-40">
          <div className="flex items-center gap-2">
            <button 
              onClick={async (e) => { 
                e.stopPropagation(); 
                if (isTogglingCamera) return;
                setIsTogglingCamera(true);
                try {
                  await localParticipant?.setCameraEnabled(!cameraActive);
                } catch (err) {
                  console.error(err);
                } finally {
                  setIsTogglingCamera(false);
                }
              }} 
              disabled={isTogglingCamera}
              className={`rounded-full p-3 transition-all duration-300 hover:scale-105 active:scale-95 text-white disabled:opacity-70 ${cameraActive ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-500 hover:bg-red-600'}`}
            >
              {isTogglingCamera ? (
                <svg className="h-6 w-6 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : cameraActive ? (
                <VideoCameraIcon className="h-6 w-6" />
              ) : (
                <VideoCameraSlashIcon className="h-6 w-6" />
              )}
            </button>
            <DeviceSelector kind="videoinput" variant="icon" />
          </div>

          <div className="flex items-center gap-2">
            {disableMic ? (
              <button disabled title="Microphones are disabled in this room" className="relative rounded-full p-3 bg-gray-800 text-gray-500 cursor-not-allowed overflow-hidden">
                <MicrophoneIcon className="h-6 w-6" />
                <div className="absolute top-1/2 left-1/2 w-6 h-[2px] bg-gray-500 -translate-x-1/2 -translate-y-1/2 -rotate-45" />
              </button>
            ) : (
              <button 
                onClick={async (e) => { 
                  e.stopPropagation(); 
                  if (isTogglingMic) return;
                  setIsTogglingMic(true);
                  try {
                    await localParticipant?.setMicrophoneEnabled(!micActive);
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setIsTogglingMic(false);
                  }
                }} 
                disabled={isTogglingMic}
                className={`relative rounded-full p-3 transition-all duration-300 hover:scale-105 active:scale-95 text-white overflow-hidden disabled:opacity-70 ${micActive ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-500 hover:bg-red-600'}`}
              >
                {isTogglingMic ? (
                  <svg className="h-6 w-6 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <>
                    <MicrophoneIcon className="h-6 w-6" />
                    {!micActive && <div className="absolute top-1/2 left-1/2 w-7 h-[2px] bg-white -translate-x-1/2 -translate-y-1/2 -rotate-45" />}
                  </>
                )}
              </button>
            )}
            <DeviceSelector kind="audioinput" variant="icon" />
          </div>

          {!myCurrentZone ? (
            <button disabled title="You must be in a zone to share screen" className="rounded-full p-3 bg-gray-800 text-gray-500 cursor-not-allowed">
              <TvIcon className="h-6 w-6" />
            </button>
          ) : (
            <button 
              onClick={async (e) => {
                e.stopPropagation();
                if (isTogglingScreen) return;
                setIsTogglingScreen(true);
                try {
                  await toggleScreenShare();
                } finally {
                  setIsTogglingScreen(false);
                }
              }} 
              disabled={isTogglingScreen}
              className={`rounded-full p-3 transition-all duration-300 hover:scale-105 active:scale-95 text-white disabled:opacity-70 ${screenShareActive ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
              {isTogglingScreen ? (
                <svg className="h-6 w-6 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <TvIcon className="h-6 w-6" />
              )}
            </button>
          )}

          <div className="mx-2 h-8 w-px bg-gray-700"></div>

          {/* Zoom In / Zoom Out Controls */}
          <div className="flex items-center gap-1 rounded-full bg-gray-800/90 border border-gray-700/80 p-1 text-white shadow-lg backdrop-blur-md">
            <button
              onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
              disabled={zoomLevel <= 1.0}
              title="Zoom Out (Min Zoom = 100%)"
              className="rounded-full p-2 text-gray-300 hover:bg-gray-700 hover:text-white transition active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
            >
              <MagnifyingGlassMinusIcon className="h-5 w-5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleResetZoom(); }}
              title="Reset Zoom (Fill Screen)"
              className="px-2.5 py-1 text-xs font-mono font-bold text-indigo-300 hover:text-white transition rounded hover:bg-gray-700/60"
            >
              {Math.round(zoomLevel * 100)}%
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
              disabled={zoomLevel >= 3.0}
              title="Zoom In"
              className="rounded-full p-2 text-gray-300 hover:bg-gray-700 hover:text-white transition active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
            >
              <MagnifyingGlassPlusIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Sit / Stand Toggle */}
          <button
            onClick={(e) => { e.stopPropagation(); handleToggleSit(); }}
            title={me.isSitting ? "Stand Up (Key: X)" : "Sit Down (Key: X)"}
            className={`rounded-full px-3.5 py-2 text-xs font-bold transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow ${
              me.isSitting
                ? 'bg-amber-600 text-white hover:bg-amber-500 shadow-[0_0_12px_rgba(217,119,6,0.4)] ring-2 ring-amber-400/50'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <span className="text-sm">🪑</span>
            <span>{me.isSitting ? 'Seated' : 'Sit'}</span>
          </button>

          {/* Emergency Stop Button */}
          <button
            onClick={(e) => { e.stopPropagation(); handleStop(); }}
            title="Stop Movement (Key: Esc / Space)"
            className="rounded-full px-3.5 py-2 text-xs font-bold transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-1.5 bg-red-800/90 text-red-100 hover:bg-red-700 border border-red-600/50 shadow"
          >
            <span className="text-sm">🛑</span>
            <span>Stop</span>
          </button>

          {/* Elevate Office Channels Toggle */}
          <button
            onClick={(e) => { e.stopPropagation(); setIsChannelsOpen(!isChannelsOpen) }}
            title="Team Channels & Office Chat"
            className={`rounded-full p-3 transition-all duration-300 hover:scale-105 active:scale-95 text-white ${
              isChannelsOpen ? 'bg-purple-600 hover:bg-purple-700 ring-2 ring-purple-400 shadow-[0_0_12px_rgba(147,51,234,0.4)]' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            <HashtagIcon className="h-6 w-6" />
          </button>

          <button onClick={(e) => { e.stopPropagation(); setIsChatOpen(!isChatOpen) }} className={`rounded-full p-3 transition-all duration-300 hover:scale-105 active:scale-95 text-white ${isChatOpen ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
            <ChatBubbleLeftRightIcon className="h-6 w-6" />
          </button>

          {ambientAudio && (
            <>
              <div className="mx-2 h-8 w-px bg-purple-100"></div>
              <button onClick={toggleAmbientAudio} title="Toggle Room Audio" className={`rounded-full p-3 transition-all duration-300 hover:scale-105 active:scale-95 ${isAmbientPlaying ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.3)]' : 'bg-white text-gray-500 shadow-sm hover:bg-purple-50 hover:text-purple-700'}`}>
                {isAmbientPlaying ? <SpeakerWaveIcon className="h-6 w-6" /> : <SpeakerXMarkIcon className="h-6 w-6" />}
              </button>
              <audio ref={ambientAudioRef} src={ambientAudio} loop className="hidden" preload="auto" />
            </>
          )}
        </div>

        {chatMounted && (
          <div
            className="absolute right-6 top-20 bottom-24 z-30"
            style={{
              transition: `opacity ${CHAT_TRANSITION_MS}ms ease-out, transform ${CHAT_TRANSITION_MS}ms ease-out`,
              opacity: chatEntered ? 1 : 0,
              transform: chatEntered ? 'translateX(0)' : 'translateX(24px)',
              pointerEvents: chatEntered ? 'auto' : 'none'
            }}
          >
            <ChatPanel
              roomId={roomId}
              currentUser={{ id: currentUser.id, name: currentUser.name || 'You' }}
              allUsers={users.map(u => ({ id: u.id, name: u.name }))}
              onClose={() => setIsChatOpen(false)}
            />
          </div>
        )}

        {/* Elevate Remote Office Channels & Collapsible Chat */}
        <OfficeChannelsSidebar
          currentUserId={currentUser.id}
          currentUserName={currentUser.name || 'You'}
          currentUserRole={currentUser.role || 'employee'}
          currentUserAvatarUrl={currentUser.avatar_url}
          onlineUserIds={users.map(u => u.id)}
          isOpen={isChannelsOpen}
          onToggle={() => setIsChannelsOpen(!isChannelsOpen)}
          onClose={() => setIsChannelsOpen(false)}
        />

        <div
          ref={mapBoardRef}
          className="absolute top-0 left-0 overflow-hidden rounded-xl border border-gray-700/40 shadow-2xl cursor-crosshair bg-center"
          style={{
            width: `${MAP_WIDTH}px`,
            height: `${MAP_HEIGHT}px`,
            transformOrigin: '0 0',
            transform: `translate3d(${translateX}px, ${translateY}px, 0px) scale(${fitScale})`,
            backgroundColor: '#1E232B',
            backgroundImage: `radial-gradient(ellipse at center, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0.15) 100%), url('${mapBackground}')`,
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat',
            imageRendering: 'auto',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {zones.map((zone) => {
            const isUserInZone = me.x >= zone.x && me.x <= zone.x + zone.width && me.y >= zone.y && me.y <= zone.y + zone.height;

            return (
              <div
                key={zone.id}
                className={`absolute border-2 transition-all ${isEditingZones ? 'border-dashed border-yellow-400 bg-yellow-400/20' : 'border-blue-400/30 bg-blue-400/10'}`}
                style={{ left: zone.x, top: zone.y, width: zone.width, height: zone.height }}
              >
                <span className="absolute -top-6 left-0 flex items-center gap-1.5 rounded bg-black/60 px-2 py-1 text-xs font-bold text-white shadow-sm">
                  {zone.name}
                  {isUserInZone && isListening && (
                    <span className="relative flex h-2 w-2" title="Transcribing to AI...">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
                    </span>
                  )}
                </span>

                {isEditingZones && (
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (deletingZoneId) return;
                      setDeletingZoneId(zone.id);
                      try {
                        await deleteZone(zone.id);
                        setZones(await getZones(roomId));
                      } finally {
                        setDeletingZoneId(null);
                      }
                    }}
                    disabled={deletingZoneId === zone.id}
                    title="Delete Zone"
                    className="absolute -top-6 right-0 rounded bg-red-600 p-1 text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {deletingZoneId === zone.id ? (
                      <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <TrashIcon className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            )
          })}

          {isEditingZones && draftZone && (
            <div
              className="absolute border-2 border-dashed border-yellow-400 bg-yellow-400/40"
              style={{
                left: draftZone.w < 0 ? draftZone.x + draftZone.w : draftZone.x,
                top: draftZone.h < 0 ? draftZone.y + draftZone.h : draftZone.y,
                width: Math.abs(draftZone.w),
                height: Math.abs(draftZone.h),
              }}
            />
          )}

          {users.map((user) => {
            const theirZone = zones.find(z => user.x >= z.x && user.x <= z.x + z.width && user.y >= z.y && user.y <= z.y + z.height)
            const isSameZone = myCurrentZone && theirZone && myCurrentZone.id === theirZone.id
            const distance = Math.hypot(user.x - me.x, user.y - me.y)
            const shouldConnect = isSameZone || (!myCurrentZone && !theirZone && distance <= PROXIMITY_RADIUS)
            
            return (
              <MapAvatar
                key={user.id}
                user={user}
                isMe={user.id === currentUser.id}
                isInZone={!!myCurrentZone}
                shouldConnect={shouldConnect!}
              />
            )
          })}
        </div>
      </div>

      {activeMinutes && (
        <MeetingMinutesModal
          zoneName={activeMinutes.zoneName}
          minutes={activeMinutes}
          onClose={() => setActiveMinutes(null)}
        />
      )}

      {showGenderModal && (
        <CharacterGenderModal
          isOpen={showGenderModal}
          currentGender={currentUser.gender}
          onGenderSelected={(selectedGender) => {
            currentUser.gender = selectedGender
            const meMeta = playersRef.current.get(currentUser.id)
            if (meMeta) {
              meMeta.gender = selectedGender
            }
            setUsers((prev) =>
              prev.map((u) => (u.id === currentUser.id ? { ...u, gender: selectedGender } : u))
            )
            broadcastPosition(meMeta?.renderX ?? 800, meMeta?.renderY ?? 450, true, meMeta?.direction, false, meMeta?.isSitting)
            setShowGenderModal(false)
          }}
        />
      )}
    </div>
  )
}