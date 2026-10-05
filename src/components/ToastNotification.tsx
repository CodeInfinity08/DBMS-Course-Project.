import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  X,
  Volume2,
  VolumeX,
  Truck,
  Droplets,
  MapPin,
  Clock,
  ExternalLink,
  Bell,
  Sparkles
} from 'lucide-react';

export interface DeliveryToast {
  id: string;
  deliveryId: number;
  bookingId?: number;
  driverName: string;
  driverPhone?: string;
  tankerPlate: string;
  customerName: string;
  areaName: string;
  street?: string;
  pincode?: string;
  capacityLiters: number;
  price?: number;
  timestamp: string;
  soundPlayed: boolean;
}

interface ToastNotificationContainerProps {
  toasts: DeliveryToast[];
  onDismiss: (id: string) => void;
  onNavigateToBooking?: (bookingId: number) => void;
  soundEnabled: boolean;
  onTestChime?: () => void;
}

export const ToastNotificationContainer: React.FC<ToastNotificationContainerProps> = ({
  toasts,
  onDismiss,
  onNavigateToBooking,
  soundEnabled,
  onTestChime
}) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 sm:right-6 z-50 flex flex-col gap-3 max-w-sm sm:max-w-md w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => onDismiss(toast.id)}
          onNavigate={() => toast.bookingId && onNavigateToBooking?.(toast.bookingId)}
          soundEnabled={soundEnabled}
        />
      ))}
    </div>
  );
};

interface ToastItemProps {
  toast: DeliveryToast;
  onDismiss: () => void;
  onNavigate?: () => void;
  soundEnabled: boolean;
}

const ToastItem: React.FC<ToastItemProps> = ({
  toast,
  onDismiss,
  onNavigate,
  soundEnabled
}) => {
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const duration = 6500; // 6.5 seconds auto-dismiss

  useEffect(() => {
    if (isPaused) return;

    const intervalTime = 50;
    const step = (intervalTime / duration) * 100;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev <= step) {
          clearInterval(interval);
          onDismiss();
          return 0;
        }
        return prev - step;
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [isPaused, onDismiss, duration]);

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="pointer-events-auto relative overflow-hidden rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-emerald-500/50 shadow-2xl shadow-emerald-500/15 text-slate-100 p-4 transition-all duration-300 animate-in slide-in-from-right-8 fade-in-50"
      role="alert"
    >
      {/* Top Accent Gradient Line */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-400"></div>

      {/* Header Badge & Action Icons */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-emerald-400">
            Delivery Completed
          </span>
          <span className="text-[10px] text-slate-500 font-mono">• {toast.timestamp}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {toast.soundPlayed ? (
            <span
              className="p-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              title="Tri-Tone Audio Alert Triggered"
            >
              <Volume2 className="w-3.5 h-3.5" />
            </span>
          ) : (
            <span
              className="p-1 rounded-md bg-slate-800 text-slate-500"
              title="Sound was muted"
            >
              <VolumeX className="w-3.5 h-3.5" />
            </span>
          )}

          <button
            onClick={onDismiss}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Core Message Details */}
      <div className="space-y-2">
        <div className="flex items-start gap-3">
          {/* Driver Avatar */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center text-slate-950 font-black text-sm shrink-0 shadow-md shadow-emerald-500/20">
            {toast.driverName.charAt(0)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm truncate">
                {toast.driverName}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-cyan-300 border border-slate-700 shrink-0">
                {toast.tankerPlate}
              </span>
            </div>

            <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-1 truncate">
              <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>
                <strong>{toast.customerName}</strong> in {toast.areaName}
              </span>
            </p>
          </div>
        </div>

        {/* Payload & Action Row */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
          <div className="flex items-center gap-2 font-mono">
            <span className="text-cyan-400 flex items-center gap-1 font-semibold">
              <Droplets className="w-3.5 h-3.5" />
              <span>{toast.capacityLiters.toLocaleString()} L Fulfilled</span>
            </span>
            {toast.price && (
              <span className="text-emerald-400 font-semibold">• ₹{toast.price}</span>
            )}
          </div>

          {onNavigate && toast.bookingId && (
            <button
              onClick={onNavigate}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 hover:underline"
            >
              <span>View Booking</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Auto-dismiss Countdown Progress Bar */}
      <div className="absolute bottom-0 inset-x-0 h-1 bg-slate-800">
        <div
          className="h-full bg-emerald-500 transition-all ease-linear"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
};
