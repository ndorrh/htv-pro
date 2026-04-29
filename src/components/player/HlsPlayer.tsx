'use client';

import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, PictureInPicture, Loader2, ListVideo } from 'lucide-react';
import { useStore } from '@/store/useStore';

interface HlsPlayerProps {
  src: string;
  autoPlay?: boolean;
  muted?: boolean;
  onStreamError?: () => void;
  onChangeChannel?: () => void;
  className?: string;
  isMini?: boolean;
}

export default function HlsPlayer({ src, autoPlay = true, muted = false, onStreamError, onChangeChannel, className = "", isMini = false }: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(muted);
  const [isBuffering, setIsBuffering] = useState(true);
  const [levels, setLevels] = useState<any[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1); // -1 is auto
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  const [audioTracks, setAudioTracks] = useState<any[]>([]);
  const [currentAudio, setCurrentAudio] = useState<number>(-1);
  const [subtitleTracks, setSubtitleTracks] = useState<any[]>([]);
  const [currentSubtitle, setCurrentSubtitle] = useState<number>(-1);

  // Network / buffer stats
  const [bandwidth, setBandwidth] = useState<number>(0);   // bits per second
  const [bufferAhead, setBufferAhead] = useState<number>(0); // seconds buffered ahead
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  // Controls are always visible in full-screen mode.
  // In mini mode they are always shown too (they're minimal).
  // No auto-hide — this is a TV app, hover is unreliable.

  // Sync muted prop with state and video element
  useEffect(() => {
    setIsMuted(muted);
    if (videoRef.current) {
      videoRef.current.muted = muted;
    }
  }, [muted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    if (Hls.isSupported()) {
      let retryCount = 0;
      const hls = new Hls({
        autoStartLoad: true,
        startLevel: -1, // Auto
      });
      hlsRef.current = hls;

      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        setLevels(data.levels);
        setAudioTracks(hls.audioTracks || []);
        setSubtitleTracks(hls.subtitleTracks || []);
        if (autoPlay) {
          const p = video.play();
          if (p !== undefined) {
            p.catch(e => { if (e.name !== 'AbortError') console.error("Playback failed", e); });
          }
        }
      });

      // ── Speed meter: poll HLS.js bandwidth estimate after each fragment ──
      hls.on(Hls.Events.FRAG_LOADED, () => {
        setBandwidth(hls.bandwidthEstimate || 0); // bits per second, maintained by ABR controller
      });

      // ── Buffer health: update when the video timeline advances ─────────
      const updateBuffer = () => {
        if (!videoRef.current) return;
        const v = videoRef.current;
        setCurrentTime(v.currentTime);
        setDuration(v.duration);
        if (v.buffered.length > 0) {
          const ahead = v.buffered.end(v.buffered.length - 1) - v.currentTime;
          setBufferAhead(Math.max(0, ahead));
        }
      };
      video.addEventListener('timeupdate', updateBuffer);
      video.addEventListener('progress',   updateBuffer);
      video.addEventListener('waiting',    () => setBufferAhead(0));

      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (event, data) => {
        setAudioTracks(data.audioTracks);
      });
      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (event, data) => {
        setSubtitleTracks(data.subtitleTracks);
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (retryCount < 2) {
                retryCount++;
                hls.startLoad();
              } else {
                hls.destroy();
                if (onStreamError) onStreamError();
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              // Cannot recover
              hls.destroy();
              if (onStreamError) onStreamError();
              break;
          }
        }
      });

      return () => {
        hls.destroy();
        video.removeEventListener('timeupdate', updateBuffer);
        video.removeEventListener('progress',   updateBuffer);
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
        if (autoPlay) {
          const p = video.play();
          if (p !== undefined) {
            p.catch(e => { if (e.name !== 'AbortError') console.error("Playback failed", e); });
          }
        }
      });
    }
  }, [src, autoPlay, onStreamError]);

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
      } else {
        document.exitFullscreen();
      }
    }
  };

  const togglePiP = async () => {
    if (videoRef.current) {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await videoRef.current.requestPictureInPicture();
        }
      } catch (error) {
        console.error("PiP failed", error);
      }
    }
  };

  const handleLevelChange = (index: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = index;
      setCurrentLevel(index);
    }
  };

  const handleAudioChange = (index: number) => {
    if (hlsRef.current) {
      hlsRef.current.audioTrack = index;
      setCurrentAudio(index);
    }
  };

  const handleSubtitleChange = (index: number) => {
    if (hlsRef.current) {
      hlsRef.current.subtitleTrack = index;
      setCurrentSubtitle(index);
    }
  };

  return (
    <div 
      ref={containerRef} 
      className={`relative bg-black overflow-hidden flex items-center justify-center ${className}`}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain cursor-pointer"
        autoPlay={autoPlay}
        muted={isMuted}
        onClick={(e) => { e.stopPropagation(); togglePlay(); setShowControls(true); }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onCanPlay={() => setIsBuffering(false)}
        playsInline
      />

      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
          <Loader2 className="animate-spin text-red-600" size={48} />
        </div>
      )}

      {/* Controls Overlay — always visible in full-screen; minimal in mini */}
      <div 
        className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex flex-col justify-end z-10 transition-opacity duration-200 ${
          isMini ? 'opacity-0 hover:opacity-100' : 'opacity-100'
        }`}
      >
        {/* ── Buffer progress bar (live buffer fill, 0–10s range) ──────── */}
        <div className="w-full mb-3 flex items-center space-x-3">
          <div className="flex-1">
            <div className="relative w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              {/* Buffered range */}
              <div
                className="absolute left-0 top-0 h-full bg-red-500/60 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (bufferAhead / 10) * 100)}%` }}
              />
              {/* Playhead dot */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-red-500 rounded-full shadow-md shadow-red-500/50 -ml-1.25" />
            </div>
          </div>
          {!isMini && (
            <div className="text-[10px] font-mono text-zinc-400 whitespace-nowrap">
              {formatTime(currentTime)}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-3">
            <button 
              tabIndex={0} 
              onClick={togglePlay} 
              className="text-white hover:text-red-500 focus:outline-none focus:ring-4 focus:ring-red-600 rounded-full p-2"
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>
            {!isMini && (
              <button 
                tabIndex={0} 
                onClick={toggleMute} 
                className="text-white hover:text-red-500 focus:outline-none focus:ring-4 focus:ring-red-600 rounded-full p-2"
              >
                {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
              </button>
            )}
            
            {/* LIVE badge */}
            <div className="flex items-center space-x-2 bg-red-600/20 px-2 py-1 rounded border border-red-600/50">
              <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></div>
              <span className="text-red-500 text-xs font-bold tracking-widest uppercase">Live</span>
            </div>

            {/* Speed + buffer info */}
            {bandwidth > 0 && (
              <div className={`flex items-center space-x-2 text-xs font-mono ${isMini ? 'scale-75 origin-left' : ''}`}>
                <span className={`px-2 py-0.5 rounded font-semibold ${
                  bandwidth >= 2_000_000 ? 'text-green-400 bg-green-400/10' :
                  bandwidth >= 500_000   ? 'text-yellow-400 bg-yellow-400/10' :
                                           'text-red-400 bg-red-400/10'
                }`}>
                  ↓ {bandwidth >= 1_000_000
                    ? `${(bandwidth / 1_000_000).toFixed(1)} Mbps`
                    : `${Math.round(bandwidth / 1_000)} kbps`}
                </span>
                {!isMini && bufferAhead > 0 && (
                  <span className="text-zinc-400 bg-white/5 px-2 py-0.5 rounded">
                    {bufferAhead.toFixed(1)}s buffered
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {!isMini && (
              <div className="relative">
                <button 
                  tabIndex={0} 
                  onClick={() => setShowSettings(!showSettings)} 
                  className="text-white hover:text-red-500 focus:outline-none focus:ring-4 focus:ring-red-600 rounded-full p-2"
                >
                  <Settings size={24} />
                </button>
                {showSettings && (
                  <div className="absolute bottom-12 right-0 bg-zinc-900 border border-zinc-700 rounded-lg p-3 min-w-[200px] z-20 max-h-[60vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                    
                    {/* QUALITY SETTINGS */}
                    <div className="text-xs text-zinc-400 mb-2 uppercase tracking-wider font-bold">Quality</div>
                    <button 
                      className={`block w-full text-left px-2 py-1 text-sm rounded mb-1 focus:outline-none ${currentLevel === -1 ? 'bg-red-600 text-white' : 'text-zinc-200 hover:bg-zinc-800'}`}
                      onClick={() => handleLevelChange(-1)}
                    >
                      Auto
                    </button>
                    {levels.map((level, i) => (
                      <button 
                        key={`q-${i}`}
                        className={`block w-full text-left px-2 py-1 text-sm rounded mb-1 focus:outline-none ${currentLevel === i ? 'bg-red-600 text-white' : 'text-zinc-200 hover:bg-zinc-800'}`}
                        onClick={() => handleLevelChange(i)}
                      >
                        {level.height}p
                      </button>
                    ))}

                    {/* AUDIO TRACKS */}
                    {audioTracks.length > 1 && (
                      <>
                        <div className="text-xs text-zinc-400 mb-2 mt-4 uppercase tracking-wider font-bold">Audio Track</div>
                        {audioTracks.map((track, i) => (
                          <button 
                            key={`a-${i}`}
                            className={`block w-full text-left px-2 py-1 text-sm rounded mb-1 focus:outline-none ${currentAudio === i ? 'bg-red-600 text-white' : 'text-zinc-200 hover:bg-zinc-800'}`}
                            onClick={() => handleAudioChange(i)}
                          >
                            {track.name || `Track ${i + 1}`} {track.lang && `(${track.lang})`}
                          </button>
                        ))}
                      </>
                    )}

                    {/* SUBTITLE TRACKS */}
                    {subtitleTracks.length > 0 && (
                      <>
                        <div className="text-xs text-zinc-400 mb-2 mt-4 uppercase tracking-wider font-bold">Subtitles</div>
                        <button 
                          className={`block w-full text-left px-2 py-1 text-sm rounded mb-1 focus:outline-none ${currentSubtitle === -1 ? 'bg-red-600 text-white' : 'text-zinc-200 hover:bg-zinc-800'}`}
                          onClick={() => handleSubtitleChange(-1)}
                        >
                          Off
                        </button>
                        {subtitleTracks.map((track, i) => (
                          <button 
                            key={`s-${i}`}
                            className={`block w-full text-left px-2 py-1 text-sm rounded mb-1 focus:outline-none ${currentSubtitle === i ? 'bg-red-600 text-white' : 'text-zinc-200 hover:bg-zinc-800'}`}
                            onClick={() => handleSubtitleChange(i)}
                          >
                            {track.name || `Subtitle ${i + 1}`} {track.lang && `(${track.lang})`}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {onChangeChannel && (
              <button 
                tabIndex={0} 
                onClick={(e) => { e.stopPropagation(); onChangeChannel(); }} 
                className="text-white hover:text-red-500 focus:outline-none focus:ring-4 focus:ring-red-600 rounded-full p-2"
                title="Change Channel"
              >
                <ListVideo size={24} />
              </button>
            )}

            <button 
              tabIndex={0} 
              onClick={togglePiP} 
              className="text-white hover:text-red-500 focus:outline-none focus:ring-4 focus:ring-red-600 rounded-full p-2"
            >
              <PictureInPicture size={24} />
            </button>
            
            {!isMini && (
              <button 
                tabIndex={0} 
                onClick={toggleFullscreen} 
                className="text-white hover:text-red-500 focus:outline-none focus:ring-4 focus:ring-red-600 rounded-full p-2"
              >
                <Maximize size={24} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
