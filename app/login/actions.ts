'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { logActivity } from '@/lib/logger'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  
  const supabase = await createClient() 

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    await logActivity({
      userId: null,
      level: 'warn',
      source: 'AUTH',
      message: `Failed login attempt for ${email}`,
      metadata: { email, reason: error.message }
    })
    return redirect(`/login?message=${encodeURIComponent(error.message)}`)
  }

  if (data?.user) {
    await logActivity({
      userId: data.user.id,
      level: 'info',
      source: 'AUTH',
      message: 'User logged in successfully',
      metadata: { email: data.user.email }
    })
  }

  return redirect('/office') 
}

export async function signOut() {
  const supabaseClient = await createClient()
  const { data: { user } } = await supabaseClient.auth.getUser()

  if (user) {
    await logActivity({
      userId: user.id,
      level: 'info',
      source: 'AUTH',
      message: 'User signed out',
      metadata: { email: user.email }
    })
  }

  await supabaseClient.auth.signOut()
  redirect('/login')
}