export type TankerStatus = 'Available' | 'Dispatched' | 'Maintenance';
export type BookingStatus = 'Pending' | 'Assigned' | 'Delivered' | 'Cancelled';
export type PaymentMethod = 'Cash' | 'UPI' | 'Card' | 'NetBanking';
export type TimeSlot = '06:00-09:00' | '09:00-12:00' | '12:00-15:00' | '15:00-18:00';

export interface Customer {
  CustomerID: number;
  Name: string;
  Phone: string;
}

export interface Area {
  AreaID: number;
  AreaName: string;
  Pincode: string;
}

export interface Address {
  AddressID: number;
  CustomerID: number;
  AreaID: number;
  Street: string;
  Latitude: number;
  Longitude: number;
}

export interface TankerType {
  TypeID: number;
  Capacity_Liters: number;
  Price: number;
}

export interface Tanker {
  TankerID: number;
  TypeID: number;
  License_Plate: string;
  Status: TankerStatus;
}

export interface Driver {
  DriverID: number;
  Name: string;
  Phone: string;
  License_No: string;
  IsOnDuty?: boolean;
}

export interface Booking {
  BookingID: number;
  AddressID: number;
  TypeID: number;
  ScheduledDate: string; // YYYY-MM-DD
  TimeSlot: TimeSlot;
  Status: BookingStatus;
}

export interface Delivery {
  DeliveryID: number;
  BookingID: number;
  TankerID: number;
  DriverID: number;
  DispatchTime: string; // YYYY-MM-DD HH:mm:ss
  DeliveredTime: string | null; // YYYY-MM-DD HH:mm:ss | null
}

export interface Payment {
  PaymentID: number;
  BookingID: number;
  Amount: number;
  Method: PaymentMethod;
}

// Flat View row matching `vw_booking_details`
export interface BookingDetailView {
  BookingID: number;
  CustomerID: number;
  CustomerName: string;
  CustomerPhone: string;
  Street: string;
  AreaName: string;
  Pincode: string;
  Capacity_Liters: number;
  Price: number;
  ScheduledDate: string;
  TimeSlot: TimeSlot;
  BookingStatus: BookingStatus;
  DeliveryID: number | null;
  License_Plate: string | null;
  DriverName: string | null;
  DriverPhone?: string | null;
  DispatchTime: string | null;
  DeliveredTime: string | null;
  PaidAmount: number | null;
  PaymentMethod: PaymentMethod | null;
  // Computed GIS
  Latitude?: number;
  Longitude?: number;
  AddressID?: number;
  TankerID?: number;
  DriverID?: number;
  TypeID?: number;
}

// Real-time GPS Telemetry for live simulation
export interface DriverTelemetry {
  driverId: number;
  tankerId: number;
  deliveryId: number;
  currentLat: number;
  currentLng: number;
  targetLat: number;
  targetLng: number;
  speedKmh: number;
  progressPercent: number; // 0 to 100
  etaMinutes: number;
  waterRemainingLiters: number;
  totalCapacityLiters: number;
  lastUpdated: string;
  heading: number;
  status: 'en_route_delivery' | 'delivering_discharge' | 'returning_depot' | 'idle';
}

export type ActiveNavTab = 'dashboard' | 'deliveries' | 'livemap' | 'fleet' | 'bookings' | 'database' | 'analytics';
