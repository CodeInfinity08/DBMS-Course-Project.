import React from 'react';
import {
  Activity,
  Truck,
  Droplets,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  MapPin,
  Calendar,
  Layers,
  Send
} from 'lucide-react';
import {
  BookingDetailView,
  DriverTelemetry,
  Tanker,
  Driver,
  Delivery,
  TankerType
} from '../types.ts';
import { CENTRAL_DEPOT } from '../db/initialData.ts';

interface DashboardOverviewProps {
  bookingDetails: BookingDetailView[];
  telemetries: Record<number, DriverTelemetry>;
  tankers: Tanker[];
  drivers: Driver[];
  deliveries: Delivery[];
  tankerTypes: TankerType[];
  onNavigateToTab: (tab: any) => void;
  onOpenDispatch: () => void;
  onOpenNewBooking: () => void;
  onCompleteDelivery: (deliveryId: number) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  bookingDetails,
  telemetries,
  tankers,
  drivers,
  deliveries,
  tankerTypes,
  onNavigateToTab,
  onOpenDispatch,
  onOpenNewBooking,
  onCompleteDelivery
}) => {
  const inTransitDeliveries = bookingDetails.filter((b) => b.BookingStatus === 'Assigned' && b.DeliveryID !== null);
  const pendingOrders = bookingDetails.filter((b) => b.BookingStatus === 'Pending');
  const deliveredOrders = bookingDetails.filter((b) => b.BookingStatus === 'Delivered');

  const totalDeliveredWaterLiters = deliveredOrders.reduce((sum, b) => sum + b.Capacity_Liters, 0);
  const totalRevenue = bookingDetails
    .filter((b) => b.PaidAmount !== null)
    .reduce((sum, b) => sum + (b.PaidAmount || 0), 0);

  const availableFleetCount = tankers.filter((t) => t.Status === 'Available').length;
  const dispatchedFleetCount = tankers.filter((t) => t.Status === 'Dispatched').length;

  return (
    <div className="space-y-6">
      {/* Top Banner: Central Water Supply Depot Snapshot */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border border-slate-800 p-6 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 animate-ping"></span>
              <span className="text-xs font-mono font-bold tracking-wider text-cyan-400 uppercase">
                Hyderabad Water Authority • Central Depot #1
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Real-Time Fleet & Water Delivery Dispatch
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              Automated trigger validation prevents double-booking and enforces capacity-matched tanker allocation with live GPS driver tracking.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onOpenDispatch}
              className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all shadow-lg shadow-cyan-600/25 flex items-center gap-2"
            >
              <Truck className="w-4 h-4" />
              <span>Dispatch Tanker</span>
            </button>
            <button
              onClick={onOpenNewBooking}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-lg shadow-blue-600/25 flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              <span>New Booking</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Tankers */}
        <div
          onClick={() => onNavigateToTab('livemap')}
          className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer shadow-lg space-y-3 group"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>In Transit (Live GPS)</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-extrabold font-mono text-white">{inTransitDeliveries.length}</div>
            <span className="text-xs text-amber-300 font-mono">active units</span>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <span>Click to track on live GIS radar</span>
            <ArrowRight className="w-3 h-3 text-cyan-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Available Fleet */}
        <div
          onClick={() => onNavigateToTab('fleet')}
          className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer shadow-lg space-y-3 group"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Available at Depot</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-extrabold font-mono text-white">{availableFleetCount}</div>
            <span className="text-xs text-emerald-400 font-mono">/ {tankers.length} tankers</span>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <span>Ready for instant assignment</span>
            <ArrowRight className="w-3 h-3 text-cyan-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Water Delivered */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Water Dispensed</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Droplets className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-extrabold font-mono text-cyan-300">
              {totalDeliveredWaterLiters.toLocaleString()}
            </div>
            <span className="text-xs text-slate-400 font-mono">Liters</span>
          </div>
          <div className="text-[11px] text-slate-500">
            {deliveredOrders.length} Completed Trips Today
          </div>
        </div>

        {/* Revenue Collected */}
        <div
          onClick={() => onNavigateToTab('analytics')}
          className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer shadow-lg space-y-3 group"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Receipts</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-extrabold font-mono text-emerald-400">
              ₹{totalRevenue.toLocaleString()}
            </div>
            <span className="text-xs text-slate-400 font-mono">INR</span>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <span>UPI, Cash & Card reconciliation</span>
            <ArrowRight className="w-3 h-3 text-cyan-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Main Grid: Active Deliveries Telemetry & Pending Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* In-Transit Tankers (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" />
              <span>Live In-Transit Telemetry</span>
            </h2>
            <button
              onClick={() => onNavigateToTab('livemap')}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
            >
              <span>Full Screen Radar</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {inTransitDeliveries.length === 0 ? (
            <div className="p-10 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-500 text-xs">
              No tankers currently en route. All units available at depot.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {inTransitDeliveries.map((b) => {
                const tel = b.DeliveryID ? telemetries[b.DeliveryID] : undefined;

                return (
                  <div
                    key={`dash-trans-${b.BookingID}`}
                    className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all space-y-3.5 shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-300 text-sm">{b.License_Plate}</span>
                        <span className="text-xs text-slate-400 font-mono">({b.Capacity_Liters.toLocaleString()} L)</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        {tel?.speedKmh || 32} km/h • {tel?.etaMinutes || 10}m ETA
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Route Progress</span>
                        <span className="font-mono text-cyan-300">{tel?.progressPercent || 45}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-cyan-500 to-amber-500 h-2 rounded-full transition-all duration-700"
                          style={{ width: `${tel?.progressPercent || 45}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="text-xs text-slate-300 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-slate-500" />
                        <span>Driver: <strong className="text-white">{b.DriverName}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span className="truncate">Customer: <strong>{b.CustomerName}</strong> ({b.AreaName})</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex justify-end">
                      <button
                        onClick={() => b.DeliveryID && onCompleteDelivery(b.DeliveryID)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirm Delivery</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pending Orders Queue (1 col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Pending Orders Queue</span>
            </h2>
            <button
              onClick={() => onNavigateToTab('deliveries')}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            {pendingOrders.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                No orders waiting for dispatch.
              </div>
            ) : (
              pendingOrders.slice(0, 4).map((b) => (
                <div
                  key={`pending-queue-${b.BookingID}`}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white">{b.CustomerName}</span>
                    <span className="font-mono text-cyan-400">{b.Capacity_Liters.toLocaleString()} L</span>
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>{b.AreaName}</span>
                    <span>Slot: {b.TimeSlot}</span>
                  </div>

                  <div className="pt-1 flex items-center justify-between text-[11px]">
                    <span className="text-emerald-400 font-mono font-semibold">₹{b.Price}</span>
                    <button
                      onClick={onOpenDispatch}
                      className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-colors flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      <span>Dispatch</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
