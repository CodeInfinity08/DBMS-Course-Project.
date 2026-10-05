import {
  Customer,
  Area,
  Address,
  TankerType,
  Tanker,
  Driver,
  Booking,
  Delivery,
  Payment
} from '../types.ts';

export const CENTRAL_DEPOT = {
  name: 'Central Water Reservoir & Dispatch Depot #1',
  lat: 17.4000,
  lng: 78.4850,
  address: 'Water Works Complex, Tank Bund Road, Hyderabad',
  totalWaterSupplyLiters: 150000,
  currentStorageLiters: 124000
};

export const INITIAL_AREAS: Area[] = [
  { AreaID: 1, AreaName: 'Gandhi Nagar', Pincode: '500101' },
  { AreaID: 2, AreaName: 'Lakshmi Nagar', Pincode: '500102' },
  { AreaID: 3, AreaName: 'Ram Nagar', Pincode: '500103' },
  { AreaID: 4, IndiraColony: 'Indira Colony', AreaName: 'Indira Colony', Pincode: '500104' },
  { AreaID: 5, AreaName: 'Shanti Nagar', Pincode: '500105' },
  { AreaID: 6, AreaName: 'Vivek Vihar', Pincode: '500106' }
].map(a => ({ AreaID: a.AreaID, AreaName: a.AreaName, Pincode: a.Pincode }));

export const INITIAL_CUSTOMERS: Customer[] = [
  { CustomerID: 1, Name: 'Ravi Kumar', Phone: '9000000001' },
  { CustomerID: 2, Name: 'Sneha Reddy', Phone: '9000000002' },
  { CustomerID: 3, Name: 'Anil Sharma', Phone: '9000000003' },
  { CustomerID: 4, Name: 'Lakshmi Devi', Phone: '9000000004' },
  { CustomerID: 5, Name: 'Mohammed Imran', Phone: '9000000005' },
  { CustomerID: 6, Name: 'Priya Nair', Phone: '9000000006' },
  { CustomerID: 7, Name: 'Suresh Babu', Phone: '9000000007' },
  { CustomerID: 8, Name: 'Kavitha Rao', Phone: '9000000008' }
];

export const INITIAL_ADDRESSES: Address[] = [
  { AddressID: 1, CustomerID: 1, AreaID: 1, Street: '12-3-45, Main Road', Latitude: 17.401200, Longitude: 78.480100 },
  { AddressID: 2, CustomerID: 2, AreaID: 2, Street: '4-18, Temple Street', Latitude: 17.405800, Longitude: 78.487300 },
  { AddressID: 3, CustomerID: 3, AreaID: 3, Street: '7-2-11, Market Lane', Latitude: 17.398400, Longitude: 78.491800 },
  { AddressID: 4, CustomerID: 4, AreaID: 1, Street: '9-1-7, Canal Road', Latitude: 17.402600, Longitude: 78.478400 },
  { AddressID: 5, CustomerID: 5, AreaID: 4, Street: '2-44, School Street', Latitude: 17.410300, Longitude: 78.470900 },
  { AddressID: 6, CustomerID: 6, AreaID: 5, Street: '15-8-2, Garden Road', Latitude: 17.395100, Longitude: 78.483700 },
  { AddressID: 7, CustomerID: 7, AreaID: 6, Street: '3-9-30, Station Road', Latitude: 17.408800, Longitude: 78.495200 },
  { AddressID: 8, CustomerID: 8, AreaID: 2, Street: '6-6-6, Lake View Colony', Latitude: 17.403900, Longitude: 78.489500 },
  { AddressID: 9, CustomerID: 2, AreaID: 3, Street: '22-1, Industrial Area', Latitude: 17.397200, Longitude: 78.493100 },
  { AddressID: 10, CustomerID: 1, AreaID: 5, Street: '8-8-88, Farm House Road', Latitude: 17.393800, Longitude: 78.481600 }
];

export const INITIAL_TANKER_TYPES: TankerType[] = [
  { TypeID: 1, Capacity_Liters: 3000, Price: 600.00 },
  { TypeID: 2, Capacity_Liters: 6000, Price: 1000.00 },
  { TypeID: 3, Capacity_Liters: 10000, Price: 1500.00 }
];

export const INITIAL_TANKERS: Tanker[] = [
  { TankerID: 1, TypeID: 1, License_Plate: 'TS01WT1001', Status: 'Dispatched' }, // Delivery 7
  { TankerID: 2, TypeID: 1, License_Plate: 'TS01WT1002', Status: 'Available' },
  { TankerID: 3, TypeID: 2, License_Plate: 'TS01WT1003', Status: 'Dispatched' }, // Delivery 8
  { TankerID: 4, TypeID: 2, License_Plate: 'TS01WT1004', Status: 'Available' },
  { TankerID: 5, TypeID: 3, License_Plate: 'TS01WT1005', Status: 'Available' },
  { TankerID: 6, TypeID: 3, License_Plate: 'TS01WT1006', Status: 'Maintenance' }
];

