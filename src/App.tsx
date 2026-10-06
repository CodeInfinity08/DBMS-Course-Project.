/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useDatabase } from './db/databaseStore.ts';
import { useDriverTelemetry } from './utils/telemetrySimulation.ts';
import { playChime } from './utils/audio.ts';
import { Navbar } from './components/Navbar.tsx';
import { DashboardOverview } from './components/DashboardOverview.tsx';
import { LiveMap } from './components/LiveMap.tsx';
import { ActiveDeliveries } from './components/ActiveDeliveries.tsx';
import { FleetInventory } from './components/FleetInventory.tsx';
import { BookingsView } from './components/BookingsView.tsx';
import { CustomersView } from './components/CustomersView.tsx';
import { DatabaseEditor } from './components/DatabaseEditor.tsx';
import { AnalyticsView } from './components/AnalyticsView.tsx';
import { ToastNotificationContainer, DeliveryToast } from './components/ToastNotification.tsx';
import { ActiveNavTab, BookingDetailView, PaymentMethod, TankerStatus, TimeSlot } from './types.ts';
import { Truck, X, AlertCircle, Send, CheckCircle2, Calendar, Search, Users, Plus } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveNavTab>('dashboard');
  const [simulationSpeed, setSimulationSpeed] = useState<number>(1);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Database hook with exact MySQL schema & triggers
  const {
    db,
    bookingDetailsView,
    resetDatabase,
    validateDeliveryInsert,
    dispatchTanker,
    completeDelivery,
    updateTankerStatus,
    updateDriverDuty,
    addTanker,
    addDriver,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addCustomerWithAddress,
    createCustomerBookingAtomic,
    addAddress,
    addBooking,
    updateBooking,
    deleteBooking,
    cancelBooking,
    recordPayment,
    insertTableRow,
    updateTableRow,
    deleteTableRow,
    generateSQLDump
  } = useDatabase();

  // Active Toast Notifications for dispatch alerts
  const [toasts, setToasts] = useState<DeliveryToast[]>([]);

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Trigger sound and toast notification when completing delivery
  const handleCompleteDelivery = (deliveryId: number) => {
    const del = db.deliveries.find((d) => d.DeliveryID === deliveryId);
    if (!del || del.DeliveredTime !== null) return;

    // Look up detailed info from bookingDetailsView
    const booking = bookingDetailsView.find((b) => b.DeliveryID === deliveryId);
    const driver = db.drivers.find((dr) => dr.DriverID === del.DriverID);
    const tanker = db.tankers.find((t) => t.TankerID === del.TankerID);

    // 1. Update database
    completeDelivery(deliveryId);

    // 2. Play existing audio chime utility
    if (soundEnabled) {
      playChime('delivered');
    }

    // 3. Build rich dispatcher toast alert
    const driverName = booking?.DriverName || driver?.Name || 'Fleet Driver';
    const tankerPlate = booking?.License_Plate || tanker?.License_Plate || 'TS01WT1001';
    const customerName = booking?.CustomerName || 'Resident Customer';
    const areaName = booking?.AreaName || 'Municipal Zone';
    const capacityLiters = booking?.Capacity_Liters || 6000;
    const price = booking?.Price;

    const newToast: DeliveryToast = {
      id: `delivery-${deliveryId}-${Date.now()}`,
      deliveryId,
      bookingId: booking?.BookingID,
      driverName,
      driverPhone: booking?.DriverPhone || driver?.Phone,
      tankerPlate,
      customerName,
      areaName,
      street: booking?.Street,
      pincode: booking?.Pincode,
      capacityLiters,
      price,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      soundPlayed: soundEnabled,
    };

    setToasts((prev) => [newToast, ...prev.slice(0, 4)]);
  };

  // Test chime & toast notification
  const handleTestDeliveryAlert = () => {
    if (soundEnabled) {
      playChime('delivered');
    }

    const sampleDriver = db.drivers[0] || { Name: 'Ramesh Goud', Phone: '9100000001' };
    const sampleTanker = db.tankers[0] || { License_Plate: 'TS01WT1001' };
    const sampleArea = db.areas[0] || { AreaName: 'Gandhi Nagar' };

    const testToast: DeliveryToast = {
      id: `test-${Date.now()}`,
      deliveryId: 99,
      bookingId: 1,
      driverName: sampleDriver.Name,
      driverPhone: sampleDriver.Phone,
      tankerPlate: sampleTanker.License_Plate,
      customerName: 'Rajesh Sharma',
      areaName: sampleArea.AreaName,
      capacityLiters: 6000,
      price: 1000,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      soundPlayed: soundEnabled,
    };

    setToasts((prev) => [testToast, ...prev.slice(0, 4)]);
  };

  // Real-time GPS Telemetry simulation with automatic arrival callback
  const { telemetries } = useDriverTelemetry(
    db.deliveries,
    db.bookings,
    db.tankers,
    db.drivers,
    db.addresses,
    db.tankerTypes,
    simulationSpeed,
    handleCompleteDelivery
  );

  // Global Quick Dispatch Modal
  const [isQuickDispatchOpen, setIsQuickDispatchOpen] = useState(false);
  const [selectedQuickBookingId, setSelectedQuickBookingId] = useState<number | null>(null);
  const [selectedQuickTankerId, setSelectedQuickTankerId] = useState<number | null>(null);
  const [selectedQuickDriverId, setSelectedQuickDriverId] = useState<number | null>(null);
  const [quickDispatchError, setQuickDispatchError] = useState<string | null>(null);

  // Global Quick Booking Modal
  const [isQuickBookingOpen, setIsQuickBookingOpen] = useState(false);
  const [quickCustomerMode, setQuickCustomerMode] = useState<'existing' | 'new'>('existing');
  const [quickCustomerSearch, setQuickCustomerSearch] = useState('');
  const [quickCustId, setQuickCustId] = useState<number>(1);
  const [quickNewCustName, setQuickNewCustName] = useState('');
  const [quickNewCustPhone, setQuickNewCustPhone] = useState('');
  const [quickNewAreaId, setQuickNewAreaId] = useState<number>(1);
  const [quickNewStreet, setQuickNewStreet] = useState('');
  const [quickBookingError, setQuickBookingError] = useState<string | null>(null);

  const [quickAddrId, setQuickAddrId] = useState<number>(1);
  const [quickTypeId, setQuickTypeId] = useState<number>(2);
  const [quickDate, setQuickDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [quickSlot, setQuickSlot] = useState<TimeSlot>('09:00-12:00');

  // Trigger sound when dispatching
  const handleDispatch = (bookingId: number, tankerId: number, driverId: number) => {
    dispatchTanker(bookingId, tankerId, driverId);
    if (soundEnabled) playChime('dispatch');
  };

  // Open dispatch pre-configured for a specific booking
  const handleOpenDispatchForBooking = (b: BookingDetailView) => {
    setSelectedQuickBookingId(b.BookingID);
    const matchingTanker = db.tankers.find((t) => t.Status === 'Available' && t.TypeID === b.TypeID);
    const idleDriver = db.drivers.find((dr) => {
      const isOffDuty = dr.IsOnDuty === false;
      const isBusy = db.deliveries.some((d) => d.DriverID === dr.DriverID && d.DeliveredTime === null);
      return !isOffDuty && !isBusy;
    });
    setSelectedQuickTankerId(matchingTanker?.TankerID || null);
    setSelectedQuickDriverId(idleDriver?.DriverID || null);
    setQuickDispatchError(null);
    setIsQuickDispatchOpen(true);
  };

  const handleOpenGeneralDispatch = () => {
    const firstPending = db.bookings.find((b) => b.Status === 'Pending');
    if (firstPending) {
      const view = bookingDetailsView.find((v) => v.BookingID === firstPending.BookingID);
      if (view) {
        handleOpenDispatchForBooking(view);
        return;
      }
    }
    setSelectedQuickBookingId(firstPending?.BookingID || null);
    setQuickDispatchError(null);
    setIsQuickDispatchOpen(true);
  };

  const handleExecuteQuickDispatch = () => {
    if (!selectedQuickBookingId || !selectedQuickTankerId || !selectedQuickDriverId) {
      setQuickDispatchError('Please select a booking, available tanker, and idle driver.');
      return;
    }

    const check = validateDeliveryInsert(selectedQuickBookingId, selectedQuickTankerId, selectedQuickDriverId);
    if (!check.valid) {
      setQuickDispatchError(check.error || 'Trigger validation error');
      if (soundEnabled) playChime('alert');
      return;
    }

    try {
      handleDispatch(selectedQuickBookingId, selectedQuickTankerId, selectedQuickDriverId);
      setIsQuickDispatchOpen(false);
    } catch (e: any) {
      setQuickDispatchError(e.message);
      if (soundEnabled) playChime('alert');
    }
  };

  const handleExportSQL = () => {
    const dump = generateSQLDump();
    const blob = new Blob([dump], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `water_tanker_db_export_${new Date().toISOString().split('T')[0]}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetWithConfirm = () => {
    if (window.confirm('Reset database to the initial MySQL sample data script? All your modifications will be refreshed.')) {
      resetDatabase();
      if (soundEnabled) playChime('click');
    }
  };

  const pendingBookingsList = db.bookings.filter((b) => b.Status === 'Pending');
  const selectedBookingData = selectedQuickBookingId
    ? bookingDetailsView.find((b) => b.BookingID === selectedQuickBookingId)
    : undefined;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        tankers={db.tankers}
        deliveries={db.deliveries}
        simulationSpeed={simulationSpeed}
        setSimulationSpeed={setSimulationSpeed}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        onOpenNewBooking={() => setIsQuickBookingOpen(true)}
        onOpenDispatch={handleOpenGeneralDispatch}
        onResetDB={handleResetWithConfirm}
        onExportSQL={handleExportSQL}
        onTestAlert={handleTestDeliveryAlert}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardOverview
            bookingDetails={bookingDetailsView}
            telemetries={telemetries}
            tankers={db.tankers}
            drivers={db.drivers}
            deliveries={db.deliveries}
            tankerTypes={db.tankerTypes}
            onNavigateToTab={setActiveTab}
            onOpenDispatch={handleOpenGeneralDispatch}
            onOpenNewBooking={() => setIsQuickBookingOpen(true)}
            onCompleteDelivery={handleCompleteDelivery}
          />
        )}

        {activeTab === 'livemap' && (
          <LiveMap
            bookingDetails={bookingDetailsView}
            telemetries={telemetries}
            tankers={db.tankers}
            drivers={db.drivers}
            addresses={db.addresses}
            areas={db.areas}
            deliveries={db.deliveries}
            onCompleteDelivery={handleCompleteDelivery}
            onDispatchToAddress={(addressId) => {
              const booking = bookingDetailsView.find((b) => b.AddressID === addressId && b.BookingStatus === 'Pending');
              if (booking) {
                handleOpenDispatchForBooking(booking);
              } else {
                setActiveTab('bookings');
              }
            }}
          />
        )}

        {activeTab === 'deliveries' && (
          <ActiveDeliveries
            bookingDetails={bookingDetailsView}
            telemetries={telemetries}
            tankers={db.tankers}
            drivers={db.drivers}
            deliveries={db.deliveries}
            onCompleteDelivery={handleCompleteDelivery}
            onDispatchTanker={handleDispatch}
            onRecordPayment={(bookingId, amount, method) => recordPayment(bookingId, amount, method)}
            validateDeliveryInsert={validateDeliveryInsert}
          />
        )}

        {activeTab === 'fleet' && (
          <FleetInventory
            tankers={db.tankers}
            tankerTypes={db.tankerTypes}
            drivers={db.drivers}
            deliveries={db.deliveries}
            onUpdateTankerStatus={updateTankerStatus}
            onAddTanker={addTanker}
            onAddDriver={addDriver}
            onUpdateDriverDuty={updateDriverDuty}
          />
        )}

        {activeTab === 'bookings' && (
          <BookingsView
            bookingDetails={bookingDetailsView}
            customers={db.customers}
            areas={db.areas}
            addresses={db.addresses}
            tankerTypes={db.tankerTypes}
            onCancelBooking={cancelBooking}
            onAddCustomer={addCustomer}
            onAddAddress={addAddress}
            onAddBooking={addBooking}
            onOpenDispatchForBooking={handleOpenDispatchForBooking}
            onCreateCustomerBookingAtomic={createCustomerBookingAtomic}
            onUpdateBooking={updateBooking}
            onDeleteBooking={deleteBooking}
          />
        )}

        {activeTab === 'customers' && (
          <CustomersView
            customers={db.customers}
            addresses={db.addresses}
            areas={db.areas}
            bookings={db.bookings}
            bookingDetails={bookingDetailsView}
            tankerTypes={db.tankerTypes}
            onAddCustomer={addCustomer}
            onAddCustomerWithAddress={addCustomerWithAddress}
            onUpdateCustomer={updateCustomer}
            onDeleteCustomer={deleteCustomer}
            onBookForCustomer={(customerId) => {
              setQuickCustomerMode('existing');
              setQuickCustId(customerId);
              const matchingAddr = db.addresses.find((a) => a.CustomerID === customerId);
              if (matchingAddr) setQuickAddrId(matchingAddr.AddressID);
              setIsQuickBookingOpen(true);
            }}
          />
        )}

        {activeTab === 'database' && (
          <DatabaseEditor
            db={db}
            bookingDetailsView={bookingDetailsView}
            insertTableRow={insertTableRow}
            updateTableRow={updateTableRow}
            deleteTableRow={deleteTableRow}
            resetDatabase={resetDatabase}
            generateSQLDump={generateSQLDump}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView
            bookingDetails={bookingDetailsView}
            areas={db.areas}
            payments={db.payments}
            tankerTypes={db.tankerTypes}
            drivers={db.drivers}
            deliveries={db.deliveries}
          />
        )}
      </main>

      {/* QUICK DISPATCH MODAL */}
      {isQuickDispatchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setIsQuickDispatchOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono uppercase tracking-wider">
                <Truck className="w-4 h-4" />
                <span>MySQL Trigger-Enforced Tanker Dispatch</span>
              </div>
              <h3 className="text-lg font-bold text-white mt-1">Dispatch Water Tanker</h3>
              <p className="text-xs text-slate-400">
                Trigger validation verifies: Booking Pending, Tanker Available, Type/Capacity match, Driver idle.
              </p>
            </div>

            {quickDispatchError && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span className="font-mono">{quickDispatchError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              {/* Select Booking */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">1. Select Pending Order</label>
                {pendingBookingsList.length === 0 ? (
                  <div className="p-3 rounded-xl bg-slate-950 text-slate-400 text-center">
                    No pending orders. Create a booking first!
                  </div>
                ) : (
                  <select
                    value={selectedQuickBookingId || ''}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      setSelectedQuickBookingId(id);
                      const target = bookingDetailsView.find((b) => b.BookingID === id);
                      if (target) {
                        const matching = db.tankers.find((t) => t.Status === 'Available' && t.TypeID === target.TypeID);
                        setSelectedQuickTankerId(matching?.TankerID || null);
                      }
                    }}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    {pendingBookingsList.map((b) => {
                      const view = bookingDetailsView.find((v) => v.BookingID === b.BookingID);
                      return (
                        <option key={b.BookingID} value={b.BookingID}>
                          Order #{b.BookingID} - {view?.CustomerName} ({view?.Capacity_Liters.toLocaleString()} L) - {b.ScheduledDate}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              {/* Select Tanker */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  2. Select Available Tanker{' '}
                  {selectedBookingData && (
                    <span className="text-cyan-400 font-normal">
                      (Req: {selectedBookingData.Capacity_Liters.toLocaleString()} L / Type #{selectedBookingData.TypeID})
                    </span>
                  )}
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                  {db.tankers.map((t) => {
                    const isSelected = selectedQuickTankerId === t.TankerID;
                    const type = db.tankerTypes.find((tt) => tt.TypeID === t.TypeID);
                    const isAvailable = t.Status === 'Available';
                    const isTypeMatch = selectedBookingData ? t.TypeID === selectedBookingData.TypeID : true;

                    return (
                      <div
                        key={`quick-tk-${t.TankerID}`}
                        onClick={() => setSelectedQuickTankerId(t.TankerID)}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-cyan-950/50 border-cyan-500 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-white text-xs">{t.License_Plate}</span>
                          <span
                            className={`text-[9px] px-1 rounded font-mono ${
                              isAvailable ? 'text-emerald-400' : 'text-amber-400'
                            }`}
                          >
                            {t.Status}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {type?.Capacity_Liters.toLocaleString()} L {!isTypeMatch && <span className="text-rose-400 font-bold">(Mismatch)</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Select Driver */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">3. Select Idle Driver</label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  {db.drivers.map((dr) => {
                    const isSelected = selectedQuickDriverId === dr.DriverID;
                    const isBusy = db.deliveries.some((d) => d.DriverID === dr.DriverID && d.DeliveredTime === null);
                    const isOffDuty = dr.IsOnDuty === false;

                    return (
                      <div
                        key={`quick-dr-${dr.DriverID}`}
                        onClick={() => {
                          if (isOffDuty) {
                            setQuickDispatchError(`Driver ${dr.Name} is currently OFF DUTY. Toggle them On Duty in the Fleet tab.`);
                            if (soundEnabled) playChime('alert');
                            return;
                          }
                          if (isBusy) {
                            setQuickDispatchError(`Driver ${dr.Name} is currently on an active delivery.`);
                            if (soundEnabled) playChime('alert');
                            return;
                          }
                          setQuickDispatchError(null);
                          setSelectedQuickDriverId(dr.DriverID);
                        }}
                        className={`p-2.5 rounded-xl border transition-all ${
                          isOffDuty
                            ? 'bg-slate-950/40 border-slate-800/40 text-slate-500 opacity-60 cursor-not-allowed'
                            : isBusy
                            ? 'bg-slate-950 border-slate-800/70 text-slate-400 cursor-not-allowed'
                            : isSelected
                            ? 'bg-cyan-950/50 border-cyan-500 text-white cursor-pointer'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 cursor-pointer'
                        }`}
                      >
                        <div className="font-semibold text-white truncate flex items-center justify-between">
                          <span>{dr.Name}</span>
                          {isOffDuty && (
                            <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                              OFF DUTY
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between mt-0.5">
                          <span>{dr.Phone}</span>
                          <span
                            className={
                              isOffDuty
                                ? 'text-slate-500 font-semibold'
                                : isBusy
                                ? 'text-amber-400 font-bold'
                                : 'text-emerald-400'
                            }
                          >
                            {isOffDuty ? 'Unavailable' : isBusy ? 'Busy' : 'Ready'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsQuickDispatchOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteQuickDispatch}
                disabled={pendingBookingsList.length === 0}
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-cyan-600/20 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Confirm & Dispatch</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK NEW BOOKING MODAL */}
      {isQuickBookingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setIsQuickBookingOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono uppercase tracking-wider">
                <Calendar className="w-4 h-4" />
                <span>Quick Booking Schedule</span>
              </div>
              <h3 className="text-base font-bold text-white mt-1">Book Water Tanker</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Select an existing customer or register a new customer with delivery location.
              </p>
            </div>

            {quickBookingError && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{quickBookingError}</span>
              </div>
            )}

            {/* Mode Switcher */}
            <div className="flex p-0.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-medium">
              <button
                type="button"
                onClick={() => {
                  setQuickCustomerMode('existing');
                  setQuickBookingError(null);
                }}
                className={`flex-1 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                  quickCustomerMode === 'existing'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Existing Customer</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuickCustomerMode('new');
                  setQuickBookingError(null);
                }}
                className={`flex-1 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                  quickCustomerMode === 'new'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ New Customer</span>
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setQuickBookingError(null);

                try {
                  if (quickCustomerMode === 'new') {
                    if (!quickNewCustName.trim()) {
                      setQuickBookingError('Customer name is required.');
                      return;
                    }
                    if (!/^\d{10}$/.test(quickNewCustPhone.trim())) {
                      setQuickBookingError('Mobile phone must be exactly 10 digits.');
                      return;
                    }
                    if (!quickNewStreet.trim()) {
                      setQuickBookingError('Street address is required.');
                      return;
                    }

                    createCustomerBookingAtomic({
                      customerName: quickNewCustName.trim(),
                      customerPhone: quickNewCustPhone.trim(),
                      areaId: quickNewAreaId,
                      street: quickNewStreet.trim(),
                      typeId: quickTypeId,
                      scheduledDate: quickDate,
                      timeSlot: quickSlot
                    });

                    setQuickNewCustName('');
                    setQuickNewCustPhone('');
                    setQuickNewStreet('');
                  } else {
                    if (!quickAddrId) {
                      setQuickBookingError('Please select a delivery address for the customer.');
                      return;
                    }
                    addBooking(quickAddrId, quickTypeId, quickDate, quickSlot);
                  }

                  setIsQuickBookingOpen(false);
                  if (soundEnabled) playChime('click');
                } catch (err: any) {
                  setQuickBookingError(err.message || 'Failed to create booking.');
                }
              }}
              className="space-y-3.5 text-xs"
            >
              {/* Existing Customer Selector */}
              {quickCustomerMode === 'existing' ? (
                <>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Select Customer</label>
                    <div className="space-y-1.5">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Filter customers by name or phone..."
                          value={quickCustomerSearch}
                          onChange={(e) => setQuickCustomerSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-xs"
                        />
                      </div>

                      <select
                        value={quickCustId}
                        onChange={(e) => {
                          const cid = Number(e.target.value);
                          setQuickCustId(cid);
                          const matchingAddr = db.addresses.find((a) => a.CustomerID === cid);
                          if (matchingAddr) setQuickAddrId(matchingAddr.AddressID);
                        }}
                        className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                      >
                        {db.customers
                          .filter((c) => {
                            if (!quickCustomerSearch.trim()) return true;
                            const q = quickCustomerSearch.toLowerCase();
                            return c.Name.toLowerCase().includes(q) || c.Phone.includes(q);
                          })
                          .map((c) => (
                            <option key={c.CustomerID} value={c.CustomerID}>
                              {c.Name} (+91 {c.Phone})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Delivery Address</label>
                    <select
                      value={quickAddrId}
                      onChange={(e) => setQuickAddrId(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                    >
                      {db.addresses.filter((a) => a.CustomerID === quickCustId).length === 0 ? (
                        <option disabled value="">No address found for this client</option>
                      ) : (
                        db.addresses
                          .filter((a) => a.CustomerID === quickCustId)
                          .map((a) => {
                            const area = db.areas.find((ar) => ar.AreaID === a.AreaID);
                            return (
                              <option key={a.AddressID} value={a.AddressID}>
                                {a.Street}, {area?.AreaName}
                              </option>
                            );
                          })
                      )}
                    </select>
                  </div>
                </>
              ) : (
                /* New Customer Registration Fields */
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 text-[10px] mb-1">Full Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Arvind Rao"
                        value={quickNewCustName}
                        onChange={(e) => setQuickNewCustName(e.target.value)}
                        className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[10px] mb-1">10-Digit Mobile *</label>
                      <input
                        type="tel"
                        maxLength={10}
                        placeholder="9876543210"
                        value={quickNewCustPhone}
                        onChange={(e) => setQuickNewCustPhone(e.target.value.replace(/\D/g, ''))}
                        className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">Delivery Area *</label>
                    <select
                      value={quickNewAreaId}
                      onChange={(e) => setQuickNewAreaId(Number(e.target.value))}
                      className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                    >
                      {db.areas.map((ar) => (
                        <option key={ar.AreaID} value={ar.AreaID}>
                          {ar.AreaName} (PIN {ar.Pincode})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">Street Address *</label>
                    <input
                      type="text"
                      placeholder="e.g. Flat 104, Sai Residency, Main Road"
                      value={quickNewStreet}
                      onChange={(e) => setQuickNewStreet(e.target.value)}
                      className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-medium mb-1">Tanker Capacity</label>
                <div className="grid grid-cols-3 gap-2">
                  {db.tankerTypes.map((tt) => (
                    <button
                      key={tt.TypeID}
                      type="button"
                      onClick={() => setQuickTypeId(tt.TypeID)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        quickTypeId === tt.TypeID
                          ? 'bg-cyan-950/50 border-cyan-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold font-mono">{tt.Capacity_Liters.toLocaleString()} L</div>
                      <div className="text-[10px] text-emerald-400 font-mono mt-0.5">₹{tt.Price}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Scheduled Date</label>
                  <input
                    type="date"
                    required
                    value={quickDate}
                    onChange={(e) => setQuickDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Time Slot</label>
                  <select
                    value={quickSlot}
                    onChange={(e) => setQuickSlot(e.target.value as TimeSlot)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="06:00-09:00">06:00 - 09:00 AM</option>
                    <option value="09:00-12:00">09:00 - 12:00 PM</option>
                    <option value="12:00-15:00">12:00 - 03:00 PM</option>
                    <option value="15:00-18:00">03:00 - 06:00 PM</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsQuickBookingOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-600/20"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{quickCustomerMode === 'new' ? 'Register & Book' : 'Confirm Booking'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Real-time Dispatcher Toast Notifications */}
      <ToastNotificationContainer
        toasts={toasts}
        onDismiss={handleDismissToast}
        onNavigateToBooking={() => setActiveTab('deliveries')}
        soundEnabled={soundEnabled}
        onTestChime={handleTestDeliveryAlert}
      />
    </div>
  );
}
