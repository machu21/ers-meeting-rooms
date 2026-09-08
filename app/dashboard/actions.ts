'use server'

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

async function verifyAdminOrSupervisor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { authorized: false as const, error: "Unauthorized: Please log in." }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'supervisor')) {
    return { authorized: false as const, error: "Forbidden: Admin or supervisor access required." }
  }

  return { authorized: true as const, user }
}

export async function createEmployeeAccount(formData: FormData): Promise<{ success: boolean; message: string }> {
  const authCheck = await verifyAdminOrSupervisor()
  if (!authCheck.authorized) {
    return { success: false, message: authCheck.error }
  }

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const role = formData.get('role') as string
  
  // gets an array of strings from all checkboxes named "maps"
  const accessibleMaps = formData.getAll('maps') as string[] 

  if (!email || !password || !role) {
    return { success: false, message: "Email, password, and role are required." }
  }

  // Ensure they have access to at least one map
  if (accessibleMaps.length === 0) {
     return { success: false, message: "You must assign at least one map to this user." }
  }

  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
    })

    if (authError) return { success: false, message: authError.message }

    if (authData.user) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({ 
          id: authData.user.id, 
          email: email, 
          role: role, 
          accessible_maps: accessibleMaps 
        })

      if (profileError) return { success: false, message: "User created, but profile setup failed." }
    }

    revalidatePath('/dashboard')
    return { success: true, message: "Team member account created successfully!" }
    
  } catch {
    return { success: false, message: "An unexpected error occurred." }
  }
}

// 2. Action to update the profile picture
export async function updateProfilePicture(file: File) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { success: false, message: "Unauthorized." }

  // Upload the file to the 'avatars' storage bucket
  const fileExtension = file.name.split('.').pop()
  const filePath = `${user.id}.${fileExtension}` // Use user.id as the file name to prevent multiple files per user

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true, contentType: file.type }) // upsert=true allows overwriting existing files

  if (uploadError) {
    console.error("Storage upload error:", uploadError)
    return { success: false, message: `Storage Error: ${uploadError.message}` }
  }

  // Generate the public URL (if the bucket is public)
  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath)

  // Update the 'profiles' table with the new URL
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', user.id)

  if (profileError) {
    console.error("Profile update error:", profileError)
    return { success: false, message: `Profile Error: ${profileError.message}` }
  }

  revalidatePath('/dashboard')
  return { success: true, message: "Profile picture updated!" }
}

// 3. Action to update media settings (camera, microphone)
export async function updateMediaSettings(camera: boolean, microphone: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { success: false, message: "Unauthorized." }

  // Update the boolean values in the 'profiles' table
  const { error } = await supabase
    .from('profiles')
    .update({ camera_enabled: camera, microphone_enabled: microphone })
    .eq('id', user.id)

  if (error) {
    console.error("Error updating media settings:", error)
    return { success: false, message: error.message }
  }

  revalidatePath('/dashboard')
  return { success: true, message: "Media settings saved!" }
}

export async function updateUser(userId: string, formData: FormData) {
  const authCheck = await verifyAdminOrSupervisor()
  if (!authCheck.authorized) {
    return { success: false, message: authCheck.error }
  }

  const role = formData.get('role') as string
  const accessibleMaps = formData.getAll('maps') as string[]

  if (!role || accessibleMaps.length === 0) {
    return { success: false, message: "Role and at least one map are required." }
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ role, accessible_maps: accessibleMaps })
    .eq('id', userId)

  if (error) return { success: false, message: error.message }
  
  revalidatePath('/dashboard')
  return { success: true, message: "User updated successfully." }
}

export async function toggleUserStatus(userId: string, currentStatus: boolean) {
  const authCheck = await verifyAdminOrSupervisor()
  if (!authCheck.authorized) {
    return { success: false, message: authCheck.error }
  }

  // Prevent users from banning themselves
  if (authCheck.user.id === userId) {
    return { success: false, message: "You cannot change your own account status." }
  }

  // 1. Ban/Unban the user in Supabase Auth
  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    ban_duration: currentStatus ? '876000h' : 'none',
  })

  if (authError) return { success: false, message: authError.message }

  // 2. Update the visual flag in the profiles table
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({ is_active: !currentStatus })
    .eq('id', userId)

  if (profileError) return { success: false, message: profileError.message }
  
  revalidatePath('/dashboard')
  return { success: true, message: `User ${!currentStatus ? 'reactivated' : 'deactivated'} successfully.` }
}