export const INITIAL_DRIVERS: Driver[] = [
  { DriverID: 1, Name: 'Ramesh Goud', Phone: '9100000001', License_No: 'DL-2026-0001', IsOnDuty: true },
  { DriverID: 2, Name: 'Venkatesh Yadav', Phone: '9100000002', License_No: 'DL-2026-0002', IsOnDuty: true },
  { DriverID: 3, Name: 'Srinivas Rao', Phone: '9100000003', License_No: 'DL-2026-0003', IsOnDuty: true },
  { DriverID: 4, Name: 'Mahesh Kumar', Phone: '9100000004', License_No: 'DL-2026-0004', IsOnDuty: true }
];

export const INITIAL_BOOKINGS: Booking[] = [
  { BookingID: 1, AddressID: 1, TypeID: 2, ScheduledDate: '2026-09-16', TimeSlot: '06:00-09:00', Status: 'Delivered' },
  { BookingID: 2, AddressID: 2, TypeID: 3, ScheduledDate: '2026-09-16', TimeSlot: '09:00-12:00', Status: 'Delivered' },
  { BookingID: 3, AddressID: 3, TypeID: 1, ScheduledDate: '2026-09-17', TimeSlot: '12:00-15:00', Status: 'Delivered' },
  { BookingID: 4, AddressID: 4, TypeID: 2, ScheduledDate: '2026-09-18', TimeSlot: '09:00-12:00', Status: 'Delivered' },
  { BookingID: 5, AddressID: 5, TypeID: 2, ScheduledDate: '2026-09-19', TimeSlot: '15:00-18:00', Status: 'Delivered' },
  { BookingID: 6, AddressID: 6, TypeID: 3, ScheduledDate: '2026-09-20', TimeSlot: '06:00-09:00', Status: 'Delivered' },
  { BookingID: 7, AddressID: 7, TypeID: 1, ScheduledDate: '2026-09-21', TimeSlot: '09:00-12:00', Status: 'Assigned' },
  { BookingID: 8, AddressID: 8, TypeID: 2, ScheduledDate: '2026-09-21', TimeSlot: '12:00-15:00', Status: 'Assigned' },
  { BookingID: 9, AddressID: 1, TypeID: 1, ScheduledDate: '2026-09-22', TimeSlot: '06:00-09:00', Status: 'Pending' },
  { BookingID: 10, AddressID: 9, TypeID: 3, ScheduledDate: '2026-09-22', TimeSlot: '09:00-12:00', Status: 'Pending' },
  { BookingID: 11, AddressID: 2, TypeID: 2, ScheduledDate: '2026-09-23', TimeSlot: '15:00-18:00', Status: 'Pending' },
  { BookingID: 12, AddressID: 10, TypeID: 1, ScheduledDate: '2026-09-19', TimeSlot: '09:00-12:00', Status: 'Cancelled' }
];

export const INITIAL_DELIVERIES: Delivery[] = [
  { DeliveryID: 1, BookingID: 1, TankerID: 3, DriverID: 1, DispatchTime: '2026-09-16 06:30:00', DeliveredTime: '2026-09-16 07:40:00' },
  { DeliveryID: 2, BookingID: 2, TankerID: 5, DriverID: 2, DispatchTime: '2026-09-16 09:20:00', DeliveredTime: '2026-09-16 10:35:00' },
  { DeliveryID: 3, BookingID: 3, TankerID: 1, DriverID: 3, DispatchTime: '2026-09-17 12:15:00', DeliveredTime: '2026-09-17 13:05:00' },
  { DeliveryID: 4, BookingID: 4, TankerID: 4, DriverID: 1, DispatchTime: '2026-09-18 09:10:00', DeliveredTime: '2026-09-18 10:20:00' },
  { DeliveryID: 5, BookingID: 5, TankerID: 3, DriverID: 4, DispatchTime: '2026-09-19 15:20:00', DeliveredTime: '2026-09-19 16:30:00' },
  { DeliveryID: 6, BookingID: 6, TankerID: 5, DriverID: 2, DispatchTime: '2026-09-20 06:15:00', DeliveredTime: '2026-09-20 07:50:00' },
  { DeliveryID: 7, BookingID: 7, TankerID: 1, DriverID: 1, DispatchTime: '2026-09-21 09:15:00', DeliveredTime: null },
  { DeliveryID: 8, BookingID: 8, TankerID: 3, DriverID: 2, DispatchTime: '2026-09-21 12:20:00', DeliveredTime: null }
];

export const INITIAL_PAYMENTS: Payment[] = [
  { PaymentID: 1, BookingID: 1, Amount: 1000.00, Method: 'UPI' },
  { PaymentID: 2, BookingID: 2, Amount: 1500.00, Method: 'Cash' },
  { PaymentID: 3, BookingID: 3, Amount: 600.00, Method: 'UPI' },
  { PaymentID: 4, BookingID: 4, Amount: 1000.00, Method: 'Card' },
  { PaymentID: 5, BookingID: 5, Amount: 1000.00, Method: 'Cash' },
  { PaymentID: 6, BookingID: 6, Amount: 1500.00, Method: 'UPI' },
  { PaymentID: 7, BookingID: 7, Amount: 600.00, Method: 'UPI' }
];
