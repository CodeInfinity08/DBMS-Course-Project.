import React, { useState, useMemo, useRef } from 'react';
import {
  BarChart3,
  TrendingUp,
  Droplets,
  DollarSign,
  PieChart,
  MapPin,
  Calendar,
  CreditCard,
  Truck,
  Trophy,
  Award,
  Medal,
  Star,
  Zap,
  CheckCircle2,
  Users,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  SlidersHorizontal,
  Info,
  Activity,
  ArrowUpCircle
} from 'lucide-react';
import { BookingDetailView, Area, Payment, TankerType, Driver, Delivery } from '../types.ts';

interface AnalyticsViewProps {
  bookingDetails: BookingDetailView[];
  areas: Area[];
  payments: Payment[];
  tankerTypes: TankerType[];
  drivers?: Driver[];
  deliveries?: Delivery[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  bookingDetails,
  areas,
  payments,
  tankerTypes,
  drivers = [],
  deliveries = []
}) => {
  // Chart and filter state for Driver Bar Chart
  const [chartMode, setChartMode] = useState<'vertical' | 'horizontal'>('vertical');
  const [metricMode, setMetricMode] = useState<'deliveries' | 'volume'>('deliveries');
  const [sortBy, setSortBy] = useState<'rank' | 'volume' | 'name'>('rank');
  const [hoveredDriverId, setHoveredDriverId] = useState<number | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);

  // State for 30-Day Cumulative Revenue Line Chart
  const [revenueChartMode, setRevenueChartMode] = useState<'cumulative' | 'daily'>('cumulative');
  const [hoveredDayIndex, setHoveredDayIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Total Revenue & Payment breakdown
  const totalRevenue = payments.reduce((sum, p) => sum + p.Amount, 0);

  const paymentByMethod: Record<string, number> = {};
  payments.forEach((p) => {
    paymentByMethod[p.Method] = (paymentByMethod[p.Method] || 0) + p.Amount;
  });

  // Area-wise water volume delivered
  const waterByArea: Record<string, number> = {};
  let totalWaterDelivered = 0;
  bookingDetails.forEach((b) => {
    if (b.BookingStatus === 'Delivered') {
      waterByArea[b.AreaName] = (waterByArea[b.AreaName] || 0) + b.Capacity_Liters;
      totalWaterDelivered += b.Capacity_Liters;
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

  // ==========================================
  // 30-DAY CUMULATIVE REVENUE DATA CALCULATION
  // ==========================================
  const thirtyDaysRevenueData = useMemo(() => {
    const now = new Date();
    const datesInBookings: number[] = [];

    bookingDetails.forEach((b) => {
      if (b.DeliveredTime) {
        const d = new Date(b.DeliveredTime.split(' ')[0]);
        if (!isNaN(d.getTime())) datesInBookings.push(d.getTime());
      } else if (b.ScheduledDate) {
        const d = new Date(b.ScheduledDate);
        if (!isNaN(d.getTime())) datesInBookings.push(d.getTime());
      }
    });

    const maxDataTime = datesInBookings.length > 0 ? Math.max(...datesInBookings) : now.getTime();
    const anchorTime = Math.max(now.getTime(), maxDataTime);
    const anchorDate = new Date(anchorTime);
    anchorDate.setHours(0, 0, 0, 0);

    const startDate = new Date(anchorDate);
    startDate.setDate(anchorDate.getDate() - 29);
    const startDateStr = startDate.toISOString().split('T')[0];

    // Compute any revenue prior to startDate
    let priorRevenue = 0;
    payments.forEach((p) => {
      const b = bookingDetails.find((bd) => bd.BookingID === p.BookingID);
      const pDate = b?.DeliveredTime ? b.DeliveredTime.split(' ')[0] : b?.ScheduledDate;
      if (pDate && pDate < startDateStr) {
        priorRevenue += p.Amount;
      }
    });

    let runningCumulative = priorRevenue;

    const days: {
      index: number;
      dateStr: string;
      displayDate: string;
      dayOfWeek: string;
      fullDateLabel: string;
      isTodayOrEnd: boolean;
      dailyRevenue: number;
      dailyDeliveries: number;
      cumulativeRevenue: number;
      transactionCount: number;
      methods: Record<string, number>;
    }[] = [];

    for (let i = 0; i < 30; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'short' });
      const fullDateLabel = d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      // Find all payments on this day
      const dayPayments = payments.filter((p) => {
        const b = bookingDetails.find((bd) => bd.BookingID === p.BookingID);
        const pDate = b?.DeliveredTime ? b.DeliveredTime.split(' ')[0] : b?.ScheduledDate;
        return pDate === dateStr;
      });

      const dailyRevenue = dayPayments.reduce((sum, p) => sum + p.Amount, 0);

      const methods: Record<string, number> = {};
      dayPayments.forEach((p) => {
        methods[p.Method] = (methods[p.Method] || 0) + p.Amount;
      });

      const dailyDeliveries = bookingDetails.filter((b) => {
        const pDate = b.DeliveredTime ? b.DeliveredTime.split(' ')[0] : b.ScheduledDate;
        return pDate === dateStr && (b.BookingStatus === 'Delivered' || b.DeliveredTime !== null);
      }).length;

      runningCumulative += dailyRevenue;

      days.push({
        index: i,
        dateStr,
        displayDate,
        dayOfWeek,
        fullDateLabel,
        isTodayOrEnd: i === 29,
        dailyRevenue,
        dailyDeliveries,
        cumulativeRevenue: runningCumulative,
        transactionCount: dayPayments.length,
        methods
      });
    }

    const total30dRevenue = runningCumulative - priorRevenue;
    const peakDay = [...days].sort((a, b) => b.dailyRevenue - a.dailyRevenue)[0];
    const payingDaysCount = days.filter((d) => d.dailyRevenue > 0).length;
    const avgDailyRevenue = (total30dRevenue / 30).toFixed(0);

    // Calculate growth trajectory percentage
    const startVal = days[0]?.cumulativeRevenue || 1;
    const endVal = runningCumulative;
    const growthPercent = startVal > 0 ? (((endVal - startVal) / startVal) * 100).toFixed(0) : '100';

    return {
      days,
      priorRevenue,
      finalCumulative: runningCumulative,
      total30dRevenue,
      peakDay,
      payingDaysCount,
      avgDailyRevenue: Number(avgDailyRevenue),
      growthPercent,
      startDateStr,
      endDateStr: days[29].dateStr
    };
  }, [bookingDetails, payments]);

  // Selected or hovered day for the line chart tooltip
  const activeHoveredDay = useMemo(() => {
    if (hoveredDayIndex !== null && thirtyDaysRevenueData.days[hoveredDayIndex]) {
      return thirtyDaysRevenueData.days[hoveredDayIndex];
    }
    // Default to last day (today)
    return thirtyDaysRevenueData.days[29] || null;
  }, [hoveredDayIndex, thirtyDaysRevenueData]);

  // SVG Line Chart Coordinate Mapping
  const chartConfig = useMemo(() => {
    const totalW = 900;
    const totalH = 260;
    const padLeft = 65;
    const padRight = 30;
    const padTop = 25;
    const padBottom = 40;
    const w = totalW - padLeft - padRight;
    const h = totalH - padTop - padBottom;

    const isCumulative = revenueChartMode === 'cumulative';
    const rawMax = isCumulative
      ? thirtyDaysRevenueData.finalCumulative
      : (thirtyDaysRevenueData.peakDay?.dailyRevenue || 1000);

    // Add 15% headroom for top aesthetics
    const maxVal = Math.max(Math.ceil(rawMax * 1.15 / 500) * 500, 1000);

    const points = thirtyDaysRevenueData.days.map((day) => {
      const val = isCumulative ? day.cumulativeRevenue : day.dailyRevenue;
      const x = padLeft + (day.index / 29) * w;
      const y = padTop + h - (val / maxVal) * h;
      return { x, y, val, day };
    });

    // Generate smooth cardinal spline curve
    const getCurvedPath = (pts: { x: number; y: number }[]) => {
      if (pts.length === 0) return '';
      if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
      let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i === 0 ? i : i - 1];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
      }
      return d;
    };

    const curvedLine = getCurvedPath(points);
    const baselineY = padTop + h;
    const curvedArea = `${curvedLine} L ${points[points.length - 1].x.toFixed(1)} ${baselineY} L ${points[0].x.toFixed(1)} ${baselineY} Z`;

    // 5 Horizontal grid line ticks
    const yTicks = [
      { val: maxVal, y: padTop },
      { val: Math.round(maxVal * 0.75), y: padTop + h * 0.25 },
      { val: Math.round(maxVal * 0.5), y: padTop + h * 0.5 },
      { val: Math.round(maxVal * 0.25), y: padTop + h * 0.75 },
      { val: 0, y: baselineY }
    ];

    return {
      totalW,
      totalH,
      padLeft,
      padRight,
      padTop,
      padBottom,
      w,
      h,
      baselineY,
      maxVal,
      points,
      curvedLine,
      curvedArea,
      yTicks
    };
  }, [thirtyDaysRevenueData, revenueChartMode]);

  // Handle interactive hover over SVG
  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const svgRelativeX = (clientX / rect.width) * chartConfig.totalW;

    // Constrain to active chart bounds
    const innerX = Math.max(0, Math.min(chartConfig.w, svgRelativeX - chartConfig.padLeft));
    const dayIdx = Math.round((innerX / chartConfig.w) * 29);
    setHoveredDayIndex(Math.max(0, Math.min(29, dayIdx)));
  };

  // ==========================================
  // DRIVER PERFORMANCE ANALYTICS & BAR CHART DATA
  // ==========================================
  const driverPerformanceList = useMemo(() => {
    const driversMap = new Map<number, {
      driverId: number;
      name: string;
      phone: string;
      licenseNo: string;
    }>();

    // 1. Ingest registered drivers
    if (drivers && drivers.length > 0) {
      drivers.forEach((d) => {
        driversMap.set(d.DriverID, {
          driverId: d.DriverID,
          name: d.Name,
          phone: d.Phone,
          licenseNo: d.License_No,
        });
      });
    }

    // 2. Fallback / supplement with any drivers present in booking details
    bookingDetails.forEach((b) => {
      if (b.DriverID && !driversMap.has(b.DriverID)) {
        driversMap.set(b.DriverID, {
          driverId: b.DriverID,
          name: b.DriverName || `Driver #${b.DriverID}`,
          phone: b.DriverPhone || 'N/A',
          licenseNo: 'DL-ACTIVE',
        });
      }
    });

    // 3. Calculate delivery counts & stats for each driver
    const list = Array.from(driversMap.values()).map((drv) => {
      const completed = bookingDetails.filter(
        (b) => b.DriverID === drv.driverId && (b.BookingStatus === 'Delivered' || (b.DeliveredTime !== null && b.DeliveredTime !== undefined))
      );
      const inProgress = bookingDetails.filter(
        (b) => b.DriverID === drv.driverId && b.BookingStatus === 'Assigned'
      );
      const completedCount = completed.length;
      const activeCount = inProgress.length;
      const totalLiters = completed.reduce((sum, b) => sum + (b.Capacity_Liters || 0), 0);
      const totalRevenueHandled = completed.reduce((sum, b) => sum + (b.Price || 0), 0);

      const lastDelivery = completed.length > 0
        ? completed.map((c) => c.DeliveredTime).filter(Boolean).sort().reverse()[0]
        : null;

      return {
        ...drv,
        completedDeliveries: completedCount,
        activeDeliveries: activeCount,
        totalLiters,
        totalRevenueHandled,
        lastDelivery,
      };
    });

    const fleetCompleted = list.reduce((sum, d) => sum + d.completedDeliveries, 0);
    const avgDeliveries = list.length > 0 ? fleetCompleted / list.length : 0;

    list.sort((a, b) => {
      if (b.completedDeliveries !== a.completedDeliveries) {
        return b.completedDeliveries - a.completedDeliveries;
      }
      return b.totalLiters - a.totalLiters;
    });

    return list.map((item, index) => {
      const isTopPerformer = index === 0 && item.completedDeliveries > 0;
      const isHighPerformer = item.completedDeliveries >= Math.max(1, avgDeliveries);
      const rank = index + 1;

      return {
        ...item,
        rank,
        isTopPerformer,
        isHighPerformer,
        efficiencyScore: item.completedDeliveries > 0
          ? Math.min(100, Math.round(85 + (item.completedDeliveries * 4)))
          : 60,
      };
    });
  }, [drivers, bookingDetails]);

  const totalFleetCompleted = useMemo(() => {
    return driverPerformanceList.reduce((sum, d) => sum + d.completedDeliveries, 0);
  }, [driverPerformanceList]);

  const avgDeliveriesPerDriver = driverPerformanceList.length > 0
    ? (totalFleetCompleted / driverPerformanceList.length).toFixed(1)
    : '0';

  const highPerformersCount = useMemo(() => {
    return driverPerformanceList.filter((d) => d.isHighPerformer).length;
  }, [driverPerformanceList]);

  const maxCompletedDeliveries = useMemo(() => {
    return Math.max(...driverPerformanceList.map((d) => d.completedDeliveries), 1);
  }, [driverPerformanceList]);

  const maxLitersDelivered = useMemo(() => {
    return Math.max(...driverPerformanceList.map((d) => d.totalLiters), 1);
  }, [driverPerformanceList]);

  const displayDriverList = useMemo(() => {
    const copy = [...driverPerformanceList];
    if (sortBy === 'rank') {
      copy.sort((a, b) => {
        if (b.completedDeliveries !== a.completedDeliveries) {
          return b.completedDeliveries - a.completedDeliveries;
        }
        return b.totalLiters - a.totalLiters;
      });
    } else if (sortBy === 'volume') {
      copy.sort((a, b) => b.totalLiters - a.totalLiters);
    } else if (sortBy === 'name') {
      copy.sort((a, b) => a.name.localeCompare(b.name));
    }
    return copy;
  }, [driverPerformanceList, sortBy]);

  const topPerformer = driverPerformanceList.find((d) => d.isTopPerformer) || driverPerformanceList[0];

  const activeDetailDriver = useMemo(() => {
    const targetId = hoveredDriverId ?? selectedDriverId;
    if (targetId) {
      return driverPerformanceList.find((d) => d.driverId === targetId);
    }
    return topPerformer;
  }, [hoveredDriverId, selectedDriverId, driverPerformanceList, topPerformer]);

  const yAxisTicks = useMemo(() => {
    const max = metricMode === 'deliveries' ? maxCompletedDeliveries : maxLitersDelivered;
    const step = max > 4 ? Math.ceil(max / 4) : 1;
    const ticks = [];
    for (let i = 4; i >= 0; i--) {
      const val = Math.round(step * i);
      ticks.push(val);
    }
    return Array.from(new Set(ticks)).sort((a, b) => b - a);
  }, [metricMode, maxCompletedDeliveries, maxLitersDelivered]);

  return (
    <div className="space-y-6">
      {/* Top Header & KPI Summary */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <span>Water Delivery Intelligence & Fleet Analytics</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            30-day cumulative financial revenue trajectories, driver delivery performance, and zone distribution.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-cyan-400 flex items-center gap-1.5 shadow-sm">
            <Droplets className="w-3.5 h-3.5 text-cyan-400" />
            <span>{totalWaterDelivered.toLocaleString()} L Dispensed</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-emerald-400 flex items-center gap-1.5 shadow-sm">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span>₹{totalRevenue.toLocaleString()} Reconciled</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 30-DAY CUMULATIVE REVENUE GROWTH VISUALIZATION (LINE CHART)               */}
      {/* ========================================================================= */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
        {/* Section Header with Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">
                30-Day Cumulative Daily Revenue & Business Growth
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                +{thirtyDaysRevenueData.growthPercent}% Trajectory
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Interactive financial curve showing cumulative revenue growth day-over-day across the last 30 days.
            </p>
          </div>

          {/* Controls: Cumulative vs Daily Delta */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center rounded-xl bg-slate-950 p-1 border border-slate-800">
              <button
                onClick={() => setRevenueChartMode('cumulative')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                  revenueChartMode === 'cumulative'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Cumulative Growth</span>
              </button>
              <button
                onClick={() => setRevenueChartMode('daily')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                  revenueChartMode === 'daily'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Daily Revenue Inflow</span>
              </button>
            </div>
          </div>
        </div>

        {/* Financial KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Cumulative Total */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 via-slate-950 to-slate-950 border border-emerald-500/30 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>30-Day Cumulative Total</span>
              <span className="p-1 rounded bg-emerald-500/20 text-emerald-400">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-300 mt-1">
              ₹{thirtyDaysRevenueData.finalCumulative.toLocaleString()}
            </div>
            <div className="text-[11px] text-emerald-400/90 flex items-center gap-1 font-mono">
              <span>Sustained growth curve</span>
            </div>
          </div>

          {/* Average Daily Run-Rate */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Average Daily Run-Rate</span>
              <span className="p-1 rounded bg-blue-500/10 text-blue-400">
                <Calendar className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-white mt-1">
              ₹{thirtyDaysRevenueData.avgDailyRevenue.toLocaleString()}
              <span className="text-xs font-normal text-slate-400"> /day</span>
            </div>
            <div className="text-[11px] text-slate-400">
              Across 30 active municipal cycles
            </div>
          </div>

          {/* Peak Revenue Day */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Single-Day High</span>
              <span className="p-1 rounded bg-amber-500/10 text-amber-400">
                <Sparkles className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-amber-300 mt-1">
              ₹{thirtyDaysRevenueData.peakDay?.dailyRevenue.toLocaleString() || '0'}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              {thirtyDaysRevenueData.peakDay?.displayDate} ({thirtyDaysRevenueData.peakDay?.dailyDeliveries || 0} deliveries)
            </div>
          </div>

          {/* Active Revenue Days */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Active Inflow Days</span>
              <span className="p-1 rounded bg-cyan-500/10 text-cyan-400">
                <CreditCard className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-cyan-300 mt-1">
              {thirtyDaysRevenueData.payingDaysCount}
              <span className="text-xs font-normal text-slate-400"> / 30 days</span>
            </div>
            <div className="text-[11px] text-cyan-400/80">
              100% reconciled delivery payments
            </div>
          </div>
        </div>

        {/* Hovered / Pinned Day Telemetry Banner */}
        {activeHoveredDay && (
          <div className="p-3.5 rounded-xl bg-slate-950/90 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></div>
              <div>
                <span className="text-slate-400">Inspecting Date: </span>
                <span className="text-white font-bold">{activeHoveredDay.fullDateLabel}</span>
                <span className="text-slate-500 font-mono ml-2">(Day {activeHoveredDay.index + 1} of 30)</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 font-mono">
              <div>
                <span className="text-slate-400">Cumulative Revenue: </span>
                <span className="text-emerald-300 font-bold text-sm">
                  ₹{activeHoveredDay.cumulativeRevenue.toLocaleString()}
                </span>
              </div>
              <div className="border-l border-slate-800 pl-4">
                <span className="text-slate-400">Daily Inflow: </span>
                <span className="text-cyan-300 font-bold">
                  {activeHoveredDay.dailyRevenue > 0
                    ? `+₹${activeHoveredDay.dailyRevenue.toLocaleString()}`
                    : '₹0 (Zero inflow)'}
                </span>
              </div>
              <div className="border-l border-slate-800 pl-4">
                <span className="text-slate-400">Completed Trips: </span>
                <span className="text-amber-300 font-bold">{activeHoveredDay.dailyDeliveries}</span>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* SVG LINE CHART CANVAS                                                 */}
        {/* ===================================================================== */}
        <div className="relative rounded-2xl bg-slate-950 border border-slate-800/90 p-4 sm:p-5 overflow-hidden">
          {/* Chart Header Meta */}
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-0.5 bg-emerald-400 rounded"></span>
              <span className="text-slate-300 font-medium">
                {revenueChartMode === 'cumulative' ? 'Cumulative Revenue Curve (₹)' : 'Daily Inflow (₹)'}
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-500">
              Interactive timeline: Hover across canvas to inspect specific days
            </div>
          </div>

          <div className="relative w-full aspect-[900/280] min-h-[220px]">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${chartConfig.totalW} ${chartConfig.totalH}`}
              className="w-full h-full cursor-crosshair select-none"
              onMouseMove={handleSvgMouseMove}
              onMouseLeave={() => setHoveredDayIndex(null)}
            >
              <defs>
                {/* Area Gradient */}
                <linearGradient id="revenueAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                  <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
                </linearGradient>

                {/* Line Gradient */}
                <linearGradient id="revenueLineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="60%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#34d399" />
                </linearGradient>

                {/* Drop shadow glow filter */}
                <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#10b981" floodOpacity="0.4" />
                </filter>
              </defs>

              {/* Horizontal Gridlines & Y-Axis Ticks */}
              {chartConfig.yTicks.map((tick, i) => (
                <g key={i}>
                  <text
                    x={chartConfig.padLeft - 10}
                    y={tick.y + 4}
                    textAnchor="end"
                    fill="#64748b"
                    fontSize="11"
                    fontFamily="monospace"
                  >
                    ₹{tick.val >= 1000 ? `${(tick.val / 1000).toFixed(0)}k` : tick.val}
                  </text>
                  <line
                    x1={chartConfig.padLeft}
                    y1={tick.y}
                    x2={chartConfig.totalW - chartConfig.padRight}
                    y2={tick.y}
                    stroke="#334155"
                    strokeDasharray="4 4"
                    strokeOpacity={i === chartConfig.yTicks.length - 1 ? '0.8' : '0.4'}
                  />
                </g>
              ))}

              {/* Area fill under the line */}
              <path
                d={chartConfig.curvedArea}
                fill="url(#revenueAreaGradient)"
                className="transition-all duration-300"
              />

              {/* Main Line Stroke */}
              <path
                d={chartConfig.curvedLine}
                fill="none"
                stroke="url(#revenueLineGradient)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#lineGlow)"
                className="transition-all duration-300"
              />

              {/* Milestone Dots for Non-Zero Daily Revenue */}
              {chartConfig.points.map((pt, i) => {
                if (pt.day.dailyRevenue === 0) return null;
                const isHovered = hoveredDayIndex === i;
                return (
                  <g key={i}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? '7' : '4.5'}
                      fill="#10b981"
                      stroke="#0f172a"
                      strokeWidth="2"
                      className="transition-all duration-150"
                    />
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? '11' : '7'}
                      fill="#10b981"
                      fillOpacity="0.25"
                      className="animate-pulse"
                    />
                  </g>
                );
              })}

              {/* Active Hover Crosshair Line & Target Marker */}
              {hoveredDayIndex !== null && chartConfig.points[hoveredDayIndex] && (
                <g>
                  {/* Vertical Guide Line */}
                  <line
                    x1={chartConfig.points[hoveredDayIndex].x}
                    y1={chartConfig.padTop}
                    x2={chartConfig.points[hoveredDayIndex].x}
                    y2={chartConfig.baselineY}
                    stroke="#38bdf8"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    strokeOpacity="0.8"
                  />
                  {/* Outer Pulsing Halo */}
                  <circle
                    cx={chartConfig.points[hoveredDayIndex].x}
                    cy={chartConfig.points[hoveredDayIndex].y}
                    r="10"
                    fill="#38bdf8"
                    fillOpacity="0.3"
                  />
                  {/* Inner Highlight Point */}
                  <circle
                    cx={chartConfig.points[hoveredDayIndex].x}
                    cy={chartConfig.points[hoveredDayIndex].y}
                    r="5.5"
                    fill="#38bdf8"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                  />
                </g>
              )}

              {/* X-Axis Date Labels (Every 5 days + last day) */}
              {chartConfig.points.map((pt, idx) => {
                const showLabel = idx % 5 === 0 || idx === 29;
                if (!showLabel) return null;

                const isEnd = idx === 29;
                return (
                  <g key={idx}>
                    <line
                      x1={pt.x}
                      y1={chartConfig.baselineY}
                      x2={pt.x}
                      y2={chartConfig.baselineY + 5}
                      stroke="#475569"
                    />
                    <text
                      x={pt.x}
                      y={chartConfig.baselineY + 18}
                      textAnchor="middle"
                      fill={isEnd ? '#34d399' : '#94a3b8'}
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight={isEnd ? 'bold' : 'normal'}
                    >
                      {isEnd ? 'Today' : pt.day.displayDate}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Bottom Chart Footer Legend */}
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block shadow-sm"></span>
                <span>Active Payment Recorded</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-cyan-400 inline-block"></span>
                <span>Cumulative Trajectory</span>
              </div>
            </div>
            <div className="text-slate-400 font-mono">
              30-Day Span: {thirtyDaysRevenueData.startDateStr} → {thirtyDaysRevenueData.endDateStr}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DRIVER PERFORMANCE & DELIVERIES VISUALIZATION (BAR CHART)                 */}
      {/* ========================================================================= */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
        {/* Section Header with Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Trophy className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Driver Delivery Performance & High-Performer Leaderboard
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Live Metrics
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Bar chart visualization of total completed deliveries per driver to pinpoint high-performing team members.
            </p>
          </div>

          {/* Interactive Chart Controls */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Metric Mode Toggle */}
            <div className="flex items-center rounded-xl bg-slate-950 p-1 border border-slate-800">
              <button
                onClick={() => setMetricMode('deliveries')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  metricMode === 'deliveries'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Visualize total deliveries completed"
              >
                Deliveries Count
              </button>
              <button
                onClick={() => setMetricMode('volume')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  metricMode === 'volume'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Visualize total water volume dispensed"
              >
                Water Volume (L)
              </button>
            </div>

            {/* View Mode Toggle: Vertical Column vs Horizontal Bars */}
            <div className="flex items-center rounded-xl bg-slate-950 p-1 border border-slate-800">
              <button
                onClick={() => setChartMode('vertical')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                  chartMode === 'vertical'
                    ? 'bg-slate-800 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Column Chart</span>
              </button>
              <button
                onClick={() => setChartMode('horizontal')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                  chartMode === 'horizontal'
                    ? 'bg-slate-800 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                <span>Leaderboard</span>
              </button>
            </div>

            {/* Sort Selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'rank' | 'volume' | 'name')}
              className="bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="rank">Sort: Most Deliveries</option>
              <option value="volume">Sort: Water Volume</option>
              <option value="name">Sort: Driver Name</option>
            </select>
          </div>
        </div>

        {/* High Performers Spotlight & KPI Banners */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Top Performer Card */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 border border-amber-500/30 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-15 group-hover:opacity-25 transition-opacity">
              <Trophy className="w-16 h-16 text-amber-400" />
            </div>
            <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <CrownIcon className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>#1 Top Performer</span>
            </div>
            <div className="text-base font-bold text-white truncate">
              {topPerformer ? topPerformer.name : 'No Deliveries Yet'}
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-2 mt-1">
              <span>{topPerformer?.phone}</span>
              <span className="text-slate-600">•</span>
              <span className="font-mono text-amber-300 font-semibold">{topPerformer?.licenseNo}</span>
            </div>
            <div className="mt-3 pt-2.5 border-t border-amber-500/20 flex items-center justify-between text-xs">
              <span className="text-slate-300">Completed Deliveries</span>
              <span className="font-mono text-amber-300 font-bold text-sm">
                {topPerformer?.completedDeliveries || 0}
              </span>
            </div>
          </div>

          {/* Fleet Total Completed */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 shadow-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Total Fleet Deliveries</span>
              <div className="p-1 rounded bg-cyan-500/10 text-cyan-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono text-white mt-1">
              {totalFleetCompleted}
            </div>
            <div className="text-[11px] text-cyan-400 flex items-center gap-1 font-mono">
              <Droplets className="w-3 h-3" />
              <span>{totalWaterDelivered.toLocaleString()} L fulfilled</span>
            </div>
          </div>

          {/* Average per Driver */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 shadow-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Fleet Benchmark Avg.</span>
              <div className="p-1 rounded bg-blue-500/10 text-blue-400">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono text-white mt-1">
              {avgDeliveriesPerDriver} <span className="text-xs font-normal text-slate-400">deliv/driver</span>
            </div>
            <div className="text-[11px] text-slate-400">
              Active Fleet Size: {driverPerformanceList.length} licensed drivers
            </div>
          </div>

          {/* High Performing Members Count */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 shadow-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">High Performers</span>
              <div className="p-1 rounded bg-emerald-500/10 text-emerald-400">
                <Medal className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
              {highPerformersCount} <span className="text-xs font-normal text-slate-400">team members</span>
            </div>
            <div className="text-[11px] text-emerald-400/90 flex items-center gap-1">
              <Star className="w-3 h-3 fill-emerald-400 text-emerald-400" />
              <span>Performing at or above fleet avg</span>
            </div>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* BAR CHART VISUALIZATION AREA                                          */}
        {/* ===================================================================== */}
        {chartMode === 'vertical' ? (
          /* VERTICAL BAR CHART VISUALIZATION */
          <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800/80 relative">
            {/* Chart Legend & Metric Banner */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-6 text-xs text-slate-400">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-gradient-to-t from-amber-500 to-emerald-400 inline-block shadow-sm"></span>
                  <span className="text-white font-medium">#1 Top Performer (MVP)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-gradient-to-t from-cyan-600 to-teal-400 inline-block"></span>
                  <span>High Performer (≥ Avg)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-gradient-to-t from-slate-700 to-blue-600 inline-block"></span>
                  <span>Active Courier</span>
                </div>
              </div>

              <div className="text-[11px] font-mono text-cyan-400/80 bg-cyan-950/40 px-2.5 py-1 rounded-lg border border-cyan-800/30">
                Metric: {metricMode === 'deliveries' ? 'Completed Delivery Trips' : 'Total Liters Delivered'}
              </div>
            </div>

            {/* Chart Canvas with Y-Axis Grid */}
            <div className="relative h-80 flex items-end pl-12 pr-4 pt-6 pb-2">
              {/* Y-Axis Grid Lines & Tick Labels */}
              <div className="absolute inset-0 pl-12 pr-4 pt-6 pb-2 pointer-events-none flex flex-col justify-between">
                {yAxisTicks.map((tickVal, idx) => (
                  <div key={idx} className="relative w-full flex items-center">
                    <span className="absolute -left-12 text-[10px] font-mono text-slate-500 w-9 text-right">
                      {metricMode === 'deliveries' ? tickVal : `${(tickVal / 1000).toFixed(0)}k`}
                    </span>
                    <div className="w-full border-b border-slate-800/70"></div>
                  </div>
                ))}
              </div>

              {/* Bar Columns Container */}
              <div className="relative w-full h-full flex items-end justify-around gap-2 sm:gap-4 z-10">
                {displayDriverList.map((driver) => {
                  const currentValue = metricMode === 'deliveries' ? driver.completedDeliveries : driver.totalLiters;
                  const maxValue = metricMode === 'deliveries' ? maxCompletedDeliveries : maxLitersDelivered;
                  
                  const heightPercent = maxValue > 0
                    ? Math.max(driver.completedDeliveries > 0 ? 14 : 4, (currentValue / maxValue) * 100)
                    : 4;

                  const isSelected = selectedDriverId === driver.driverId;

                  let barGradient = 'from-slate-700 to-blue-600';
                  let barBorder = 'border-slate-600/40';
                  let glowStyle = '';

                  if (driver.isTopPerformer) {
                    barGradient = 'from-amber-500 via-amber-400 to-emerald-400';
                    barBorder = 'border-amber-300/80 ring-2 ring-amber-400/40';
                    glowStyle = 'shadow-lg shadow-amber-500/25';
                  } else if (driver.isHighPerformer) {
                    barGradient = 'from-cyan-600 via-cyan-500 to-teal-400';
                    barBorder = 'border-cyan-400/70';
                    glowStyle = 'shadow-md shadow-cyan-500/20';
                  } else if (driver.completedDeliveries === 0) {
                    barGradient = 'from-slate-800 to-slate-700';
                    barBorder = 'border-slate-700';
                  }

                  return (
                    <div
                      key={driver.driverId}
                      className="group flex-1 max-w-[120px] h-full flex flex-col justify-end items-center cursor-pointer transition-all duration-200"
                      onMouseEnter={() => setHoveredDriverId(driver.driverId)}
                      onMouseLeave={() => setHoveredDriverId(null)}
                      onClick={() => setSelectedDriverId(isSelected ? null : driver.driverId)}
                    >
                      {/* Top Metric Tag / Trophy Badge */}
                      <div className="mb-2 transition-transform duration-200 group-hover:-translate-y-1 flex flex-col items-center">
                        {driver.isTopPerformer && (
                          <div className="p-1 rounded-full bg-amber-500 text-slate-950 shadow-md shadow-amber-500/40 mb-1 animate-bounce">
                            <Trophy className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <span
                          className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md ${
                            driver.isTopPerformer
                              ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                              : driver.isHighPerformer
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {metricMode === 'deliveries'
                            ? `${driver.completedDeliveries} deliv.`
                            : `${(driver.totalLiters / 1000).toFixed(0)}k L`}
                        </span>
                      </div>

                      {/* The Bar Column */}
                      <div className="w-full px-1 sm:px-2 flex justify-center h-full items-end">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full max-w-[64px] rounded-t-xl bg-gradient-to-t ${barGradient} border-t border-x ${barBorder} ${glowStyle} transition-all duration-300 group-hover:brightness-110 group-hover:scale-y-[1.02] origin-bottom relative overflow-hidden`}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          <div className="absolute bottom-0 inset-x-0 h-1.5 bg-white/20"></div>
                        </div>
                      </div>

                      {/* Base Driver Information */}
                      <div className="mt-3 text-center space-y-0.5 w-full">
                        <div className="flex items-center justify-center gap-1">
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              driver.isTopPerformer
                                ? 'bg-amber-400 text-slate-950 font-black'
                                : driver.isHighPerformer
                                ? 'bg-cyan-500 text-slate-950'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {driver.name.charAt(0)}
                          </div>
                          <span className="text-xs font-semibold text-white truncate max-w-[90px]">
                            {driver.name.split(' ')[0]}
                          </span>
                        </div>

                        <div className="text-[10px]">
                          {driver.isTopPerformer ? (
                            <span className="text-amber-400 font-bold flex items-center justify-center gap-0.5">
                              <Star className="w-2.5 h-2.5 fill-amber-400" />
                              <span>#1 MVP</span>
                            </span>
                          ) : driver.isHighPerformer ? (
                            <span className="text-cyan-400 font-medium">Top Tier</span>
                          ) : (
                            <span className="text-slate-500 font-mono">Driver #{driver.driverId}</span>
                          )}
                        </div>

                        <div className="text-[10px] font-mono text-slate-400">
                          {driver.totalLiters.toLocaleString()} L
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dynamic Benchmark Line Overlay */}
            <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <span className="inline-block w-4 border-b-2 border-dashed border-cyan-400"></span>
                <span>Fleet Average Target: <strong className="text-cyan-300 font-mono">{avgDeliveriesPerDriver} deliveries</strong></span>
              </div>
              <span className="text-slate-500 italic">
                Tip: Hover over or click any bar for driver telemetry and volume details.
              </span>
            </div>
          </div>
        ) : (
          /* HORIZONTAL LEADERBOARD BAR CHART VISUALIZATION */
          <div className="space-y-3">
            {displayDriverList.map((driver) => {
              const currentValue = metricMode === 'deliveries' ? driver.completedDeliveries : driver.totalLiters;
              const maxValue = metricMode === 'deliveries' ? maxCompletedDeliveries : maxLitersDelivered;
              const widthPct = maxValue > 0 ? Math.max(5, (currentValue / maxValue) * 100) : 5;
              const isSelected = selectedDriverId === driver.driverId;

              return (
                <div
                  key={driver.driverId}
                  onClick={() => setSelectedDriverId(isSelected ? null : driver.driverId)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    driver.isTopPerformer
                      ? 'bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-950 border-amber-500/40 shadow-md'
                      : driver.isHighPerformer
                      ? 'bg-slate-900/90 border-cyan-500/30'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-[200px]">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                          driver.rank === 1
                            ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400/50'
                            : driver.rank === 2
                            ? 'bg-slate-300 text-slate-900'
                            : driver.rank === 3
                            ? 'bg-amber-700 text-white'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        #{driver.rank}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{driver.name}</span>
                          {driver.isTopPerformer && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                              <Trophy className="w-2.5 h-2.5" />
                              <span>Fleet Leader</span>
                            </span>
                          )}
                          {driver.isHighPerformer && !driver.isTopPerformer && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                              High Performer
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 font-mono">
                          <span>{driver.phone}</span>
                          <span>•</span>
                          <span>{driver.licenseNo}</span>
                          {driver.activeDeliveries > 0 && (
                            <span className="text-emerald-400 font-semibold">• 1 Active En Route</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 max-w-md space-y-1.5">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-400">
                          {metricMode === 'deliveries' ? 'Completed Deliveries' : 'Volume Delivered'}
                        </span>
                        <span className="text-white font-bold">
                          {driver.completedDeliveries} completed ({driver.totalLiters.toLocaleString()} L)
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            driver.isTopPerformer
                              ? 'bg-gradient-to-r from-amber-500 to-emerald-400 shadow-sm shadow-amber-500/50'
                              : driver.isHighPerformer
                              ? 'bg-gradient-to-r from-cyan-500 to-teal-400'
                              : 'bg-gradient-to-r from-slate-600 to-blue-500'
                          }`}
                          style={{ width: `${widthPct}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="text-right min-w-[100px]">
                      <div className="text-lg font-bold font-mono text-cyan-300">
                        {driver.completedDeliveries}
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                        Deliveries
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Selected / Hovered Driver Detail Card */}
        {activeDetailDriver && (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-cyan-400">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">{activeDetailDriver.name}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                    {activeDetailDriver.licenseNo}
                  </span>
                  {activeDetailDriver.isTopPerformer && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      🏆 MVP Team Member
                    </span>
                  )}
                </div>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Phone: {activeDetailDriver.phone} • Status: {activeDetailDriver.activeDeliveries > 0 ? 'Dispatched On Active Route' : 'Idle in Central Depot'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
              <div className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                <span className="text-slate-400">Completed: </span>
                <span className="text-emerald-400 font-bold">{activeDetailDriver.completedDeliveries} Deliveries</span>
              </div>
              <div className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                <span className="text-slate-400">Volume: </span>
                <span className="text-cyan-400 font-bold">{activeDetailDriver.totalLiters.toLocaleString()} L</span>
              </div>
              <div className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                <span className="text-slate-400">Fleet Share: </span>
                <span className="text-amber-400 font-bold">
                  {totalFleetCompleted > 0
                    ? ((activeDetailDriver.completedDeliveries / totalFleetCompleted) * 100).toFixed(0)
                    : 0}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2x2 ANALYTICS BENTO GRID (REVENUE, ZONES, SLOTS, CAPACITY)                 */}
      {/* ========================================================================= */}
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

// Crown icon component
const CrownIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14v2H5v-2z" />
  </svg>
);
