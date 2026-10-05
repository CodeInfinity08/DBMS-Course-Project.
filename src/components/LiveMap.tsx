import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Truck,
  Droplets,
  Compass,
  Maximize2,
  Minimize2,
  Navigation,
  Phone,
  Clock,
  Gauge,
  Info,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  BookingDetailView,
  DriverTelemetry,
  Tanker,
  Driver,
  Address,
  Area,
  Delivery
} from '../types.ts';
import { CENTRAL_DEPOT } from '../db/initialData.ts';

interface LiveMapProps {
  bookingDetails: BookingDetailView[];
  telemetries: Record<number, DriverTelemetry>;
  tankers: Tanker[];
  drivers: Driver[];
  addresses: Address[];
  areas: Area[];
  deliveries: Delivery[];
  onSelectBooking?: (bookingId: number) => void;
  onCompleteDelivery?: (deliveryId: number) => void;
  onDispatchToAddress?: (addressId: number) => void;
}

export const LiveMap: React.FC<LiveMapProps> = ({
  bookingDetails,
  telemetries,
  tankers,
  drivers,
  addresses,
  areas,
  deliveries,
  onCompleteDelivery,
  onDispatchToAddress
}) => {
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [filterMode, setFilterMode] = useState<'all' | 'active_only' | 'pending'>('all');
  const [selectedEntity, setSelectedEntity] = useState<{
    type: 'depot' | 'tanker' | 'customer';
    id: number | string;
    data?: any;
  } | null>(null);

  // Map bounding box: lat 17.391 to 17.414, lng 78.468 to 78.498
  const MAP_BOUNDS = {
    minLat: 17.3910,
    maxLat: 17.4140,
    minLng: 78.4680,
    maxLng: 78.4980
  };

  const mapWidth = 900;
  const mapHeight = 600;

  // Convert GPS (Lat, Lng) to SVG coordinates (x, y)
  const projectCoordinates = (lat: number, lng: number) => {
    const xRatio = (lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng);
    // Invert Y because latitude increases northward (upward)
    const yRatio = 1 - (lat - MAP_BOUNDS.minLat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat);
    return {
      x: xRatio * mapWidth,
      y: yRatio * mapHeight
    };
  };

  const depotPos = projectCoordinates(CENTRAL_DEPOT.lat, CENTRAL_DEPOT.lng);

  // Active in-transit deliveries
  const activeDeliveries = useMemo(() => {
    return deliveries.filter((d) => d.DeliveredTime === null);
  }, [deliveries]);

  // Address pins with latest booking info
  const mappedAddresses = useMemo(() => {
    return addresses.map((addr) => {
      const area = areas.find((ar) => ar.AreaID === addr.AreaID);
      const bookingsForAddr = bookingDetails.filter((b) => b.AddressID === addr.AddressID);
      const activeBooking = bookingsForAddr.find((b) => b.BookingStatus === 'Assigned');
      const pendingBooking = bookingsForAddr.find((b) => b.BookingStatus === 'Pending');
      const deliveredBooking = bookingsForAddr.find((b) => b.BookingStatus === 'Delivered');

      const primaryBooking = activeBooking || pendingBooking || deliveredBooking || bookingsForAddr[0];
      const pos = projectCoordinates(addr.Latitude, addr.Longitude);

      return {
        ...addr,
        areaName: area?.AreaName || 'Unknown Area',
        pos,
        booking: primaryBooking,
        status: activeBooking ? 'active' : pendingBooking ? 'pending' : deliveredBooking ? 'delivered' : 'idle'
      };
    });
  }, [addresses, areas, bookingDetails]);

  // Filtered address list
  const filteredAddresses = useMemo(() => {
    if (filterMode === 'active_only') {
      return mappedAddresses.filter((a) => a.status === 'active');
    }
    if (filterMode === 'pending') {
      return mappedAddresses.filter((a) => a.status === 'pending');
    }
    return mappedAddresses;
  }, [mappedAddresses, filterMode]);

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-140px)] min-h-[620px]">
      {/* Primary Map Stage */}
      <div className="relative flex-1 rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex flex-col shadow-2xl">
        {/* Top Control Bar */}
        <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
          {/* Status Overlay */}
          <div className="pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 shadow-lg">
            <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 animate-ping"></span>
            <div>
              <div className="text-xs font-bold text-white tracking-wide flex items-center gap-2">
                <span>HYDERABAD WATER DISTRIBUTION GRID</span>
                <span className="text-[10px] text-cyan-400 font-mono">17.40°N 78.48°E</span>
              </div>
              <div className="text-[11px] text-slate-400">
                {activeDeliveries.length} Tankers Dispatched • {filteredAddresses.length} Delivery Nodes Active
              </div>
            </div>
          </div>

          {/* Filter Chips & View Controls */}
          <div className="pointer-events-auto flex items-center gap-2">
            <div className="flex bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/80 shadow-lg text-xs">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1 rounded-lg transition-colors font-medium ${
                  filterMode === 'all' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All Nodes
              </button>
              <button
                onClick={() => setFilterMode('active_only')}
                className={`px-3 py-1 rounded-lg transition-colors font-medium ${
                  filterMode === 'active_only' ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                In Transit ({activeDeliveries.length})
              </button>
              <button
                onClick={() => setFilterMode('pending')}
                className={`px-3 py-1 rounded-lg transition-colors font-medium ${
                  filterMode === 'pending' ? 'bg-blue-500/20 text-blue-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Pending
              </button>
            </div>

            {/* Zoom & Reset Controls */}
            <div className="flex bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-700/80 shadow-lg p-1 text-slate-300">
              <button
                onClick={() => setZoom((z) => Math.min(2.0, z + 0.2))}
                className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
                title="Zoom In"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoom((z) => Math.max(0.8, z - 0.2))}
                className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
                title="Zoom Out"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setZoom(1);
                  setPanOffset({ x: 0, y: 0 });
                }}
                className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
                title="Center Central Depot"
              >
                <Compass className="w-4 h-4 text-cyan-400" />
              </button>
            </div>
          </div>
        </div>

        {/* SVG Interactive Canvas */}
        <div className="relative flex-1 w-full h-full overflow-hidden cursor-grab active:cursor-grabbing bg-radial from-slate-900 via-slate-950 to-black">
          <svg
            viewBox={`0 0 ${mapWidth} ${mapHeight}`}
            className="w-full h-full select-none"
            style={{
              transform: `scale(${zoom}) translate(${panOffset.x}px, ${panOffset.y}px)`,
              transformOrigin: `${depotPos.x}px ${depotPos.y}px`,
              transition: 'transform 0.25s ease-out'
            }}
          >
            <defs>
              {/* Radial gradient for central reservoir radar */}
              <radialGradient id="radarPulse" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
                <stop offset="60%" stopColor="#0891b2" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#0e7490" stopOpacity="0" />
              </radialGradient>

              {/* Water flow line glow */}
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Tactical Coordinate Grid */}
            <g opacity="0.15">
              {[100, 200, 300, 400, 500, 600, 700, 800].map((x) => (
                <line key={`grid-x-${x}`} x1={x} y1="0" x2={x} y2={mapHeight} stroke="#38bdf8" strokeDasharray="3 6" />
              ))}
              {[100, 200, 300, 400, 500].map((y) => (
                <line key={`grid-y-${y}`} x1="0" y1={y} x2={mapWidth} y2={y} stroke="#38bdf8" strokeDasharray="3 6" />
              ))}
            </g>

            {/* Simulated Road Arteries connecting Central Depot to Hubs */}
            <g stroke="#1e293b" strokeWidth="2" strokeLinecap="round" opacity="0.6">
              {mappedAddresses.map((addr) => (
                <line
                  key={`road-${addr.AddressID}`}
                  x1={depotPos.x}
                  y1={depotPos.y}
                  x2={addr.pos.x}
                  y2={addr.pos.y}
                />
              ))}
            </g>

            {/* Active Delivery Route Lines (animated glowing trail) */}
            {activeDeliveries.map((del) => {
              const booking = bookingDetails.find((b) => b.BookingID === del.BookingID);
              if (!booking || !booking.Latitude || !booking.Longitude) return null;
              const targetPos = projectCoordinates(booking.Latitude, booking.Longitude);
              const tel = telemetries[del.DeliveryID];
              const curPos = tel ? projectCoordinates(tel.currentLat, tel.currentLng) : depotPos;

              return (
                <g key={`route-${del.DeliveryID}`}>
                  {/* Base full route path */}
                  <line
                    x1={depotPos.x}
                    y1={depotPos.y}
                    x2={targetPos.x}
                    y2={targetPos.y}
                    stroke="#f59e0b"
                    strokeWidth="2.5"
                    strokeDasharray="6 4"
                    opacity="0.35"
                  />
                  {/* Covered route trail with glow */}
                  <line
                    x1={depotPos.x}
                    y1={depotPos.y}
                    x2={curPos.x}
                    y2={curPos.y}
                    stroke="#38bdf8"
                    strokeWidth="3.5"
                    filter="url(#glow)"
                  />
                </g>
              );
            })}

            {/* Neighborhood Area Zones & Names */}
            {areas.map((area) => {
              // Group addresses by area to compute centroid
              const addrsInArea = mappedAddresses.filter((a) => a.AreaID === area.AreaID);
              if (addrsInArea.length === 0) return null;
              const avgX = addrsInArea.reduce((sum, a) => sum + a.pos.x, 0) / addrsInArea.length;
              const avgY = addrsInArea.reduce((sum, a) => sum + a.pos.y, 0) / addrsInArea.length;

              return (
                <g key={`area-lbl-${area.AreaID}`} className="pointer-events-none">
                  <circle cx={avgX} cy={avgY} r="50" fill="#0369a1" fillOpacity="0.04" stroke="#0ea5e9" strokeOpacity="0.15" strokeDasharray="4 4" />
                  <text
                    x={avgX}
                    y={avgY - 45}
                    textAnchor="middle"
                    fill="#64748b"
                    fontSize="11"
                    fontWeight="600"
                    letterSpacing="0.05em"
                  >
                    {area.AreaName.toUpperCase()}
                  </text>
                  <text
                    x={avgX}
                    y={avgY - 33}
                    textAnchor="middle"
                    fill="#475569"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    PIN: {area.Pincode}
                  </text>
                </g>
              );
            })}

            {/* Destination Address Markers */}
            {filteredAddresses.map((addr) => {
              const isSelected = selectedEntity?.type === 'customer' && selectedEntity?.id === addr.AddressID;
              const statusColor =
                addr.status === 'active'
                  ? '#f59e0b'
                  : addr.status === 'pending'
                  ? '#38bdf8'
                  : addr.status === 'delivered'
                  ? '#10b981'
                  : '#64748b';

              return (
                <g
                  key={`addr-${addr.AddressID}`}
                  className="cursor-pointer transition-transform hover:scale-110"
                  onClick={() =>
                    setSelectedEntity({
                      type: 'customer',
                      id: addr.AddressID,
                      data: addr
                    })
                  }
                >
                  {/* Subtle target circle */}
                  <circle cx={addr.pos.x} cy={addr.pos.y} r={isSelected ? 16 : 12} fill={statusColor} fillOpacity="0.15" stroke={statusColor} strokeWidth={isSelected ? 2 : 1} />
                  <circle cx={addr.pos.x} cy={addr.pos.y} r="5" fill={statusColor} />

                  {/* Marker Pin Icon text */}
                  <text
                    x={addr.pos.x}
                    y={addr.pos.y + 20}
                    textAnchor="middle"
                    fill="#e2e8f0"
                    fontSize="10"
                    fontWeight="600"
                    className="drop-shadow-md select-none"
                  >
                    {addr.booking ? addr.booking.CustomerName.split(' ')[0] : `Node #${addr.AddressID}`}
                  </text>
                </g>
              );
            })}

            {/* Central Water Depot Hub */}
            <g
              className="cursor-pointer"
              onClick={() =>
                setSelectedEntity({
                  type: 'depot',
                  id: 'central_depot',
                  data: CENTRAL_DEPOT
                })
              }
            >
              {/* Radar Expanding Rings */}
              <circle cx={depotPos.x} cy={depotPos.y} r="45" fill="url(#radarPulse)" className="animate-pulse" />
              <circle cx={depotPos.x} cy={depotPos.y} r="28" fill="#0891b2" fillOpacity="0.2" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="3 3" />
              <circle cx={depotPos.x} cy={depotPos.y} r="16" fill="#0284c7" stroke="#38bdf8" strokeWidth="2.5" />

              {/* Water Droplet symbol inside depot */}
              <path
                d={`M ${depotPos.x} ${depotPos.y - 7} C ${depotPos.x + 5} ${depotPos.y - 2} ${depotPos.x + 6} ${depotPos.y + 4} ${depotPos.x} ${depotPos.y + 7} C ${depotPos.x - 6} ${depotPos.y + 4} ${depotPos.x - 5} ${depotPos.y - 2} ${depotPos.x} ${depotPos.y - 7} Z`}
                fill="#ffffff"
              />

              <text
                x={depotPos.x}
                y={depotPos.y + 36}
                textAnchor="middle"
                fill="#38bdf8"
                fontSize="11"
                fontWeight="700"
                letterSpacing="0.05em"
              >
                CENTRAL DEPOT #1
              </text>
              <text
                x={depotPos.x}
                y={depotPos.y + 49}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="9"
                fontFamily="monospace"
              >
                124,000L STORED
              </text>
            </g>

            {/* Real-time Moving Tankers */}
            {activeDeliveries.map((del) => {
              const tel = telemetries[del.DeliveryID];
              if (!tel) return null;
              const tanker = tankers.find((t) => t.TankerID === del.TankerID);
              const driver = drivers.find((d) => d.DriverID === del.DriverID);
              const booking = bookingDetails.find((b) => b.BookingID === del.BookingID);

              const currentPos = projectCoordinates(tel.currentLat, tel.currentLng);
              const isSelected = selectedEntity?.type === 'tanker' && selectedEntity?.id === del.DeliveryID;

              return (
                <g
                  key={`truck-${del.DeliveryID}`}
                  className="cursor-pointer"
                  onClick={() =>
                    setSelectedEntity({
                      type: 'tanker',
                      id: del.DeliveryID,
                      data: { del, tel, tanker, driver, booking }
                    })
                  }
                >
                  {/* Ping ripple effect */}
                  <circle cx={currentPos.x} cy={currentPos.y} r={isSelected ? 26 : 20} fill="#f59e0b" fillOpacity="0.25" className="animate-ping" />
                  <circle cx={currentPos.x} cy={currentPos.y} r={isSelected ? 18 : 15} fill="#0f172a" stroke="#f59e0b" strokeWidth="2.5" />

                  {/* Truck Center Dot */}
                  <circle cx={currentPos.x} cy={currentPos.y} r="5" fill="#f59e0b" />

                  {/* Label badge */}
                  <g transform={`translate(${currentPos.x + 16}, ${currentPos.y - 12})`}>
                    <rect x="0" y="0" width="84" height="26" rx="5" fill="#0f172a" fillOpacity="0.9" stroke="#f59e0b" strokeWidth="1" />
                    <text x="6" y="11" fill="#f59e0b" fontSize="9" fontWeight="700" fontFamily="monospace">
                      {tanker?.License_Plate || 'TANKER'}
                    </text>
                    <text x="6" y="21" fill="#cbd5e1" fontSize="8">
                      {tel.speedKmh} km/h • ETA {tel.etaMinutes}m
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Bottom Legend */}
        <div className="bg-slate-950/80 backdrop-blur-md px-4 py-2.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-cyan-500 border border-cyan-300"></span>
              <span>Central Depot (Source)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              <span>Tanker En Route (Live GPS)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
              <span>Pending Booking</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <span>Delivered</span>
            </div>
          </div>
          <div className="text-[11px] font-mono text-slate-400 hidden sm:block">
            Radar Frequency: 1.5s • Hyderabad Municipal Zone
          </div>
        </div>
      </div>

      {/* Side Inspector / Telemetry Control Panel */}
      <div className="w-full lg:w-80 flex flex-col gap-4">
        {selectedEntity ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-cyan-400" />
                <h3 className="font-semibold text-white text-sm">
                  {selectedEntity.type === 'depot'
                    ? 'Central Depot Operations'
                    : selectedEntity.type === 'tanker'
                    ? 'Active Tanker Telemetry'
                    : 'Customer Delivery Point'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEntity(null)}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700"
              >
                Close
              </button>
            </div>

            {/* Entity Body */}
            {selectedEntity.type === 'depot' && (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="text-slate-400">Facility:</div>
                  <div className="text-white font-medium text-sm">{CENTRAL_DEPOT.name}</div>
                  <div className="text-slate-400 text-[11px]">{CENTRAL_DEPOT.address}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-slate-400 text-[11px]">Current Reserve</div>
                    <div className="text-base font-bold text-cyan-400 font-mono mt-0.5">
                      {CENTRAL_DEPOT.currentStorageLiters.toLocaleString()} L
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-slate-400 text-[11px]">Total Capacity</div>
                    <div className="text-base font-bold text-slate-200 font-mono mt-0.5">
                      {CENTRAL_DEPOT.totalWaterSupplyLiters.toLocaleString()} L
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-cyan-300">
                  <div className="font-semibold mb-1 flex items-center gap-1.5">
                    <Droplets className="w-3.5 h-3.5" /> High Quality Potable Water
                  </div>
                  <p className="text-[11px] text-cyan-200/80">
                    Chlorination & TDS testing compliant with IS 10500 standards.
                  </p>
                </div>
              </div>
            )}

            {selectedEntity.type === 'tanker' && selectedEntity.data && (
              <div className="space-y-3 text-xs">
                {/* Tanker & Driver Info */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-amber-300">
                      {selectedEntity.data.tanker?.License_Plate}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      IN TRANSIT
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Truck className="w-3.5 h-3.5 text-slate-400" />
                    <span>Driver: {selectedEntity.data.driver?.Name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <a href={`tel:${selectedEntity.data.driver?.Phone}`} className="hover:text-cyan-300 font-mono">
                      +91 {selectedEntity.data.driver?.Phone}
                    </a>
                  </div>
                </div>

                {/* Telemetry Metrics */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-slate-400 text-[10px] flex items-center gap-1">
                      <Gauge className="w-3 h-3 text-cyan-400" /> Speed
                    </div>
                    <div className="text-sm font-bold font-mono text-white mt-1">
                      {selectedEntity.data.tel?.speedKmh} km/h
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-slate-400 text-[10px] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" /> ETA
                    </div>
                    <div className="text-sm font-bold font-mono text-amber-300 mt-1">
                      {selectedEntity.data.tel?.etaMinutes} Minutes
                    </div>
                  </div>
                </div>

                {/* Delivery Progress Bar */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Route Progress</span>
                    <span className="font-mono text-cyan-300 font-semibold">
                      {selectedEntity.data.tel?.progressPercent}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-amber-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${selectedEntity.data.tel?.progressPercent}%` }}
                    ></div>
                  </div>
                </div>

                {/* Customer Target */}
                {selectedEntity.data.booking && (
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                    <div className="text-slate-400 text-[10px]">Delivering To:</div>
                    <div className="text-white font-medium">{selectedEntity.data.booking.CustomerName}</div>
                    <div className="text-slate-400 text-[11px] truncate">
                      {selectedEntity.data.booking.Street}, {selectedEntity.data.booking.AreaName}
                    </div>
                  </div>
                )}

                {/* Action: Mark Delivery Complete */}
                {onCompleteDelivery && (
                  <button
                    onClick={() => {
                      onCompleteDelivery(selectedEntity.data.del.DeliveryID);
                      setSelectedEntity(null);
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm Delivery Complete</span>
                  </button>
                )}
              </div>
            )}

            {selectedEntity.type === 'customer' && selectedEntity.data && (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="text-slate-400 text-[10px]">Address & Customer:</div>
                  <div className="text-white font-semibold text-sm">
                    {selectedEntity.data.booking?.CustomerName || 'Unassigned Customer'}
                  </div>
                  <div className="text-slate-300 text-[11px]">{selectedEntity.data.Street}</div>
                  <div className="text-slate-400 text-[11px]">
                    {selectedEntity.data.areaName} - PIN {selectedEntity.data.booking?.Pincode || '500101'}
                  </div>
                </div>

                {selectedEntity.data.booking ? (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Order #{selectedEntity.data.booking.BookingID}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          selectedEntity.data.booking.BookingStatus === 'Delivered'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : selectedEntity.data.booking.BookingStatus === 'Assigned'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}
                      >
                        {selectedEntity.data.booking.BookingStatus}
                      </span>
                    </div>
                    <div className="text-slate-300 text-[11px]">
                      Tanker Size: <span className="font-semibold text-white">{selectedEntity.data.booking.Capacity_Liters.toLocaleString()} L</span>
                    </div>
                    <div className="text-slate-300 text-[11px]">
                      Slot: <span className="font-semibold text-white">{selectedEntity.data.booking.TimeSlot}</span>
                    </div>
                    <div className="text-slate-300 text-[11px]">
                      Price: <span className="font-semibold text-emerald-400">₹{selectedEntity.data.booking.Price}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-950 text-slate-400 text-center">
                    No active booking for this address.
                  </div>
                )}

                {onDispatchToAddress && selectedEntity.data.status === 'pending' && (
                  <button
                    onClick={() => {
                      onDispatchToAddress(selectedEntity.data.AddressID);
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <Truck className="w-4 h-4" />
                    <span>Dispatch Tanker Here</span>
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Default Quick Feed when nothing is clicked */
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex-1 flex flex-col">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-cyan-400" />
              <span>Active Dispatch Feed</span>
            </h3>

            {activeDeliveries.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-slate-500 text-xs">
                <Truck className="w-8 h-8 text-slate-600 mb-2" />
                <span>All tankers are currently idle or docked at depot.</span>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                {activeDeliveries.map((del) => {
                  const tel = telemetries[del.DeliveryID];
                  const tanker = tankers.find((t) => t.TankerID === del.TankerID);
                  const driver = drivers.find((d) => d.DriverID === del.DriverID);
                  const booking = bookingDetails.find((b) => b.BookingID === del.BookingID);

                  return (
                    <div
                      key={`card-${del.DeliveryID}`}
                      onClick={() =>
                        setSelectedEntity({
                          type: 'tanker',
                          id: del.DeliveryID,
                          data: { del, tel, tanker, driver, booking }
                        })
                      }
                      className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer space-y-2 group"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-amber-300 group-hover:text-amber-200">
                          {tanker?.License_Plate}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {tel?.speedKmh || 32} km/h • {tel?.etaMinutes || 12}m ETA
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-300">
                        Driver: {driver?.Name} • to {booking?.CustomerName}
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-amber-400 h-1.5 rounded-full"
                          style={{ width: `${tel?.progressPercent || 50}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
