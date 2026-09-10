'use client'

import { useState, useEffect, useRef, useCallback, memo } from 'react'
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
  TvIcon
} from '@heroicons/react/24/solid'
import ChatPanel from './ChatPanel'
import ScreenShareViewer from './ScreenShareViewer'
import DeviceSelector from './DeviceSelector'
import { useLocalParticipant, useRemoteParticipants, AudioTrack, VideoTrack, useTrackVolume } from '@livekit/components-react'
import { Track, RemoteAudioTrack, LocalAudioTrack } from 'livekit-client'

type MapUser = {
  id: string
  name: string
  x: number
  y: number
  avatarColor: string
  avatar_url?: string | null
}

type CurrentUser = {
  id: string
  name: string
  avatar_url: string | null
  camera_enabled: boolean
  microphone_enabled: boolean
  role: string
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
const BROADCAST_INTERVAL = 300

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
  const isSpeaking = volume && volume > 0.05

  const showVideo = isMe 
    ? localParticipant?.isCameraEnabled 
    : (shouldConnect && camPub?.track && !camPub.isMuted)

  const ringClass = isSpeaking
    ? 'ring-4 ring-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.8)]'
    : showVideo
      ? 'ring-4 ring-purple-400/50'
      : ''

  return (
    <div
      className={`absolute flex flex-col items-center pointer-events-none ${isMe ? 'z-20' : 'z-10'}`}
      style={{
        left: `${user.x - AVATAR_RADIUS}px`,
        top: `${user.y - AVATAR_RADIUS}px`,
        transformOrigin: 'top center'
      }}
    >
      {isMe && !isInZone && (
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-400/30 bg-blue-400/10 pointer-events-none"
          style={{ width: `${PROXIMITY_RADIUS * 2}px`, height: `${PROXIMITY_RADIUS * 2}px` }}
        />
      )}

      <div className={`relative flex items-center justify-center rounded-full border-2 border-white shadow-md overflow-hidden z-10 transition-[height,width] duration-150 ${user.avatarColor} ${ringClass} ${showVideo ? 'h-16 w-16' : 'h-12 w-12'}`}>
        {showVideo ? (
          isMe ? (
            localParticipant?.getTrackPublication(Track.Source.Camera)?.track && (
              <VideoTrack trackRef={{ participant: localParticipant, source: Track.Source.Camera, publication: localParticipant.getTrackPublication(Track.Source.Camera)! }} className="h-full w-full scale-x-[-1] object-cover" />
            )
          ) : (
            participant && camPub?.track && (
              <VideoTrack trackRef={{ participant: participant, source: Track.Source.Camera, publication: camPub }} className="h-full w-full object-cover" />
            )
          )
        ) : user.avatar_url ? (
          <img src={user.avatar_url} alt={user.name} className="h-full w-full object-cover" />
        ) : (
          <span className="font-bold text-white shadow-sm">{user.name.charAt(0)}</span>
        )}
      </div>

      <div className="mt-1 flex items-center gap-1 rounded bg-black/60 px-2 py-0.5 text-xs font-medium text-white shadow z-10">
        {user.name}
      </div>

      {!isMe && shouldConnect && participant && micPub?.track && !micPub.isMuted && (
        <AudioTrack trackRef={{ participant: participant, source: Track.Source.Microphone, publication: micPub }} />
      )}
    </div>
  )
})
MapAvatar.displayName = 'MapAvatar'

type PlayerMeta = { name: string; avatarColor: string; avatar_url?: string | null; targetX: number; targetY: number; renderX: number; renderY: number }
type Zone = { id: string; name: string; x: number; y: number; width: number; height: number }

