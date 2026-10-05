import { useState, useEffect, useRef } from 'react';
import { Delivery, DriverTelemetry, Tanker, Driver, Address, TankerType, Booking } from '../types.ts';
import { CENTRAL_DEPOT } from '../db/initialData.ts';

// Calculate heading angle in degrees between two lat/lng points
export function calculateHeading(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const y = Math.sin(dLon) * Math.cos(lat2 * (Math.PI / 180));
  const x =
    Math.cos(lat1 * (Math.PI / 180)) * Math.sin(lat2 * (Math.PI / 180)) -
    Math.sin(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.cos(dLon);
  const brng = Math.atan2(y, x) * (180 / Math.PI);
  return (brng + 360) % 360;
}

// Distance in kilometers using Haversine formula
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function useDriverTelemetry(
  deliveries: Delivery[],
  bookings: Booking[],
  tankers: Tanker[],
  drivers: Driver[],
  addresses: Address[],
  tankerTypes: TankerType[],
  simulationSpeed: number = 1, // 1x, 2x, 5x, or 0 for paused
  onDeliveryArrival?: (deliveryId: number) => void
) {
  const [telemetries, setTelemetries] = useState<Record<number, DriverTelemetry>>({});
  const completedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    // Identify active in-transit deliveries (DeliveredTime === null)
    const activeDeliveries = deliveries.filter((d) => d.DeliveredTime === null);

    setTelemetries((prev) => {
      const next: Record<number, DriverTelemetry> = {};

      activeDeliveries.forEach((del) => {
        const booking = bookings.find((b) => b.BookingID === del.BookingID);
        const addr = booking ? addresses.find((a) => a.AddressID === booking.AddressID) : undefined;
        const tanker = tankers.find((t) => t.TankerID === del.TankerID);
        const ttype = tanker ? tankerTypes.find((tt) => tt.TypeID === tanker.TypeID) : undefined;
        const totalCap = ttype?.Capacity_Liters || 6000;

        const destLat = addr?.Latitude ?? 17.4088;
        const destLng = addr?.Longitude ?? 78.4952;
        const depotLat = CENTRAL_DEPOT.lat;
        const depotLng = CENTRAL_DEPOT.lng;

        const existing = prev[del.DeliveryID];

        if (existing) {
          // Progress simulation if speed > 0
          const increment = 0.5 * simulationSpeed;
          let newProgress = existing.progressPercent + increment;
          let status: DriverTelemetry['status'] = existing.status;
          let waterRem = existing.waterRemainingLiters;

          if (newProgress >= 100) {
            // Reached destination, discharging water
            newProgress = 100;
            status = 'delivering_discharge';
            waterRem = Math.max(0, waterRem - (totalCap / 40) * (simulationSpeed || 1));
          } else {
            status = 'en_route_delivery';
          }

          // Interpolate current lat/lng
          const ratio = Math.min(1, newProgress / 100);
          // Add slight organic curvature offset
          const arcOffset = Math.sin(ratio * Math.PI) * 0.0015;
          const curLat = depotLat + (destLat - depotLat) * ratio + arcOffset;
          const curLng = depotLng + (destLng - depotLng) * ratio - arcOffset * 0.5;

          const distRem = calculateDistanceKm(curLat, curLng, destLat, destLng);
          const speed = simulationSpeed > 0 ? 32 + Math.floor(Math.sin(newProgress * 0.1) * 8) : 0;
          const eta = speed > 0 ? Math.ceil((distRem / speed) * 60) : 0;
          const heading = calculateHeading(curLat, curLng, destLat, destLng);

          next[del.DeliveryID] = {
            ...existing,
            currentLat: curLat,
            currentLng: curLng,
            progressPercent: Number(newProgress.toFixed(1)),
            speedKmh: speed,
            etaMinutes: Math.max(0, eta),
            waterRemainingLiters: Math.round(waterRem),
            lastUpdated: new Date().toLocaleTimeString(),
            heading,
            status
          };
        } else {
          // Initialize fresh telemetry starting near depot with initial offset
          // Stagger starting progress based on delivery ID
          const initProgress = del.DeliveryID === 7 ? 68 : 34;
          const ratio = initProgress / 100;
          const curLat = depotLat + (destLat - depotLat) * ratio;
          const curLng = depotLng + (destLng - depotLng) * ratio;
          const distRem = calculateDistanceKm(curLat, curLng, destLat, destLng);
          const heading = calculateHeading(curLat, curLng, destLat, destLng);

          next[del.DeliveryID] = {
            driverId: del.DriverID,
            tankerId: del.TankerID,
            deliveryId: del.DeliveryID,
            currentLat: curLat,
            currentLng: curLng,
            targetLat: destLat,
            targetLng: destLng,
            speedKmh: 36,
            progressPercent: initProgress,
            etaMinutes: Math.ceil((distRem / 36) * 60),
            waterRemainingLiters: totalCap,
            totalCapacityLiters: totalCap,
            lastUpdated: new Date().toLocaleTimeString(),
            heading,
            status: 'en_route_delivery'
          };
        }
      });

      return next;
    });
  }, [deliveries, bookings, tankers, drivers, addresses, tankerTypes, simulationSpeed]);

  // Run ticker every 1.5 seconds if simulation speed > 0
  useEffect(() => {
    if (simulationSpeed <= 0) return;
    const interval = setInterval(() => {
      setTelemetries((prev) => {
        const next = { ...prev };
        let changed = false;

        Object.keys(next).forEach((key) => {
          const id = Number(key);
          const item = next[id];
          if (!item) return;

          changed = true;
          const increment = 0.8 * simulationSpeed;
          let newProgress = item.progressPercent + increment;
          let status = item.status;
          let waterRem = item.waterRemainingLiters;

          if (newProgress >= 100) {
            newProgress = 100;
            status = 'delivering_discharge';
            waterRem = Math.max(0, waterRem - (item.totalCapacityLiters / 30) * simulationSpeed);

            if (waterRem <= 0 && !completedRef.current.has(item.deliveryId)) {
              completedRef.current.add(item.deliveryId);
              onDeliveryArrival?.(item.deliveryId);
            }
          } else {
            status = 'en_route_delivery';
          }

          const ratio = Math.min(1, newProgress / 100);
          const arcOffset = Math.sin(ratio * Math.PI) * 0.0012;
          const depotLat = CENTRAL_DEPOT.lat;
          const depotLng = CENTRAL_DEPOT.lng;

          const curLat = depotLat + (item.targetLat - depotLat) * ratio + arcOffset;
          const curLng = depotLng + (item.targetLng - depotLng) * ratio - arcOffset * 0.5;

          const distRem = calculateDistanceKm(curLat, curLng, item.targetLat, item.targetLng);
          const speed = 30 + Math.floor(Math.sin(newProgress * 0.15) * 8);
          const eta = Math.ceil((distRem / Math.max(10, speed)) * 60);
          const heading = calculateHeading(curLat, curLng, item.targetLat, item.targetLng);

          next[id] = {
            ...item,
            currentLat: curLat,
            currentLng: curLng,
            progressPercent: Number(newProgress.toFixed(1)),
            speedKmh: speed,
            etaMinutes: Math.max(0, eta),
            waterRemainingLiters: Math.round(waterRem),
            lastUpdated: new Date().toLocaleTimeString(),
            heading,
            status
          };
        });

        return changed ? next : prev;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [simulationSpeed]);

  return { telemetries };
}
