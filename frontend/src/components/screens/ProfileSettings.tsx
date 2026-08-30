import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Settings,
  User,
  Shield,
  Palette,
  Bell,
  Radio,
  Sliders,
  CheckCircle2,
  Save,
  Globe,
  SlidersHorizontal,
} from 'lucide-react';

export const ProfileSettings: React.FC = () => {
  const { userProfile, updateUserProfile, navigateTo } = useApp();
  const [savedBanner, setSavedBanner] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 3000);
  };

  const palettes = [
    { id: 'ironbow', name: 'Ironbow (Classic FLIR)', colors: 'from-purple-900 via-red-600 to-amber-300' },
    { id: 'inferno', name: 'Inferno (High Contrast)', colors: 'from-black via-purple-700 to-yellow-300' },
    { id: 'turbo', name: 'Turbo (Perceptually Uniform)', colors: 'from-blue-700 via-green-500 to-red-500' },
    { id: 'rainbow', name: 'Rainbow Multispectral', colors: 'from-blue-600 via-teal-400 to-red-600' },
    { id: 'whiteHot', name: 'White Hot (Monochrome)', colors: 'from-slate-900 via-slate-500 to-white' },
    { id: 'blackHot', name: 'Black Hot (Monochrome Inverted)', colors: 'from-white via-slate-500 to-slate-950' },
  ];

  return (
    <div id="screen-profile-settings" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-5 rounded-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-300 text-xs font-mono font-bold">
              SCREEN #4 • OPERATOR CONFIG
            </span>
            <span className="text-slate-400 text-xs font-mono">TACTICAL CREDENTIALS</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            HeatIQ | Profile Settings
          </h1>
          <p className="text-sm text-slate-300 mt-0.5">
            Operator authorization, shift parameters, radiometric colormaps, and telemetry transmission endpoints.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigateTo('alert-preferences', 'push')}
            data-path="alert-preferences"
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
          >
            Alert Thresholds →
          </button>
        </div>
      </div>

      {savedBanner && (
        <div className="bg-emerald-950 border border-emerald-800 text-emerald-300 px-4 py-3 rounded-lg flex items-center gap-2 text-xs font-mono">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Operator configuration and radiometric profile successfully updated and synchronized.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Operator Profile Card */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-3">
            <User className="w-4 h-4 text-orange-400" />
            <span>Operator Identity &amp; Sector Assignment</span>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div>
              <label className="block text-slate-400 mb-1">OPERATOR CALLSIGN</label>
              <input
                type="text"
                value={userProfile.callsign}
                onChange={(e) => updateUserProfile({ callsign: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">OPERATOR FULL NAME</label>
              <input
                type="text"
                value={userProfile.operatorName}
                onChange={(e) => updateUserProfile({ operatorName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">ROLE / TACTICAL SPECIALTY</label>
              <input
                type="text"
                value={userProfile.role}
                onChange={(e) => updateUserProfile({ role: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">ASSIGNED SECTOR DIVISION</label>
              <input
                type="text"
                value={userProfile.sector}
                onChange={(e) => updateUserProfile({ sector: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Radiometric Visualization & Units */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-3">
            <Palette className="w-4 h-4 text-amber-400" />
            <span>Radiometric Colormap &amp; Display Standards</span>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-mono text-slate-400">SELECT FLIR THERMOGRAPHY PALETTE:</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {palettes.map((pal) => (
                <button
                  type="button"
                  key={pal.id}
                  onClick={() => updateUserProfile({ colorPalette: pal.id as any })}
                  className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    userProfile.colorPalette === pal.id
                      ? 'bg-orange-950/40 border-orange-500 text-white ring-1 ring-orange-500'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <span className="text-xs font-semibold">{pal.name}</span>
                  <div className={`h-3 w-full rounded mt-2 bg-gradient-to-r ${pal.colors}`} />
                </button>
              ))}
            </div>

            {/* Units and Refresh */}
            <div className="pt-2 grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-1.5">TEMPERATURE UNIT</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => updateUserProfile({ tempUnit: 'celsius' })}
                    className={`flex-1 py-1 rounded font-bold cursor-pointer ${
                      userProfile.tempUnit === 'celsius'
                        ? 'bg-orange-600 text-white'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    Celsius (°C)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateUserProfile({ tempUnit: 'fahrenheit' })}
                    className={`flex-1 py-1 rounded font-bold cursor-pointer ${
                      userProfile.tempUnit === 'fahrenheit'
                        ? 'bg-orange-600 text-white'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    Fahrenheit (°F)
                  </button>
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-1.5">REFRESH FREQUENCY</span>
                <select
                  value={userProfile.refreshRateSec}
                  onChange={(e) => updateUserProfile({ refreshRateSec: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                >
                  <option value={2}>2 Seconds (High Rate)</option>
                  <option value={5}>5 Seconds (Default)</option>
                  <option value={10}>10 Seconds (Standard)</option>
                  <option value={30}>30 Seconds (Bandwidth Saver)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications and Webhook Endpoints */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 p-5 rounded-xl space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-3">
            <Bell className="w-4 h-4 text-orange-400" />
            <span>Emergency Dispatch Channels &amp; Webhooks</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={userProfile.smsDispatch}
                  onChange={(e) => updateUserProfile({ smsDispatch: e.target.checked })}
                  className="rounded accent-orange-600"
                />
                <span>SMS Emergency Dispatch Integration</span>
              </label>

              <label className="flex items-center gap-2 text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={userProfile.radioBroadcastSync}
                  onChange={(e) => updateUserProfile({ radioBroadcastSync: e.target.checked })}
                  className="rounded accent-orange-600"
                />
                <span>Municipal Radio Broadcast Protocol Link</span>
              </label>

              <label className="flex items-center gap-2 text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={userProfile.highContrastMode}
                  onChange={(e) => updateUserProfile({ highContrastMode: e.target.checked })}
                  className="rounded accent-orange-600"
                />
                <span>High-Contrast Tactical Night Mode</span>
              </label>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">MUNICIPAL WEBHOOK ENDPOINT (JSON TELEMETRY)</label>
              <input
                type="text"
                value={userProfile.webhookUrl}
                onChange={(e) => updateUserProfile({ webhookUrl: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-orange-950 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save &amp; Apply Profile Settings</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
