import { useState, useRef, useEffect } from 'react';
import { useMediaDeviceSelect } from '@livekit/components-react';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/solid';

interface DeviceSelectorProps {
  kind: 'audioinput' | 'videoinput';
  variant?: 'default' | 'icon';
}

export default function DeviceSelector({ kind, variant = 'default' }: DeviceSelectorProps) {
  const { devices, activeDeviceId, setActiveMediaDevice } = useMediaDeviceSelect({ 
    kind, 
    requestPermissions: true 
  });
  
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!devices || devices.length === 0) return null;

  const activeDevice = devices.find(d => d.deviceId === activeDeviceId);
  const activeLabel = activeDevice?.label || `${kind === 'audioinput' ? 'Microphone' : 'Camera'} ${activeDeviceId?.substring(0, 5)}`;

  return (
    <div className={`relative ${variant === 'default' ? 'block w-full' : 'inline-block'}`} ref={containerRef}>
      {variant === 'default' ? (
        <button 
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full min-w-[200px] items-center justify-between bg-gray-900/80 backdrop-blur-md border border-gray-700 hover:border-gray-500 px-4 py-2 rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-200 text-sm transition-all"
        >
          <span className="block truncate pr-2 flex-1 text-left">{activeLabel}</span>
          <ChevronDownIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white transition-colors flex items-center justify-center"
          title="Select Device"
        >
          <ChevronUpIcon className="h-4 w-4" />
        </button>
      )}

      {isOpen && (
        <div className={`absolute z-50 min-w-[240px] max-w-[300px] bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden py-1 ${variant === 'icon' ? 'bottom-full mb-2 left-1/2 -translate-x-1/2' : 'top-full mt-2 left-0'}`}>
          <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-700">
            {kind === 'audioinput' ? 'Microphone' : 'Camera'} Options
          </div>
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {devices.map((device) => (
              <button
                key={device.deviceId}
                type="button"
                onClick={() => {
                  setActiveMediaDevice(device.deviceId);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                  device.deviceId === activeDeviceId 
                    ? 'bg-indigo-600/20 text-indigo-400 font-medium' 
                    : 'text-gray-300 hover:bg-gray-700'
                } truncate block`}
              >
                {device.label || `${kind === 'audioinput' ? 'Microphone' : 'Camera'} ${device.deviceId.substring(0, 5)}`}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