export default function VirtualMap({ currentUser, roomId, mapBackground, ambientAudio, disableMic = false }: VirtualMapProps) {
  const supabase = createClient()
  
  const outerContainerRef = useRef<HTMLDivElement>(null)
  const mapBoardRef = useRef<HTMLDivElement>(null)

  const [fitScale, setFitScale] = useState(1)

  const [zones, setZones] = useState<Zone[]>([])
  const [isEditingZones, setIsEditingZones] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [draftZone, setDraftZone] = useState<{ x: number, y: number, w: number, h: number } | null>(null)

  const [generatingZoneId, setGeneratingZoneId] = useState<string | null>(null)
  const [activeMinutes, setActiveMinutes] = useState<{ summary: string; action_items: string; zoneName: string } | null>(null)

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
  const [chatMounted, setChatMounted] = useState(false)
  const [chatEntered, setChatEntered] = useState(false)
  const chatCloseTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const CHAT_TRANSITION_MS = 220

  const { localParticipant } = useLocalParticipant()
  const screenShareActive = localParticipant?.isScreenShareEnabled ?? false

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const isChannelJoined = useRef(false)

  const playersRef = useRef<Map<string, PlayerMeta>>(
    new Map([[currentUser.id, { name: currentUser.name || 'You', avatarColor: 'bg-blue-500', avatar_url: currentUser.avatar_url, targetX: 800, targetY: 450, renderX: 800, renderY: 450 }]])
  )
  const pressedKeys = useRef<Set<string>>(new Set())
  const clickTarget = useRef<{ x: number; y: number } | null>(null)
  const lastBroadcastAt = useRef(0)
  const lastBroadcastPos = useRef({ x: 800, y: 450 })

  const [users, setUsers] = useState<MapUser[]>(() =>
    Array.from(playersRef.current.entries()).map(([id, p]) => ({ id, name: p.name, x: p.renderX, y: p.renderY, avatarColor: p.avatarColor, avatar_url: p.avatar_url }))
  )

  const me = users.find(u => u.id === currentUser.id) || { x: 800, y: 450, id: currentUser.id, name: currentUser.name, avatarColor: 'bg-blue-500' }
  const myCurrentZone = zones.find(z => me.x >= z.x && me.x <= z.x + z.width && me.y >= z.y && me.y <= z.y + z.height)
  
  const usersInMyZone = users.filter(u => 
    myCurrentZone &&
    u.x >= myCurrentZone.x && u.x <= myCurrentZone.x + myCurrentZone.width &&
    u.y >= myCurrentZone.y && u.y <= myCurrentZone.y + myCurrentZone.height
  ).map(u => u.id)

  useEffect(() => {
    if (!myCurrentZone && screenShareActive && localParticipant) {
      localParticipant.setScreenShareEnabled(false).catch(console.error)
    }
  }, [myCurrentZone, screenShareActive, localParticipant])

  const toggleScreenShare = async (e: React.MouseEvent) => {
    e.stopPropagation()
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

  const broadcastPosition = useCallback((x: number, y: number, force = false) => {
    if (!isChannelJoined.current) return

    const now = Date.now()
    if (!force && now - lastBroadcastAt.current < BROADCAST_INTERVAL) return
    lastBroadcastAt.current = now
    lastBroadcastPos.current = { x, y }

    channelRef.current?.send({
      type: 'broadcast',
      event: 'cursor-move',
      payload: { id: currentUser.id, name: currentUser.name, avatar_url: currentUser.avatar_url, avatarColor: 'bg-indigo-500', x, y }
    })
  }, [currentUser.id, currentUser.name, currentUser.avatar_url])

  useEffect(() => {
    if (!outerContainerRef.current) return
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      const scale = Math.min(width / MAP_WIDTH, height / MAP_HEIGHT)
      setFitScale(clamp(scale, 0.2, 2))
    })
    observer.observe(outerContainerRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => { getZones(roomId).then(setZones) }, [roomId])

  useEffect(() => {
    const MOVE_KEYS = new Set(['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'])
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return
      if (!e.key) return
      const key = e.key.toLowerCase()
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
  }, [])

  useEffect(() => {
    const roomChannel = supabase.channel(roomId, { config: { broadcast: { self: false } } })
    channelRef.current = roomChannel

    roomChannel
      .on('broadcast', { event: 'cursor-move' }, (payload) => {
        const { id, x, y, name, avatarColor, avatar_url } = payload.payload
        const existing = playersRef.current.get(id)
        if (existing) {
          existing.targetX = x; existing.targetY = y; existing.name = name || existing.name; existing.avatarColor = avatarColor || existing.avatarColor; existing.avatar_url = avatar_url
        } else {
          playersRef.current.set(id, { name: name || 'Colleague', avatarColor: avatarColor || 'bg-indigo-500', avatar_url, targetX: x, targetY: y, renderX: x, renderY: y })
          setUsers(Array.from(playersRef.current.entries()).map(([pid, p]) => ({ id: pid, name: p.name, x: p.renderX, y: p.renderY, avatarColor: p.avatarColor, avatar_url: p.avatar_url })))
        }
      })
      .on('broadcast', { event: 'user-left' }, (payload) => {
        const { id } = payload.payload
        if (!id || id === currentUser.id) return
        playersRef.current.delete(id)
        setUsers(Array.from(playersRef.current.entries()).map(([pid, p]) => ({ id: pid, name: p.name, x: p.renderX, y: p.renderY, avatarColor: p.avatarColor, avatar_url: p.avatar_url })))
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          isChannelJoined.current = true
          let me = playersRef.current.get(currentUser.id)
          if (!me) {
            me = { name: currentUser.name || 'You', avatarColor: 'bg-blue-500', avatar_url: currentUser.avatar_url, targetX: 800, targetY: 450, renderX: 800, renderY: 450 }
            playersRef.current.set(currentUser.id, me)
          }
          broadcastPosition(me.targetX, me.targetY, true)
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          isChannelJoined.current = false
        }
      })

    return () => {
      if (isChannelJoined.current) roomChannel.send({ type: 'broadcast', event: 'user-left', payload: { id: currentUser.id } })
      isChannelJoined.current = false
      supabase.removeChannel(roomChannel)
    }
  }, [supabase, roomId, currentUser.id, currentUser.name, currentUser.avatar_url, broadcastPosition])

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
        if (dx > 2 || dy > 2 || timeSinceLast > 10000) broadcastPosition(me.targetX, me.targetY, true)
      }
    }, 3000)
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
          const len = Math.hypot(dx, dy) || 1
          me.targetX = clamp(me.targetX + (dx / len) * MOVE_SPEED * dt, AVATAR_RADIUS, MAP_WIDTH - AVATAR_RADIUS)
          me.targetY = clamp(me.targetY + (dy / len) * MOVE_SPEED * dt, AVATAR_RADIUS, MAP_HEIGHT - AVATAR_RADIUS)
          me.renderX = me.targetX
          me.renderY = me.targetY
          broadcastPosition(me.targetX, me.targetY)
        } else if (clickTarget.current) {
          moved = true
          const { x: tx, y: ty } = clickTarget.current
          const dist = Math.hypot(tx - me.targetX, ty - me.targetY)
          if (dist < 2) {
            me.targetX = tx; me.targetY = ty; clickTarget.current = null
          } else {
            const step = Math.min(GLIDE_SPEED * dt, dist)
            me.targetX += ((tx - me.targetX) / dist) * step
            me.targetY += ((ty - me.targetY) / dist) * step
          }
          me.renderX = me.targetX
          me.renderY = me.targetY
          broadcastPosition(me.targetX, me.targetY)
        }
      }

      const smoothing = 1 - Math.pow(0.0001, dt)
      playersRef.current.forEach((p, id) => {
        if (id === currentUser.id) return
        const diffX = p.targetX - p.renderX
        const diffY = p.targetY - p.renderY
        if (Math.abs(diffX) > 0.05 || Math.abs(diffY) > 0.05) {
          moved = true
          p.renderX += diffX * smoothing
          p.renderY += diffY * smoothing
        }
      })

      if (moved && (now - lastReactSync > 33)) {
        lastReactSync = now
        setUsers(Array.from(playersRef.current.entries()).map(([id, p]) => ({
          id,
          name: p.name,
          x: Math.round(p.renderX * 10) / 10,
          y: Math.round(p.renderY * 10) / 10,
          avatarColor: p.avatarColor,
          avatar_url: p.avatar_url
        })))
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
      
      <div ref={outerContainerRef} className="relative w-full h-full flex items-center justify-center">

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
              onClick={(e) => { 
                e.stopPropagation(); 
                localParticipant?.setCameraEnabled(!cameraActive).catch(console.error); 
              }} 
              className={`rounded-full p-3 transition-all duration-300 hover:scale-105 active:scale-95 text-white ${cameraActive ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-500 hover:bg-red-600'}`}
            >
              {cameraActive ? <VideoCameraIcon className="h-6 w-6" /> : <VideoCameraSlashIcon className="h-6 w-6" />}
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
                onClick={(e) => { 
                  e.stopPropagation(); 
                  localParticipant?.setMicrophoneEnabled(!micActive).catch(console.error); 
                }} 
                className={`relative rounded-full p-3 transition-all duration-300 hover:scale-105 active:scale-95 text-white overflow-hidden ${micActive ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-500 hover:bg-red-600'}`}
              >
                <MicrophoneIcon className="h-6 w-6" />
                {!micActive && <div className="absolute top-1/2 left-1/2 w-7 h-[2px] bg-white -translate-x-1/2 -translate-y-1/2 -rotate-45" />}
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
              onClick={toggleScreenShare} 
              className={`rounded-full p-3 transition-all duration-300 hover:scale-105 active:scale-95 text-white ${screenShareActive ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
              <TvIcon className="h-6 w-6" />
            </button>
          )}

          <div className="mx-2 h-8 w-px bg-gray-700"></div>

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

        <div
          ref={mapBoardRef}
          className="absolute origin-center overflow-hidden rounded-xl border border-gray-700 shadow-2xl cursor-crosshair bg-center bg-no-repeat"
          style={{
            width: `${MAP_WIDTH}px`,
            height: `${MAP_HEIGHT}px`,
            transform: `scale(${fitScale})`,
            backgroundColor: '#1E232B',
            backgroundImage: `radial-gradient(ellipse at center, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0.15) 100%), url('${mapBackground}')`,
            backgroundSize: '100% 100%'
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
                    onClick={async (e) => { e.stopPropagation(); await deleteZone(zone.id); setZones(await getZones(roomId)); }}
                    className="absolute -top-6 right-0 rounded bg-red-600 p-1 text-white hover:bg-red-700"
                  >
                    <TrashIcon className="h-4 w-4" />
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
    </div>
  )
}