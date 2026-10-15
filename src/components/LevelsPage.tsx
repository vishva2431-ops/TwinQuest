import React, { useState } from 'react';
import { Lock, Heart, Star, Clock, Play, ArrowLeft, Search, CheckCircle2 } from 'lucide-react';
import { WORLDS_DATA, storage } from '../services/storage';
import { WorldData, PlayerProfile } from '../types/game';
import { sound } from '../services/sound';

interface LevelsPageProps {
  selectedWorldId: number;
  profile: PlayerProfile;
  onSelectLevel: (worldId: number, levelNumber: number) => void;
  onBackToMaps: () => void;
}

export const LevelsPage: React.FC<LevelsPageProps> = ({
  selectedWorldId,
  profile,
  onSelectLevel,
  onBackToMaps
}) => {
  const [currentWorldId, setCurrentWorldId] = useState(selectedWorldId);
  const [tierPage, setTierPage] = useState(0); // 0 = 1-50, 1 = 51-100, etc.
  const [searchQuery, setSearchQuery] = useState('');

  const world: WorldData = WORLDS_DATA.find((w) => w.id === currentWorldId) || WORLDS_DATA[0];
  const allProgress = storage.getAllProgress();

  const pageSize = 50;
  const startLevel = tierPage * pageSize + 1;
  const endLevel = Math.min(500, (tierPage + 1) * pageSize);

  const levelsInRange = Array.from({ length: endLevel - startLevel + 1 }, (_, i) => startLevel + i);

  // Filter if user searched a specific level number
  const displayedLevels = searchQuery
    ? [parseInt(searchQuery, 10)].filter((n) => !isNaN(n) && n >= 1 && n <= 500)
    : levelsInRange;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Top Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              sound.playButtonClick();
              onBackToMaps();
            }}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 shadow-md transition-all active:scale-95"
            title="Back to Worlds"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="text-xs font-bold text-rose-400 uppercase tracking-wider">
              {world.name} (World {world.id})
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white font-serif">
              STAGE SELECT (1–500)
            </h1>
          </div>
        </div>

        {/* Quick Search Level */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="number"
              min="1"
              max="500"
              placeholder="Jump to level (1-500)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-xs w-52 focus:outline-none focus:border-rose-500 font-mono"
            />
          </div>
        </div>
      </div>

      {/* World Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar">
        {WORLDS_DATA.map((w) => {
          const isUnlocked = w.id <= profile.unlockedWorlds;
          return (
            <button
              key={w.id}
              onClick={() => {
                sound.playButtonClick();
                setCurrentWorldId(w.id);
                setSearchQuery('');
              }}
              disabled={!isUnlocked}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                currentWorldId === w.id
                  ? 'bg-rose-600 border-rose-500 text-white shadow-lg'
                  : isUnlocked
                  ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
                  : 'bg-slate-950/40 border-slate-900 text-slate-600 cursor-not-allowed'
              }`}
            >
              {!isUnlocked && <Lock className="w-3 h-3 text-slate-600" />}
              <span>W{w.id}: {w.name}</span>
            </button>
          );
        })}
      </div>

      {/* Tier Jump Pagination (1-50, 51-100, etc.) */}
      {!searchQuery && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-4 mb-6 no-scrollbar">
          {Array.from({ length: 10 }, (_, idx) => {
            const start = idx * 50 + 1;
            const end = (idx + 1) * 50;
            return (
              <button
                key={idx}
                onClick={() => {
                  sound.playButtonClick();
                  setTierPage(idx);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border ${
                  tierPage === idx
                    ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {start}–{end}
              </button>
            );
          })}
        </div>
      )}

      {/* 50-Level Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-3">
        {displayedLevels.map((lvl) => {
          const key = `${world.id}_${lvl}`;
          const progress = allProgress[key] || {
            worldId: world.id,
            levelNumber: lvl,
            unlocked: lvl === 1 && world.id <= profile.unlockedWorlds,
            completed: false,
            stars: 0,
            bestTimeSeconds: null,
            heartsCollected: [false, false, false]
          };

          const isUnlocked = progress.unlocked || lvl === 1;

          return (
            <button
              key={lvl}
              disabled={!isUnlocked}
              onClick={() => {
                sound.playButtonClick();
                onSelectLevel(world.id, lvl);
              }}
              className={`relative p-3 rounded-2xl border transition-all text-center flex flex-col items-center justify-between min-h-[115px] group ${
                progress.completed
                  ? 'bg-gradient-to-b from-slate-900 to-slate-950 border-rose-500/40 hover:border-rose-400 hover:shadow-lg'
                  : isUnlocked
                  ? 'bg-slate-900/80 border-slate-800 hover:border-slate-600 hover:bg-slate-800'
                  : 'bg-slate-950/40 border-slate-900 opacity-50 cursor-not-allowed'
              }`}
            >
              {/* Top Star Row */}
              <div className="flex items-center justify-center gap-0.5 w-full">
                {[1, 2, 3].map((starIdx) => (
                  <Star
                    key={starIdx}
                    className={`w-3 h-3 ${
                      starIdx <= progress.stars
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-slate-700'
                    }`}
                  />
                ))}
              </div>

              {/* Level Number */}
              <div className="my-1">
                {isUnlocked ? (
                  <span className="text-xl font-black text-white font-mono group-hover:scale-110 transition-transform block">
                    {lvl}
                  </span>
                ) : (
                  <Lock className="w-5 h-5 text-slate-600 mx-auto my-1" />
                )}
              </div>

              {/* Bottom Heart / Time details */}
              <div className="w-full flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
                <div className="flex items-center gap-0.5 text-rose-400 font-medium">
                  <Heart className={`w-3 h-3 ${progress.heartsCollected?.filter(Boolean).length ? 'fill-rose-400' : ''}`} />
                  <span>{progress.heartsCollected?.filter(Boolean).length || 0}</span>
                </div>

                <div className="font-mono text-slate-400">
                  {progress.bestTimeSeconds ? `${progress.bestTimeSeconds}s` : '--'}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
