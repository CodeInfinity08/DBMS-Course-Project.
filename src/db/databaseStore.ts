import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Customer,
  Area,
  Address,
  TankerType,
  Tanker,
  Driver,
  Booking,
  Delivery,
  Payment,
  BookingDetailView,
  TankerStatus,
  BookingStatus,
  PaymentMethod,
  TimeSlot
} from '../types.ts';
import {
  INITIAL_AREAS,
  INITIAL_CUSTOMERS,
  INITIAL_ADDRESSES,
  INITIAL_TANKER_TYPES,
  INITIAL_TANKERS,
  INITIAL_DRIVERS,
  INITIAL_BOOKINGS,
  INITIAL_DELIVERIES,
  INITIAL_PAYMENTS,
  CENTRAL_DEPOT
} from './initialData.ts';

const DB_STORAGE_KEY = 'aquaflow_database_v1';

export interface DatabaseState {
  customers: Customer[];
  areas: Area[];
  addresses: Address[];
  tankerTypes: TankerType[];
  tankers: Tanker[];
  drivers: Driver[];
  bookings: Booking[];
  deliveries: Delivery[];
  payments: Payment[];
}

function loadInitialState(): DatabaseState {
  try {
    const raw = localStorage.getItem(DB_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.customers && parsed.tankers && parsed.bookings) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load DB from localStorage', e);
  }
  return {
    customers: [...INITIAL_CUSTOMERS],
    areas: [...INITIAL_AREAS],
    addresses: [...INITIAL_ADDRESSES],
    tankerTypes: [...INITIAL_TANKER_TYPES],
    tankers: [...INITIAL_TANKERS],
    drivers: [...INITIAL_DRIVERS],
    bookings: [...INITIAL_BOOKINGS],
    deliveries: [...INITIAL_DELIVERIES],
    payments: [...INITIAL_PAYMENTS],
  };
}

