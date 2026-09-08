import { AccessToken } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  // 1. Authenticate the caller using Supabase Auth
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized: Valid session required' }, { status: 401 });
  }

  const room = req.nextUrl.searchParams.get('room');
  const username = req.nextUrl.searchParams.get('username');

  if (!room) {
    return NextResponse.json({ error: 'Missing "room" query parameter' }, { status: 400 });
  }
  if (!username) {
    return NextResponse.json({ error: 'Missing "username" query parameter' }, { status: 400 });
  }

  // 2. Authorize map/room access based on user role and accessible maps
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, accessible_maps, is_active')
    .eq('id', user.id)
    .single();

  if (profile?.is_active === false) {
    return NextResponse.json({ error: 'Account is deactivated' }, { status: 403 });
  }

  const userRole = profile?.role || 'employee';
  const accessibleMaps = profile?.accessible_maps || [];

  if (userRole !== 'admin') {
    // Determine map key from room identifier (e.g. "office_room_1" -> "office")
    const mapKey = room.includes('meeting')
      ? 'meeting-room'
      : room.includes('prayer')
        ? 'prayer-room'
        : 'office';

    if (!accessibleMaps.includes(mapKey)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient map permissions' }, { status: 403 });
    }
  }

  // 3. Verify server configuration
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  if (!apiKey || !apiSecret || !wsUrl) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  // 4. Generate time-bound token with identity bound to authenticated user
  const identity = `${user.id}#${username}`;
  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    ttl: '10h'  // Extended for full 8-hour demo sessions
  });

  at.addGrant({
    room,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  });

  return NextResponse.json({ token: await at.toJwt() });
}
