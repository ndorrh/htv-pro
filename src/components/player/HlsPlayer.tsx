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

  // Auto-hide controls — only when playing. Any mouse/key activity resets the timer.
  const controlsTimer = useRef<NodeJS.Timeout | null>(null);

  const revealControls = () => {
    setShowControls(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    // Only auto-hide while playing and settings panel is closed
    if (!showSettings) {
      controlsTimer.current = setTimeout(() => setShowControls(false), 4000);
    }
  };

  // Show controls when playback state changes:
  // - Paused → always visible, cancel any pending hide timer
  // - Started playing → briefly show, then auto-hide after 4s
  useEffect(() => {
    if (!isPlaying) {
      // Paused: keep controls visible indefinitely
      setShowControls(true);
      if (controlsTimer.current) clearTimeout(controlsTimer.current);
    } else {
      // Playback started: show controls and begin the hide countdown
      setShowControls(true);
      if (controlsTimer.current) clearTimeout(controlsTimer.current);
      if (!showSettings) {
        controlsTimer.current = setTimeout(() => setShowControls(false), 4000);
      }
    }
    return () => { if (controlsTimer.current) clearTimeout(controlsTimer.current); };
  }, [isPlaying, showSettings]);

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
      className={`relative group bg-black overflow-hidden flex items-center justify-center ${className}`}
      onMouseMove={revealControls}
      onKeyDown={revealControls}
      onClick={() => { revealControls(); }}
      tabIndex={-1}
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

      {/* Controls Overlay — always visible when paused, auto-hides while playing */}
      <div 
        className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-opacity duration-300 ${
          (!isMini && showControls) || isMini ? 'opacity-100' : 'opacity-0 pointer-events-none'
        } flex flex-col justify-end z-10`}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-4">
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
            
            <div className="flex items-center space-x-2 bg-red-600/20 px-2 py-1 rounded border border-red-600/50">
              <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></div>
              <span className="text-red-500 text-xs font-bold tracking-widest uppercase">Live</span>
            </div>
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
