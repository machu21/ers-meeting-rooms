'use server'

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export type AttachmentItem = {
  url: string
  name: string
  type: string
  size: number
  storage_path: string
}

export type Channel = {
  id: string
  name: string
  slug: string
  description: string
  is_private: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  member_count?: number
  is_member?: boolean
}

export type ChannelMember = {
  id: string
  channel_id: string
  user_id: string
  role: 'admin' | 'member'
  joined_at: string
  invited_by: string | null
  profile?: {
    id: string
    display_name: string | null
    email: string
    avatar_url: string | null
    role: string
    is_active?: boolean
  }
}

export type ChannelMessage = {
  id: string
  channel_id: string
  sender_id: string
  content: string
  attachments: AttachmentItem[]
  created_at: string
  updated_at: string
  sender?: {
    id: string
    display_name: string | null
    email: string
    avatar_url: string | null
    role: string
  }
}

export type EmployeeProfile = {
  id: string
  display_name: string | null
  email: string
  avatar_url: string | null
  role: string
}

/**
 * Fetch all channels accessible to the current user
 */
export async function fetchChannelsAction(): Promise<{ success: boolean; channels: Channel[]; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, channels: [], error: 'Not authenticated' }

    // Fetch channels
    const { data: channels, error } = await supabase
      .from('channels')
      .select('*')
      .order('is_private', { ascending: true })
      .order('name', { ascending: true })

    if (error) throw error

    // Fetch user memberships to attach member status
    const { data: memberships } = await supabase
      .from('channel_members')
      .select('channel_id')
      .eq('user_id', user.id)

    const userChannelIds = new Set(memberships?.map(m => m.channel_id) || [])

    const formattedChannels: Channel[] = (channels || []).map(ch => ({
      ...ch,
      is_member: !ch.is_private || userChannelIds.has(ch.id),
    }))

    return { success: true, channels: formattedChannels }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch channels'
    return { success: false, channels: [], error: message }
  }
}

/**
 * Fetch messages for a specific channel with sender profile details
 */
export async function fetchChannelMessagesAction(channelId: string): Promise<{ success: boolean; messages: ChannelMessage[]; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, messages: [], error: 'Not authenticated' }

    const { data: messages, error } = await supabase
      .from('channel_messages')
      .select(`
        id,
        channel_id,
        sender_id,
        content,
        attachments,
        created_at,
        updated_at,
        sender:profiles!channel_messages_sender_id_fkey(
          id,
          display_name,
          email,
          avatar_url,
          role
        )
      `)
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true })
      .limit(150)

    if (error) throw error

    // Format sender correctly from Supabase relation
    interface RawMessageWithSender {
      id: string
      channel_id: string
      sender_id: string
      content: string
      attachments?: AttachmentItem[] | null
      created_at: string
      updated_at: string
      sender?: EmployeeProfile | EmployeeProfile[] | null
    }

    const formatted: ChannelMessage[] = ((messages as unknown as RawMessageWithSender[]) || []).map((m) => {
      const senderProfile = Array.isArray(m.sender) ? m.sender[0] : m.sender
      return {
        id: m.id,
        channel_id: m.channel_id,
        sender_id: m.sender_id,
        content: m.content,
        attachments: Array.isArray(m.attachments) ? m.attachments : [],
        created_at: m.created_at,
        updated_at: m.updated_at,
        sender: senderProfile || undefined,
      }
    })

    return { success: true, messages: formatted }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch channel messages'
    return { success: false, messages: [], error: message }
  }
}

/**
 * Fetch all employees in the organization (for inviting and DMing)
 */
export async function fetchAllEmployeesAction(): Promise<{ success: boolean; employees: EmployeeProfile[]; error?: string }> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, email, avatar_url, role')
      .eq('is_active', true)
      .order('display_name', { ascending: true })

    if (error) throw error

    return { success: true, employees: data || [] }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch employees'
    return { success: false, employees: [], error: message }
  }
}

