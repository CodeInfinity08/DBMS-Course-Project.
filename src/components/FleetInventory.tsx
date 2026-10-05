import React, { useState } from 'react';
import {
  Truck,
  Layers,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Plus,
  X,
  Phone,
  Droplets,
  ShieldCheck
} from 'lucide-react';
import {
  Tanker,
  TankerType,
  Driver,
  Delivery,
  TankerStatus
} from '../types.ts';
import { CENTRAL_DEPOT } from '../db/initialData.ts';

interface FleetInventoryProps {
  tankers: Tanker[];
  tankerTypes: TankerType[];
  drivers: Driver[];
  deliveries: Delivery[];
  onUpdateTankerStatus: (tankerId: number, status: TankerStatus) => void;
  onAddTanker: (typeId: number, licensePlate: string, status?: TankerStatus) => void;
  onAddDriver: (name: string, phone: string, licenseNo: string) => void;
  onUpdateDriverDuty?: (driverId: number, isOnDuty: boolean) => void;
}

export const FleetInventory: React.FC<FleetInventoryProps> = ({
  tankers,
  tankerTypes,
  drivers,
  deliveries,
  onUpdateTankerStatus,
  onAddTanker,
  onAddDriver,
  onUpdateDriverDuty
}) => {
  const [filterStatus, setFilterStatus] = useState<'All' | TankerStatus>('All');
  const [isAddTankerOpen, setIsAddTankerOpen] = useState(false);
  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);

  // New Tanker Form State
  const [newTankerType, setNewTankerType] = useState<number>(2);
  const [newTankerPlate, setNewTankerPlate] = useState<string>('');
  const [tankerError, setTankerError] = useState<string | null>(null);

  // New Driver Form State
  const [newDriverName, setNewDriverName] = useState<string>('');
  const [newDriverPhone, setNewDriverPhone] = useState<string>('');
  const [newDriverLicense, setNewDriverLicense] = useState<string>('');
  const [driverError, setDriverError] = useState<string | null>(null);

  // Stats calculation
  const totalTankers = tankers.length;
  const availableTankers = tankers.filter((t) => t.Status === 'Available').length;
  const dispatchedTankers = tankers.filter((t) => t.Status === 'Dispatched').length;
  const maintenanceTankers = tankers.filter((t) => t.Status === 'Maintenance').length;

  const totalFleetWaterCapacity = tankers.reduce((sum, t) => {
    const type = tankerTypes.find((tt) => tt.TypeID === t.TypeID);
    return sum + (type?.Capacity_Liters || 0);
  }, 0);

  const activeMobileCapacity = tankers
    .filter((t) => t.Status === 'Dispatched')
    .reduce((sum, t) => {
      const type = tankerTypes.find((tt) => tt.TypeID === t.TypeID);
      return sum + (type?.Capacity_Liters || 0);
    }, 0);

  const filteredTankers = tankers.filter((t) => {
    if (filterStatus === 'All') return true;
    return t.Status === filterStatus;
  });

  const handleCreateTanker = (e: React.FormEvent) => {
    e.preventDefault();
    setTankerError(null);
    if (!newTankerPlate.trim()) {
      setTankerError('License plate is required.');
      return;
    }
    try {
      onAddTanker(newTankerType, newTankerPlate.trim());
      setNewTankerPlate('');
      setIsAddTankerOpen(false);
    } catch (err: any) {
      setTankerError(err.message);
    }
  };

  const handleCreateDriver = (e: React.FormEvent) => {
    e.preventDefault();
    setDriverError(null);
    if (!newDriverName.trim() || !newDriverPhone.trim() || !newDriverLicense.trim()) {
      setDriverError('All fields are required.');
      return;
    }
    if (!/^\d{10}$/.test(newDriverPhone.trim())) {
      setDriverError('Phone number must be exactly 10 digits.');
      return;
    }
    try {
      onAddDriver(newDriverName.trim(), newDriverPhone.trim(), newDriverLicense.trim());
      setNewDriverName('');
      setNewDriverPhone('');
      setNewDriverLicense('');
      setIsAddDriverOpen(false);
    } catch (err: any) {
      setDriverError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Quick Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <span>Fleet Inventory & Driver Asset Tracking</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor tanker maintenance status, vehicle capacities, and driver allocations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddTankerOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white transition-all shadow-md shadow-cyan-600/20 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Tanker</span>
          </button>

          <button
            onClick={() => setIsAddDriverOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Driver</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Total Fleet Size</span>
            <Truck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1">{totalTankers}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {totalFleetWaterCapacity.toLocaleString()} L Total Mobile Capacity
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Available at Depot</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-300 mt-1">{availableTankers}</div>
          <div className="text-[11px] text-slate-500 mt-1">Ready for Immediate Dispatch</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Dispatched / Active</span>
            <Truck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-300 mt-1">{dispatchedTankers}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {activeMobileCapacity.toLocaleString()} L Currently on Road
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>In Maintenance</span>
            <Wrench className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-300 mt-1">{maintenanceTankers}</div>
          <div className="text-[11px] text-slate-500 mt-1">Workshop or Inspection</div>
        </div>
      </div>

      {/* Central Water Storage Reservoir Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-cyan-950/20 to-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Droplets className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">{CENTRAL_DEPOT.name}</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-800">
                ACTIVE RESERVOIR
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{CENTRAL_DEPOT.address}</p>
          </div>
        </div>

        <div className="w-full md:w-72 space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-400">Reservoir Water Level</span>
            <span className="font-mono text-cyan-300 font-bold">
              {CENTRAL_DEPOT.currentStorageLiters.toLocaleString()} / {CENTRAL_DEPOT.totalWaterSupplyLiters.toLocaleString()} L
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-cyan-400 h-2.5 rounded-full"
              style={{
                width: `${(CENTRAL_DEPOT.currentStorageLiters / CENTRAL_DEPOT.totalWaterSupplyLiters) * 100}%`
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* Tankers Fleet Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Truck className="w-4 h-4 text-cyan-400" />
            <span>Tankers ({filteredTankers.length})</span>
          </h3>

          {/* Filter Pills */}
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            {(['All', 'Available', 'Dispatched', 'Maintenance'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1 rounded-lg transition-colors font-medium ${
                  filterStatus === s
                    ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTankers.map((tanker) => {
            const type = tankerTypes.find((tt) => tt.TypeID === tanker.TypeID);
            const activeDel = deliveries.find((d) => d.TankerID === tanker.TankerID && d.DeliveredTime === null);

            return (
              <div
                key={`tanker-card-${tanker.TankerID}`}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 shadow-xl space-y-4 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono text-base font-bold text-white tracking-wide">
                      {tanker.License_Plate}
                    </span>
                    <span className="text-xs text-slate-500 ml-2 font-mono">ID #{tanker.TankerID}</span>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold ${
                      tanker.Status === 'Available'
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : tanker.Status === 'Dispatched'
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {tanker.Status.toUpperCase()}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Capacity:</span>
                    <span className="font-bold text-cyan-300 font-mono">
                      {type?.Capacity_Liters.toLocaleString()} Liters
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Standard Rate:</span>
                    <span className="font-bold text-emerald-400 font-mono">₹{type?.Price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Type Category:</span>
                    <span className="text-slate-300 font-mono">Type #{tanker.TypeID}</span>
                  </div>
                </div>

                {activeDel && (
                  <div className="text-xs text-amber-300 bg-amber-950/30 p-2.5 rounded-xl border border-amber-800/40 flex items-center gap-2">
                    <Truck className="w-3.5 h-3.5 shrink-0" />
                    <span>Active on Delivery #{activeDel.DeliveryID}</span>
                  </div>
                )}

                {/* Direct Status Toggle (Available <-> Maintenance) */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Manage Status:</span>
                  <select
                    value={tanker.Status}
                    onChange={(e) => onUpdateTankerStatus(tanker.TankerID, e.target.value as TankerStatus)}
                    disabled={tanker.Status === 'Dispatched'}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 disabled:opacity-50"
                  >
                    <option value="Available">Available</option>
                    <option value="Maintenance">Maintenance</option>
                    {tanker.Status === 'Dispatched' && <option value="Dispatched">Dispatched</option>}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Driver Asset Management Roster */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-cyan-400" />
              <span>Authorized Drivers ({drivers.length})</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Toggle driver duty status to immediately update availability in the database and prevent dispatching off-duty personnel.
            </p>
          </div>

          {/* Quick Roster Status Badges */}
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[11px] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>{drivers.filter((d) => d.IsOnDuty !== false).length} On Duty</span>
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-400 font-mono text-[11px] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-500"></span>
              <span>{drivers.filter((d) => d.IsOnDuty === false).length} Off Duty</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {drivers.map((driver) => {
            const activeDel = deliveries.find((d) => d.DriverID === driver.DriverID && d.DeliveredTime === null);
            const isOnDuty = driver.IsOnDuty !== false;

            return (
              <div
                key={`driver-card-${driver.DriverID}`}
                className={`border rounded-2xl p-4 shadow-xl space-y-3 transition-all ${
                  !isOnDuty
                    ? 'bg-slate-950/60 border-slate-800/60 opacity-80 ring-1 ring-slate-800/50'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Header with Avatar & Status */}
                <div className="flex items-center justify-between">
                  <div
                    className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs ${
                      !isOnDuty
                        ? 'bg-slate-900 border-slate-800 text-slate-500'
                        : activeDel
                        ? 'bg-amber-950 border-amber-800/60 text-amber-400'
                        : 'bg-cyan-950 border-cyan-800/60 text-cyan-400'
                    }`}
                  >
                    {driver.Name.charAt(0)}
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 ${
                      !isOnDuty
                        ? 'bg-slate-800/80 text-slate-400 border border-slate-700/80'
                        : activeDel
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {!isOnDuty ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                        <span>OFF DUTY</span>
                      </>
                    ) : activeDel ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                        <span>ON DELIVERY</span>
                      </>
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span>AVAILABLE</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Driver Info */}
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center justify-between">
                    <span>{driver.Name}</span>
                    <span className="text-[10px] font-mono text-slate-500 font-normal">#{driver.DriverID}</span>
                  </h4>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3 text-cyan-400" />
                    <a href={`tel:${driver.Phone}`} className="hover:text-cyan-300 font-mono">
                      +91 {driver.Phone}
                    </a>
                  </div>
                </div>

                {/* License Tag */}
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                  <span className="font-mono">{driver.License_No}</span>
                </div>

                {/* ON / OFF DUTY TOGGLE SWITCH */}
                <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-semibold text-slate-300">Duty Status</span>
                    <span className={`text-[10px] font-mono ${isOnDuty ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {isOnDuty ? 'On Duty' : 'Off Duty'}
                    </span>
                  </div>

                  {/* Accessible Toggle Switch */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isOnDuty}
                    onClick={() => onUpdateDriverDuty?.(driver.DriverID, !isOnDuty)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                      isOnDuty ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                    title={isOnDuty ? 'Click to switch Off Duty (prevents dispatch)' : 'Click to switch On Duty (available for dispatch)'}
                  >
                    <span className="sr-only">Toggle duty status</span>
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        isOnDuty ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ADD TANKER MODAL */}
      {isAddTankerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setIsAddTankerOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-cyan-400" />
                <span>Add Tanker to Fleet</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Registers a new vehicle in the TANKER relational table.</p>
            </div>

            {tankerError && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs">
                {tankerError}
              </div>
            )}

            <form onSubmit={handleCreateTanker} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">License Plate (e.g. TS01WT1007)</label>
                <input
                  type="text"
                  required
                  placeholder="TS01WT1007"
                  value={newTankerPlate}
                  onChange={(e) => setNewTankerPlate(e.target.value.toUpperCase())}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:border-cyan-500 focus:outline-none uppercase"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Tanker Capacity (TypeID)</label>
                <div className="grid grid-cols-3 gap-2">
                  {tankerTypes.map((tt) => (
                    <button
                      key={tt.TypeID}
                      type="button"
                      onClick={() => setNewTankerType(tt.TypeID)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        newTankerType === tt.TypeID
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

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddTankerOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-md shadow-cyan-600/20"
                >
                  Register Tanker
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD DRIVER MODAL */}
      {isAddDriverOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setIsAddDriverOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-cyan-400" />
                <span>Register Driver</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Inserts authorized personnel into the DRIVER table.</p>
            </div>

            {driverError && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs">
                {driverError}
              </div>
            )}

            <form onSubmit={handleCreateDriver} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anand Varma"
                  value={newDriverName}
                  onChange={(e) => setNewDriverName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Phone Number (10 digits)</label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="9100000005"
                  value={newDriverPhone}
                  onChange={(e) => setNewDriverPhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Driver License No (e.g. DL-2026-0005)</label>
                <input
                  type="text"
                  required
                  placeholder="DL-2026-0005"
                  value={newDriverLicense}
                  onChange={(e) => setNewDriverLicense(e.target.value.toUpperCase())}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:border-cyan-500 focus:outline-none uppercase"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddDriverOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-md shadow-cyan-600/20"
                >
                  Add Driver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
