// Core service for fetching and caching IPTV API data.

export interface ApiChannel {
  id: string;
  name: string;
  alt_names: string[];
  network: string | null;
  owners: string[];
  country: string;
  categories: string[];
  is_nsfw: boolean;
  launched: string | null;
  closed: string | null;
  replaced_by: string | null;
  website: string | null;
}

export interface ApiStream {
  channel: string | null;
  feed: string | null;
  title: string;
  url: string;
  referrer: string | null;
  user_agent: string | null;
  quality: string | null;
  label: string | null;
}

export interface ApiCategory {
  id: string;
  name: string;
  description: string;
}

export interface ApiCountry {
  name: string;
  code: string;
  languages: string[];
  flag: string;
}

export interface ApiLanguage {
  name: string;
  code: string;
}

export interface ApiRegion {
  code: string;
  name: string;
  countries: string[];
}

export interface ApiCity {
  country: string;
  subdivision: string | null;
  name: string;
  code: string;
  wikidata_id: string;
}

export interface ApiSubdivision {
  country: string;
  name: string;
  code: string;
  parent: string | null;
}

export interface ApiTimezone {
  id: string;
  utc_offset: string;
  countries: string[];
}

export interface ApiLogo {
  channel: string;
  feed: string | null;
  in_use: boolean;
  tags: string[];
  width: number;
  height: number;
  format: string | null;
  url: string;
}

export interface ApiBlocklist {
  channel: string;
  reason: string;
  ref: string;
}

export interface ApiGuide {
  channel: string | null;
  feed: string | null;
  site: string;
  site_id: string;
  site_name: string;
  lang: string;
}

export interface ApiFeed {
  channel: string;
  id: string;
  name: string;
  alt_names: string[];
  is_main: boolean;
  broadcast_area: string[];
  timezones: string[];
  languages: string[];
  format: string;
}

// Composite interface for frontend
export interface ChannelData {
  id: string;
  name: string;
  alt_names: string[];
  country: string | null;
  categories: string[];
  logo: string | null;
  streams: ApiStream[];
  is_nsfw: boolean;
}

interface Cache {
  channels: ApiChannel[];
  streams: ApiStream[];
  categories: ApiCategory[];
  countries: ApiCountry[];
  languages: ApiLanguage[];
  regions: ApiRegion[];
  cities: ApiCity[];
  subdivisions: ApiSubdivision[];
  timezones: ApiTimezone[];
  logos: ApiLogo[];
  blocklist: ApiBlocklist[];
  guides: ApiGuide[];
  feeds: ApiFeed[];
  lastFetched: number;
}

const cache: Cache = {
  channels: [],
  streams: [],
  categories: [],
  countries: [],
  languages: [],
  regions: [],
  cities: [],
  subdivisions: [],
  timezones: [],
  logos: [],
  blocklist: [],
  guides: [],
  feeds: [],
  lastFetched: 0,
};

const BASE_URL = 'https://iptv-org.github.io/api';
const ONE_HOUR = 60 * 60 * 1000;

async function fetchJson<T>(endpoint: string): Promise<T[]> {
  try {
    const res = await fetch(`${BASE_URL}/${endpoint}`);
    if (!res.ok) throw new Error(`Failed to fetch ${endpoint}`);
    return await res.json();
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    return [];
  }
}

export async function refreshCache() {
  const now = Date.now();
  if (now - cache.lastFetched < ONE_HOUR && cache.channels.length > 0) {
    return; // Use existing cache
  }

  console.log("Fetching fresh data from iptv-org API...");

  const [
    channels, streams, categories, countries, languages,
    regions, cities, subdivisions, timezones, logos,
    blocklist, guides, feeds
  ] = await Promise.all([
    fetchJson<ApiChannel>('channels.json'),
    fetchJson<ApiStream>('streams.json'),
    fetchJson<ApiCategory>('categories.json'),
    fetchJson<ApiCountry>('countries.json'),
    fetchJson<ApiLanguage>('languages.json'),
    fetchJson<ApiRegion>('regions.json'),
    fetchJson<ApiCity>('cities.json'),
    fetchJson<ApiSubdivision>('subdivisions.json'),
    fetchJson<ApiTimezone>('timezones.json'),
    fetchJson<ApiLogo>('logos.json'),
    fetchJson<ApiBlocklist>('blocklist.json'),
    fetchJson<ApiGuide>('guides.json'),
    fetchJson<ApiFeed>('feeds.json'),
  ]);

  cache.channels = channels;
  cache.streams = streams;
  cache.categories = categories;
  cache.countries = countries;
  cache.languages = languages;
  cache.regions = regions;
  cache.cities = cities;
  cache.subdivisions = subdivisions;
  cache.timezones = timezones;
  cache.logos = logos;
  cache.blocklist = blocklist;
  cache.guides = guides;
  cache.feeds = feeds;
  cache.lastFetched = now;

  console.log(`Cache refreshed. Loaded ${channels.length} channels and ${streams.length} streams.`);
}

