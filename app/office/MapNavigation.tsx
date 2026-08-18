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
        className="flex items-center gap-2 rounded-md bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <MapIcon className="h-5 w-5 text-blue-600" />
        {currentMap.name}
        <ChevronDownIcon className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-56 origin-top-left rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
          <div className="py-1">
            <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider border-b">
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
                      ? 'bg-blue-50 text-blue-700 font-semibold cursor-default pointer-events-none' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${isActive ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
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