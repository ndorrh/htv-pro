'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import HlsPlayer from './HlsPlayer';
import { X, Maximize2 } from 'lucide-react';

export default function MiniPlayer() {
  const { currentChannel, isMiniMode, setMiniMode, setCurrentChannel } = useStore();
  const pathname = usePathname();
  const router = useRouter();

  const isPlayerPage = pathname === '/player';
  const isMultiViewPage = pathname === '/multiview';

  // Only show mini player if explicitly in mini mode, not on the full player or multiview page,
  // and there is a current channel with at least one stream
  if (!isMiniMode || !currentChannel || !currentChannel.streams?.length || isPlayerPage || isMultiViewPage) {
    return null;
  }

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMiniMode(false);
    setCurrentChannel(null);
  };

  const handleExpand = () => {
    setMiniMode(false);
    router.push('/player');
  };

  const streamSrc = currentChannel.streams?.[0]?.url;

  return (
    <div 
      className="fixed bottom-6 right-6 w-80 aspect-video bg-zinc-900 rounded-lg shadow-2xl overflow-hidden border border-zinc-800 z-50 cursor-pointer group hover:ring-2 hover:ring-red-600 transition-all duration-300"
      onClick={handleExpand}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleExpand();
      }}
    >
      <div className="absolute top-2 right-2 flex space-x-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={(e) => { e.stopPropagation(); handleExpand(); }}
          className="bg-black/60 p-1.5 rounded-full text-white hover:text-red-500 hover:bg-black/80"
          tabIndex={0}
          title="Go fullscreen"
        >
          <Maximize2 size={16} />
        </button>
        <button 
          onClick={handleClose}
          className="bg-black/60 p-1.5 rounded-full text-white hover:text-red-500 hover:bg-black/80"
          tabIndex={0}
          title="Close"
        >
          <X size={16} />
        </button>
      </div>
      <div className="absolute top-2 left-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 px-2 py-1 rounded text-xs text-white font-medium truncate max-w-[200px]">
        {currentChannel.name}
      </div>
      <HlsPlayer 
        src={streamSrc} 
        autoPlay={true} 
        muted={false} 
        isMini={true}
        className="w-full h-full pointer-events-none" 
      />
    </div>
  );
}
