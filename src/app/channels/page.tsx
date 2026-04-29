'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useSpatialNavigation } from '@/lib/spatialFocus';
import { ChannelCard } from '@/components/ui/ChannelRow';
import { Loader2, Tv } from 'lucide-react';
import { ChannelData as Channel } from '@/lib/iptvApi';

const LIMIT = 40;

export default function AllChannelsPage() {
  useSpatialNavigation();

  const [categories, setCategories] = useState<any[]>([]);
  const [countries, setCountries]   = useState<any[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedCountry,  setSelectedCountry]  = useState('All');

  const [channels, setChannels]         = useState<Channel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [hasMore, setHasMore]           = useState(true);

  // Stable refs so the IntersectionObserver never gets stale values
  const pageRef              = useRef(1);
  const loadingRef           = useRef(false);
  const hasMoreRef           = useRef(true);
  const selectedCategoryRef  = useRef('All');
  const selectedCountryRef   = useRef('All');
  const observerTarget       = useRef<HTMLDivElement>(null);

  // ─── fetch helpers ────────────────────────────────────────────────────────
  async function doFetch(pageNum: number, append: boolean) {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoadingChannels(true);

    try {
      const params = new URLSearchParams();
      if (selectedCategoryRef.current !== 'All') params.append('category', selectedCategoryRef.current);
      if (selectedCountryRef.current  !== 'All') params.append('country',  selectedCountryRef.current);
      params.append('page',  pageNum.toString());
      params.append('limit', LIMIT.toString());

      const res = await fetch(`/api/channels?${params.toString()}`);
      if (!res.ok) return;

      const data = await res.json();
      const fetched: Channel[] = data.data || [];

      setChannels(prev => append ? [...prev, ...fetched] : fetched);

      const more = fetched.length === LIMIT;
      hasMoreRef.current = more;
      setHasMore(more);
    } catch (err) {
      console.error('Channel fetch failed', err);
    } finally {
      loadingRef.current = false;
      setLoadingChannels(false);
    }
  }

  // ─── metadata ─────────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([fetch('/api/categories'), fetch('/api/countries')])
      .then(async ([catRes, countryRes]) => {
        if (catRes.ok)     setCategories(await catRes.json());
        if (countryRes.ok) setCountries(await countryRes.json());
      })
      .catch(err => console.error('Metadata fetch failed', err))
      .finally(() => setLoadingMeta(false));
  }, []);

  // ─── reset + fetch when filter changes ────────────────────────────────────
  useEffect(() => {
    selectedCategoryRef.current = selectedCategory;
    selectedCountryRef.current  = selectedCountry;
    pageRef.current = 1;
    hasMoreRef.current = true;
    doFetch(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, selectedCountry]);

  // ─── infinite scroll ──────────────────────────────────────────────────────
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMoreRef.current && !loadingRef.current) {
        const next = pageRef.current + 1;
        pageRef.current = next;
        doFetch(next, true);
      }
    }, { threshold: 0.1 });

    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
    // We intentionally run this once — refs keep everything fresh
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── loading skeleton ─────────────────────────────────────────────────────
  if (loadingMeta) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <Loader2 className="animate-spin text-red-600" size={64} />
      </div>
    );
  }

  // ─── pill helpers ─────────────────────────────────────────────────────────
  const pillBase =
    'shrink-0 px-5 py-2.5 rounded-full text-sm font-semibold border transition-all duration-200 ' +
    'focus:outline-none focus:ring-4 focus:ring-red-600/50 cursor-pointer whitespace-nowrap';
  const pillActive   = 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-600/20';
  const pillInactive = 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white';

  // ─── render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col bg-zinc-950 overflow-hidden">

      {/* ── Sticky header ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 pt-8 pb-4 space-y-4">
        {/* Title */}
        <div className="px-10 flex items-center space-x-3">
          <Tv className="text-red-500" size={28} />
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Browse Channels</h1>
            <p className="text-zinc-500 text-sm mt-0.5">
              {channels.length > 0 ? `${channels.length}${hasMore ? '+' : ''} channels loaded` : 'Loading…'}
            </p>
          </div>
        </div>

        {/* ── Row 1: Categories ──────────────────────────────────────── */}
        <div>
          <p className="px-10 text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2">Category</p>
          <div
            className="flex space-x-3 overflow-x-auto px-10 pb-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {/* "All" pill */}
            <button
              tabIndex={0}
              onClick={() => setSelectedCategory('All')}
              className={`${pillBase} ${selectedCategory === 'All' ? pillActive : pillInactive}`}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                tabIndex={0}
                onClick={() => setSelectedCategory(cat.id)}
                className={`${pillBase} ${selectedCategory === cat.id ? pillActive : pillInactive}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* ── Row 2: Countries ───────────────────────────────────────── */}
        <div>
          <p className="px-10 text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2">Region</p>
          <div
            className="flex space-x-3 overflow-x-auto px-10 pb-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <button
              tabIndex={0}
              onClick={() => setSelectedCountry('All')}
              className={`${pillBase} ${selectedCountry === 'All' ? pillActive : pillInactive}`}
            >
              All
            </button>
            {countries.map(c => (
              <button
                key={c.code}
                tabIndex={0}
                onClick={() => setSelectedCountry(c.code)}
                className={`${pillBase} ${selectedCountry === c.code ? pillActive : pillInactive}`}
              >
                {c.flag && <span className="mr-1.5">{c.flag}</span>}{c.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Channel grid ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-8 pt-8 pb-36">
        {channels.length === 0 && !loadingChannels ? (
          <div className="flex flex-col items-center justify-center py-32 text-zinc-500">
            <Tv size={64} className="mb-4 opacity-20" />
            <p className="text-2xl font-semibold">No channels found</p>
            <p className="text-zinc-600 mt-2">Try a different category or region.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-5">
            {channels.map((channel, i) => (
              <ChannelCard key={`${channel.id}-${i}`} channel={channel} />
            ))}
          </div>
        )}

        {/* Infinite scroll sentinel */}
        <div ref={observerTarget} className="w-full py-10 flex justify-center">
          {loadingChannels && (
            <div className="flex items-center space-x-3 text-zinc-500">
              <Loader2 className="animate-spin text-red-600" size={28} />
              <span className="text-sm">Loading more channels…</span>
            </div>
          )}
          {!hasMore && channels.length > 0 && !loadingChannels && (
            <p className="text-zinc-600 text-sm">— end of results —</p>
          )}
        </div>
      </div>
    </div>
  );
}
