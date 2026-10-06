import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Droplets,
  AlertCircle,
  CheckCircle2,
  X,
  ExternalLink,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { Customer, Address, Area, Booking, BookingDetailView, TankerType } from '../types.ts';

interface CustomersViewProps {
  customers: Customer[];
  addresses: Address[];
  areas: Area[];
  bookings: Booking[];
  bookingDetails: BookingDetailView[];
  tankerTypes: TankerType[];
  onAddCustomer: (name: string, phone: string) => void;
  onAddCustomerWithAddress: (
    name: string,
    phone: string,
    areaId: number,
    street: string,
    lat?: number,
    lng?: number
  ) => { customer: Customer; address: Address };
  onUpdateCustomer: (customerId: number, updated: { Name?: string; Phone?: string }) => void;
  onDeleteCustomer: (customerId: number, cascade?: boolean) => void;
  onBookForCustomer: (customerId: number) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  addresses,
  areas,
  bookings,
  bookingDetails,
  tankerTypes,
  onAddCustomer,
  onAddCustomerWithAddress,
  onUpdateCustomer,
  onDeleteCustomer,
  onBookForCustomer
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [cascadeDelete, setCascadeDelete] = useState(false);

  // Form states for Add Customer
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [includeAddress, setIncludeAddress] = useState(true);
  const [newAreaId, setNewAreaId] = useState<number>(areas[0]?.AreaID || 1);
  const [newStreet, setNewStreet] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Form states for Edit Customer
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchSearch =
        c.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.Phone.includes(searchTerm) ||
        c.CustomerID.toString().includes(searchTerm);
      return matchSearch;
    });
  }, [customers, searchTerm]);

  // Customer statistics
  const customerStats = useMemo(() => {
    const totalCustomers = customers.length;
    const totalOrders = bookings.length;
    const deliveredOrders = bookings.filter((b) => b.Status === 'Delivered').length;
    const totalRevenue = bookingDetails
      .filter((b) => b.BookingStatus === 'Delivered')
      .reduce((sum, b) => sum + (b.Price || 0), 0);

    return { totalCustomers, totalOrders, deliveredOrders, totalRevenue };
  }, [customers, bookings, bookingDetails]);

  // Handle Add Customer Submit
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    const cleanName = newName.trim();
    const cleanPhone = newPhone.trim();

    if (!cleanName) {
      setModalError('Customer Name is required.');
      return;
    }
    if (!/^\d{10}$/.test(cleanPhone)) {
      setModalError('Customer Phone must be exactly 10 digits.');
      return;
    }

    try {
      if (includeAddress) {
        if (!newStreet.trim()) {
          setModalError('Street address is required when adding an address.');
          return;
        }
        onAddCustomerWithAddress(cleanName, cleanPhone, newAreaId, newStreet.trim());
      } else {
        onAddCustomer(cleanName, cleanPhone);
      }

      setSuccessToast(`Customer "${cleanName}" added successfully!`);
      setTimeout(() => setSuccessToast(null), 4000);
      setIsAddModalOpen(false);
      setNewName('');
      setNewPhone('');
      setNewStreet('');
    } catch (err: any) {
      setModalError(err.message || 'Failed to add customer.');
    }
  };

  // Open Edit Customer
  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setEditName(customer.Name);
    setEditPhone(customer.Phone);
    setEditError(null);
  };

  // Handle Edit Submit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    setEditError(null);

    const cleanName = editName.trim();
    const cleanPhone = editPhone.trim();

    if (!cleanName) {
      setEditError('Customer Name cannot be empty.');
      return;
    }
    if (!/^\d{10}$/.test(cleanPhone)) {
      setEditError('Customer Phone must be exactly 10 digits.');
      return;
    }

    try {
      onUpdateCustomer(editingCustomer.CustomerID, { Name: cleanName, Phone: cleanPhone });
      setSuccessToast(`Customer "${cleanName}" updated successfully!`);
      setTimeout(() => setSuccessToast(null), 4000);
      setEditingCustomer(null);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update customer.');
    }
  };

  // Handle Delete Confirm
  const handleDeleteConfirm = () => {
    if (!deletingCustomer) return;
    try {
      onDeleteCustomer(deletingCustomer.CustomerID, cascadeDelete);
      setSuccessToast(`Customer "${deletingCustomer.Name}" deleted.`);
      setTimeout(() => setSuccessToast(null), 4000);
      setDeletingCustomer(null);
      setCascadeDelete(false);
    } catch (err: any) {
      alert(err.message || 'Failed to delete customer.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            <span>Customer Directory & CRM</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage client profiles, service delivery addresses, order histories, and contact info.
          </p>
        </div>

        <button
          onClick={() => {
            setIsAddModalOpen(true);
            setModalError(null);
          }}
          className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all shadow-md shadow-cyan-600/20 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Success Notification */}
      {successToast && (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] font-medium text-slate-400">Total Registered</div>
          <div className="text-xl font-mono font-bold text-white mt-1">
            {customerStats.totalCustomers}
          </div>
          <div className="text-[10px] text-cyan-400 mt-0.5 flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span>Verified Phone Records</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] font-medium text-slate-400">Total Bookings</div>
          <div className="text-xl font-mono font-bold text-cyan-300 mt-1">
            {customerStats.totalOrders}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-cyan-400" />
            <span>Across All Sectors</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] font-medium text-slate-400">Completed Trips</div>
          <div className="text-xl font-mono font-bold text-emerald-400 mt-1">
            {customerStats.deliveredOrders}
          </div>
          <div className="text-[10px] text-emerald-400/80 mt-0.5 flex items-center gap-1">
            <Droplets className="w-3 h-3" />
            <span>Water Delivered</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] font-medium text-slate-400">Customer Spend</div>
          <div className="text-xl font-mono font-bold text-emerald-300 mt-1">
            ₹{customerStats.totalRevenue.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-emerald-400" />
            <span>Delivered Inflows</span>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 p-3 rounded-2xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search customers by name, phone (+91), or customer ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-2">
          <span>Showing {filteredCustomers.length} of {customers.length} clients</span>
        </div>
      </div>

      {/* Customer List Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] text-slate-400 uppercase font-mono tracking-wider">
              <tr>
                <th className="py-3 px-4">Customer ID</th>
                <th className="py-3 px-4">Name & Profile</th>
                <th className="py-3 px-4">Mobile Phone</th>
                <th className="py-3 px-4">Registered Addresses</th>
                <th className="py-3 px-4">Bookings Count</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No customers found matching "{searchTerm}".
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const custAddresses = addresses.filter((a) => a.CustomerID === cust.CustomerID);
                  const custBookings = bookingDetails.filter((b) => b.CustomerID === cust.CustomerID);
                  const primaryAddr = custAddresses[0];
                  const primaryArea = primaryAddr ? areas.find((ar) => ar.AreaID === primaryAddr.AreaID) : undefined;

                  return (
                    <tr key={`cust-${cust.CustomerID}`} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-cyan-400">
                        #{cust.CustomerID}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white text-sm">{cust.Name}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {custBookings.length > 0 ? (
                            <span className="text-emerald-400">Active client • {custBookings.length} order(s)</span>
                          ) : (
                            <span className="text-slate-500">New registration</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-slate-200 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-cyan-400" />
                          <span>+91 {cust.Phone}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        {custAddresses.length > 0 ? (
                          <div>
                            <div className="text-slate-300 truncate flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                              <span className="truncate">{primaryAddr.Street}</span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {primaryArea?.AreaName} (PIN {primaryArea?.Pincode})
                              {custAddresses.length > 1 && (
                                <span className="ml-1 text-cyan-400 font-mono">
                                  +{custAddresses.length - 1} more
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">No address on file</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-white">
                          {custBookings.length}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {custBookings.filter((b) => b.BookingStatus === 'Delivered').length} Delivered
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5">
                        <button
                          onClick={() => onBookForCustomer(cust.CustomerID)}
                          className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-[11px] transition-colors inline-flex items-center gap-1 shadow-sm"
                          title="Schedule delivery for this customer"
                        >
                          <Calendar className="w-3 h-3" />
                          <span>Book Tanker</span>
                        </button>
                        <button
                          onClick={() => handleOpenEdit(cust)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="Edit Customer Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setDeletingCustomer(cust);
                            setCascadeDelete(false);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 transition-colors"
                          title="Delete Customer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD CUSTOMER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                <span>Add New Customer</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Register a new customer with verified contact details and delivery location.
              </p>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Meera Nambiar"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  10-Digit Mobile Phone *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="9876543210"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-12 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Include Address toggle */}
              <div className="pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-semibold text-slate-200">Delivery Address</label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-400">
                    <input
                      type="checkbox"
                      checked={includeAddress}
                      onChange={(e) => setIncludeAddress(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-800 text-cyan-600 focus:ring-0"
                    />
                    <span>Add Address Now</span>
                  </label>
                </div>

                {includeAddress && (
                  <div className="space-y-2.5 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1">Area / Sector *</label>
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
                      <label className="block text-slate-400 text-[11px] mb-1">Street Address *</label>
                      <input
                        type="text"
                        placeholder="e.g. Flat 302, Green Meadows, Road No 10"
                        value={newStreet}
                        onChange={(e) => setNewStreet(e.target.value)}
                        className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-cyan-600/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Customer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CUSTOMER MODAL */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setEditingCustomer(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-cyan-400" />
                <span>Update Customer #{editingCustomer.CustomerID}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Modify client contact and profile information.
              </p>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Customer Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">10-Digit Mobile Phone</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-12 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-cyan-600/20"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CUSTOMER CONFIRMATION MODAL */}
      {deletingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-rose-800/60 rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setDeletingCustomer(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-400 shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Customer?</h3>
                <p className="text-xs text-slate-300 mt-1">
                  Are you sure you want to delete <strong>{deletingCustomer.Name}</strong> (+91 {deletingCustomer.Phone})?
                </p>
              </div>
            </div>

            {/* Cascade option notice */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cascadeDelete}
                  onChange={(e) => setCascadeDelete(e.target.checked)}
                  className="mt-0.5 rounded bg-slate-900 border-slate-700 text-rose-600 focus:ring-0"
                />
                <div>
                  <span className="font-semibold text-slate-200">
                    Cascade Delete (Addresses & Linked Bookings)
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    If checked, also deletes all delivery addresses, bookings, and delivery links registered for this customer.
                  </p>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCustomer(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-rose-600/20"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
