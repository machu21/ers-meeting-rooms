'use client'

import { Suspense, useTransition, useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { login } from './actions'
import ErrorMessage from './ErrorMessage'

export default function LoginPage() {
  const [isPending, startTransition] = useTransition()
  
  // States for the 3D Tilt & Hover Effect
  const cardRef = useRef<HTMLDivElement>(null)
  const [rotation, setRotation] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

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
    
    // Smooth, subtle 6-degree tilt for executive feel
    const rotateX = ((y - centerY) / centerY) * -6
    const rotateY = ((x - centerX) / centerX) * 6
    
    setRotation({ x: rotateX, y: rotateY })
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    setRotation({ x: 0, y: 0 })
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#070b19] px-4 py-8">
      
      {/* --- STUNNING AMBIENT MESH BACKGROUND --- */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[15%] -left-[10%] h-[650px] w-[650px] animate-[spin_28s_linear_infinite] rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.22)_0%,rgba(0,0,0,0)_70%)] blur-[90px]" />
        <div className="absolute top-[35%] -right-[12%] h-[600px] w-[600px] animate-[spin_32s_linear_infinite_reverse] rounded-full bg-[radial-gradient(circle,rgba(192,38,211,0.18)_0%,rgba(0,0,0,0)_70%)] blur-[90px]" />
        <div className="absolute -bottom-[20%] left-[25%] h-[750px] w-[750px] animate-[pulse_10s_ease-in-out_infinite] rounded-full bg-[radial-gradient(circle,rgba(79,70,229,0.2)_0%,rgba(0,0,0,0)_70%)] blur-[100px]" />
        
        {/* Subtle geometric grid backdrop */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }}
        />
      </div>
      
      {/* --- 3D TILT CONTAINER --- */}
      <div 
        className="relative z-10 w-full max-w-[450px]"
        style={{ perspective: '1500px' }}
      >
        <div
          ref={cardRef}
          onMouseEnter={() => setIsHovered(true)}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
            transition: isHovered ? 'none' : 'transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          }}
          className={`relative overflow-hidden rounded-[2.5rem] border border-white/[0.12] bg-[#0d1326]/85 p-7 sm:p-10 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.12)] backdrop-blur-2xl transition-all duration-1000 ${
            mounted ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0 scale-95'
          }`}
        >
          {/* Internal Mouse-Tracking Spotlight */}
          <div 
            className="pointer-events-none absolute inset-0 -z-10 transition-opacity duration-300"
            style={{
              opacity: isHovered ? 1 : 0,
              background: `radial-gradient(600px circle at ${50 + rotation.y * 5}% ${50 - rotation.x * 5}%, rgba(147,51,234,0.18), transparent 45%)`
            }}
          />

          {/* --- TOP STATUS BADGE --- */}
          <div className="mb-6 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-3.5 py-1 text-[11px] font-semibold tracking-wide text-purple-300 shadow-inner">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              Virtual Workspace Network • Operational
            </span>
          </div>

          {/* --- LOGO & HEADER --- */}
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="relative mb-4 flex items-center justify-center">
              {/* Vibrant ambient logo glow */}
              <div className="absolute inset-0 -m-3 rounded-3xl bg-gradient-to-r from-purple-600/30 via-indigo-600/25 to-fuchsia-600/30 blur-xl transition-all duration-500"></div>
              
              <div className="relative flex items-center justify-center px-4 py-2">
                <Image 
                  src="/logo.png" 
                  alt="ERS Office Logo" 
                  width={260} 
                  height={62} 
                  className="h-14 w-auto object-contain drop-shadow-[0_4px_12px_rgba(124,58,237,0.35)] transition-transform duration-500 hover:scale-[1.03]"
                  priority
                />
              </div>
            </div>
            
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              Welcome Back
            </h1>
            <p className="mt-1.5 text-xs font-medium text-slate-400 sm:text-sm">
              Enter your credentials to enter the virtual office
            </p>
          </div>
          
          <Suspense fallback={null}>
            <ErrorMessage />
          </Suspense>

          <form action={handleAction} className="flex flex-col gap-5">
            
            {/* EMAIL INPUT */}
            <div className="group relative">
              <label className="mb-2 block text-[11px] font-bold tracking-wider text-slate-300 transition-colors group-focus-within:text-purple-400" htmlFor="email">
                WORK EMAIL
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 transition-colors group-focus-within:text-purple-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2"/>
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@elevateremotesolutions.com"
                  required
                  disabled={isPending}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3.5 pl-12 pr-4 text-sm text-white shadow-inner outline-none transition-all placeholder:text-slate-500 focus:border-purple-500 focus:bg-white/[0.07] focus:ring-4 focus:ring-purple-500/15 disabled:opacity-50"
                />
              </div>
            </div>
            
            {/* PASSWORD INPUT */}
            <div className="group relative">
              <label className="mb-2 block text-[11px] font-bold tracking-wider text-slate-300 transition-colors group-focus-within:text-purple-400" htmlFor="password">
                PASSWORD
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 transition-colors group-focus-within:text-purple-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  required
                  disabled={isPending}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3.5 pl-12 pr-12 text-sm text-white shadow-inner outline-none transition-all placeholder:text-slate-500 focus:border-purple-500 focus:bg-white/[0.07] focus:ring-4 focus:ring-purple-500/15 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-white transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
                      <line x1="2" x2="22" y1="2" y2="22"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={isPending}
              className="group relative mt-3 flex w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 px-5 py-4 text-sm font-bold tracking-wide text-white shadow-[0_10px_25px_-5px_rgba(124,58,237,0.45)] transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_14px_30px_-5px_rgba(124,58,237,0.6)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-70"
            >
              {/* Shimmer sweep */}
              <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-150%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(150%)]">
                <div className="relative h-full w-12 bg-white/25" />
              </div>
              <span className="relative flex items-center gap-2">
                {isPending ? (
                  <>
                    <svg className="h-4 w-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    AUTHENTICATING...
                  </>
                ) : (
                  <>
                    <span>ENTER VIRTUAL OFFICE</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  </>
                )}
              </span>
            </button>
          </form>

          {/* Footer note */}
          <div className="mt-8 text-center text-[11px] font-medium text-slate-500">
            Elevate Remote Solutions • Secure Workspace Access
          </div>
        </div>
      </div>
    </div>
  )
}