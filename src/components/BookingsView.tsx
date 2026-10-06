import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Search,
  Filter,
  Plus,
  X,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  DollarSign,
  Ban,
  Edit2,
  Trash2,
  Users
} from 'lucide-react';
import {
  BookingDetailView,
  Customer,
  Area,
  Address,
  TankerType,
  TimeSlot,
  BookingStatus,
  Booking
} from '../types.ts';

interface BookingsViewProps {
  bookingDetails: BookingDetailView[];
  customers: Customer[];
  areas: Area[];
  addresses: Address[];
  tankerTypes: TankerType[];
  onCancelBooking: (bookingId: number) => void;
  onAddCustomer: (name: string, phone: string) => number | Customer;
  onAddAddress: (customerId: number, areaId: number, street: string, latitude: number, longitude: number) => number;
  onAddBooking: (addressId: number, typeId: number, scheduledDate: string, timeSlot: TimeSlot) => number;
  onOpenDispatchForBooking: (booking: BookingDetailView) => void;
  onCreateCustomerBookingAtomic?: (params: {
    customerName: string;
    customerPhone: string;
    areaId: number;
    street: string;
    typeId: number;
    scheduledDate: string;
    timeSlot: TimeSlot;
    latitude?: number;
    longitude?: number;
  }) => { customerId: number; bookingId: number };
  onUpdateBooking?: (bookingId: number, fields: Partial<Booking>) => void;
  onDeleteBooking?: (bookingId: number) => void;
}

