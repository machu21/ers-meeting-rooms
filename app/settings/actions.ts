'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateEmployeeProfile(formData: FormData) {
  const supabase = await createClient()
  
  // Verify user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'Unauthorized.' }

  const displayName = formData.get('display_name') as string
  const avatarFile = formData.get('avatar') as File | null
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirm_password') as string

  // 1. Handle Password Update
  if (password) {
    if (password !== confirmPassword) {
      return { success: false, message: 'Passwords do not match.' }
    }
    const { error: authError } = await supabase.auth.updateUser({
      password: password
    })
    if (authError) return { success: false, message: authError.message }
  }

  let avatarUrl = undefined

  // 2. Handle Avatar Upload (if a file was selected)
  if (avatarFile && avatarFile.size > 0) {
    // Generate a unique file name to prevent caching issues
    const fileExt = avatarFile.name.split('.').pop()
    const fileName = `${user.id}-${Date.now()}.${fileExt}`
    
    // Upload to the 'avatars' bucket
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, avatarFile, { upsert: true })
      
    if (uploadError) return { success: false, message: `Upload failed: ${uploadError.message}` }
    
    // Get the public URL of the uploaded image
    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName)
      
    avatarUrl = publicUrlData.publicUrl
  }

  // 3. Prepare Database Updates
  const updates: { display_name?: string; avatar_url?: string } = {}
  if (displayName) updates.display_name = displayName
  if (avatarUrl) updates.avatar_url = avatarUrl

  // 4. Update the Profile Table
  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)

    if (updateError) return { success: false, message: updateError.message }
  }

  // Refresh all affected pages
  revalidatePath('/settings')
  revalidatePath('/office')
  revalidatePath('/prayer-room')
  revalidatePath('/dashboard')
  
  return { success: true, message: 'Settings updated successfully!' }
}