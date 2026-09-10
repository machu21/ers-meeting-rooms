import { useState, useRef, useEffect } from 'react';
import { LocalUserChoices, useMediaDeviceSelect } from '@livekit/components-react';
import { VideoCameraIcon, VideoCameraSlashIcon, MicrophoneIcon, SpeakerXMarkIcon } from '@heroicons/react/24/solid';
import DeviceSelector from './DeviceSelector';

interface CustomPreJoinProps {
  defaults: Partial<LocalUserChoices>;
  onSubmit: (values: LocalUserChoices) => void;
}

export default function CustomPreJoin({ defaults, onSubmit }: CustomPreJoinProps) {
  const [videoEnabled, setVideoEnabled] = useState(defaults.videoEnabled ?? true);
  const [audioEnabled, setAudioEnabled] = useState(defaults.audioEnabled ?? true);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const username = defaults.username || '';

  const videoSelect = useMediaDeviceSelect({ kind: 'videoinput', requestPermissions: true });
  const audioSelect = useMediaDeviceSelect({ kind: 'audioinput', requestPermissions: true });

  const videoRef = useRef<HTMLVideoElement>(null);

  // Simple preview logic using vanilla navigator.mediaDevices
  useEffect(() => {
    let stream: MediaStream | null = null;
    
    const startPreview = async () => {
      if (!videoEnabled) {
        if (videoRef.current) videoRef.current.srcObject = null;
        return;
      }
      try {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: videoSelect.activeDeviceId ? { deviceId: { exact: videoSelect.activeDeviceId } } : true
          });
        } catch (err: unknown) {
          const error = err as Error;
          if (error.name === 'OverconstrainedError' || error.name === 'NotFoundError') {
            console.warn("Exact video device not found, falling back to default camera");
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
          } else {
            throw err;
          }
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Failed to get preview video stream", err);
      }
    };

    startPreview();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [videoEnabled, videoSelect.activeDeviceId]);

  // Audio volume monitoring logic
  useEffect(() => {
    let stream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let dataArray: Uint8Array | null = null;
    let animationFrameId: number;

    const startAudioPreview = async () => {
      if (!audioEnabled) {
        setVolumeLevel(0);
        return;
      }
      try {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: audioSelect.activeDeviceId ? { deviceId: { exact: audioSelect.activeDeviceId } } : true
          });
        } catch (err: unknown) {
          const error = err as Error;
          if (error.name === 'OverconstrainedError' || error.name === 'NotFoundError') {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          } else {
            throw err;
          }
        }
        
        audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateVolume = () => {
          if (analyser && dataArray) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            analyser.getByteFrequencyData(dataArray as any);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            // Normalize roughly between 0 and 1
            const normalized = Math.min(average / 100, 1);
            setVolumeLevel(normalized);
          }
          animationFrameId = requestAnimationFrame(updateVolume);
        };
        updateVolume();

      } catch (err) {
        console.error("Failed to get preview audio stream", err);
      }
    };

    startAudioPreview();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (audioContext) audioContext.close();
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [audioEnabled, audioSelect.activeDeviceId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      username,
      videoEnabled,
      audioEnabled,
      videoDeviceId: videoSelect.activeDeviceId,
      audioDeviceId: audioSelect.activeDeviceId,
    });
  };

  return (
    <div className="flex h-full w-full items-center justify-center bg-[#1E232B]">
      <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-700 p-8 rounded-2xl shadow-2xl w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left: Preview */}
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-inner flex items-center justify-center border border-gray-800">
            {videoEnabled ? (
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover scale-x-[-1]"
              />
            ) : (
              <div className="text-gray-500 flex flex-col items-center">
                <VideoCameraSlashIcon className="h-16 w-16 mb-2 opacity-50" />
                <p>Camera is off</p>
              </div>
            )}
            
            {/* Overlay toggles */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-4">
              <button
                type="button"
                onClick={() => setAudioEnabled(!audioEnabled)}
                className={`relative p-3 rounded-full transition ${audioEnabled ? 'bg-gray-800/80 text-white hover:bg-gray-700' : 'bg-red-500 text-white hover:bg-red-600'}`}
              >
                {/* Volume Indicator Ring */}
                {audioEnabled && (
                  <span 
                    className="absolute inset-0 rounded-full bg-green-500 opacity-30 pointer-events-none transition-transform duration-75"
                    style={{ transform: `scale(${1 + volumeLevel * 0.6})` }}
                  ></span>
                )}
                <div className="relative z-10">
                  {audioEnabled ? <MicrophoneIcon className="h-6 w-6" /> : <SpeakerXMarkIcon className="h-6 w-6" />}
                </div>
              </button>
              <button
                type="button"
                onClick={() => setVideoEnabled(!videoEnabled)}
                className={`p-3 rounded-full transition ${videoEnabled ? 'bg-gray-800/80 text-white hover:bg-gray-700' : 'bg-red-500 text-white hover:bg-red-600'}`}
              >
                {videoEnabled ? <VideoCameraIcon className="h-6 w-6" /> : <VideoCameraSlashIcon className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Settings and Join */}
        <form onSubmit={handleSubmit} className="flex flex-col justify-center space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Ready to join?</h1>
            <p className="text-gray-400">Configure your devices before entering the office.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Microphone</label>
              <DeviceSelector kind="audioinput" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Camera</label>
              <DeviceSelector kind="videoinput" />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-800">
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all active:scale-[0.98] flex justify-center items-center gap-2"
            >
              Join Office
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