/**
 * Fetch members for a specific channel
 */
export async function fetchChannelMembersAction(channelId: string): Promise<{ success: boolean; members: ChannelMember[]; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, members: [], error: 'Not authenticated' }

    // Proactively clean up any deactivated users from channel_members table
    try {
      const { data: deactivated } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('is_active', false)

      if (deactivated && deactivated.length > 0) {
        const deactIds = deactivated.map((d) => d.id)
        await supabaseAdmin
          .from('channel_members')
          .delete()
          .in('user_id', deactIds)
      }
    } catch (cleanupErr) {
      console.error('Non-critical cleanup error for deactivated members:', cleanupErr)
    }

    const { data, error } = await supabase
      .from('channel_members')
      .select(`
        id,
        channel_id,
        user_id,
        role,
        joined_at,
        invited_by,
        profile:profiles!channel_members_user_id_fkey(
          id,
          display_name,
          email,
          avatar_url,
          role,
          is_active
        )
      `)
      .eq('channel_id', channelId)

    if (error) throw error

    interface RawMemberWithProfile {
      id: string
      channel_id: string
      user_id: string
      role: 'admin' | 'member'
      joined_at: string
      invited_by: string | null
      profile?: (EmployeeProfile & { is_active?: boolean }) | (EmployeeProfile & { is_active?: boolean })[] | null
    }

    const formatted: ChannelMember[] = ((data as unknown as RawMemberWithProfile[]) || [])
      .map((m) => {
        const prof = Array.isArray(m.profile) ? m.profile[0] : m.profile
        return {
          id: m.id,
          channel_id: m.channel_id,
          user_id: m.user_id,
          role: m.role,
          joined_at: m.joined_at,
          invited_by: m.invited_by,
          profile: prof || undefined,
        }
      })
      .filter((m) => m.profile && m.profile.is_active !== false)

    return { success: true, members: formatted }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch channel members'
    return { success: false, members: [], error: message }
  }
}

/**
 * Admin action: Create a new channel
 */
export async function createChannelAction(params: {
  name: string
  description?: string
  is_private: boolean
  initialMemberIds?: string[]
}): Promise<{ success: boolean; channel?: Channel; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    // Verify caller is admin or supervisor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdminOrSupervisor = profile?.role === 'admin' || profile?.role === 'supervisor'
    if (!isAdminOrSupervisor) {
      return { success: false, error: 'Permission denied: Only administrators can create channels' }
    }

    const cleanName = params.name.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-')
    if (!cleanName) {
      return { success: false, error: 'Channel name cannot be empty' }
    }

    const { data: channel, error: insertError } = await supabase
      .from('channels')
      .insert({
        name: cleanName,
        slug: cleanName,
        description: params.description?.trim() || '',
        is_private: params.is_private,
        created_by: user.id,
      })
      .select()
      .single()

    if (insertError) {
      if (insertError.code === '23505') {
        return { success: false, error: `Channel #${cleanName} already exists` }
      }
      throw insertError
    }

    // Add creator to channel_members as admin
    await supabase.from('channel_members').upsert(
      {
        channel_id: channel.id,
        user_id: user.id,
        role: 'admin',
        invited_by: user.id,
      },
      { onConflict: 'channel_id,user_id' }
    )

    if (!params.is_private) {
      // Public channel: all active employees are automatically members
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('is_active', true)

      if (allProfiles && allProfiles.length > 0) {
        const otherMemberIds = allProfiles
          .map((p) => p.id)
          .filter((uid) => uid !== user.id)

        if (otherMemberIds.length > 0) {
          const rows = otherMemberIds.map((uid) => ({
            channel_id: channel.id,
            user_id: uid,
            role: 'member' as const,
            invited_by: user.id,
          }))
          await supabase.from('channel_members').upsert(rows, { onConflict: 'channel_id,user_id' })
        }
      }
    } else {
      // Private channel: only explicitly selected initial members are added
      if (params.initialMemberIds && params.initialMemberIds.length > 0) {
        const distinctMembers = Array.from(new Set(params.initialMemberIds.filter((id) => id !== user.id)))
        if (distinctMembers.length > 0) {
          const rows = distinctMembers.map((uid) => ({
            channel_id: channel.id,
            user_id: uid,
            role: 'member' as const,
            invited_by: user.id,
          }))
          await supabase.from('channel_members').upsert(rows, { onConflict: 'channel_id,user_id' })
        }
      }
    }

    revalidatePath('/office')
    return { success: true, channel }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create channel'
    return { success: false, error: message }
  }
}

