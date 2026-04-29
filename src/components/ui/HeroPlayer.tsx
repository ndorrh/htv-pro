'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import HlsPlayer from '../player/HlsPlayer';
import { Volume2, VolumeX, Play } from 'lucide-react';
import { Channel } from '@/lib/m3uParser';

interface HeroPlayerProps {
  channel: Channel;
  onStreamError?: () => void;
}

export default function HeroPlayer({ channel, onStreamError }: HeroPlayerProps) {
  const [isMuted, setIsMuted] = useState(true);
  const router = useRouter();
  const { setCurrentChannel } = useStore();

  const handlePlayFullscreen = () => {
    setCurrentChannel(channel);
    router.push('/player');
  };

  const streamSrc = channel.sources[0]?.url;

  if (!streamSrc) return null;

  return (
    <div className="relative w-full h-[70vh] min-h-[500px] overflow-hidden group">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <HlsPlayer 
          src={streamSrc} 
          autoPlay={true} 
          muted={isMuted} 
          className="w-full h-full object-cover scale-105" 
          isMini={true} // Re-use the mini setting to hide default controls
          onStreamError={onStreamError}
        />
      </div>

      <div className="absolute inset-0 z-10 bg-gradient-to-r from-zinc-950 via-zinc-950/60 to-transparent pointer-events-none" />
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-zinc-950 via-transparent to-transparent pointer-events-none" />

      <div className="absolute bottom-20 left-12 z-20 max-w-2xl">
        {channel.logo && (
          <img src={channel.logo} alt={channel.name} className="h-16 mb-4 drop-shadow-lg object-contain" />
        )}
        <h1 className="text-5xl font-black text-white mb-4 tracking-tight drop-shadow-md">
          {channel.name}
        </h1>
        <p className="text-lg text-zinc-300 mb-8 font-medium">
          Category: {channel.group}
        </p>

        <div className="flex items-center space-x-4">
          <button 
            tabIndex={0}
            onClick={handlePlayFullscreen}
            className="flex items-center justify-center space-x-2 bg-white text-black px-8 py-3 rounded-md font-bold text-lg hover:bg-zinc-200 focus:outline-none focus:ring-4 focus:ring-red-600 transition-colors shadow-lg"
          >
            <Play fill="currentColor" size={24} />
            <span>Watch Fullscreen</span>
          </button>
          
          <button 
            tabIndex={0}
            onClick={() => setIsMuted(!isMuted)}
            className="flex items-center justify-center bg-zinc-800/80 text-white p-3.5 rounded-full hover:bg-zinc-700 backdrop-blur-sm focus:outline-none focus:ring-4 focus:ring-red-600 transition-colors border border-zinc-600"
          >
            {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
          </button>
        </div>
      </div>
    </div>
  );
}
