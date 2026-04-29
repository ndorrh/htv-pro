'use client';

import React, { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { fetchAndParseM3U, Channel } from '@/lib/m3uParser';
import { useSpatialNavigation } from '@/lib/spatialFocus';
import { ChannelCard } from '@/components/ui/ChannelRow';
import { Loader2, Heart } from 'lucide-react';

const DEFAULT_M3U = "https://iptv-org.github.io/iptv/index.m3u";

export default function FavoritesPage() {
  useSpatialNavigation();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const { favorites } = useStore();

  useEffect(() => {
    let isMounted = true;
    const loadChannels = async () => {
      setLoading(true);
      const activeUrl = localStorage.getItem('htv-custom-m3u') || DEFAULT_M3U;
      const data = await fetchAndParseM3U(activeUrl);
      if (isMounted) {
        setChannels(data);
        setLoading(false);
      }
    };
    loadChannels();
    return () => { isMounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <Loader2 className="animate-spin text-red-600" size={64} />
      </div>
    );
  }

  const favoriteChannels = channels.filter(c => favorites.includes(c.id));

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col pt-12 px-12 pb-20">
      <div className="mb-8 flex items-center space-x-3">
        <Heart className="text-red-500" size={36} fill="currentColor" />
        <h1 className="text-4xl font-bold text-white">Your Favorites</h1>
      </div>

      {favoriteChannels.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
          <Heart size={64} className="mb-4 opacity-20" />
          <p className="text-xl">You haven't favorited any channels yet.</p>
          <p className="text-sm mt-2">Browse the channel list and click the heart icon to add them here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {favoriteChannels.map(channel => (
            <ChannelCard key={channel.id} channel={channel} />
          ))}
        </div>
      )}
    </div>
  );
}