export const BookingsView: React.FC<BookingsViewProps> = ({
  bookingDetails,
  customers,
  areas,
  addresses,
  tankerTypes,
  onCancelBooking,
  onAddCustomer,
  onAddAddress,
  onAddBooking,
  onOpenDispatchForBooking,
  onCreateCustomerBookingAtomic,
  onUpdateBooking,
  onDeleteBooking
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | BookingStatus>('All');
  const [slotFilter, setSlotFilter] = useState<'All' | TimeSlot>('All');
  const [isNewBookingModalOpen, setIsNewBookingModalOpen] = useState(false);

  // New Booking Wizard State
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number>(customers[0]?.CustomerID || 1);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  const [addressMode, setAddressMode] = useState<'existing' | 'new'>('existing');
  const [selectedAddressId, setSelectedAddressId] = useState<number>(addresses[0]?.AddressID || 1);
  const [newAreaId, setNewAreaId] = useState<number>(areas[0]?.AreaID || 1);
  const [newStreet, setNewStreet] = useState('');

  const [selectedTypeId, setSelectedTypeId] = useState<number>(tankerTypes[0]?.TypeID || 1);
  const [scheduledDate, setScheduledDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [timeSlot, setTimeSlot] = useState<TimeSlot>('09:00-12:00');
  const [wizardError, setWizardError] = useState<string | null>(null);

  // Edit Booking Modal State
  const [editingBooking, setEditingBooking] = useState<BookingDetailView | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editSlot, setEditSlot] = useState<TimeSlot>('09:00-12:00');
  const [editTypeId, setEditTypeId] = useState<number>(1);
  const [editStatus, setEditStatus] = useState<BookingStatus>('Pending');
  const [editError, setEditError] = useState<string | null>(null);

  // Customer's existing addresses
  const customerAddresses = useMemo(() => {
    return addresses.filter((a) => a.CustomerID === selectedCustomerId);
  }, [addresses, selectedCustomerId]);

  // Filtered customer list for modal dropdown
  const filteredModalCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return customers;
    const q = customerSearchQuery.toLowerCase();
    return customers.filter(
      (c) => c.Name.toLowerCase().includes(q) || c.Phone.includes(q) || c.CustomerID.toString() === q
    );
  }, [customers, customerSearchQuery]);

  // Filtered Bookings
  const filteredBookings = useMemo(() => {
    return bookingDetails.filter((b) => {
      const matchSearch =
        b.CustomerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.CustomerPhone.includes(searchTerm) ||
        b.Street.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.AreaName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.BookingID.toString().includes(searchTerm);

      const matchStatus = statusFilter === 'All' || b.BookingStatus === statusFilter;
      const matchSlot = slotFilter === 'All' || b.TimeSlot === slotFilter;

      return matchSearch && matchStatus && matchSlot;
    });
  }, [bookingDetails, searchTerm, statusFilter, slotFilter]);

  const handleCreateBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setWizardError(null);

    try {
      if (customerMode === 'new') {
        if (!newCustomerName.trim() || !newCustomerPhone.trim()) {
          setWizardError('Customer Name and 10-digit Phone are required.');
          return;
        }
        if (!/^\d{10}$/.test(newCustomerPhone.trim())) {
          setWizardError('Customer phone must be exactly 10 digits.');
          return;
        }
        if (!newStreet.trim()) {
          setWizardError('Street address is required for new customer.');
          return;
        }

        if (onCreateCustomerBookingAtomic) {
          onCreateCustomerBookingAtomic({
            customerName: newCustomerName.trim(),
            customerPhone: newCustomerPhone.trim(),
            areaId: newAreaId,
            street: newStreet.trim(),
            typeId: selectedTypeId,
            scheduledDate,
            timeSlot
          });
        } else {
          const res = onAddCustomer(newCustomerName.trim(), newCustomerPhone.trim());
          const custId = typeof res === 'number' ? res : res.CustomerID;
          const addrId = onAddAddress(custId, newAreaId, newStreet.trim(), 17.41, 78.47);
          onAddBooking(addrId, selectedTypeId, scheduledDate, timeSlot);
        }

        setIsNewBookingModalOpen(false);
        setNewCustomerName('');
        setNewCustomerPhone('');
        setNewStreet('');
        return;
      }

      // Existing Customer
      let addrId = selectedAddressId;
      if (addressMode === 'new' || customerAddresses.length === 0) {
        if (!newStreet.trim()) {
          setWizardError('Street address is required.');
          return;
        }
        const baseLat = 17.4000 + (Math.random() - 0.5) * 0.015;
        const baseLng = 78.4850 + (Math.random() - 0.5) * 0.015;
        addrId = onAddAddress(
          selectedCustomerId,
          newAreaId,
          newStreet.trim(),
          Number(baseLat.toFixed(6)),
          Number(baseLng.toFixed(6))
        );
      }

      onAddBooking(addrId, selectedTypeId, scheduledDate, timeSlot);
      setIsNewBookingModalOpen(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      setNewStreet('');
    } catch (err: any) {
      setWizardError(err.message || 'Failed to create booking.');
    }
  };

  const handleOpenEditBooking = (b: BookingDetailView) => {
    setEditingBooking(b);
    setEditDate(b.ScheduledDate);
    setEditSlot(b.TimeSlot);
    setEditStatus(b.BookingStatus);
    setEditTypeId(b.TypeID || 1);
    setEditError(null);
  };

  const handleSaveEditBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking || !onUpdateBooking) return;
    try {
      onUpdateBooking(editingBooking.BookingID, {
        ScheduledDate: editDate,
        TimeSlot: editSlot,
        TypeID: editTypeId,
        Status: editStatus
      });
      setEditingBooking(null);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update booking.');
    }
  };

  const handleDeleteBooking = (bookingId: number) => {
    if (window.confirm(`Are you sure you want to delete Booking #${bookingId}? This will remove it from the system.`)) {
      if (onDeleteBooking) {
        onDeleteBooking(bookingId);
      } else {
        onCancelBooking(bookingId);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-400" />
            <span>Water Tanker Bookings Registry</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Relational order lifecycle tracking: Pending &rarr; Assigned &rarr; Delivered / Cancelled.
          </p>
        </div>

        <button
          onClick={() => {
            setIsNewBookingModalOpen(true);
            setWizardError(null);
          }}
          className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all shadow-md shadow-cyan-600/20 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>New Customer Booking</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 p-3 rounded-2xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer name, phone, area, order ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Assigned">Assigned (In Transit)</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <div className="flex items-center gap-1.5 text-slate-400 ml-2">
            <Clock className="w-3.5 h-3.5" />
            <span>Slot:</span>
          </div>
          <select
            value={slotFilter}
            onChange={(e) => setSlotFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
          >
            <option value="All">All Time Slots</option>
            <option value="06:00-09:00">06:00 - 09:00 AM</option>
            <option value="09:00-12:00">09:00 - 12:00 PM</option>
            <option value="12:00-15:00">12:00 - 03:00 PM</option>
            <option value="15:00-18:00">03:00 - 06:00 PM</option>
          </select>
        </div>
      </div>

      {/* Bookings Table View */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] text-slate-400 uppercase font-mono tracking-wider">
              <tr>
                <th className="py-3 px-4">Booking ID</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Address / Area</th>
                <th className="py-3 px-4">Capacity & Rate</th>
                <th className="py-3 px-4">Date & Slot</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Delivery & Driver</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No bookings found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => (
                  <tr key={`bk-${b.BookingID}`} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-white">#{b.BookingID}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{b.CustomerName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">+91 {b.CustomerPhone}</div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="text-slate-300 truncate">{b.Street}</div>
                      <div className="text-[11px] text-slate-500">{b.AreaName} (PIN {b.Pincode})</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-cyan-300">{b.Capacity_Liters.toLocaleString()} L</div>
                      <div className="text-[11px] font-mono text-emerald-400">₹{b.Price}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-slate-200">{b.ScheduledDate}</div>
                      <div className="text-[11px] text-slate-400">{b.TimeSlot}</div>
                    </td>
                    <td className="py-3.5 px-4">
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
                    <td className="py-3.5 px-4">
                      {b.License_Plate ? (
                        <div>
                          <div className="font-mono text-amber-300 font-semibold">{b.License_Plate}</div>
                          <div className="text-[11px] text-slate-400">Driver: {b.DriverName}</div>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Not dispatched</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {b.BookingStatus === 'Pending' && (
                        <button
                          onClick={() => onOpenDispatchForBooking(b)}
                          className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-[11px] transition-colors"
                        >
                          Dispatch
                        </button>
                      )}
                      {b.BookingStatus === 'Assigned' && (
                        <button
                          onClick={() => onCancelBooking(b.BookingID)}
                          className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 font-medium text-[11px] transition-colors"
                          title="Abort & Free Tanker"
                        >
                          Abort
                        </button>
                      )}

                      {/* Edit Booking button */}
                      <button
                        onClick={() => handleOpenEditBooking(b)}
                        className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                        title="Edit Booking"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Booking button */}
                      <button
                        onClick={() => handleDeleteBooking(b.BookingID)}
                        className="p-1 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 transition-colors"
                        title="Delete Booking Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW BOOKING WIZARD MODAL */}
      {isNewBookingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl p-6 shadow-2xl relative space-y-5 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsNewBookingModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono uppercase tracking-wider">
                <Calendar className="w-4 h-4" />
                <span>3NF Relational Order Creation</span>
              </div>
              <h3 className="text-lg font-bold text-white mt-1">Book Water Tanker Delivery</h3>
              <p className="text-xs text-slate-400 mt-1">
                Linked across CUSTOMER &rarr; ADDRESS &rarr; TANKER_TYPE &rarr; BOOKING tables.
              </p>
            </div>

            {wizardError && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{wizardError}</span>
              </div>
            )}

            <form onSubmit={handleCreateBookingSubmit} className="space-y-4 text-xs">
              {/* Customer Selection */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-200">1. Customer Identification</label>
                  <div className="flex rounded-lg bg-slate-900 p-0.5 border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setCustomerMode('existing')}
                      className={`px-2 py-0.5 rounded text-[11px] ${
                        customerMode === 'existing' ? 'bg-cyan-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      Existing Customer
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomerMode('new')}
                      className={`px-2 py-0.5 rounded text-[11px] ${
                        customerMode === 'new' ? 'bg-cyan-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      + New Customer
                    </button>
                  </div>
                </div>

                {customerMode === 'existing' ? (
                  <div className="space-y-2">
                    {/* Search box for customers */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search customer by name or phone..."
                        value={customerSearchQuery}
                        onChange={(e) => setCustomerSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <select
                      value={selectedCustomerId}
                      onChange={(e) => {
                        const cid = Number(e.target.value);
                        setSelectedCustomerId(cid);
                        const custAddrs = addresses.filter((a) => a.CustomerID === cid);
                        if (custAddrs.length > 0) setSelectedAddressId(custAddrs[0].AddressID);
                      }}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                    >
                      {filteredModalCustomers.length === 0 ? (
                        <option disabled>No customers match query</option>
                      ) : (
                        filteredModalCustomers.map((c) => (
                          <option key={c.CustomerID} value={c.CustomerID}>
                            {c.Name} (+91 {c.Phone})
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 text-[10px] mb-1">Full Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Radhika Rao"
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                        className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[10px] mb-1">10-Digit Mobile *</label>
                      <input
                        type="tel"
                        maxLength={10}
                        placeholder="9876543210"
                        value={newCustomerPhone}
                        onChange={(e) => setNewCustomerPhone(e.target.value.replace(/\D/g, ''))}
                        className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Delivery Address */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-200">2. Delivery Address</label>
                  {customerMode === 'existing' && customerAddresses.length > 0 && (
                    <div className="flex rounded-lg bg-slate-900 p-0.5 border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setAddressMode('existing')}
                        className={`px-2 py-0.5 rounded text-[11px] ${
                          addressMode === 'existing' ? 'bg-cyan-600 text-white' : 'text-slate-400'
                        }`}
                      >
                        Saved Address
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddressMode('new')}
                        className={`px-2 py-0.5 rounded text-[11px] ${
                          addressMode === 'new' ? 'bg-cyan-600 text-white' : 'text-slate-400'
                        }`}
                      >
                        + New Address
                      </button>
                    </div>
                  )}
                </div>

                {customerMode === 'existing' && addressMode === 'existing' && customerAddresses.length > 0 ? (
                  <select
                    value={selectedAddressId}
                    onChange={(e) => setSelectedAddressId(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                  >
                    {customerAddresses.map((a) => {
                      const area = areas.find((ar) => ar.AreaID === a.AreaID);
                      return (
                        <option key={a.AddressID} value={a.AddressID}>
                          {a.Street}, {area?.AreaName} (PIN {area?.Pincode})
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-slate-400 text-[10px] mb-1">Select Area Zone *</label>
                      <select
                        value={newAreaId}
                        onChange={(e) => setNewAreaId(Number(e.target.value))}
                        className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                      >
                        {areas.map((ar) => (
                          <option key={ar.AreaID} value={ar.AreaID}>
                            {ar.AreaName} (PIN {ar.Pincode})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[10px] mb-1">Street / House / Landmark *</label>
                      <input
                        type="text"
                        placeholder="e.g. 5-11-20, Greenfield Road"
                        value={newStreet}
                        onChange={(e) => setNewStreet(e.target.value)}
                        className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Tanker Size & Price Selection */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">3. Tanker Capacity & Pricing</label>
                <div className="grid grid-cols-3 gap-2">
                  {tankerTypes.map((tt) => (
                    <button
                      key={tt.TypeID}
                      type="button"
                      onClick={() => setSelectedTypeId(tt.TypeID)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        selectedTypeId === tt.TypeID
                          ? 'bg-cyan-950/60 border-cyan-500 text-white shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold font-mono text-sm text-cyan-300">
                        {tt.Capacity_Liters.toLocaleString()} L
                      </div>
                      <div className="text-xs text-emerald-400 font-mono font-semibold mt-1">₹{tt.Price}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Scheduled Date & Timeslot */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Scheduled Date</label>
                  <input
                    type="date"
                    required
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Delivery Time Slot</label>
                  <select
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value as TimeSlot)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="06:00-09:00">06:00 - 09:00 AM</option>
                    <option value="09:00-12:00">09:00 - 12:00 PM</option>
                    <option value="12:00-15:00">12:00 - 03:00 PM</option>
                    <option value="15:00-18:00">03:00 - 06:00 PM</option>
                  </select>
                </div>
              </div>

              {/* Submit / Cancel */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewBookingModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-md shadow-cyan-600/25 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Booking</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BOOKING MODAL */}
      {editingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setEditingBooking(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-cyan-400" />
                <span>Update Booking #{editingBooking.BookingID}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Client: {editingBooking.CustomerName} • {editingBooking.Street}
              </p>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEditBooking} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Scheduled Date</label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Time Slot</label>
                  <select
                    value={editSlot}
                    onChange={(e) => setEditSlot(e.target.value as TimeSlot)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="06:00-09:00">06:00 - 09:00 AM</option>
                    <option value="09:00-12:00">09:00 - 12:00 PM</option>
                    <option value="12:00-15:00">12:00 - 03:00 PM</option>
                    <option value="15:00-18:00">03:00 - 06:00 PM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Tanker Capacity</label>
                <select
                  value={editTypeId}
                  onChange={(e) => setEditTypeId(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                >
                  {tankerTypes.map((tt) => (
                    <option key={tt.TypeID} value={tt.TypeID}>
                      {tt.Capacity_Liters.toLocaleString()} L - ₹{tt.Price}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Booking Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as BookingStatus)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="Pending">Pending</option>
                  <option value="Assigned">Assigned</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingBooking(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-cyan-600/20"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Update Booking</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
