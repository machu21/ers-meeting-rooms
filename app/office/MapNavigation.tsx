'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { MapIcon, ChevronDownIcon } from '@heroicons/react/24/solid'

// Define the available maps and their routing paths
const MAP_DIRECTORY: Record<string, { name: string; path: string }> = {
  'office': { name: 'Main Office', path: '/office' },
  'meeting-room': { name: 'Meeting Room', path: '/meeting-room' },
  'prayer-room': { name: 'Prayer Room', path: '/prayer-room' },
}

interface MapNavigationProps {
  accessibleMaps: string[]
  currentMapId: string
}

export default function MapNavigation({ accessibleMaps, currentMapId }: MapNavigationProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown if user clicks outside of it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const currentMap = MAP_DIRECTORY[currentMapId] || MAP_DIRECTORY['office']

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Active Map Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-xl border border-purple-200 bg-white/50 px-4 py-2 text-sm font-semibold text-purple-900 shadow-sm transition-all hover:bg-white hover:shadow-md focus:outline-none focus:ring-2 focus:ring-purple-500/30"
      >
        <MapIcon className="h-5 w-5 text-purple-600" />
        {currentMap.name}
        <ChevronDownIcon className={`h-4 w-4 text-purple-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-56 origin-top-left rounded-xl border border-purple-100 bg-white/95 shadow-[0_8px_32px_rgba(107,33,168,0.1)] backdrop-blur-2xl focus:outline-none z-50 overflow-hidden">
          <div className="py-1">
            <div className="px-4 py-3 text-xs font-bold text-purple-400 uppercase tracking-wider border-b border-purple-50">
              Your Assigned Maps
            </div>
            
            {accessibleMaps.map((mapId) => {
              const mapDetails = MAP_DIRECTORY[mapId]
              if (!mapDetails) return null // Skip if map ID doesn't exist in directory

              const isActive = mapId === currentMapId

              return (
                <Link
                  key={mapId}
                  href={mapDetails.path}
                  onClick={() => setIsOpen(false)}
                  className={`block px-4 py-3 text-sm transition-colors ${
                    isActive 
                      ? 'bg-purple-50 text-purple-800 font-semibold cursor-default pointer-events-none border-l-2 border-purple-500' 
                      : 'text-gray-600 hover:bg-purple-50 hover:text-purple-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${isActive ? 'bg-purple-500 shadow-[0_0_5px_rgba(168,85,247,0.5)]' : 'bg-purple-200'}`}></div>
                    {mapDetails.name}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}