/**
 * Admin action: Invite users to a channel
 */
export async function inviteMembersAction(
  channelId: string,
  userIds: string[]
): Promise<{ success: boolean; addedCount?: number; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    // Verify caller is admin or channel admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin' || profile?.role === 'supervisor'
    if (!isAdmin) {
      const { data: cm } = await supabase
        .from('channel_members')
        .select('role')
        .eq('channel_id', channelId)
        .eq('user_id', user.id)
        .single()

      if (cm?.role !== 'admin') {
        return { success: false, error: 'Permission denied: Only administrators can invite members' }
      }
    }

    if (!userIds || userIds.length === 0) {
      return { success: true, addedCount: 0 }
    }

    const uniqueIds = Array.from(new Set(userIds))

    // Only invite active users
    const { data: activeUsers } = await supabase
      .from('profiles')
      .select('id')
      .in('id', uniqueIds)
      .eq('is_active', true)

    const validUserIds = (activeUsers || []).map((u) => u.id)
    if (validUserIds.length === 0) {
      return { success: true, addedCount: 0 }
    }

    const rows = validUserIds.map((uid) => ({
      channel_id: channelId,
      user_id: uid,
      role: 'member' as const,
      invited_by: user.id,
    }))

    const { error } = await supabase
      .from('channel_members')
      .upsert(rows, { onConflict: 'channel_id,user_id' })

    if (error) throw error

    revalidatePath('/office')
    return { success: true, addedCount: validUserIds.length }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to invite members'
    return { success: false, error: message }
  }
}

/**
 * Send a message to a channel with text and/or attachments
 */
export async function sendChannelMessageAction(
  channelId: string,
  content: string,
  attachments: AttachmentItem[] = []
): Promise<{ success: boolean; message?: ChannelMessage; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    if (!content.trim() && attachments.length === 0) {
      return { success: false, error: 'Message cannot be empty' }
    }

    const { data, error } = await supabase
      .from('channel_messages')
      .insert({
        channel_id: channelId,
        sender_id: user.id,
        content: content.trim(),
        attachments: attachments,
      })
      .select(`
        id,
        channel_id,
        sender_id,
        content,
        attachments,
        created_at,
        updated_at,
        sender:profiles!channel_messages_sender_id_fkey(
          id,
          display_name,
          email,
          avatar_url,
          role
        )
      `)
      .single()

    if (error) throw error

    const senderProfile = Array.isArray(data.sender) ? data.sender[0] : data.sender
    const formatted: ChannelMessage = {
      id: data.id,
      channel_id: data.channel_id,
      sender_id: data.sender_id,
      content: data.content,
      attachments: Array.isArray(data.attachments) ? data.attachments : [],
      created_at: data.created_at,
      updated_at: data.updated_at,
      sender: senderProfile || undefined,
    }

    return { success: true, message: formatted }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to send message'
    return { success: false, error: message }
  }
}

/**
 * Delete a channel message (sender or admin)
 */
export async function deleteChannelMessageAction(
  messageId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    const { error } = await supabase
      .from('channel_messages')
      .delete()
      .eq('id', messageId)

    if (error) throw error

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete message'
    return { success: false, error: message }
  }
}

/**
 * Admin action: Update a channel (name, description, privacy public/private)
 */
