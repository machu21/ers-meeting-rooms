'use client';

import { LiveKitRoom, LocalUserChoices } from '@livekit/components-react';
import { useEffect, useState } from 'react';
import '@livekit/components-styles';
import CustomPreJoin from './CustomPreJoin';

export default function LiveKitRoomWrapper({ 
  roomId, 
  currentUser, 
  children 
}: { 
  roomId: string;
  currentUser: { name: string, id: string, camera_enabled?: boolean, microphone_enabled?: boolean };
  children: React.ReactNode;
}) {
  const [token, setToken] = useState<string>('');
  const [preJoinChoices, setPreJoinChoices] = useState<LocalUserChoices | null>(null);

  useEffect(() => {
    // Fetch the token when the component mounts
    const fetchToken = async () => {
      try {
        const resp = await fetch(`/api/livekit?room=${roomId}&username=${currentUser.name}_${currentUser.id}`);
        const data = await resp.json();
        if (data.token) {
          setToken(data.token);
        }
      } catch (e) {
        console.error('Failed to fetch LiveKit token', e);
      }
    };
    fetchToken();
  }, [roomId, currentUser.name, currentUser.id]);

  if (token === '') {
    return <div className="flex h-full w-full items-center justify-center text-white">Connecting to LiveKit...</div>;
  }

  if (!preJoinChoices) {
    return (
      <CustomPreJoin
        defaults={{
          audioEnabled: currentUser.microphone_enabled ?? false,
          videoEnabled: currentUser.camera_enabled ?? false,
          username: currentUser.name,
        }}
        onSubmit={(values) => {
          setPreJoinChoices(values);
        }}
      />
    );
  }

  return (
    <LiveKitRoom
      video={preJoinChoices.videoEnabled}
      audio={preJoinChoices.audioEnabled}
      options={{
        audioCaptureDefaults: {
          deviceId: preJoinChoices.audioDeviceId,
        },
        videoCaptureDefaults: {
          deviceId: preJoinChoices.videoDeviceId,
        },
      }}
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      data-lk-theme="default"
      style={{ height: '100%', width: '100%', position: 'relative' }}
    >
      {/* The VirtualMap or PixiJS canvas will go inside here */}
      {children}
    </LiveKitRoom>
  );
}
