'use client'

import { useTracks, VideoTrack } from '@livekit/components-react'
import { Track } from 'livekit-client'
import { useState, useRef } from 'react'

interface ScreenShareViewerProps {
  currentZoneId: string | undefined
  usersInCurrentZone: string[]
  currentUserId: string
}

export default function ScreenShareViewer({ currentZoneId, usersInCurrentZone, currentUserId }: ScreenShareViewerProps) {
  const [position, setPosition] = useState({ x: 24, y: 24 })
  const dragRef = useRef<{ isDragging: boolean; startX: number; startY: number; startPosX: number; startPosY: number }>({
    isDragging: false,
    startX: 0,
    startY: 0,
    startPosX: 0,
    startPosY: 0,
  })

  // Get all screen share tracks in the room
  const screenShareTracks = useTracks([
    { source: Track.Source.ScreenShare, withPlaceholder: false }
  ])

  // Filter tracks: only show if the participant is in our current zone and is not us
  const visibleTracks = screenShareTracks.filter((trackRef) => {
    if (!currentZoneId) return false // We must be in a zone
    const identity = trackRef.participant.identity
    // Identity format set in route.ts: `${user.id}#${username}`
    const participantId = identity.split('#')[0]

    if (!participantId) return false
    if (participantId === currentUserId) return false // Don't watch our own screen share back
    
    // Check if they are in the same zone as us
    return usersInCurrentZone.includes(participantId)
  })

  if (visibleTracks.length === 0) return null

  // Draggable logic
  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startPosX: position.x,
      startPosY: position.y,
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.isDragging) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    setPosition({
      x: dragRef.current.startPosX + dx,
      y: Math.max(0, dragRef.current.startPosY + dy), // Prevent dragging off top
    })
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    dragRef.current.isDragging = false
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  return (
    <div
      className="absolute z-50 flex flex-col overflow-hidden rounded-2xl border border-purple-100 bg-white/80 shadow-[0_16px_64px_rgba(107,33,168,0.15)] backdrop-blur-2xl w-[480px] min-w-[320px] min-h-[240px] resize"
      style={{ left: position.x, top: position.y }}
    >
      {/* Header (Draggable) */}
      <div
        className="flex items-center justify-between border-b border-purple-100 bg-white/60 px-4 py-3 cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75"></span>
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-purple-500"></span>
          </span>
          <h3 className="text-sm font-semibold tracking-wide text-purple-900 select-none">Screen Share Active</h3>
        </div>
      </div>

      {/* Video Content */}
      <div className="flex flex-col gap-2 bg-black/5 p-2 flex-1 min-h-0 w-full h-full">
          {visibleTracks.map((trackRef) => {
            if (!trackRef.publication) return null
            const rawIdentity = trackRef.participant.identity
            // Identity format: `userId#displayName_userId` - extract the display name part
            const participantName = rawIdentity.split('#')[1]?.split('_')[0]?.replace(/%20/g, ' ') ?? rawIdentity
            
            return (
              <div key={trackRef.publication.trackSid} className="relative flex-1 min-h-0 rounded-xl overflow-hidden bg-black/10 flex items-center justify-center">
                <VideoTrack 
                  trackRef={trackRef as Parameters<typeof VideoTrack>[0]['trackRef']} 
                  className="w-full h-full object-contain"
                />
                <div className="absolute bottom-3 left-3 rounded-lg bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md">
                  {participantName}&apos;s Screen
                </div>
              </div>
            )
          })}
        </div>
    </div>
  )
}
