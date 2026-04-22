"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';

// --- Stylized Pixel Icons (Simple SVG Wrappers) ---
const PixelHeart = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square">
    <path d="M12 21l-1-1-7-7c-2-2-2-5 0-7 2-2 5-2 7 0l1 1 1-1c2-2 5-2 7 0 2 2 2 5 0 7l-7 7-1 1z" />
  </svg>
);

const PixelMusic = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square">
    <path d="M9 18V5l12-2v13" />
    <path d="M6 15h3v3H6v-3z" />
    <path d="M18 13h3v3h-3v-3z" />
  </svg>
);

const PixelWeather = ({ desc = "", size = 24, className = "" }) => {
  const isRain = desc.toLowerCase().includes('rain') || desc.toLowerCase().includes('drizzle');
  if (isRain) {
    return (
      <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square">
        <path d="M12 2v2M5 7l1 1M19 7l-1 1M16 14v6M8 14v6M12 16v6" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square">
      <rect x="8" y="8" width="8" height="8" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  );
};

const PixelBrain = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square">
    <path d="M4 11h16v8H4zM8 7h8v4H8z" />
    <rect x="10" y="13" width="4" height="4" />
  </svg>
);

const PixelPlay = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 6v12h2v-2h2v-2h2v-4h-2V8h-2V6H8z" />
  </svg>
);

const PixelPause = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 6h4v12H6V6zm8 0h4v12h-4V6z" />
  </svg>
);

const PixelSkip = ({ size = 20, className = "", reverse = false }) => (
  <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="currentColor" style={{ transform: reverse ? 'rotate(180deg)' : 'none' }}>
    <path d="M6 6v12h2v-2h2v-2h2v-4h-2V8H8V6H6zm10 0v12h2V6h-2z" />
  </svg>
);

const PixelWifi = ({ connected = false, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {connected ? (
      <>
        <path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" />
      </>
    ) : (
      <>
        <line x1="2" y1="2" x2="22" y2="22" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" /><path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" />
      </>
    )}
  </svg>
);

// --- Animation Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 }
  }
};

