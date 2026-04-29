import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'HTV Pro - Elite IPTV',
    short_name: 'HTV Pro',
    description: 'An elite IPTV web application optimized for Smart TVs and modern browsers.',
    start_url: '/',
    display: 'standalone',
    background_color: '#09090b', // zinc-950
    theme_color: '#dc2626', // red-600
  }
}
