import React, { useState, useEffect } from 'react';
import { Sliders, Volume2, Monitor, Keyboard, Smartphone, Globe, RotateCcw, Check, Move, Mic, MicOff, Radio } from 'lucide-react';
import { storage, DEFAULT_SETTINGS } from '../services/storage';
import { GameSettings } from '../types/game';
import { sound } from '../services/sound';
import { voiceChat, VoiceChatState } from '../services/voiceChat';

interface SettingsPageProps {
  onLogout?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onLogout }) => {
  const profile = storage.getProfile();
  const [settings, setSettings] = useState<GameSettings>(storage.getSettings());
  const [savedBanner, setSavedBanner] = useState(false);
  const [draggingTarget, setDraggingTarget] = useState<'joystick' | 'jump' | 'switch' | null>(null);
  const [voiceState, setVoiceState] = useState<VoiceChatState>(voiceChat.getState());

  useEffect(() => {
    const unsub = voiceChat.subscribe((v) => setVoiceState(v));
    return unsub;
  }, []);

  const updateSetting = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    storage.saveSettings(updated);

    if (key === 'masterVolume' || key === 'musicVolume' || key === 'sfxVolume') {
      sound.setVolumes(updated.masterVolume, updated.musicVolume, updated.sfxVolume);
    }
  };

  const handleSave = () => {
    sound.playButtonClick();
    storage.saveSettings(settings);
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 2000);
  };

  const handleResetDefaults = () => {
    sound.playButtonClick();
    setSettings(DEFAULT_SETTINGS);
    storage.saveSettings(DEFAULT_SETTINGS);
    sound.setVolumes(DEFAULT_SETTINGS.masterVolume, DEFAULT_SETTINGS.musicVolume, DEFAULT_SETTINGS.sfxVolume);
  };

  // Draggable Mobile Canvas Position Handler
  const handlePreviewMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = Math.max(5, Math.min(95, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
    const yPct = Math.max(5, Math.min(95, Math.round(((e.clientY - rect.top) / rect.height) * 100)));

    const currentMobile = { ...settings.mobileControls };
    if (draggingTarget === 'joystick') {
      currentMobile.joystickX = xPct;
      currentMobile.joystickY = yPct;
    } else if (draggingTarget === 'jump') {
      currentMobile.jumpBtnX = xPct;
      currentMobile.jumpBtnY = yPct;
    } else if (draggingTarget === 'switch') {
      currentMobile.switchBtnX = xPct;
      currentMobile.switchBtnY = yPct;
    }

    updateSetting('mobileControls', currentMobile);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white font-serif">GAME SETTINGS</h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure visual fidelity, audio volumes, keybindings, and custom draggable mobile layout.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition-all active:scale-95"
          >
            {savedBanner ? <Check className="w-4 h-4" /> : null}
            <span>{savedBanner ? 'Settings Saved!' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 1: Graphics & Display */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Monitor className="w-5 h-5 text-blue-400" />
            <span>Graphics & Display</span>
          </h2>

          <div>
            <label className="text-xs font-bold text-slate-400 block mb-2">Graphics Preset</label>
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'medium', 'high'] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    sound.playButtonClick();
                    updateSetting('graphicsQuality', q);
                  }}
                  className={`py-2 rounded-xl text-xs font-bold capitalize transition-all border ${
                    settings.graphicsQuality === q
                      ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-white'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 mt-2">
              High: 60fps PC/Console tier with soft shadows & reflections. Low: Optimized for Android 7-15 mobiles.
            </p>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <div>
              <div className="text-xs font-bold text-white">Dynamic Shadows</div>
              <div className="text-[11px] text-slate-400">Soft contact shadows for platforms</div>
            </div>
            <input
              type="checkbox"
              checked={settings.shadows}
              onChange={(e) => updateSetting('shadows', e.target.checked)}
              className="w-5 h-5 accent-rose-500 rounded"
            />
          </div>

          <div className="pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-slate-400">Camera Sensitivity</span>
              <span className="font-mono text-white">{settings.cameraSensitivity.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={settings.cameraSensitivity}
              onChange={(e) => updateSetting('cameraSensitivity', parseFloat(e.target.value))}
              className="w-full accent-rose-500"
            />
          </div>
        </div>

        {/* Section 2: Audio & Acoustics */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-rose-400" />
            <span>Audio & Music</span>
          </h2>

          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-slate-400">Master Volume</span>
              <span className="font-mono text-white">{Math.round(settings.masterVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.masterVolume}
              onChange={(e) => updateSetting('masterVolume', parseFloat(e.target.value))}
              className="w-full accent-rose-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-slate-400">Romantic Sunset Music</span>
              <span className="font-mono text-white">{Math.round(settings.musicVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.musicVolume}
              onChange={(e) => updateSetting('musicVolume', parseFloat(e.target.value))}
              className="w-full accent-rose-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-slate-400">Sound Effects (Traps, Jumps, Fanfare)</span>
              <span className="font-mono text-white">{Math.round(settings.sfxVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.sfxVolume}
              onChange={(e) => updateSetting('sfxVolume', parseFloat(e.target.value))}
              className="w-full accent-rose-500"
            />
          </div>
        </div>

        {/* Section: In-Game Teammate Voice Chat & Microphone */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Mic className="w-5 h-5 text-emerald-400" />
              <span>Voice Chat & Teammate Mic</span>
            </h2>
            <button
              onClick={async () => {
                sound.playButtonClick();
                await voiceChat.toggleMic();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 ${
                voiceState.isMicOn
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
            >
              {voiceState.isMicOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5 text-slate-400" />}
              <span>{voiceState.isMicOn ? 'Mic is ON (Live)' : 'Mic is OFF (Muted)'}</span>
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Communicate live with your co-op partner during dangerous trap platforming. You can toggle your microphone ON or OFF anytime in-game using the on-screen button or by pressing <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-white">M</kbd>.
          </p>

          {/* Live Mic Test Meter */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Radio className={`w-3.5 h-3.5 ${voiceState.isMicOn ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
                <span>Microphone Status & Live Meter</span>
              </span>
              <span className={`font-mono text-xs ${voiceState.isMicOn ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                {voiceState.statusMessage}
              </span>
            </div>

            {/* Visual Equalizer Bar */}
            <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-700">
              <div
                className={`h-full rounded-full transition-all duration-75 ${
                  voiceState.isSpeaking ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-emerald-500/50'
                }`}
                style={{ width: `${Math.round(voiceState.audioLevel * 100)}%` }}
              />
            </div>

            <div className="text-[10px] text-slate-500 flex justify-between">
              <span>Mute</span>
              <span>Speak into mic to test volume</span>
              <span>100%</span>
            </div>
          </div>

          {/* Partner Voice Volume */}
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-slate-400">Partner Voice Incoming Volume</span>
              <span className="font-mono text-white">{Math.round(settings.voiceVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.voiceVolume}
              onChange={(e) => updateSetting('voiceVolume', parseFloat(e.target.value))}
              className="w-full accent-rose-500"
            />
          </div>
        </div>

        {/* Section 3: Keyboard Controls Configuration */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-amber-400" />
            <span>Keyboard Bindings</span>
          </h2>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60">
              <div className="font-bold text-blue-400 mb-2">Player 1 ({profile.boyName || 'Boyfriend'})</div>
              <div className="space-y-1.5 text-slate-300">
                <div className="flex justify-between"><span>Forward:</span> <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded">W</span></div>
                <div className="flex justify-between"><span>Backward:</span> <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded">S</span></div>
                <div className="flex justify-between"><span>Left / Right:</span> <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded">A / D</span></div>
                <div className="flex justify-between"><span>Jump:</span> <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded">Space</span></div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60">
              <div className="font-bold text-rose-400 mb-2">Player 2 ({profile.girlName || 'Girlfriend'})</div>
              <div className="space-y-1.5 text-slate-300">
                <div className="flex justify-between"><span>Forward:</span> <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded">Up Arrow</span></div>
                <div className="flex justify-between"><span>Backward:</span> <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded">Down Arrow</span></div>
                <div className="flex justify-between"><span>Left / Right:</span> <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded">Left / Right</span></div>
                <div className="flex justify-between"><span>Jump:</span> <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded">Right Shift</span></div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-800/30 rounded-xl border border-slate-800 text-[11px] text-slate-400">
            Tip: In Solo Mode, press <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-white font-mono">Tab</kbd> to switch between controlling {profile.boyName || 'Boyfriend'} and {profile.girlName || 'Girlfriend'} anytime!
          </div>
        </div>

        {/* Section 4: Mobile On-Screen Controller Repositioning (Drag & Move) */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-emerald-400" />
              <span>Mobile Layout Customizer</span>
            </h2>
            <div className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
              Drag to Reposition
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Drag the virtual joystick and buttons inside the screen preview below to match your hand ergonomics.
          </p>

          {/* Interactive Phone Screen Drag Preview */}
          <div
            onMouseMove={handlePreviewMouseMove}
            onMouseUp={() => setDraggingTarget(null)}
            className="relative w-full h-48 rounded-2xl bg-slate-950 border-2 border-dashed border-slate-700 overflow-hidden cursor-crosshair select-none"
          >
            {/* Draggable Virtual Joystick */}
            <div
              onMouseDown={() => setDraggingTarget('joystick')}
              className="absolute -translate-x-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-800/80 border-2 border-blue-400 text-blue-300 flex items-center justify-center cursor-move shadow-xl"
              style={{
                left: `${settings.mobileControls.joystickX}%`,
                top: `${settings.mobileControls.joystickY}%`
              }}
            >
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white">
                <Move className="w-4 h-4" />
              </div>
            </div>

            {/* Draggable Jump Button */}
            <div
              onMouseDown={() => setDraggingTarget('jump')}
              className="absolute -translate-x-1/2 -translate-y-1/2 p-1.5 rounded-full bg-slate-800/80 border-2 border-rose-400 text-rose-300 flex items-center justify-center cursor-move shadow-xl"
              style={{
                left: `${settings.mobileControls.jumpBtnX}%`,
                top: `${settings.mobileControls.jumpBtnY}%`
              }}
            >
              <div className="w-10 h-10 rounded-full bg-rose-500 flex items-center justify-center text-[10px] font-bold text-white">
                JUMP
              </div>
            </div>

            {/* Draggable Switch Button */}
            <div
              onMouseDown={() => setDraggingTarget('switch')}
              className="absolute -translate-x-1/2 -translate-y-1/2 p-1 rounded-full bg-slate-800/80 border-2 border-amber-400 text-amber-300 flex items-center justify-center cursor-move shadow-xl"
              style={{
                left: `${settings.mobileControls.switchBtnX}%`,
                top: `${settings.mobileControls.switchBtnY}%`
              }}
            >
              <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-[9px] font-bold text-white">
                SWAP
              </div>
            </div>

            <div className="absolute top-2 left-2 text-[10px] text-slate-500">Screen Area (Mobile Viewport)</div>
          </div>
        </div>

        {/* Account & Session Management */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-rose-400" />
                <span>Account & Session</span>
              </h2>
              <div className="text-xs text-slate-400 mt-1">
                Logged in as <span className="text-white font-semibold">{profile.username}</span> {profile.isEmailVerified ? `(${profile.verifiedEmail})` : '(Guest Session)'}
              </div>
            </div>

            {onLogout && (
              <button
                onClick={() => {
                  sound.playButtonClick();
                  onLogout();
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-600/20 text-rose-300 hover:text-rose-400 font-bold text-xs border border-slate-700 hover:border-rose-500/40 transition-all active:scale-95 flex items-center gap-2"
              >
                <span>Switch Account / Logout</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
