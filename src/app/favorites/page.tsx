'use client';

import React, { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { useSpatialNavigation } from '@/lib/spatialFocus';
import { ChannelCard } from '@/components/ui/ChannelRow';
import { Loader2, Heart } from 'lucide-react';
import { ChannelData as Channel } from '@/lib/iptvApi';

export default function FavoritesPage() {
  useSpatialNavigation();
  const { favorites } = useStore();
  const [favoriteChannels, setFavoriteChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchFavorites() {
      if (favorites.length === 0) {
        setFavoriteChannels([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/channels?ids=${favorites.join(',')}&limit=${favorites.length}`);
        if (res.ok) {
          const data = await res.json();
          setFavoriteChannels(data.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch favorite channels", err);
      } finally {
        setLoading(false);
      }
    }
    fetchFavorites();
  }, [favorites]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <Loader2 className="animate-spin text-red-600" size={64} />
      </div>
    );
  }

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
