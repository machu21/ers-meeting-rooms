'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/lib/logger'

export type BinaryGender = 'male' | 'female'

/**
 * Server action to update the user's character gender.
 * Strictly limited to 'male' or 'female'.
 */
export async function setCharacterGender(gender: BinaryGender) {
  if (gender !== 'male' && gender !== 'female') {
    return { success: false, message: 'Invalid gender selection. Only male and female are supported.' }
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, message: 'Unauthorized. Please sign in.' }
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ gender })
    .eq('id', user.id)

  if (updateError) {
    return { success: false, message: updateError.message }
  }

  await logActivity({
    userId: user.id,
    level: 'info',
    source: 'AUTH',
    message: `User set character gender to ${gender}`,
    metadata: { gender }
  })

  revalidatePath('/office')
  revalidatePath('/meeting-room')
  revalidatePath('/prayer-room')
  revalidatePath('/settings')

  return { success: true, gender }
}
