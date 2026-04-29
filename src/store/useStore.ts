import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Channel } from '@/lib/m3uParser';

interface StoreState {
  favorites: string[];
  history: Channel[];
  currentChannel: Channel | null;
  multiViewChannels: (Channel | null)[]; // Fixed length 4 array
  focusedPlayerIndex: number;
  
  // Actions
  addFavorite: (id: string) => void;
  removeFavorite: (id: string) => void;
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  
  addToHistory: (channel: Channel) => void;
  setCurrentChannel: (channel: Channel | null) => void;
  
  setMultiViewChannel: (index: number, channel: Channel | null) => void;
  setFocusedPlayerIndex: (index: number) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      favorites: [],
      history: [],
      currentChannel: null,
      multiViewChannels: [null, null, null, null],
      focusedPlayerIndex: 0,

      addFavorite: (id) => set((state) => ({ favorites: [...new Set([...state.favorites, id])] })),
      removeFavorite: (id) => set((state) => ({ favorites: state.favorites.filter((fId) => fId !== id) })),
      toggleFavorite: (id) => {
        const isFav = get().favorites.includes(id);
        if (isFav) {
          get().removeFavorite(id);
        } else {
          get().addFavorite(id);
        }
      },
      isFavorite: (id) => get().favorites.includes(id),

      addToHistory: (channel) => set((state) => {
        // Remove if it already exists to move it to the front
        const filteredHistory = state.history.filter(c => c.id !== channel.id);
        const newHistory = [channel, ...filteredHistory].slice(0, 50); // Keep last 50
        return { history: newHistory };
      }),

      setCurrentChannel: (channel) => set({ currentChannel: channel }),

      setMultiViewChannel: (index, channel) => set((state) => {
        const newMultiView = [...state.multiViewChannels];
        newMultiView[index] = channel;
        return { multiViewChannels: newMultiView };
      }),

      setFocusedPlayerIndex: (index) => set({ focusedPlayerIndex: index }),
    }),
    {
      name: 'htv-pro-storage',
      // Only persist these specific fields
      partialize: (state) => ({ 
        favorites: state.favorites, 
        history: state.history,
        currentChannel: state.currentChannel
      }),
    }
  )
);