export async function getCategories() {
  await refreshCache();
  return cache.categories;
}

export async function getCountries() {
  await refreshCache();
  return cache.countries;
}

export async function getLanguages() {
  await refreshCache();
  return cache.languages;
}

export async function getRegions() {
  await refreshCache();
  return cache.regions;
}

export async function getCities() {
  await refreshCache();
  return cache.cities;
}

export async function getSubdivisions() {
  await refreshCache();
  return cache.subdivisions;
}

export async function getTimezones() {
  await refreshCache();
  return cache.timezones;
}

export async function getGuides() {
  await refreshCache();
  return cache.guides;
}

export async function getBlocklist() {
  await refreshCache();
  return cache.blocklist;
}

export async function getFeeds() {
  await refreshCache();
  return cache.feeds;
}

export async function getChannels(params: {
  category?: string;
  country?: string;
  language?: string;
  region?: string;
  search?: string;
  page?: number;
  limit?: number;
  ids?: string[];
}) {
  await refreshCache();

  let filtered = cache.channels;

  // Filter blocked channels
  const blockedIds = new Set(cache.blocklist.map(b => b.channel));
  filtered = filtered.filter(c => !blockedIds.has(c.id));

  if (params.ids && params.ids.length > 0) {
    const idSet = new Set(params.ids);
    filtered = filtered.filter(c => idSet.has(c.id));
  } else {
    if (params.category) {
      filtered = filtered.filter(c => c.categories.includes(params.category!));
    }

    if (params.country) {
      filtered = filtered.filter(c => c.country === params.country);
    }

    if (params.language) {
      // Channels don't have direct language, but we can filter by matching feeds which have languages
      const feedsWithLanguage = new Set(cache.feeds.filter(f => f.languages.includes(params.language!)).map(f => f.channel));
      filtered = filtered.filter(c => feedsWithLanguage.has(c.id));
    }

    if (params.region) {
      // Find countries in the region, then filter channels by those countries
      const region = cache.regions.find(r => r.code === params.region);
      if (region) {
        filtered = filtered.filter(c => region.countries.includes(c.country));
      }
    }

    if (params.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(q) || 
        c.alt_names.some(alt => alt.toLowerCase().includes(q))
      );
    }
  }

  // Pagination
  const limit = params.limit || 50;
  const page = params.page || 1;
  const total = filtered.length;
  
  const start = (page - 1) * limit;
  const sliced = filtered.slice(start, start + limit);

  // Map to composite objects (joining streams and logos)
  // Optimization: Group streams and logos by channel ID
  const streamsByChannel = new Map<string, ApiStream[]>();
  cache.streams.forEach(s => {
    if (s.channel) {
      if (!streamsByChannel.has(s.channel)) streamsByChannel.set(s.channel, []);
      streamsByChannel.get(s.channel)!.push(s);
    }
  });

  const logosByChannel = new Map<string, string>();
  // Prefer in_use logos
  cache.logos.forEach(l => {
    if (!logosByChannel.has(l.channel) || l.in_use) {
      logosByChannel.set(l.channel, l.url);
    }
  });

  const mapped: ChannelData[] = sliced.map(c => ({
    id: c.id,
    name: c.name,
    alt_names: c.alt_names,
    country: c.country,
    categories: c.categories,
    is_nsfw: c.is_nsfw,
    logo: logosByChannel.get(c.id) || null,
    streams: streamsByChannel.get(c.id) || [],
  })).filter(c => c.streams.length > 0); // Only return channels with at least one stream

  return {
    data: mapped,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
}

export async function getChannelById(id: string): Promise<ChannelData | null> {
  const result = await getChannels({ ids: [id] });
  return result.data.length > 0 ? result.data[0] : null;
}