export async function updateChannelAction(
  channelId: string,
  params: {
    name: string
    description?: string
    is_private: boolean
    newMemberIds?: string[]
  }
): Promise<{ success: boolean; channel?: Channel; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    // Verify caller is admin or supervisor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdminOrSupervisor = profile?.role === 'admin' || profile?.role === 'supervisor'
    if (!isAdminOrSupervisor) {
      return { success: false, error: 'Permission denied: Only administrators can update channels' }
    }

    // Fetch existing channel
    const { data: existingChannel, error: fetchErr } = await supabase
      .from('channels')
      .select('*')
      .eq('id', channelId)
      .single()

    if (fetchErr || !existingChannel) {
      return { success: false, error: 'Channel not found' }
    }

    const cleanName = params.name.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-')
    if (!cleanName) {
      return { success: false, error: 'Channel name cannot be empty' }
    }

    // Guard: general channel cannot be made private or renamed away from general
    if (existingChannel.slug === 'general') {
      if (params.is_private) {
        return { success: false, error: 'The #general channel cannot be made private' }
      }
      if (cleanName !== 'general') {
        return { success: false, error: 'The #general channel name cannot be modified' }
      }
    }

    const wasPrivate = existingChannel.is_private
    const isNowPrivate = params.is_private

    // Update channel record
    const { data: updatedChannel, error: updateError } = await supabase
      .from('channels')
      .update({
        name: cleanName,
        slug: cleanName,
        description: params.description?.trim() || '',
        is_private: isNowPrivate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', channelId)
      .select()
      .single()

    if (updateError) {
      if (updateError.code === '23505') {
        return { success: false, error: `Channel #${cleanName} already exists` }
      }
      throw updateError
    }

    // If switched from private to public: ensure all active profiles are in channel_members
    if (wasPrivate && !isNowPrivate) {
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('is_active', true)

      if (allProfiles && allProfiles.length > 0) {
        const rows = allProfiles.map((p) => ({
          channel_id: channelId,
          user_id: p.id,
          role: 'member' as const,
        }))
        await supabase.from('channel_members').upsert(rows, { onConflict: 'channel_id,user_id' })
      }
    }

    // If private channel: add any newly specified active members
    if (isNowPrivate && params.newMemberIds && params.newMemberIds.length > 0) {
      const { data: activeUsers } = await supabase
        .from('profiles')
        .select('id')
        .in('id', params.newMemberIds)
        .eq('is_active', true)

      const validNewIds = (activeUsers || []).map((u) => u.id)
      if (validNewIds.length > 0) {
        const rows = validNewIds.map((uid) => ({
          channel_id: channelId,
          user_id: uid,
          role: 'member' as const,
          invited_by: user.id,
        }))
        await supabase.from('channel_members').upsert(rows, { onConflict: 'channel_id,user_id' })
      }
    }

    revalidatePath('/office')
    return { success: true, channel: updatedChannel }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update channel'
    return { success: false, error: message }
  }
}

/**
 * Admin action: Delete a channel
 */
export async function deleteChannelAction(
  channelId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    // Verify caller is admin or supervisor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdminOrSupervisor = profile?.role === 'admin' || profile?.role === 'supervisor'
    if (!isAdminOrSupervisor) {
      return { success: false, error: 'Permission denied: Only administrators can delete channels' }
    }

    // Fetch existing channel
    const { data: existingChannel, error: fetchErr } = await supabase
      .from('channels')
      .select('slug, name')
      .eq('id', channelId)
      .single()

    if (fetchErr || !existingChannel) {
      return { success: false, error: 'Channel not found' }
    }

    // Guard: Prevent deleting system default channels
    if (existingChannel.slug === 'general') {
      return { success: false, error: 'The #general channel cannot be deleted' }
    }

    const { error: deleteError } = await supabase
      .from('channels')
      .delete()
      .eq('id', channelId)

    if (deleteError) throw deleteError

    revalidatePath('/office')
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete channel'
    return { success: false, error: message }
  }
}