export function useDatabase() {
  const [db, setDb] = useState<DatabaseState>(loadInitialState);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(db));
    } catch (e) {
      console.error('Failed to save DB to localStorage', e);
    }
  }, [db]);

  // Reset to default sample data
  const resetDatabase = useCallback(() => {
    const fresh: DatabaseState = {
      customers: JSON.parse(JSON.stringify(INITIAL_CUSTOMERS)),
      areas: JSON.parse(JSON.stringify(INITIAL_AREAS)),
      addresses: JSON.parse(JSON.stringify(INITIAL_ADDRESSES)),
      tankerTypes: JSON.parse(JSON.stringify(INITIAL_TANKER_TYPES)),
      tankers: JSON.parse(JSON.stringify(INITIAL_TANKERS)),
      drivers: JSON.parse(JSON.stringify(INITIAL_DRIVERS)),
      bookings: JSON.parse(JSON.stringify(INITIAL_BOOKINGS)),
      deliveries: JSON.parse(JSON.stringify(INITIAL_DELIVERIES)),
      payments: JSON.parse(JSON.stringify(INITIAL_PAYMENTS)),
    };
    setDb(fresh);
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(fresh));
  }, []);

  // Compute view `vw_booking_details`
  const bookingDetailsView = useMemo<BookingDetailView[]>(() => {
    return db.bookings.map((b) => {
      const addr = db.addresses.find((a) => a.AddressID === b.AddressID);
      const cust = addr ? db.customers.find((c) => c.CustomerID === addr.CustomerID) : undefined;
      const area = addr ? db.areas.find((ar) => ar.AreaID === addr.AreaID) : undefined;
      const ttype = db.tankerTypes.find((tt) => tt.TypeID === b.TypeID);
      const delivery = db.deliveries.find((d) => d.BookingID === b.BookingID);
      const tanker = delivery ? db.tankers.find((t) => t.TankerID === delivery.TankerID) : undefined;
      const driver = delivery ? db.drivers.find((dr) => dr.DriverID === delivery.DriverID) : undefined;
      const payment = db.payments.find((p) => p.BookingID === b.BookingID);

      return {
        BookingID: b.BookingID,
        CustomerID: cust?.CustomerID || 0,
        CustomerName: cust?.Name || 'Unknown Customer',
        CustomerPhone: cust?.Phone || '0000000000',
        Street: addr?.Street || 'Unknown Street',
        AreaName: area?.AreaName || 'Unknown Area',
        Pincode: area?.Pincode || '000000',
        Capacity_Liters: ttype?.Capacity_Liters || 0,
        Price: ttype?.Price || 0,
        ScheduledDate: b.ScheduledDate,
        TimeSlot: b.TimeSlot,
        BookingStatus: b.Status,
        DeliveryID: delivery?.DeliveryID ?? null,
        License_Plate: tanker?.License_Plate ?? null,
        DriverName: driver?.Name ?? null,
        DriverPhone: driver?.Phone ?? null,
        DispatchTime: delivery?.DispatchTime ?? null,
        DeliveredTime: delivery?.DeliveredTime ?? null,
        PaidAmount: payment?.Amount ?? null,
        PaymentMethod: payment?.Method ?? null,
        Latitude: addr?.Latitude,
        Longitude: addr?.Longitude,
        AddressID: b.AddressID,
        TankerID: tanker?.TankerID,
        DriverID: driver?.DriverID,
        TypeID: b.TypeID
      };
    });
  }, [db]);

  // Validation function enforcing trigger: `trg_delivery_before_insert`
  const validateDeliveryInsert = useCallback(
    (bookingId: number, tankerId: number, driverId: number): { valid: boolean; error?: string } => {
      const booking = db.bookings.find((b) => b.BookingID === bookingId);
      if (!booking || booking.Status !== 'Pending') {
        return { valid: false, error: 'SQLSTATE 45000: Booking not found or not in Pending status' };
      }

      const tanker = db.tankers.find((t) => t.TankerID === tankerId);
      if (!tanker || tanker.Status !== 'Available') {
        return { valid: false, error: 'SQLSTATE 45000: Tanker is not available (Status must be Available)' };
      }

      if (tanker.TypeID !== booking.TypeID) {
        return {
          valid: false,
          error: `SQLSTATE 45000: Tanker size does not match the booking (Tanker Type ${tanker.TypeID} vs Booking Type ${booking.TypeID})`
        };
      }

      const driverBusyCount = db.deliveries.filter(
        (d) => d.DriverID === driverId && d.DeliveredTime === null
      ).length;

      if (driverBusyCount > 0) {
        return { valid: false, error: 'SQLSTATE 45000: Driver is already on another active delivery' };
      }

      return { valid: true };
    },
    [db]
  );

  // Dispatch Tanker (Trigger before and after insert)
  const dispatchTanker = useCallback(
    (bookingId: number, tankerId: number, driverId: number, customDispatchTime?: string) => {
      const check = validateDeliveryInsert(bookingId, tankerId, driverId);
      if (!check.valid) {
        throw new Error(check.error);
      }

      const now = customDispatchTime || new Date().toISOString().replace('T', ' ').substring(0, 19);
      const newDeliveryId = db.deliveries.length > 0 ? Math.max(...db.deliveries.map((d) => d.DeliveryID)) + 1 : 1;

      const newDelivery: Delivery = {
        DeliveryID: newDeliveryId,
        BookingID: bookingId,
        TankerID: tankerId,
        DriverID: driverId,
        DispatchTime: now,
        DeliveredTime: null
      };

      setDb((prev) => {
        // trg_delivery_after_insert: Tanker -> 'Dispatched', Booking -> 'Assigned'
        const updatedTankers = prev.tankers.map((t) =>
          t.TankerID === tankerId ? { ...t, Status: 'Dispatched' as TankerStatus } : t
        );
        const updatedBookings = prev.bookings.map((b) =>
          b.BookingID === bookingId ? { ...b, Status: 'Assigned' as BookingStatus } : b
        );
        return {
          ...prev,
          deliveries: [newDelivery, ...prev.deliveries],
          tankers: updatedTankers,
          bookings: updatedBookings
        };
      });

      return newDelivery;
    },
    [db, validateDeliveryInsert]
  );

  // Complete Delivery (Trigger after update)
  const completeDelivery = useCallback((deliveryId: number, deliveredTimeStr?: string) => {
    const now = deliveredTimeStr || new Date().toISOString().replace('T', ' ').substring(0, 19);

    setDb((prev) => {
      const delivery = prev.deliveries.find((d) => d.DeliveryID === deliveryId);
      if (!delivery) return prev;

      // Update Delivery
      const updatedDeliveries = prev.deliveries.map((d) =>
        d.DeliveryID === deliveryId ? { ...d, DeliveredTime: now } : d
      );

      // trg_delivery_after_update: Booking -> 'Delivered', Tanker -> 'Available'
      const updatedBookings = prev.bookings.map((b) =>
        b.BookingID === delivery.BookingID ? { ...b, Status: 'Delivered' as BookingStatus } : b
      );

      const updatedTankers = prev.tankers.map((t) =>
        t.TankerID === delivery.TankerID ? { ...t, Status: 'Available' as TankerStatus } : t
      );

      return {
        ...prev,
        deliveries: updatedDeliveries,
        bookings: updatedBookings,
        tankers: updatedTankers
      };
    });
  }, []);

  // Update Tanker status manually (e.g. mark in maintenance or available)
  const updateTankerStatus = useCallback((tankerId: number, status: TankerStatus) => {
    setDb((prev) => ({
      ...prev,
      tankers: prev.tankers.map((t) => (t.TankerID === tankerId ? { ...t, Status: status } : t))
    }));
  }, []);

  // Add Tanker
  const addTanker = useCallback((typeId: number, licensePlate: string, status: TankerStatus = 'Available') => {
    setDb((prev) => {
      const exists = prev.tankers.some((t) => t.License_Plate.toUpperCase() === licensePlate.toUpperCase());
      if (exists) {
        throw new Error(`Tanker with License Plate ${licensePlate} already exists.`);
      }
      const newId = prev.tankers.length > 0 ? Math.max(...prev.tankers.map((t) => t.TankerID)) + 1 : 1;
      return {
        ...prev,
        tankers: [...prev.tankers, { TankerID: newId, TypeID: typeId, License_Plate: licensePlate.toUpperCase(), Status: status }]
      };
    });
  }, []);

  // Add Driver
  const addDriver = useCallback((name: string, phone: string, licenseNo: string) => {
    setDb((prev) => {
      if (!/^\d{10}$/.test(phone)) {
        throw new Error('Phone must be exactly 10 digits.');
      }
      const newId = prev.drivers.length > 0 ? Math.max(...prev.drivers.map((d) => d.DriverID)) + 1 : 1;
      return {
        ...prev,
        drivers: [...prev.drivers, { DriverID: newId, Name: name, Phone: phone, License_No: licenseNo }]
      };
    });
  }, []);

  // Add Customer
  const addCustomer = useCallback((name: string, phone: string) => {
    if (!/^\d{10}$/.test(phone)) {
      throw new Error('Phone number must be exactly 10 digits.');
    }
    let newId = 1;
    setDb((prev) => {
      if (prev.customers.some((c) => c.Phone === phone)) {
        throw new Error(`Customer with phone ${phone} already exists.`);
      }
      newId = prev.customers.length > 0 ? Math.max(...prev.customers.map((c) => c.CustomerID)) + 1 : 1;
      return {
        ...prev,
        customers: [...prev.customers, { CustomerID: newId, Name: name, Phone: phone }]
      };
    });
    return newId;
  }, []);

  // Add Address
  const addAddress = useCallback(
    (customerId: number, areaId: number, street: string, latitude: number, longitude: number) => {
      let newId = 1;
      setDb((prev) => {
        newId = prev.addresses.length > 0 ? Math.max(...prev.addresses.map((a) => a.AddressID)) + 1 : 1;
        return {
          ...prev,
          addresses: [
            ...prev.addresses,
            { AddressID: newId, CustomerID: customerId, AreaID: areaId, Street: street, Latitude: latitude, Longitude: longitude }
          ]
        };
      });
      return newId;
    },
    []
  );

  // Add Booking
  const addBooking = useCallback(
    (addressId: number, typeId: number, scheduledDate: string, timeSlot: TimeSlot) => {
      let newId = 1;
      setDb((prev) => {
        newId = prev.bookings.length > 0 ? Math.max(...prev.bookings.map((b) => b.BookingID)) + 1 : 1;
        const newBooking: Booking = {
          BookingID: newId,
          AddressID: addressId,
          TypeID: typeId,
          ScheduledDate: scheduledDate,
          TimeSlot: timeSlot,
          Status: 'Pending'
        };
        return {
          ...prev,
          bookings: [newBooking, ...prev.bookings]
        };
      });
      return newId;
    },
    []
  );

  // Cancel Booking
  const cancelBooking = useCallback((bookingId: number) => {
    setDb((prev) => {
      const booking = prev.bookings.find((b) => b.BookingID === bookingId);
      if (!booking) return prev;
      if (booking.Status === 'Assigned') {
        // Free the tanker if dispatched
        const delivery = prev.deliveries.find((d) => d.BookingID === bookingId && d.DeliveredTime === null);
        const updatedTankers = delivery
          ? prev.tankers.map((t) => (t.TankerID === delivery.TankerID ? { ...t, Status: 'Available' as TankerStatus } : t))
          : prev.tankers;
        return {
          ...prev,
          tankers: updatedTankers,
          bookings: prev.bookings.map((b) => (b.BookingID === bookingId ? { ...b, Status: 'Cancelled' as BookingStatus } : b))
        };
      }
      return {
        ...prev,
        bookings: prev.bookings.map((b) => (b.BookingID === bookingId ? { ...b, Status: 'Cancelled' as BookingStatus } : b))
      };
    });
  }, []);

  // Record Payment
  const recordPayment = useCallback((bookingId: number, amount: number, method: PaymentMethod) => {
    if (amount <= 0) throw new Error('Payment amount must be greater than 0.');
    setDb((prev) => {
      const existing = prev.payments.find((p) => p.BookingID === bookingId);
      if (existing) {
        return {
          ...prev,
          payments: prev.payments.map((p) => (p.BookingID === bookingId ? { ...p, Amount: amount, Method: method } : p))
        };
      }
      const newId = prev.payments.length > 0 ? Math.max(...prev.payments.map((p) => p.PaymentID)) + 1 : 1;
      return {
        ...prev,
        payments: [...prev.payments, { PaymentID: newId, BookingID: bookingId, Amount: amount, Method: method }]
      };
    });
  }, []);

  // Direct Table Update (for Database Editor)
  const updateTableRow = useCallback(<T extends { [key: string]: any }>(tableName: keyof DatabaseState, idKey: string, idVal: any, updatedFields: Partial<T>) => {
    setDb((prev) => {
      const list = prev[tableName] as any[];
      const updatedList = list.map((item) => (item[idKey] === idVal ? { ...item, ...updatedFields } : item));
      return {
        ...prev,
        [tableName]: updatedList
      };
    });
  }, []);

  // Direct Row Deletion with FK protection
  const deleteTableRow = useCallback((tableName: keyof DatabaseState, idKey: string, idVal: any) => {
    setDb((prev) => {
      // FK checks
      if (tableName === 'customers') {
        const hasAddr = prev.addresses.some((a) => a.CustomerID === idVal);
        if (hasAddr) throw new Error('Cannot delete Customer: referenced by records in ADDRESS table (RESTRICT).');
      }
      if (tableName === 'areas') {
        const hasAddr = prev.addresses.some((a) => a.AreaID === idVal);
        if (hasAddr) throw new Error('Cannot delete Area: referenced by records in ADDRESS table (RESTRICT).');
      }
      if (tableName === 'addresses') {
        const hasBk = prev.bookings.some((b) => b.AddressID === idVal);
        if (hasBk) throw new Error('Cannot delete Address: referenced by records in BOOKING table (RESTRICT).');
      }
      if (tableName === 'tankerTypes') {
        const hasTk = prev.tankers.some((t) => t.TypeID === idVal);
        const hasBk = prev.bookings.some((b) => b.TypeID === idVal);
        if (hasTk || hasBk) throw new Error('Cannot delete Tanker Type: referenced by TANKER or BOOKING table.');
      }
      if (tableName === 'tankers') {
        const hasDel = prev.deliveries.some((d) => d.TankerID === idVal);
        if (hasDel) throw new Error('Cannot delete Tanker: referenced in DELIVERY table.');
      }
      if (tableName === 'drivers') {
        const hasDel = prev.deliveries.some((d) => d.DriverID === idVal);
        if (hasDel) throw new Error('Cannot delete Driver: referenced in DELIVERY table.');
      }
      if (tableName === 'bookings') {
        const hasDel = prev.deliveries.some((d) => d.BookingID === idVal);
        const hasPay = prev.payments.some((p) => p.BookingID === idVal);
        if (hasDel || hasPay) throw new Error('Cannot delete Booking: referenced in DELIVERY or PAYMENT tables.');
      }

      const list = prev[tableName] as any[];
      return {
        ...prev,
        [tableName]: list.filter((item) => item[idKey] !== idVal)
      };
    });
  }, []);

  // Export current database state as standard SQL dump
  const generateSQLDump = useCallback(() => {
    let sql = `-- =====================================================================\n`;
    sql += `--  Water Tanker Booking & Delivery Management System - Live Export\n`;
    sql += `--  Generated: ${new Date().toISOString()}\n`;
    sql += `-- =====================================================================\n\n`;

    sql += `USE water_tanker_db;\n\n`;

    // Customers
    sql += `-- CUSTOMER\n`;
    db.customers.forEach((c) => {
      sql += `INSERT INTO CUSTOMER (CustomerID, Name, Phone) VALUES (${c.CustomerID}, '${c.Name.replace(/'/g, "\\'")}', '${c.Phone}') ON DUPLICATE KEY UPDATE Name=VALUES(Name);\n`;
    });

    // Areas
    sql += `\n-- AREA\n`;
    db.areas.forEach((a) => {
      sql += `INSERT INTO AREA (AreaID, AreaName, Pincode) VALUES (${a.AreaID}, '${a.AreaName.replace(/'/g, "\\'")}', '${a.Pincode}') ON DUPLICATE KEY UPDATE AreaName=VALUES(AreaName);\n`;
    });

    // Addresses
    sql += `\n-- ADDRESS\n`;
    db.addresses.forEach((a) => {
      sql += `INSERT INTO ADDRESS (AddressID, CustomerID, AreaID, Street, Latitude, Longitude) VALUES (${a.AddressID}, ${a.CustomerID}, ${a.AreaID}, '${a.Street.replace(/'/g, "\\'")}', ${a.Latitude}, ${a.Longitude}) ON DUPLICATE KEY UPDATE Street=VALUES(Street);\n`;
    });

    // Tanker Types
    sql += `\n-- TANKER_TYPE\n`;
    db.tankerTypes.forEach((t) => {
      sql += `INSERT INTO TANKER_TYPE (TypeID, Capacity_Liters, Price) VALUES (${t.TypeID}, ${t.Capacity_Liters}, ${t.Price}) ON DUPLICATE KEY UPDATE Price=VALUES(Price);\n`;
    });

    // Tankers
    sql += `\n-- TANKER\n`;
    db.tankers.forEach((t) => {
      sql += `INSERT INTO TANKER (TankerID, TypeID, License_Plate, Status) VALUES (${t.TankerID}, ${t.TypeID}, '${t.License_Plate}', '${t.Status}') ON DUPLICATE KEY UPDATE Status=VALUES(Status);\n`;
    });

    // Drivers
    sql += `\n-- DRIVER\n`;
    db.drivers.forEach((d) => {
      sql += `INSERT INTO DRIVER (DriverID, Name, Phone, License_No) VALUES (${d.DriverID}, '${d.Name.replace(/'/g, "\\'")}', '${d.Phone}', '${d.License_No}') ON DUPLICATE KEY UPDATE Name=VALUES(Name);\n`;
    });

    // Bookings
    sql += `\n-- BOOKING\n`;
    db.bookings.forEach((b) => {
      sql += `INSERT INTO BOOKING (BookingID, AddressID, TypeID, ScheduledDate, TimeSlot, Status) VALUES (${b.BookingID}, ${b.AddressID}, ${b.TypeID}, '${b.ScheduledDate}', '${b.TimeSlot}', '${b.Status}') ON DUPLICATE KEY UPDATE Status=VALUES(Status);\n`;
    });

    // Deliveries
    sql += `\n-- DELIVERY\n`;
    db.deliveries.forEach((d) => {
      const deliveredTimeVal = d.DeliveredTime ? `'${d.DeliveredTime}'` : `NULL`;
      sql += `INSERT INTO DELIVERY (DeliveryID, BookingID, TankerID, DriverID, DispatchTime, DeliveredTime) VALUES (${d.DeliveryID}, ${d.BookingID}, ${d.TankerID}, ${d.DriverID}, '${d.DispatchTime}', ${deliveredTimeVal}) ON DUPLICATE KEY UPDATE DeliveredTime=VALUES(DeliveredTime);\n`;
    });

    // Payments
    sql += `\n-- PAYMENT\n`;
    db.payments.forEach((p) => {
      sql += `INSERT INTO PAYMENT (PaymentID, BookingID, Amount, Method) VALUES (${p.PaymentID}, ${p.BookingID}, ${p.Amount}, '${p.Method}') ON DUPLICATE KEY UPDATE Amount=VALUES(Amount);\n`;
    });

    return sql;
  }, [db]);

  return {
    db,
    setDb,
    bookingDetailsView,
    resetDatabase,
    validateDeliveryInsert,
    dispatchTanker,
    completeDelivery,
    updateTankerStatus,
    addTanker,
    addDriver,
    addCustomer,
    addAddress,
    addBooking,
    cancelBooking,
    recordPayment,
    updateTableRow,
    deleteTableRow,
    generateSQLDump,
    depot: CENTRAL_DEPOT
  };
}
