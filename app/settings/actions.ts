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

  let avatarUrl = undefined

  // 1. Handle Avatar Upload (if a file was selected)
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

  // 2. Prepare Database Updates
  const updates: any = {}
  if (displayName) updates.display_name = displayName
  if (avatarUrl) updates.avatar_url = avatarUrl

  // 3. Update the Profile Table
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
  
  return { success: true, message: 'Profile updated successfully!' }
}