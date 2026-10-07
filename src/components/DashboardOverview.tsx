import React, { useState, useMemo } from 'react';
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
  Send,
  Search,
  Users,
  Filter,
  Sparkles,
  Trash2,
  X
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
  onOpenDispatchForBooking?: (booking: BookingDetailView) => void;
  onDeleteBooking?: (bookingId: number) => void;
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
  onCompleteDelivery,
  onOpenDispatchForBooking,
  onDeleteBooking
}) => {
  const [recentOrderFilter, setRecentOrderFilter] = useState<'All' | 'Pending' | 'Assigned' | 'Delivered'>('All');
  const [recentOrderSearch, setRecentOrderSearch] = useState('');
  const [showAllRecentOrders, setShowAllRecentOrders] = useState(false);
  const [deletingBooking, setDeletingBooking] = useState<BookingDetailView | null>(null);

  // Real-time sorted order categories (newest orders first by numeric BookingID)
  const sortedBookings = useMemo(() => {
    return [...bookingDetails].sort((a, b) => Number(b.BookingID) - Number(a.BookingID));
  }, [bookingDetails]);

  const inTransitDeliveries = useMemo(() => {
    return sortedBookings.filter((b) => b.BookingStatus === 'Assigned' && b.DeliveryID !== null);
  }, [sortedBookings]);

  const pendingOrders = useMemo(() => {
    return sortedBookings.filter((b) => b.BookingStatus === 'Pending');
  }, [sortedBookings]);

  const deliveredOrders = useMemo(() => {
    return sortedBookings.filter((b) => b.BookingStatus === 'Delivered');
  }, [sortedBookings]);

  // Customer order counts (to identify brand new customers)
  const customerOrderCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    bookingDetails.forEach((b) => {
      counts[b.CustomerID] = (counts[b.CustomerID] || 0) + 1;
    });
    return counts;
  }, [bookingDetails]);

  // Filtered recent orders table
  const filteredRecentOrders = useMemo(() => {
    return sortedBookings.filter((b) => {
      const matchStatus = recentOrderFilter === 'All' || b.BookingStatus === recentOrderFilter;
      const matchSearch =
        recentOrderSearch.trim() === '' ||
        b.CustomerName.toLowerCase().includes(recentOrderSearch.toLowerCase()) ||
        b.CustomerPhone.includes(recentOrderSearch) ||
        b.Street.toLowerCase().includes(recentOrderSearch.toLowerCase()) ||
        b.AreaName.toLowerCase().includes(recentOrderSearch.toLowerCase()) ||
        b.BookingID.toString().includes(recentOrderSearch);
      return matchStatus && matchSearch;
    });
  }, [sortedBookings, recentOrderFilter, recentOrderSearch]);

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

        {/* Pending Orders Queue Count */}
        <div
          onClick={() => onNavigateToTab('bookings')}
          className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer shadow-lg space-y-3 group"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Pending Dispatch</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-extrabold font-mono text-cyan-300">
              {pendingOrders.length}
            </div>
            <span className="text-xs text-slate-400 font-mono">orders waiting</span>
          </div>
          <div className="text-[11px] text-cyan-400 flex items-center gap-1">
            <span>View & manage bookings registry</span>
            <ArrowRight className="w-3 h-3 text-cyan-400 group-hover:translate-x-1 transition-transform" />
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
            <span>{deliveredOrders.length} Completed Trips Today</span>
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

        {/* Pending Orders Queue (1 col, scrollable, newest first) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Pending Orders Queue</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                {pendingOrders.length}
              </span>
            </h2>
            <button
              onClick={() => onNavigateToTab('bookings')}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
            >
              <span>View Registry</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3 max-h-[460px] overflow-y-auto">
            {pendingOrders.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                No orders waiting for dispatch.
              </div>
            ) : (
              pendingOrders.map((b) => {
                const isNewCustomer = customerOrderCounts[b.CustomerID] === 1;

                return (
                  <div
                    key={`pending-queue-${b.BookingID}`}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white">{b.CustomerName}</span>
                        {isNewCustomer && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-0.5">
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>NEW CLIENT</span>
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-cyan-400 font-bold">
                        {b.Capacity_Liters.toLocaleString()} L
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center justify-between">
                      <span className="truncate max-w-[150px]">{b.AreaName}</span>
                      <span className="font-mono text-slate-300">#{b.BookingID} • {b.TimeSlot}</span>
                    </div>

                    <div className="pt-1 flex items-center justify-between text-[11px]">
                      <span className="text-emerald-400 font-mono font-semibold">₹{b.Price}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setDeletingBooking(b)}
                          className="p-1 rounded bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 transition-colors"
                          title="Delete booking"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() =>
                            onOpenDispatchForBooking
                              ? onOpenDispatchForBooking(b)
                              : onOpenDispatch()
                          }
                          className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-colors flex items-center gap-1"
                          title="Dispatch a tanker for this order"
                        >
                          <Send className="w-3 h-3" />
                          <span>Dispatch</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Live Recent Orders & Bookings Registry Section (Full table on dashboard) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-0">
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span>Live Orders & Booking Stream</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {filteredRecentOrders.length} records
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Real-time feed of all municipal water delivery orders, including recently registered customers.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter by customer, phone, area..."
                value={recentOrderSearch}
                onChange={(e) => setRecentOrderSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Filter */}
            <div className="flex rounded-lg bg-slate-900 p-0.5 border border-slate-800 text-[11px]">
              {(['All', 'Pending', 'Assigned', 'Delivered'] as const).map((st) => (
                <button
                  key={`st-${st}`}
                  onClick={() => setRecentOrderFilter(st)}
                  className={`px-2 py-1 rounded-md transition-colors ${
                    recentOrderFilter === st ? 'bg-cyan-600 text-white font-medium' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[380px]">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/90 border-b border-slate-800 text-[11px] text-slate-400 uppercase font-mono tracking-wider sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-4">Booking</th>
                <th className="py-2.5 px-4">Customer & Contact</th>
                <th className="py-2.5 px-4">Delivery Address</th>
                <th className="py-2.5 px-4">Tanker Size</th>
                <th className="py-2.5 px-4">Date & Slot</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredRecentOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No orders match your filter criteria.
                  </td>
                </tr>
              ) : (
                (showAllRecentOrders ? filteredRecentOrders : filteredRecentOrders.slice(0, 30)).map((b) => {
                  const isNewClient = customerOrderCounts[b.CustomerID] === 1;

                  return (
                    <tr key={`recent-feed-${b.BookingID}`} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        #{b.BookingID}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          <span>{b.CustomerName}</span>
                          {isNewClient && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold">
                              NEW
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">+91 {b.CustomerPhone}</div>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="text-slate-200 truncate">{b.Street}</div>
                        <div className="text-[11px] text-slate-500">{b.AreaName} ({b.Pincode})</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-cyan-300">
                          {b.Capacity_Liters.toLocaleString()} L
                        </span>
                        <div className="text-[11px] font-mono text-emerald-400">₹{b.Price}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono text-slate-200">{b.ScheduledDate}</div>
                        <div className="text-[11px] text-slate-400">{b.TimeSlot}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold font-mono ${
                            b.BookingStatus === 'Delivered'
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : b.BookingStatus === 'Assigned'
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              : b.BookingStatus === 'Pending'
                              ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                              : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {b.BookingStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {b.BookingStatus === 'Pending' && (
                            <button
                              onClick={() =>
                                onOpenDispatchForBooking
                                  ? onOpenDispatchForBooking(b)
                                  : onOpenDispatch()
                              }
                              className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-[11px] transition-colors inline-flex items-center gap-1 shadow-sm"
                            >
                              <Send className="w-3 h-3" />
                              <span>Dispatch</span>
                            </button>
                          )}
                          {b.BookingStatus === 'Assigned' && (
                            <button
                              onClick={() => onNavigateToTab('livemap')}
                              className="px-2.5 py-1 rounded-lg bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/30 font-medium text-[11px] transition-colors inline-flex items-center gap-1"
                            >
                              <Truck className="w-3 h-3" />
                              <span>Track</span>
                            </button>
                          )}
                          {b.BookingStatus === 'Delivered' && (
                            <span className="text-[11px] font-mono text-emerald-400 flex items-center justify-end gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Done</span>
                            </span>
                          )}

                          {/* Delete Booking action */}
                          <button
                            onClick={() => setDeletingBooking(b)}
                            className="p-1 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 transition-colors"
                            title="Delete booking"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredRecentOrders.length > 30 && (
          <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
            <span>
              Showing {showAllRecentOrders ? filteredRecentOrders.length : 30} of {filteredRecentOrders.length} orders
            </span>
            <button
              onClick={() => setShowAllRecentOrders(!showAllRecentOrders)}
              className="text-cyan-400 hover:text-cyan-300 font-semibold"
            >
              {showAllRecentOrders ? 'Show Less' : `Show All (${filteredRecentOrders.length})`}
            </button>
          </div>
        )}
      </div>

      {/* DASHBOARD DELETE BOOKING MODAL */}
      {deletingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-rose-800/60 rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setDeletingBooking(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Order #{deletingBooking.BookingID}</h3>
                <p className="text-xs text-rose-300/80 font-mono">Remove booking from dispatch queue</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">Customer:</span>
                <span className="font-semibold text-white">{deletingBooking.CustomerName}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">Address:</span>
                <span className="truncate max-w-[200px]">{deletingBooking.Street}, {deletingBooking.AreaName}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">Water Volume:</span>
                <span className="font-mono text-cyan-300">{deletingBooking.Capacity_Liters.toLocaleString()} L (₹{deletingBooking.Price})</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">Status:</span>
                <span className="font-mono font-bold text-amber-300">{deletingBooking.BookingStatus}</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Confirm deletion of this order? If an assigned tanker is dispatched for it, the unit will be immediately freed back to Available status.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingBooking(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteBooking) {
                    onDeleteBooking(deletingBooking.BookingID);
                  }
                  setDeletingBooking(null);
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-lg shadow-rose-600/30"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm & Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
