'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  
  const supabase = await createClient() 

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    // Dynamically pass the actual Supabase error message to the URL
    return redirect(`/login?message=${encodeURIComponent(error.message)}`)
  }

  return redirect('/office') 
}

export async function signOut() {
  const supabaseClient = await createClient()
  await supabaseClient.auth.signOut()
  redirect('/login')
}