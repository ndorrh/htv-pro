export interface StreamSource {
  url: string;
  resolution: string; // Extracted resolution or 'Auto'
}

export interface Channel {
  id: string;
  name: string;
  logo: string;
  group: string;
  country: string;
  sources: StreamSource[];
}

export const DEFAULT_SOURCES = [
  "https://iptv-org.github.io/iptv/categories/sports.m3u",
  "https://iptv-org.github.io/iptv/categories/movies.m3u",
  "https://iptv-org.github.io/iptv/categories/entertainment.m3u",
  "https://iptv-org.github.io/iptv/categories/news.m3u",
  "https://iptv-org.github.io/iptv/categories/kids.m3u",
  "https://iptv-org.github.io/iptv/countries/ng.m3u",
  "https://iptv-org.github.io/iptv/regions/afr.m3u",
  "https://iptv-org.github.io/iptv/countries/us.m3u",
  "https://iptv-org.github.io/iptv/countries/uk.m3u",
];

export async function fetchAllSources(urls: string[] = DEFAULT_SOURCES): Promise<Channel[]> {
  const results = await Promise.allSettled(urls.map(url => fetchAndParseM3U(url)));
  
  const allChannelsMap = new Map<string, Channel>();

  for (const result of results) {
    if (result.status === 'fulfilled') {
      for (const channel of result.value) {
        // Use the same normalization logic to group sources from different lists
        const groupKey = channel.name || "Unknown";
        
        if (allChannelsMap.has(groupKey)) {
          const existingChannel = allChannelsMap.get(groupKey)!;
          // Merge sources
          for (const source of channel.sources) {
            if (!existingChannel.sources.some(s => s.url === source.url)) {
              existingChannel.sources.push(source);
            }
          }
          // Merge metadata
          if (!existingChannel.logo && channel.logo) existingChannel.logo = channel.logo;
          if (channel.group && existingChannel.group === "Uncategorized" && channel.group !== "Uncategorized") existingChannel.group = channel.group;
          if (channel.country && existingChannel.country === "Global" && channel.country !== "Global") existingChannel.country = channel.country;
        } else {
          allChannelsMap.set(groupKey, channel);
        }
      }
    }
  }

  return Array.from(allChannelsMap.values());
}

export async function fetchAndParseM3U(url: string): Promise<Channel[]> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch M3U from ${url}: ${response.statusText}`);
    }
    const text = await response.text();
    return parseM3UString(text);
  } catch (error) {
    console.error(`M3U Fetch Error (${url}):`, error);
    return [];
  }
}

export function parseM3UString(m3uString: string): Channel[] {
  const lines = m3uString.split(/\r?\n/);
  const channelsMap = new Map<string, Channel>();

  let currentChannelMetadata: Partial<Channel> | null = null;
  let currentResolution = "Auto";

  // Regex for extracting resolution tags from channel names, e.g. "Channel Name (1080p)" or "Channel Name 720p"
  const resolutionRegex = /(1080p|720p|480p|360p|4k|HD|SD|FHD)/i;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    if (trimmedLine.startsWith("#EXTINF:")) {
      // Parse metadata
      const idMatch = trimmedLine.match(/tvg-id="([^"]*)"/);
      const logoMatch = trimmedLine.match(/tvg-logo="([^"]*)"/);
      const groupMatch = trimmedLine.match(/group-title="([^"]*)"/);
      const countryMatch = trimmedLine.match(/tvg-country="([^"]*)"/);
      
      // The channel name is usually everything after the last comma
      const commaIndex = trimmedLine.lastIndexOf(",");
      let name = commaIndex !== -1 ? trimmedLine.substring(commaIndex + 1).trim() : "Unknown Channel";
      
      // Try to extract resolution from name
      currentResolution = "Auto";
      const resMatch = name.match(resolutionRegex);
      if (resMatch) {
        currentResolution = resMatch[0].toUpperCase();
        // Clean name by removing the resolution part to group properly
        name = name.replace(resMatch[0], "").replace(/[\(\)\[\]\-]/g, "").trim();
      }

      const id = idMatch && idMatch[1] ? idMatch[1] : name;
      const logo = logoMatch && logoMatch[1] ? logoMatch[1] : "";
      let group = groupMatch && groupMatch[1] ? groupMatch[1] : "Uncategorized";
      let country = countryMatch && countryMatch[1] ? countryMatch[1] : "Global";

      // Clean up wild categories and countries (take first item if semicolon/comma separated)
      group = group.split(/;|,/)[0].trim() || "Uncategorized";
      country = country.split(/;|,/)[0].trim() || "Global";

      if (group.toLowerCase() === "undefined") group = "Uncategorized";
      if (country.toLowerCase() === "undefined") country = "Global";

      currentChannelMetadata = {
        id: id,
        name: name,
        logo: logo,
        group: group,
        country: country,
      };
    } else if (!trimmedLine.startsWith("#") && currentChannelMetadata) {
      // This line should be the stream URL
      const url = trimmedLine;
      const { id, name, logo, group, country } = currentChannelMetadata;
      
      // We group by the normalized name to combine sources
      const groupKey = name || "Unknown";

      if (channelsMap.has(groupKey)) {
        const existingChannel = channelsMap.get(groupKey)!;
        // Avoid duplicate URLs
        if (!existingChannel.sources.some(s => s.url === url)) {
          existingChannel.sources.push({
            url,
            resolution: currentResolution,
          });
        }
        // Take the logo/group/country if the existing one is missing it
        if (!existingChannel.logo && logo) existingChannel.logo = logo;
        if (group && existingChannel.group === "Uncategorized" && group !== "Uncategorized") existingChannel.group = group;
        if (country && existingChannel.country === "Global" && country !== "Global") existingChannel.country = country;
      } else {
        channelsMap.set(groupKey, {
          id: id || groupKey,
          name: groupKey,
          logo: logo || "",
          group: group || "Uncategorized",
          country: country || "Global",
          sources: [
            {
              url,
              resolution: currentResolution,
            }
          ],
        });
      }

      // Reset for next channel
      currentChannelMetadata = null;
      currentResolution = "Auto";
    }
  }

  return Array.from(channelsMap.values());
}
