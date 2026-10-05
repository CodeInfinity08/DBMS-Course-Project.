import React from 'react';
import {
  BarChart3,
  TrendingUp,
  Droplets,
  DollarSign,
  PieChart,
  MapPin,
  Calendar,
  CreditCard,
  Truck
} from 'lucide-react';
import { BookingDetailView, Area, Payment, TankerType } from '../types.ts';

interface AnalyticsViewProps {
  bookingDetails: BookingDetailView[];
  areas: Area[];
  payments: Payment[];
  tankerTypes: TankerType[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  bookingDetails,
  areas,
  payments,
  tankerTypes
}) => {
  // Total Revenue & Payment breakdown
  const totalRevenue = payments.reduce((sum, p) => sum + p.Amount, 0);

  const paymentByMethod: Record<string, number> = {};
  payments.forEach((p) => {
    paymentByMethod[p.Method] = (paymentByMethod[p.Method] || 0) + p.Amount;
  });

  // Area-wise water volume delivered
  const waterByArea: Record<string, number> = {};
  bookingDetails.forEach((b) => {
    if (b.BookingStatus === 'Delivered') {
      waterByArea[b.AreaName] = (waterByArea[b.AreaName] || 0) + b.Capacity_Liters;
    }
  });

  // Slot demand count
  const slotDemand: Record<string, number> = {
    '06:00-09:00': 0,
    '09:00-12:00': 0,
    '12:00-15:00': 0,
    '15:00-18:00': 0
  };
  bookingDetails.forEach((b) => {
    if (slotDemand[b.TimeSlot] !== undefined) {
      slotDemand[b.TimeSlot]++;
    }
  });

  // Tanker capacity distribution
  const capacityDistribution: Record<number, number> = {};
  bookingDetails.forEach((b) => {
    capacityDistribution[b.Capacity_Liters] = (capacityDistribution[b.Capacity_Liters] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <span>Water Delivery Intelligence & Revenue Analytics</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Zone demand distribution, payment method reconciliation, and fleet utilization metrics.
          </p>
        </div>

        <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-emerald-400">
          Total Reconciled: ₹{totalRevenue.toLocaleString()}
        </div>
      </div>

      {/* 2x2 Analytics Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Payment Reconciliation */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <span>Payment Methods Breakdown</span>
            </h3>
            <span className="text-xs font-mono text-slate-400">{payments.length} Payments</span>
          </div>

          <div className="space-y-3">
            {Object.entries(paymentByMethod).map(([method, amount]) => {
              const pct = totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0;
              return (
                <div key={method} className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-300 font-medium">{method}</span>
                    <span className="font-mono text-white">
                      ₹{amount.toLocaleString()} ({pct.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Area-wise Water Dispensed */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-400" />
              <span>Water Volume Dispensed by Municipal Zone</span>
            </h3>
            <span className="text-xs font-mono text-cyan-400">Liters</span>
          </div>

          <div className="space-y-3">
            {Object.entries(waterByArea).map(([areaName, liters]) => {
              const maxLiters = Math.max(...Object.values(waterByArea), 1);
              const pct = (liters / maxLiters) * 100;

              return (
                <div key={areaName} className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-300 font-medium">{areaName}</span>
                    <span className="font-mono text-cyan-300 font-bold">
                      {liters.toLocaleString()} L
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-cyan-500 h-2 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Time Slot Demand */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>Time Slot Demand Distribution</span>
            </h3>
            <span className="text-xs font-mono text-slate-400">Bookings / Day</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            {Object.entries(slotDemand).map(([slot, count]) => (
              <div key={slot} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-slate-400 text-[11px] font-mono">{slot}</div>
                <div className="text-xl font-bold font-mono text-white">{count}</div>
                <div className="text-[10px] text-amber-400/80">Scheduled Deliveries</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tanker Size Popularity */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-400" />
              <span>Capacity Tier Demand</span>
            </h3>
            <span className="text-xs font-mono text-slate-400">Tanker Size</span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            {tankerTypes.map((tt) => {
              const count = capacityDistribution[tt.Capacity_Liters] || 0;
              return (
                <div key={tt.TypeID} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-center">
                  <div className="text-cyan-400 font-mono font-bold text-sm">
                    {tt.Capacity_Liters.toLocaleString()} L
                  </div>
                  <div className="text-xl font-bold font-mono text-white mt-1">{count}</div>
                  <div className="text-[10px] text-slate-500 font-mono">₹{tt.Price} Rate</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
