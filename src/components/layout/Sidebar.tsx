'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Grid, Heart, Search, Menu, Tv2, ListVideo } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);

  const links = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/channels', icon: ListVideo, label: 'All Channels' },
    { href: '/multiview', icon: Grid, label: 'Multi-View' },
    { href: '/favorites', icon: Heart, label: 'Favorites' },
    { href: '/search', icon: Search, label: 'Search' },
  ];

  return (
    <aside 
      className={`fixed top-0 left-0 h-screen z-40 bg-black/90 backdrop-blur-md border-r border-zinc-800 transition-all duration-300 flex flex-col items-center py-6 ${isExpanded ? 'w-64 items-start px-6' : 'w-20'}`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className={`flex items-center w-full mb-12 ${isExpanded ? 'justify-start' : 'justify-center'}`}>
        <Tv2 className="text-red-600 shrink-0" size={32} />
        {isExpanded && <span className="ml-3 text-xl font-bold text-white tracking-wider uppercase">HTV Pro</span>}
      </div>

      <nav className="flex flex-col space-y-6 w-full">
        {links.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link 
              key={link.href} 
              href={link.href}
              tabIndex={0}
              className={`flex items-center w-full focus:outline-none focus:ring-4 focus:ring-red-600 rounded-lg p-3 transition-colors ${isActive ? 'text-white bg-red-600/20' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
            >
              <Icon size={24} className={`shrink-0 ${isActive ? 'text-red-500' : ''}`} />
              {isExpanded && <span className={`ml-4 font-medium ${isActive ? 'text-white' : ''}`}>{link.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
