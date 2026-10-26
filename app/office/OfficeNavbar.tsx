'use client'

import Link from 'next/link'
import Image from 'next/image'
import { MapIcon } from '@heroicons/react/24/solid'
import SignOutButton from '@/components/SignOutButton'

interface OfficeNavbarProps {
  role: string
  currentMap: string
}

export default function OfficeNavbar({ role, currentMap }: OfficeNavbarProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-b border-white/10 bg-[#050914]/80 px-6 shadow-sm backdrop-blur-md">
      
      {/* LEFT: Branding & Badge */}
      <div className="flex items-center gap-4">
        <Link href="/office" className="group flex items-center gap-2.5">
          <div className="relative flex h-7 w-7 items-center justify-center">
            <Image
              src="/logo-icon.png"
              alt="ERS Office Emblem"
              width={28}
              height={28}
              className="object-contain drop-shadow transition-transform group-hover:scale-105"
            />
          </div>
          <span className="text-lg font-black tracking-tight text-white">ERS Office</span>
        </Link>

        {/* Dynamic Role Badge */}
        <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
          role === 'admin' 
            ? 'border-purple-500/30 bg-purple-500/10 text-purple-400' 
            : role === 'supervisor'
            ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
            : 'border-gray-500/30 bg-gray-500/10 text-gray-400'
        }`}>
          {role}
        </span>
      </div>

      {/* RIGHT: Controls & Navigation */}
      <div className="flex items-center gap-6">
        
        {/* Map Switcher Dropdown */}
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 shadow-inner">
          <MapIcon className="h-4 w-4 text-blue-400" />
          <select 
            className="bg-transparent text-sm font-medium text-gray-200 outline-none focus:ring-0 [&>option]:bg-gray-900"
            defaultValue={currentMap}
            onChange={(e) => window.location.href = `/office/${e.target.value}`}
          >
            <option value="main">Main Office</option>
            <option value="meeting">Meeting Room</option>
            <option value="prayer">Prayer Room</option>
          </select>
        </div>

        <div className="h-5 w-px bg-gray-700"></div>

        {/* Links */}
        <div className="flex items-center gap-4 text-sm font-medium">
          {(role === 'admin' || role === 'supervisor') && (
            <Link href="/dashboard" className="text-blue-400 transition hover:text-blue-300">
              Admin Dashboard
            </Link>
          )}
          <Link href="/settings" className="text-gray-400 transition hover:text-gray-200">
            Settings
          </Link>
          
          <SignOutButton variant="navbar" />
        </div>
      </div>
    </nav>
  )
}