'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const ALLOWED_GENDERS = ['male', 'female'] as const
type Gender = typeof ALLOWED_GENDERS[number]

export async function updateEmployeeProfile(formData: FormData) {
  const supabase = await createClient()
  
  // Verify user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'Unauthorized.' }

  const displayName = formData.get('display_name') as string
  const avatarFile = formData.get('avatar') as File | null
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirm_password') as string
  const genderRaw = formData.get('gender') as string | null
  const birthDateRaw = formData.get('birth_date') as string | null
  const address = formData.get('address') as string | null
  const avatarConfigRaw = formData.get('avatar_config') as string | null

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
    const fileExt = avatarFile.name.split('.').pop()
    const fileName = `${user.id}-${Date.now()}.${fileExt}`
    
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, avatarFile, { upsert: true })
      
    if (uploadError) return { success: false, message: `Upload failed: ${uploadError.message}` }
    
    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName)
      
    avatarUrl = publicUrlData.publicUrl
  }

  // 3. Validate gender (must be one of the allowed enum values or empty)
  const gender: Gender | null = genderRaw && (ALLOWED_GENDERS as readonly string[]).includes(genderRaw)
    ? (genderRaw as Gender)
    : null

  // 4. Validate birth_date (must be a valid date string or empty)
  const birth_date: string | null = birthDateRaw && birthDateRaw.trim().length > 0
    ? birthDateRaw.trim()
    : null

  // 5. Parse and validate avatar_config JSON
  let avatar_config: Record<string, unknown> | null = null
  if (avatarConfigRaw) {
    try {
      const parsed = JSON.parse(avatarConfigRaw)
      if (parsed && typeof parsed === 'object') {
        avatar_config = parsed
      }
    } catch (_e) {}
  }

  // 6. Prepare Database Updates
  const updates: {
    display_name?: string
    avatar_url?: string
    gender?: Gender | null
    birth_date?: string | null
    address?: string | null
    avatar_config?: Record<string, unknown> | null
  } = {}

  if (displayName)            updates.display_name = displayName
  if (avatarUrl)              updates.avatar_url = avatarUrl
  if (genderRaw !== null)      updates.gender = gender
  if (birthDateRaw !== null)   updates.birth_date = birth_date
  if (address !== null)       updates.address = address.trim() || null
  if (avatar_config !== null) updates.avatar_config = avatar_config

  // 6. Update the Profile Table
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