import React, { useState } from 'react';
import {
  Truck,
  CheckCircle2,
  Clock,
  Phone,
  CreditCard,
  AlertCircle,
  MapPin,
  Calendar,
  DollarSign,
  Send,
  X,
  Gauge
} from 'lucide-react';
import {
  BookingDetailView,
  DriverTelemetry,
  Tanker,
  Driver,
  Booking,
  Delivery,
  PaymentMethod
} from '../types.ts';

interface ActiveDeliveriesProps {
  bookingDetails: BookingDetailView[];
  telemetries: Record<number, DriverTelemetry>;
  tankers: Tanker[];
  drivers: Driver[];
  deliveries: Delivery[];
  onCompleteDelivery: (deliveryId: number) => void;
  onDispatchTanker: (bookingId: number, tankerId: number, driverId: number) => void;
  onRecordPayment: (bookingId: number, amount: number, method: PaymentMethod) => void;
  validateDeliveryInsert: (bookingId: number, tankerId: number, driverId: number) => { valid: boolean; error?: string };
}

export const ActiveDeliveries: React.FC<ActiveDeliveriesProps> = ({
  bookingDetails,
  telemetries,
  tankers,
  drivers,
  deliveries,
  onCompleteDelivery,
  onDispatchTanker,
  onRecordPayment,
  validateDeliveryInsert
}) => {
  const [activeTab, setActiveTab] = useState<'in_transit' | 'pending' | 'completed'>('in_transit');
  const [selectedBookingForDispatch, setSelectedBookingForDispatch] = useState<BookingDetailView | null>(null);
  const [selectedBookingForPayment, setSelectedBookingForPayment] = useState<BookingDetailView | null>(null);

  // Dispatch Modal State
  const [selectedTankerId, setSelectedTankerId] = useState<number | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  // Payment Modal State
  const [paymentAmount, setPaymentAmount] = useState<number>(1000);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');

  // Groups
  const inTransitDeliveries = bookingDetails.filter((b) => b.BookingStatus === 'Assigned' && b.DeliveryID !== null);
  const pendingBookings = bookingDetails.filter((b) => b.BookingStatus === 'Pending');
  const completedDeliveries = bookingDetails.filter((b) => b.BookingStatus === 'Delivered');

  const handleOpenDispatchModal = (b: BookingDetailView) => {
    setSelectedBookingForDispatch(b);
    setDispatchError(null);

    // Auto-select first matching tanker and driver if available
    const matchingTanker = tankers.find(
      (t) => t.Status === 'Available' && t.TypeID === b.TypeID
    );
    const idleDriver = drivers.find((dr) => {
      const isOffDuty = dr.IsOnDuty === false;
      const isBusy = deliveries.some((d) => d.DriverID === dr.DriverID && d.DeliveredTime === null);
      return !isOffDuty && !isBusy;
    });

    setSelectedTankerId(matchingTanker?.TankerID || null);
    setSelectedDriverId(idleDriver?.DriverID || null);
  };

  const handleConfirmDispatch = () => {
    if (!selectedBookingForDispatch || !selectedTankerId || !selectedDriverId) {
      setDispatchError('Please select both an available tanker and an idle driver.');
      return;
    }

    const check = validateDeliveryInsert(
      selectedBookingForDispatch.BookingID,
      selectedTankerId,
      selectedDriverId
    );

    if (!check.valid) {
      setDispatchError(check.error || 'Trigger validation failed');
      return;
    }

    try {
      onDispatchTanker(
        selectedBookingForDispatch.BookingID,
        selectedTankerId,
        selectedDriverId
      );
      setSelectedBookingForDispatch(null);
    } catch (err: any) {
      setDispatchError(err.message);
    }
  };

  const handleConfirmPayment = () => {
    if (!selectedBookingForPayment) return;
    onRecordPayment(selectedBookingForPayment.BookingID, paymentAmount, paymentMethod);
    setSelectedBookingForPayment(null);
  };

  return (
    <div className="space-y-6">
      {/* Header and Subtabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Truck className="w-5 h-5 text-cyan-400" />
            <span>Delivery Operations & Dispatch Control</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor real-time progress, dispatch pending tanker orders, and process customer receipts.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('in_transit')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'in_transit'
                ? 'bg-amber-500/20 text-amber-300 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>In Transit ({inTransitDeliveries.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'pending'
                ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Pending Orders ({pendingBookings.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'completed'
                ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Completed ({completedDeliveries.length})</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'in_transit' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {inTransitDeliveries.length === 0 ? (
            <div className="col-span-full py-16 text-center bg-slate-900/50 rounded-2xl border border-slate-800">
              <Truck className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm font-medium">No active deliveries in transit right now.</p>
              <p className="text-slate-500 text-xs mt-1">Check the Pending tab to dispatch waiting tanker requests.</p>
            </div>
          ) : (
            inTransitDeliveries.map((b) => {
              const tel = b.DeliveryID ? telemetries[b.DeliveryID] : undefined;
              const hasPayment = b.PaidAmount !== null;

              return (
                <div
                  key={`transit-${b.BookingID}`}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 shadow-xl transition-all flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    {/* Header: Plate & Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                          <Truck className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="font-mono text-base font-bold text-white tracking-wide">
                            {b.License_Plate}
                          </span>
                          <span className="text-xs text-slate-400 ml-2 font-mono">
                            ({b.Capacity_Liters.toLocaleString()} L)
                          </span>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                        IN TRANSIT
                      </span>
                    </div>

                    {/* Progress Bar & Telemetry */}
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Speed: <strong className="text-white font-mono">{tel?.speedKmh || 32} km/h</strong></span>
                        </span>
                        <span className="text-amber-300 font-mono flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>ETA: <strong>{tel?.etaMinutes || 10} mins</strong></span>
                        </span>
                      </div>

                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-cyan-500 to-amber-500 h-2 rounded-full transition-all duration-700"
                          style={{ width: `${tel?.progressPercent || 45}%` }}
                        ></div>
                      </div>

                      <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                        <span>Central Depot</span>
                        <span>{tel?.progressPercent || 45}% en route</span>
                        <span>Customer Tank</span>
                      </div>
                    </div>

                    {/* Driver & Customer Info */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 space-y-1">
                        <div className="text-slate-400 text-[10px] uppercase font-semibold tracking-wider">Driver</div>
                        <div className="text-white font-medium">{b.DriverName}</div>
                        <div className="text-slate-400 text-[11px] flex items-center gap-1">
                          <Phone className="w-3 h-3 text-cyan-400" />
                          <a href={`tel:${b.DriverPhone}`} className="hover:text-cyan-300 font-mono">
                            {b.DriverPhone}
                          </a>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 space-y-1">
                        <div className="text-slate-400 text-[10px] uppercase font-semibold tracking-wider">Customer</div>
                        <div className="text-white font-medium">{b.CustomerName}</div>
                        <div className="text-slate-400 text-[11px] truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-emerald-400" />
                          <span>{b.AreaName}</span>
                        </div>
                      </div>
                    </div>

                    {/* Address details */}
                    <div className="text-xs text-slate-400 flex items-start gap-1.5 px-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                      <span className="text-slate-300">{b.Street}, {b.AreaName} (PIN {b.Pincode})</span>
                    </div>
                  </div>

                  {/* Footer Action Buttons */}
                  <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between gap-3">
                    {/* Payment Status */}
                    {hasPayment ? (
                      <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Paid ₹{b.PaidAmount} ({b.PaymentMethod})</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedBookingForPayment(b);
                          setPaymentAmount(b.Price);
                        }}
                        className="text-xs text-amber-300 hover:text-amber-200 underline font-medium flex items-center gap-1"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Pending Payment (₹{b.Price})</span>
                      </button>
                    )}

                    {/* Mark Delivered Button */}
                    <button
                      onClick={() => b.DeliveryID && onCompleteDelivery(b.DeliveryID)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm Delivered</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Pending Orders Tab */}
      {activeTab === 'pending' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pendingBookings.length === 0 ? (
            <div className="col-span-full py-16 text-center bg-slate-900/50 rounded-2xl border border-slate-800">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
              <p className="text-slate-300 text-sm font-medium">All customer bookings have been dispatched!</p>
              <p className="text-slate-500 text-xs mt-1">Use "+ New Booking" to schedule a new tanker delivery.</p>
            </div>
          ) : (
            pendingBookings.map((b) => (
              <div
                key={`pending-${b.BookingID}`}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-xl flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-slate-400">Order #{b.BookingID}</span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                      PENDING DISPATCH
                    </span>
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-white">{b.CustomerName}</h4>
                    <p className="text-xs text-slate-400 font-mono">+91 {b.CustomerPhone}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Capacity:</span>
                      <span className="font-semibold text-cyan-300 font-mono">{b.Capacity_Liters.toLocaleString()} Liters</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Rate:</span>
                      <span className="font-semibold text-emerald-400 font-mono">₹{b.Price}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Scheduled Date:</span>
                      <span className="text-slate-200 font-mono">{b.ScheduledDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Slot:</span>
                      <span className="text-slate-200">{b.TimeSlot}</span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-400 flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                    <span>{b.Street}, {b.AreaName}</span>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-800/80">
                  <button
                    onClick={() => handleOpenDispatchModal(b)}
                    className="w-full py-2.5 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-md shadow-cyan-600/25"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Assign & Dispatch Tanker</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Completed Deliveries Tab */}
      {activeTab === 'completed' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] text-slate-400 uppercase font-mono tracking-wider">
                <tr>
                  <th className="py-3 px-4">Booking ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Tanker Plate</th>
                  <th className="py-3 px-4">Driver</th>
                  <th className="py-3 px-4">Delivered At</th>
                  <th className="py-3 px-4">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {completedDeliveries.map((b) => (
                  <tr key={`completed-${b.BookingID}`} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-white">#{b.BookingID}</td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-white">{b.CustomerName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{b.CustomerPhone}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div>{b.AreaName}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">{b.Street}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-amber-300">{b.License_Plate || 'N/A'}</td>
                    <td className="py-3 px-4">{b.DriverName || 'N/A'}</td>
                    <td className="py-3 px-4 font-mono text-slate-400">{b.DeliveredTime || 'N/A'}</td>
                    <td className="py-3 px-4">
                      {b.PaidAmount ? (
                        <span className="inline-flex items-center gap-1 font-mono text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>₹{b.PaidAmount} ({b.PaymentMethod})</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedBookingForPayment(b);
                            setPaymentAmount(b.Price);
                          }}
                          className="text-amber-400 hover:underline font-mono text-xs"
                        >
                          Record Payment (₹{b.Price})
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DISPATCH TANKER MODAL (Enforcing MySQL Triggers) */}
      {selectedBookingForDispatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative space-y-5">
            <button
              onClick={() => setSelectedBookingForDispatch(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono uppercase tracking-wider">
                <Truck className="w-4 h-4" />
                <span>MySQL Trigger Protected Dispatch</span>
              </div>
              <h3 className="text-lg font-bold text-white mt-1">
                Dispatch Tanker for Booking #{selectedBookingForDispatch.BookingID}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Target: <strong>{selectedBookingForDispatch.CustomerName}</strong> ({selectedBookingForDispatch.Capacity_Liters.toLocaleString()} L water requested)
              </p>
            </div>

            {/* Error Banner */}
            {dispatchError && (
              <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Database Validation Error</div>
                  <div className="font-mono text-[11px] mt-0.5">{dispatchError}</div>
                </div>
              </div>
            )}

            {/* Selection Form */}
            <div className="space-y-4 text-xs">
              {/* Select Tanker */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  1. Select Available Tanker (Must Match {selectedBookingForDispatch.Capacity_Liters.toLocaleString()} L)
                </label>
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-1">
                  {tankers.map((t) => {
                    const isSelected = selectedTankerId === t.TankerID;
                    const isTypeMatch = t.TypeID === selectedBookingForDispatch.TypeID;
                    const isAvailable = t.Status === 'Available';

                    return (
                      <div
                        key={`modal-tanker-${t.TankerID}`}
                        onClick={() => setSelectedTankerId(t.TankerID)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-cyan-950/40 border-cyan-500 text-white shadow-sm'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={isSelected}
                            onChange={() => setSelectedTankerId(t.TankerID)}
                            className="text-cyan-500"
                          />
                          <span className="font-mono font-bold">{t.License_Plate}</span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px]">
                          <span
                            className={`px-2 py-0.5 rounded font-mono ${
                              isTypeMatch ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                            }`}
                          >
                            Type #{t.TypeID} {isTypeMatch ? '(Match)' : '(Mismatch)'}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded ${
                              isAvailable ? 'bg-slate-800 text-emerald-400' : 'bg-slate-800 text-amber-400'
                            }`}
                          >
                            {t.Status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Select Driver */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  2. Select Driver (Must not have active delivery)
                </label>
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-1">
                  {drivers.map((dr) => {
                    const isSelected = selectedDriverId === dr.DriverID;
                    const isBusy = deliveries.some((d) => d.DriverID === dr.DriverID && d.DeliveredTime === null);
                    const isOffDuty = dr.IsOnDuty === false;

                    return (
                      <div
                        key={`modal-driver-${dr.DriverID}`}
                        onClick={() => {
                          if (isOffDuty) {
                            setDispatchError(`Driver ${dr.Name} is currently OFF DUTY. Toggle them On Duty in the Fleet tab.`);
                            return;
                          }
                          if (isBusy) {
                            setDispatchError(`Driver ${dr.Name} is currently on an active delivery.`);
                            return;
                          }
                          setDispatchError(null);
                          setSelectedDriverId(dr.DriverID);
                        }}
                        className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                          isOffDuty
                            ? 'bg-slate-950/40 border-slate-800/40 opacity-50 cursor-not-allowed text-slate-500'
                            : isBusy
                            ? 'bg-slate-950 border-slate-800/70 text-slate-400 cursor-not-allowed'
                            : isSelected
                            ? 'bg-cyan-950/40 border-cyan-500 text-white shadow-sm cursor-pointer'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={isSelected}
                            disabled={isOffDuty || isBusy}
                            onChange={() => !isOffDuty && !isBusy && setSelectedDriverId(dr.DriverID)}
                            className="text-cyan-500 disabled:opacity-40"
                          />
                          <span className="font-medium">{dr.Name}</span>
                          <span className="text-[11px] text-slate-500 font-mono">({dr.License_No})</span>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded text-[11px] ${
                            isOffDuty
                              ? 'bg-slate-800 text-slate-400 border border-slate-700 font-mono'
                              : isBusy
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-emerald-950 text-emerald-300'
                          }`}
                        >
                          {isOffDuty ? 'Off Duty' : isBusy ? 'Busy On Delivery' : 'Available'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Trigger Notes */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <span className="font-semibold text-slate-300 font-mono">Trigger trg_delivery_after_insert:</span>
              <p>
                Submitting will atomically set Tanker status to <strong>Dispatched</strong> and Booking status to <strong>Assigned</strong>.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedBookingForDispatch(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDispatch}
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white font-semibold text-xs transition-all shadow-md shadow-cyan-600/25 flex items-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Execute Dispatch</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {selectedBookingForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setSelectedBookingForPayment(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <span>Record Customer Payment</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Order #{selectedBookingForPayment.BookingID} • {selectedBookingForPayment.CustomerName}
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Amount (₹)</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['UPI', 'Cash', 'Card', 'NetBanking'] as PaymentMethod[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`p-2.5 rounded-xl border text-center font-medium transition-all ${
                        paymentMethod === m
                          ? 'bg-cyan-950/50 border-cyan-500 text-cyan-300 font-semibold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                onClick={() => setSelectedBookingForPayment(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPayment}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Payment</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