export default function MuonHub() {
  const [isConnected, setIsConnected] = useState(false);
  const [mood, setMood] = useState('idle');
  const [weather, setWeather] = useState({ temp: '--', desc: 'Syncing...', rainWarning: false });
  const [track, setTrack] = useState('Lofi Beats for Robo-Friends');
  const [chat, setChat] = useState<{role: 'user' | 'bot', text: string}[]>([
    { role: 'bot', text: 'HELLO! I AM MUON, YOUR DESK BOT CREATED BY ABRAR. I CAN SYNC SPOTIFY, SHOW WEATHER, AND VIBE WITH YOU!' }
  ]);
  const [inputText, setInputText] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  useEffect(() => {
    const connectWs = () => {
      try {
        const ws = new WebSocket('ws://127.0.0.1:3000');
        wsRef.current = ws;

        ws.onopen = () => setIsConnected(true);
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'BOT_STATUS') setIsConnected(data.connected);
          if (data.type === 'MOOD_UPDATE') setMood(data.mood);
          if (data.type === 'WEATHER_UPDATE') setWeather({ temp: data.temp, desc: data.desc, rainWarning: data.rainWarning });
          if (data.type === 'SPOTIFY_UPDATE') setTrack(data.track);
          if (data.type === 'CHAT_RESPONSE') {
            setChat(prev => [...prev, { role: 'bot', text: data.text.toUpperCase() }]);
            setMood('talking');
            setTimeout(() => setMood('idle'), 3000);
          }
        };
        ws.onclose = () => {
          setIsConnected(false);
          setTimeout(connectWs, 3000);
        };
      } catch (error) {
        console.error("WebSocket failed:", error);
      }
    };
    connectWs();
    return () => wsRef.current?.close();
  }, []);

  const sendPat = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'TOUCH_EVENT', action: 'patted' }));
    }
  };

  const spotifyControl = (action: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'SPOTIFY_CONTROL', action }));
    }
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !wsRef.current) return;
    setChat(prev => [...prev, { role: 'user', text: inputText.toUpperCase() }]);
    wsRef.current.send(JSON.stringify({ type: 'CHAT_REQUEST', text: inputText }));
    setInputText('');
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black text-slate-100 font-sans">
      {/* 8-bit Background GIF */}
      <div 
        className="fixed inset-0 z-0 opacity-40 pointer-events-none"
        style={{ 
          backgroundImage: 'url("/bg-pixel.gif")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          imageRendering: 'pixelated'
        }}
      />
      
      {/* Scanline/Grid Overlay Effect */}
      <div className="fixed inset-0 z-1 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0)_0%,rgba(0,0,0,0.5)_100%)] opacity-50" />
      <div className="fixed inset-0 z-1 pointer-events-none opacity-[0.03]" 
           style={{ backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))', backgroundSize: '100% 2px, 3px 100%' }} />

      <main className="relative z-10 max-w-[70rem] mx-auto p-4 md:p-6 lg:p-8 min-h-screen flex flex-col">
        
        {/* Header Ribbon */}
        <motion.header 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
          <div>
            <h1 className="text-3xl font-pixel text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]">Muon Hub</h1>
            <p className="text-slate-400 text-[10px] mt-2 tracking-widest font-pixel">SYSTEM_VERSION: 1.0.4</p>
          </div>
          
          <div className={`flex items-center gap-3 px-5 py-2.5 rounded-none border-2 backdrop-blur-xl ${isConnected ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-red-500/10 border-red-500/50 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]'}`}>
            <PixelWifi connected={isConnected} size={20} />
            <span className="text-xs font-pixel">{isConnected ? 'ONLINE' : 'LINK_ERROR'}</span>
          </div>
        </motion.header>

        {/* Bento Grid */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-4 flex-1"
        >
          
          {/* Muon Hero Card */}
          <motion.div 
            variants={itemVariants}
            whileHover={{ scale: 1.01, borderColor: 'rgba(250,204,21,0.4)' }}
            className="md:col-span-2 md:row-span-1 bg-slate-900/60 backdrop-blur-xl border-2 border-slate-800 p-6 flex flex-col justify-between shadow-2xl relative group overflow-hidden"
          >
            <div className="absolute -right-10 -top-10 opacity-5 group-hover:opacity-10 transition-opacity">
              <PixelHeart size={180} />
            </div>
            
            <div>
              <div className="flex items-center gap-4 mb-6">
                <div className="p-2 bg-yellow-400 text-black shadow-[4px_4px_0px_#854d0e]">
                  <PixelHeart size={20} className={mood === 'happy' ? 'animate-bounce' : ''} />
                </div>
                <h2 className="text-lg font-pixel text-slate-100">CORE_VITALS</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/40 p-4 border border-slate-800">
                  <p className="text-[10px] text-slate-500 font-pixel mb-1">CURRENT_MOOD</p>
                  <p className="text-lg font-pixel text-yellow-400 capitalize truncate">
                    {mood}
                  </p>
                </div>
                <div className="bg-black/40 p-4 border border-slate-800">
                  <p className="text-[10px] text-slate-500 font-pixel mb-1">HEARTBEAT</p>
                  <div className="flex items-center gap-1">
                     {[1,2,3,4,5].map(i => (
                       <div key={i} className={`w-1.5 h-4 bg-emerald-500 ${mood === 'vibing' ? 'animate-pulse' : ''}`} style={{ animationDelay: `${i*100}ms` }} />
                     ))}
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={sendPat}
              className="mt-6 w-full py-3 bg-yellow-400 hover:bg-yellow-300 text-black font-pixel shadow-[4px_4px_0px_#854d0e] active:translate-y-1 active:shadow-none transition-all flex justify-center items-center gap-3 text-sm"
            >
              [ PET MUON ]
            </button>
          </motion.div>

          {/* AI Chat Card */}
          <motion.div 
            variants={itemVariants}
            whileHover={{ scale: 1.01 }}
            className="md:col-span-2 md:row-span-2 bg-slate-900/60 backdrop-blur-xl border-2 border-slate-800 p-5 shadow-2xl flex flex-col"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-500 text-white shadow-[4px_4px_0px_#3730a3]">
                <PixelBrain size={20} />
              </div>
              <h2 className="text-lg font-pixel text-slate-100">CHAT_WITH_MUON</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto mb-4 space-y-3 pr-2 overflow-x-hidden">
               <AnimatePresence>
                {chat.map((msg, i) => (
                  <motion.div 
                    initial={{ x: msg.role === 'user' ? 20 : -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    key={i} 
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`p-3 max-w-[90%] border-2 shadow-[3px_3px_0px_rgba(0,0,0,0.3)] ${
                      msg.role === 'user' 
                        ? 'bg-indigo-600/80 border-indigo-400 text-white rounded-none ml-4' 
                        : 'bg-slate-800/80 border-slate-600 text-emerald-400 rounded-none mr-4'
                    }`}>
                      <p className="font-pixel text-[10px] leading-relaxed tracking-wide uppercase">{msg.text}</p>
                    </div>
                  </motion.div>
                ))}
               </AnimatePresence>
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={sendMessage} className="relative mt-auto">
              <input 
                type="text" 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="TYPE_INPUT_MESSAGE..."
                className="w-full bg-black/60 border-2 border-slate-700 p-3 pl-4 pr-12 text-[10px] font-pixel focus:outline-none focus:border-yellow-400 text-yellow-400 placeholder:text-slate-600 transition-colors uppercase"
              />
              <button 
                type="submit"
                disabled={!isConnected || !inputText.trim()}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-yellow-400 hover:text-yellow-300 disabled:opacity-30 transition-all font-pixel text-lg"
              >
                &gt;
              </button>
            </form>
          </motion.div>

          {/* Weather Card */}
          <motion.div 
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            className="md:col-span-1 bg-slate-900/60 backdrop-blur-xl border-2 border-slate-800 p-5 shadow-xl flex flex-col justify-center gap-2 group"
          >
            <div className="flex items-center gap-2">
              <div className="text-cyan-400 p-1 group-hover:rotate-12 transition-transform">
                <PixelWeather desc={weather.desc} size={24} />
              </div>
              <h2 className="text-[12px] font-pixel text-slate-300">WEATHER_SYS</h2>
            </div>
            <div className="mt-1">
              <div className="text-3xl font-pixel text-cyan-400 flex items-start gap-1">
                {weather.temp}<span className="text-base">°C</span>
              </div>
              <p className="text-[10px] font-pixel text-slate-500 mt-2 uppercase tracking-tighter">
                {weather.desc}
              </p>
              {weather.rainWarning && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-2 bg-red-900/40 border-l-4 border-red-500 text-red-400 text-[8px] font-pixel flex items-center gap-2 animate-pulse"
                >
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                  <span>RAIN_DETECTED</span>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Spotify Card */}
          <motion.div 
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            className="md:col-span-1 bg-slate-900/60 backdrop-blur-xl border-2 border-slate-800 p-5 shadow-xl relative overflow-hidden flex flex-col justify-center gap-3 group"
          >
            <div className={`absolute -right-6 -bottom-6 w-24 h-24 bg-emerald-500/10 blur-[40px] rounded-full ${mood === 'vibing' ? 'animate-pulse' : 'hidden'}`}></div>
            
            <div className="flex items-center gap-2 relative z-10">
              <div className="text-emerald-400 group-hover:rotate-12 transition-transform p-1">
                <PixelMusic size={24} />
              </div>
              <h2 className="text-[12px] font-pixel text-slate-300">SPOTIFY</h2>
            </div>
            
            <div className="relative z-10 mt-1 border-b-2 border-dashed border-slate-800 pb-3">
              <p className="text-[9px] font-pixel text-emerald-500 mb-1 tracking-tighter">NOWPLAYING.EXE</p>
              <div className="w-full overflow-hidden">
                <p className="text-xs font-pixel text-slate-100 whitespace-nowrap group-hover:animate-marquee">
                  {track.toUpperCase()}
                </p>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="relative z-10 flex items-center justify-between mt-1">
              <motion.button 
                whileHover={{ scale: 1.1, color: '#34d399' }}
                whileTap={{ scale: 0.9 }}
                onClick={() => spotifyControl('previous')}
                className="text-slate-500 hover:text-emerald-400 p-1 transition-colors cursor-pointer"
                title="PREVIOUS"
              >
                <PixelSkip size={16} reverse />
              </motion.button>

              <motion.button 
                onClick={() => track === 'SILENCE' ? spotifyControl('play') : spotifyControl('pause')}
                className="text-black bg-emerald-500 p-2 shadow-[3px_3px_0px_#064e3b] hover:bg-emerald-400 active:translate-y-1 active:translate-x-1 active:shadow-none transition-all cursor-pointer"
                title="PLAY/PAUSE"
              >
                {mood === 'vibing' ? <PixelPause size={16} /> : <PixelPlay size={16} />}
              </motion.button>

              <motion.button 
                whileHover={{ scale: 1.1, color: '#34d399' }}
                whileTap={{ scale: 0.9 }}
                onClick={() => spotifyControl('next')}
                className="text-slate-500 hover:text-emerald-400 p-1 transition-colors cursor-pointer"
                title="NEXT"
              >
                <PixelSkip size={16} />
              </motion.button>
            </div>
          </motion.div>

        </motion.div>
        
        <footer className="mt-10 py-6 border-t border-slate-800/50 flex justify-between items-center opacity-40">
           <p className="text-[9px] font-pixel uppercase tracking-widest leading-loose">
             © 2026 MUON_BOT<br/>ALL RIGHTS RESERVED
           </p>
           <div className="h-4 w-20 bg-emerald-500/20 rounded-none relative overflow-hidden">
              <motion.div 
                animate={{ x: ['-100%', '100%'] }} 
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 w-1/2 bg-emerald-500/40 blur-sm"
              />
           </div>
        </footer>

      </main>

      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 10s linear infinite;
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
}