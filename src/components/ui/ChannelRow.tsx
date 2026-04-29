'use client';

import React, { useRef } from 'react';
import { Channel } from '@/lib/m3uParser';
import { useStore } from '@/store/useStore';
import { useRouter } from 'next/navigation';
import { Play, Grid } from 'lucide-react';

interface ChannelCardProps {
  channel: Channel;
}

export function ChannelCard({ channel }: ChannelCardProps) {
  const { setCurrentChannel, addToHistory } = useStore();
  const router = useRouter();

  const handlePlay = () => {
    setCurrentChannel(channel);
    addToHistory(channel);
    router.push('/player');
  };

  const handleAddToMultiView = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/multiview?add=${encodeURIComponent(channel.id)}`);
  };

  return (
    <div 
      tabIndex={0}
      onClick={handlePlay}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handlePlay();
      }}
      className="relative shrink-0 w-64 aspect-video bg-zinc-900 rounded-lg overflow-hidden group cursor-pointer focus:outline-none focus:ring-4 focus:ring-red-600 transition-transform duration-300 hover:scale-105 focus:scale-105 border border-zinc-800"
    >
      <div className="absolute inset-0 flex items-center justify-center p-4 bg-zinc-950">
        {channel.logo ? (
          <img src={channel.logo} alt={channel.name} className="max-h-full max-w-full object-contain opacity-80 group-hover:opacity-100 transition-opacity" />
        ) : (
          <span className="text-zinc-600 font-bold text-xl text-center">{channel.name}</span>
        )}
      </div>
      
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
        <h3 className="text-white font-bold truncate">{channel.name}</h3>
        <div className="flex items-center space-x-2 mt-2">
          <button 
            tabIndex={-1}
            onClick={handlePlay}
            className="flex-1 flex items-center justify-center space-x-1 bg-white text-black py-1.5 rounded text-sm font-semibold hover:bg-zinc-200"
          >
            <Play fill="currentColor" size={14} />
            <span>Play</span>
          </button>
          <button 
            tabIndex={-1}
            onClick={handleAddToMultiView}
            className="p-1.5 bg-zinc-800 text-white rounded hover:bg-zinc-700 hover:text-red-500"
            title="Add to Multi-View"
          >
            <Grid size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

interface ChannelRowProps {
  title: string;
  channels: Channel[];
}

export default function ChannelRow({ title, channels }: ChannelRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);

  if (!channels.length) return null;

  return (
    <div className="w-full mb-8">
      <h2 className="text-2xl font-bold text-white mb-4 px-12">{title}</h2>
      <div className="relative group">
        <div 
          ref={rowRef}
          className="flex space-x-4 overflow-x-auto px-12 pb-8 pt-4 scrollbar-hide scroll-smooth snap-x"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {channels.map((channel, i) => (
            <div key={`${channel.id}-${i}`} className="snap-start">
              <ChannelCard channel={channel} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
