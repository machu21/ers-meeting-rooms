'use client'

import { Suspense, useTransition, useState, useRef, useEffect } from 'react'
import { login } from './actions'
import ErrorMessage from './ErrorMessage'

export default function LoginPage() {
  const [isPending, startTransition] = useTransition()
  
  // States for the 3D Tilt & Hover Gimmick
  const cardRef = useRef<HTMLDivElement>(null)
  const [rotation, setRotation] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Trigger entrance animation on mount
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleAction = (formData: FormData) => {
    startTransition(async () => {
      await login(formData)
    })
  }

  // Calculate 3D rotation based on mouse coordinates
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const card = cardRef.current
    const rect = card.getBoundingClientRect()
    
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    
    // Smooth, subtle 6-degree max tilt
    const rotateX = ((y - centerY) / centerY) * -6
    const rotateY = ((x - centerX) / centerX) * 6
    
    setRotation({ x: rotateX, y: rotateY })
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    setRotation({ x: 0, y: 0 })
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#050914]">
      
      {/* --- ANIMATED AMBIENT BACKGROUND --- */}
      <div className="absolute top-[-10%] left-[-10%] h-[600px] w-[600px] animate-[spin_15s_linear_infinite] rounded-full bg-blue-600/15 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] animate-[spin_20s_linear_infinite_reverse] rounded-full bg-purple-600/15 blur-[120px]" />
      
      {/* --- 3D TILT CONTAINER --- */}
      <div 
        className="relative z-10 w-full max-w-[420px] p-6"
        style={{ perspective: '1200px' }}
      >
        <div
          ref={cardRef}
          onMouseEnter={() => setIsHovered(true)}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
            transition: isHovered ? 'none' : 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)',
          }}
          className={`relative overflow-hidden rounded-3xl border border-white/10 bg-[#ffffff0a] p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl duration-700 ease-out transition-all ${
            mounted ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
          }`}
        >
          {/* Internal Mouse-Tracking Spotlight */}
          <div 
            className="pointer-events-none absolute inset-0 -z-10 transition-opacity duration-300"
            style={{
              opacity: isHovered ? 1 : 0,
              background: `radial-gradient(circle at ${50 + rotation.y * 4}% ${50 - rotation.x * 4}%, rgba(255,255,255,0.06) 0%, transparent 70%)`
            }}
          />

          {/* --- SVG LOGO & HEADER --- */}
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="relative mb-5 flex h-20 w-20 items-center justify-center">
              {/* Subtle purple glow behind the logo to match the design */}
              <div className="absolute inset-0 animate-pulse rounded-full bg-purple-500/20 blur-xl"></div>
              
              {/* Custom Integrated SVG Logo */}
              <svg 
                viewBox="0 0 100 100" 
                className="relative z-10 h-full w-full drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  {/* Linear gradient matching the deep purple aesthetic */}
                  <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#9333ea" /> {/* Lighter top-left */}
                    <stop offset="100%" stopColor="#3b0764" /> {/* Darker bottom-right */}
                  </linearGradient>
                </defs>
                
                {/* The continuous sweeping network path */}
                <path 
                  d="M 50 14 Q 70 30 86 50 Q 70 70 50 86 Q 30 70 14 50 Q 30 30 50 14 Z" 
                  stroke="url(#logoGradient)" 
                  strokeWidth="12" 
                  strokeLinejoin="round"
                />
                
                {/* The 4 connection nodes */}
                <circle cx="50" cy="14" r="9" fill="url(#logoGradient)" />
                <circle cx="86" cy="50" r="9" fill="url(#logoGradient)" />
                <circle cx="50" cy="86" r="9" fill="url(#logoGradient)" />
                <circle cx="14" cy="50" r="9" fill="url(#logoGradient)" />
              </svg>
            </div>
            
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Elevate Remote
            </h1>
            <p className="mt-1.5 text-sm font-medium text-gray-400">
              Sign in to access your virtual space
            </p>
          </div>
          
          <Suspense fallback={null}>
            <ErrorMessage />
          </Suspense>

          <form action={handleAction} className="flex flex-col gap-5">
            
            {/* CLEAN STANDARD INPUT: EMAIL */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-400" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="name@company.com"
                required
                disabled={isPending}
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white shadow-inner outline-none transition-all placeholder:text-gray-600 focus:border-blue-500/50 focus:bg-black/40 focus:ring-4 focus:ring-blue-500/10 disabled:opacity-50"
              />
            </div>
            
            {/* CLEAN STANDARD INPUT: PASSWORD */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-400" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                disabled={isPending}
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white shadow-inner outline-none transition-all placeholder:text-gray-600 focus:border-blue-500/50 focus:bg-black/40 focus:ring-4 focus:ring-blue-500/10 disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="mt-4 flex w-full items-center justify-center rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_0_15px_rgba(147,51,234,0.3)] transition-all duration-300 hover:bg-purple-500 hover:shadow-[0_0_25px_rgba(147,51,234,0.5)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-70"
            >
              {isPending ? (
                <>
                  <svg className="mr-2 h-4 w-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Authenticating...
                </>
              ) : (
                'Enter Virtual Office'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}