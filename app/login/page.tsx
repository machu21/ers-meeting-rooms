'use client'

import { Suspense, useTransition, useState, useRef, useEffect } from 'react'
import Image from 'next/image'
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
    
    // Smooth, subtle 8-degree max tilt for premium feel
    const rotateX = ((y - centerY) / centerY) * -8
    const rotateY = ((x - centerX) / centerX) * 8
    
    setRotation({ x: rotateX, y: rotateY })
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    setRotation({ x: 0, y: 0 })
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-slate-50">
      
      {/* --- STUNNING ANIMATED MESH BACKGROUND (LIGHT MODE) --- */}
      <div className="absolute inset-0 z-0">
        <div className="absolute -top-[20%] -left-[10%] h-[700px] w-[700px] animate-[spin_25s_linear_infinite] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.15)_0%,rgba(0,0,0,0)_70%)] blur-[80px]" />
        <div className="absolute top-[40%] -right-[10%] h-[600px] w-[600px] animate-[spin_30s_linear_infinite_reverse] rounded-full bg-[radial-gradient(circle,rgba(236,72,153,0.15)_0%,rgba(0,0,0,0)_70%)] blur-[80px]" />
        <div className="absolute -bottom-[20%] left-[20%] h-[800px] w-[800px] animate-[pulse_10s_ease-in-out_infinite] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.15)_0%,rgba(0,0,0,0)_70%)] blur-[100px]" />
        {/* Subtle noise overlay for texture */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.04] mix-blend-overlay" />
      </div>
      
      {/* --- 3D TILT CONTAINER --- */}
      <div 
        className="relative z-10 w-full max-w-[440px] px-6"
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
          className={`relative overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/70 p-10 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.05),inset_0_1px_0_0_rgba(255,255,255,0.8)] backdrop-blur-2xl transition-all duration-1000 ${
            mounted ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0 scale-95'
          }`}
        >
          {/* Internal Mouse-Tracking Spotlight */}
          <div 
            className="pointer-events-none absolute inset-0 -z-10 transition-opacity duration-300"
            style={{
              opacity: isHovered ? 1 : 0,
              background: `radial-gradient(800px circle at ${50 + rotation.y * 5}% ${50 - rotation.x * 5}%, rgba(255,255,255,0.8), transparent 40%)`
            }}
          />

          {/* --- LOGO & HEADER --- */}
          <div className="mb-10 flex flex-col items-center text-center">
            <div className="relative mb-6 flex h-24 w-24 items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 blur-xl transition-all duration-500 group-hover:blur-2xl"></div>
              {/* Added a solid white background circle to help mask the baked-in checkerboard from the image */}
              <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-gray-900/5">
                <Image 
                  src="/logo.png" 
                  alt="Elevate Remote Logo" 
                  width={96} 
                  height={96} 
                  className="relative z-10 scale-[1.1] transition-transform duration-500 hover:scale-[1.15]"
                  priority
                />
              </div>
            </div>
            
            <h1 className="bg-gradient-to-br from-slate-900 to-slate-700 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
              Welcome Back
            </h1>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Enter your credentials to access the virtual office
            </p>
          </div>
          
          <Suspense fallback={null}>
            <ErrorMessage />
          </Suspense>

          <form action={handleAction} className="flex flex-col gap-6">
            
            {/* EMAIL INPUT */}
            <div className="group relative">
              <label className="mb-2.5 block text-xs font-bold tracking-widest text-slate-500 transition-colors group-focus-within:text-purple-600" htmlFor="email">
                EMAIL ADDRESS
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 group-focus-within:text-purple-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@company.com"
                  required
                  disabled={isPending}
                  className="w-full rounded-2xl border border-gray-200 bg-white/80 py-3.5 pl-12 pr-4 text-sm text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10 disabled:opacity-50"
                />
              </div>
            </div>
            
            {/* PASSWORD INPUT */}
            <div className="group relative">
              <label className="mb-2.5 block text-xs font-bold tracking-widest text-slate-500 transition-colors group-focus-within:text-purple-600" htmlFor="password">
                PASSWORD
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 group-focus-within:text-purple-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  disabled={isPending}
                  className="w-full rounded-2xl border border-gray-200 bg-white/80 py-3.5 pl-12 pr-4 text-sm text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10 disabled:opacity-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="group relative mt-2 flex w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-4 py-4 text-sm font-bold text-white shadow-[0_8px_20px_rgba(147,51,234,0.25)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_10px_25px_rgba(147,51,234,0.4)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-70"
            >
              <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-150%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(150%)]">
                <div className="relative h-full w-8 bg-white/20" />
              </div>
              <span className="relative flex items-center">
                {isPending ? (
                  <>
                    <svg className="mr-2 h-4 w-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    AUTHENTICATING...
                  </>
                ) : (
                  'ENTER VIRTUAL OFFICE'
                )}
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}