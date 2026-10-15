import React from 'react';
import { Lock, Heart, Play, Layers, Star, Sparkles, ChevronRight } from 'lucide-react';
import { WORLDS_DATA, storage } from '../services/storage';
import { WorldData, PlayerProfile } from '../types/game';
import { sound } from '../services/sound';

interface MapSelectionPageProps {
  profile: PlayerProfile;
  onSelectWorld: (worldId: number) => void;
  onViewLevels: (worldId: number) => void;
}

export const MapSelectionPage: React.FC<MapSelectionPageProps> = ({
  profile,
  onSelectWorld,
  onViewLevels
}) => {
  const allProgress = storage.getAllProgress();

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>10 Unique Worlds • 500 Levels Each</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white font-serif tracking-tight">
            WORLD SELECTION
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Traverse 10 romantic fantasy realms with surprise traps, cooperative platforming, and 5,000 total stages.
          </p>
        </div>

        {/* Global Progress Badge */}
        <div className="flex items-center gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl px-5 py-3 backdrop-blur-md shadow-lg">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Total Hearts</div>
            <div className="text-lg font-bold text-rose-400 flex items-center gap-1.5">
              <Heart className="w-4 h-4 fill-rose-400" />
              <span>{profile.heartsCollected}</span>
            </div>
          </div>
          <div className="w-px h-8 bg-slate-800" />
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Worlds Unlocked</div>
            <div className="text-lg font-bold text-amber-400">
              {profile.unlockedWorlds} / 10
            </div>
          </div>
        </div>
      </div>

      {/* 10 Worlds Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {WORLDS_DATA.map((world) => {
          const isUnlocked = world.id <= profile.unlockedWorlds;

          // Calculate completed levels in this world
          const worldLevels = Object.values(allProgress).filter((p) => p.worldId === world.id && p.completed);
          const completedCount = worldLevels.length;
          const completionPct = Math.round((completedCount / world.totalLevels) * 100);

          return (
            <div
              key={world.id}
              className={`relative group rounded-3xl border overflow-hidden transition-all duration-300 flex flex-col justify-between ${
                isUnlocked
                  ? 'bg-slate-900/90 border-slate-800 hover:border-rose-500/50 hover:shadow-2xl hover:shadow-rose-950/20'
                  : 'bg-slate-950/60 border-slate-800/40 opacity-75'
              }`}
            >
              {/* Top Banner Gradient Visual */}
              <div
                className="h-40 w-full relative flex items-end p-5 overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${world.skyColorTop} 0%, ${world.groundColor} 100%)`
                }}
              >
                {/* Decorative Atmosphere Silhouette */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent z-10" />

                {/* Lock Overlay if locked */}
                {!isUnlocked && (
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-4 text-center">
                    <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 mb-2">
                      <Lock className="w-5 h-5 text-amber-400" />
                    </div>
                    <span className="text-xs font-bold text-white">WORLD LOCKED</span>
                    <span className="text-[11px] text-rose-300 flex items-center gap-1 mt-1">
                      <Heart className="w-3.5 h-3.5 fill-rose-400" />
                      <span>Requires {world.requiredHeartsToUnlock} Hearts</span>
                    </span>
                  </div>
                )}

                {/* World Number Tag */}
                <div className="relative z-20 flex items-center justify-between w-full">
                  <span className="px-2.5 py-1 rounded-lg bg-black/40 backdrop-blur-md text-[10px] font-bold text-white uppercase tracking-wider border border-white/10">
                    World {world.id}
                  </span>

                  <span
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm"
                    style={{ backgroundColor: `${world.themeColor}33`, color: world.themeColor }}
                  >
                    {world.difficulty}
                  </span>
                </div>
              </div>

              {/* World Information */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white font-serif group-hover:text-rose-400 transition-colors">
                    {world.name}
                  </h3>
                  <p className="text-xs font-medium text-rose-300/80 mb-2 italic">
                    {world.subtitle}
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                    {world.description}
                  </p>
                </div>

                {/* Progress bar */}
                <div className="mt-4 pt-4 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                    <span className="text-slate-400">Progression</span>
                    <span className="text-white font-mono font-bold">
                      {completedCount} / {world.totalLevels} ({completionPct}%)
                    </span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(4, completionPct)}%`,
                        backgroundColor: world.themeColor
                      }}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2.5 mt-4">
                    <button
                      disabled={!isUnlocked}
                      onClick={() => {
                        sound.playButtonClick();
                        onViewLevels(world.id);
                      }}
                      className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700/80 flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Browse 500 Levels</span>
                    </button>

                    <button
                      disabled={!isUnlocked}
                      onClick={() => {
                        sound.playButtonClick();
                        onSelectWorld(world.id);
                      }}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/20 flex items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-40"
                    >
                      <span>Play</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
