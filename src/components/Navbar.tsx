import React from 'react';
import {
  Droplets,
  Truck,
  Activity,
  Plus,
  RotateCcw,
  Download,
  Volume2,
  VolumeX,
  Play,
  Pause,
  MapPin,
  Calendar,
  Database,
  BarChart3,
  Layers,
  Bell
} from 'lucide-react';
import { ActiveNavTab, Tanker, Delivery } from '../types.ts';

interface NavbarProps {
  activeTab: ActiveNavTab;
  setActiveTab: (tab: ActiveNavTab) => void;
  tankers: Tanker[];
  deliveries: Delivery[];
  simulationSpeed: number;
  setSimulationSpeed: (speed: number) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  onOpenNewBooking: () => void;
  onOpenDispatch: () => void;
  onResetDB: () => void;
  onExportSQL: () => void;
  onTestAlert?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  tankers,
  deliveries,
  simulationSpeed,
  setSimulationSpeed,
  soundEnabled,
  setSoundEnabled,
  onOpenNewBooking,
  onOpenDispatch,
  onResetDB,
  onExportSQL,
  onTestAlert
}) => {
  const activeDeliveriesCount = deliveries.filter((d) => d.DeliveredTime === null).length;
  const availableTankersCount = tankers.filter((t) => t.Status === 'Available').length;

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      {/* Top Banner with Operational Status */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20 text-white">
              <Droplets className="w-5 h-5 text-cyan-100 animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-white">AquaFlow</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                  v8.0 MySQL
                </span>
              </div>
              <p className="text-xs text-slate-400 font-normal">Water Tanker Fleet & Delivery Management</p>
            </div>
          </div>

          {/* Real-time Fleet Status Pills */}
          <div className="hidden lg:flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
              <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping"></span>
              <span className="text-slate-400">In Transit:</span>
              <span className="font-semibold text-amber-300 font-mono">{activeDeliveriesCount} Tankers</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400"></span>
              <span className="text-slate-400">Available Fleet:</span>
              <span className="font-semibold text-emerald-300 font-mono">{availableTankersCount} Units</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50">
              <span className="text-slate-400">GPS Radar:</span>
              <button
                onClick={() => setSimulationSpeed(simulationSpeed === 0 ? 1 : simulationSpeed === 1 ? 2 : simulationSpeed === 2 ? 5 : 0)}
                className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-cyan-300 font-mono transition-colors flex items-center gap-1"
                title="Toggle GPS Simulation Speed"
              >
                {simulationSpeed === 0 ? <Pause className="w-3 h-3 text-rose-400" /> : <Play className="w-3 h-3 text-cyan-400" />}
                <span>{simulationSpeed}x</span>
              </button>
            </div>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-700 rounded-lg border border-slate-700/60 transition-colors"
              title={soundEnabled ? 'Mute Audio Alerts' : 'Enable Audio Alerts'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            {onTestAlert && (
              <button
                onClick={onTestAlert}
                className="p-1.5 text-slate-400 hover:text-emerald-300 bg-slate-800/60 hover:bg-slate-700 rounded-lg border border-slate-700/60 transition-colors flex items-center gap-1"
                title="Test Driver Completed Delivery Alert & Chime"
              >
                <Bell className="w-4 h-4 text-emerald-400" />
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenDispatch}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white shadow-sm transition-all shadow-cyan-600/25"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Dispatch Tanker</span>
            </button>

            <button
              onClick={onOpenNewBooking}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-sm transition-all shadow-blue-600/25"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Booking</span>
            </button>

            <div className="h-6 w-px bg-slate-800 mx-1 hidden sm:block"></div>

            <button
              onClick={onExportSQL}
              className="p-2 text-slate-400 hover:text-cyan-300 bg-slate-800/80 hover:bg-slate-800 rounded-lg border border-slate-700/70 transition-colors"
              title="Export Current DB as SQL Dump (.sql)"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={onResetDB}
              className="p-2 text-slate-400 hover:text-amber-400 bg-slate-800/80 hover:bg-slate-800 rounded-lg border border-slate-700/70 transition-colors"
              title="Reset Database to Original MySQL Seed Data"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 sm:space-x-2 py-2 overflow-x-auto no-scrollbar border-t border-slate-800/80">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('livemap')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'livemap'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Live GPS Radar</span>
            {activeDeliveriesCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {activeDeliveriesCount} active
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('deliveries')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'deliveries'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Active Deliveries</span>
          </button>

          <button
            onClick={() => setActiveTab('fleet')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'fleet'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Fleet & Inventory</span>
          </button>

          <button
            onClick={() => setActiveTab('bookings')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'bookings'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Bookings</span>
          </button>

          <button
            onClick={() => setActiveTab('database')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'database'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Database Studio (9 Tables)</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Analytics</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
