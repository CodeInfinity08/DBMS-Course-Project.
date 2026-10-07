-- =====================================================================
-- AquaFlow: Water Tanker Fleet & Delivery Management System
-- MySQL 8.0+ Complete Relational Database Schema, Triggers & Seed Data
-- =====================================================================

CREATE DATABASE IF NOT EXISTS water_tanker_db;
USE water_tanker_db;

-- 1. DROP EXISTING TABLES IN REVERSE DEPENDENCY ORDER
DROP VIEW IF EXISTS vw_booking_details;
DROP TABLE IF EXISTS PAYMENT;
DROP TABLE IF EXISTS DELIVERY;
DROP TABLE IF EXISTS BOOKING;
DROP TABLE IF EXISTS DRIVER;
DROP TABLE IF EXISTS TANKER;
DROP TABLE IF EXISTS TANKER_TYPE;
DROP TABLE IF EXISTS ADDRESS;
DROP TABLE IF EXISTS AREA;
DROP TABLE IF EXISTS CUSTOMER;

-- ---------------------------------------------------------------------
-- 2. DDL: TABLE DEFINITIONS
-- ---------------------------------------------------------------------

-- CUSTOMER Table
CREATE TABLE CUSTOMER (
    CustomerID INT AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Phone VARCHAR(15) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- AREA Table
CREATE TABLE AREA (
    AreaID INT AUTO_INCREMENT PRIMARY KEY,
    AreaName VARCHAR(100) NOT NULL,
    Pincode VARCHAR(10) NOT NULL
) ENGINE=InnoDB;

-- ADDRESS Table
CREATE TABLE ADDRESS (
    AddressID INT AUTO_INCREMENT PRIMARY KEY,
    CustomerID INT NOT NULL,
    AreaID INT NOT NULL,
    Street VARCHAR(255) NOT NULL,
    Latitude DECIMAL(10, 6) NOT NULL,
    Longitude DECIMAL(10, 6) NOT NULL,
    FOREIGN KEY (CustomerID) REFERENCES CUSTOMER(CustomerID) ON DELETE CASCADE,
    FOREIGN KEY (AreaID) REFERENCES AREA(AreaID) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- TANKER_TYPE Table
CREATE TABLE TANKER_TYPE (
    TypeID INT AUTO_INCREMENT PRIMARY KEY,
    Capacity_Liters INT NOT NULL,
    Price DECIMAL(10, 2) NOT NULL
) ENGINE=InnoDB;

-- TANKER Table
CREATE TABLE TANKER (
    TankerID INT AUTO_INCREMENT PRIMARY KEY,
    TypeID INT NOT NULL,
    License_Plate VARCHAR(20) NOT NULL UNIQUE,
    Status ENUM('Available', 'Dispatched', 'Maintenance') NOT NULL DEFAULT 'Available',
    FOREIGN KEY (TypeID) REFERENCES TANKER_TYPE(TypeID) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- DRIVER Table
CREATE TABLE DRIVER (
    DriverID INT AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Phone VARCHAR(15) NOT NULL UNIQUE,
    License_No VARCHAR(50) NOT NULL UNIQUE,
    IsOnDuty BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

-- BOOKING Table
CREATE TABLE BOOKING (
    BookingID INT AUTO_INCREMENT PRIMARY KEY,
    AddressID INT NOT NULL,
    TypeID INT NOT NULL,
    ScheduledDate DATE NOT NULL,
    TimeSlot ENUM('06:00-09:00', '09:00-12:00', '12:00-15:00', '15:00-18:00') NOT NULL,
    Status ENUM('Pending', 'Assigned', 'Delivered', 'Cancelled') NOT NULL DEFAULT 'Pending',
    FOREIGN KEY (AddressID) REFERENCES ADDRESS(AddressID) ON DELETE CASCADE,
    FOREIGN KEY (TypeID) REFERENCES TANKER_TYPE(TypeID) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- DELIVERY Table
CREATE TABLE DELIVERY (
    DeliveryID INT AUTO_INCREMENT PRIMARY KEY,
    BookingID INT NOT NULL UNIQUE,
    TankerID INT NOT NULL,
    DriverID INT NOT NULL,
    DispatchTime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    DeliveredTime DATETIME NULL,
    FOREIGN KEY (BookingID) REFERENCES BOOKING(BookingID) ON DELETE CASCADE,
    FOREIGN KEY (TankerID) REFERENCES TANKER(TankerID) ON DELETE RESTRICT,
    FOREIGN KEY (DriverID) REFERENCES DRIVER(DriverID) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- PAYMENT Table
CREATE TABLE PAYMENT (
    PaymentID INT AUTO_INCREMENT PRIMARY KEY,
    BookingID INT NOT NULL UNIQUE,
    Amount DECIMAL(10, 2) NOT NULL,
    Method ENUM('Cash', 'UPI', 'Card', 'NetBanking') NOT NULL,
    PaymentTime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (BookingID) REFERENCES BOOKING(BookingID) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 3. SQL VIEW: vw_booking_details (3NF Denormalized Flat View)
-- ---------------------------------------------------------------------

CREATE VIEW vw_booking_details AS
SELECT 
    b.BookingID,
    c.CustomerID,
    c.Name AS CustomerName,
    c.Phone AS CustomerPhone,
    a.Street,
    ar.AreaName,
    ar.Pincode,
    tt.Capacity_Liters,
    tt.Price,
    b.ScheduledDate,
    b.TimeSlot,
    b.Status AS BookingStatus,
    d.DeliveryID,
    t.License_Plate,
    dr.Name AS DriverName,
    dr.Phone AS DriverPhone,
    d.DispatchTime,
    d.DeliveredTime,
    p.Amount AS PaidAmount,
    p.Method AS PaymentMethod,
    a.Latitude,
    a.Longitude,
    b.AddressID,
    t.TankerID,
    dr.DriverID,
    tt.TypeID
FROM BOOKING b
JOIN ADDRESS a ON b.AddressID = a.AddressID
JOIN CUSTOMER c ON a.CustomerID = c.CustomerID
JOIN AREA ar ON a.AreaID = ar.AreaID
JOIN TANKER_TYPE tt ON b.TypeID = tt.TypeID
LEFT JOIN DELIVERY d ON b.BookingID = d.BookingID
LEFT JOIN TANKER t ON d.TankerID = t.TankerID
LEFT JOIN DRIVER dr ON d.DriverID = dr.DriverID
LEFT JOIN PAYMENT p ON b.BookingID = p.BookingID;

-- ---------------------------------------------------------------------
-- 4. MYSQL TRIGGERS: OPERATIONAL CONSTRAINTS & STATE TRANSITIONS
-- ---------------------------------------------------------------------

DELIMITER $$

-- Trigger 1: Validate Tanker Availability, Capacity Match & Driver Status Before Dispatch
CREATE TRIGGER trg_delivery_before_insert
BEFORE INSERT ON DELIVERY
FOR EACH ROW
BEGIN
    DECLARE v_booking_status VARCHAR(20);
    DECLARE v_booking_type INT;
    DECLARE v_tanker_status VARCHAR(20);
    DECLARE v_tanker_type INT;
    DECLARE v_driver_duty BOOLEAN;
    DECLARE v_driver_busy INT;

    -- Verify Booking is in Pending state
    SELECT Status, TypeID INTO v_booking_status, v_booking_type 
    FROM BOOKING WHERE BookingID = NEW.BookingID;
    
    IF v_booking_status IS NULL OR v_booking_status != 'Pending' THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'SQLSTATE 45000: Booking not found or not in Pending status';
    END IF;

    -- Verify Tanker is Available and matches required Type
    SELECT Status, TypeID INTO v_tanker_status, v_tanker_type 
    FROM TANKER WHERE TankerID = NEW.TankerID;
    
    IF v_tanker_status != 'Available' THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'SQLSTATE 45000: Tanker is not available';
    END IF;

    IF v_tanker_type != v_booking_type THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'SQLSTATE 45000: Tanker size does not match booking type';
    END IF;

    -- Verify Driver is On Duty and not on another active delivery
    SELECT IsOnDuty INTO v_driver_duty FROM DRIVER WHERE DriverID = NEW.DriverID;
    IF v_driver_duty = FALSE THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'SQLSTATE 45000: Driver is currently OFF DUTY and cannot be dispatched';
    END IF;

    SELECT COUNT(*) INTO v_driver_busy 
    FROM DELIVERY 
    WHERE DriverID = NEW.DriverID AND DeliveredTime IS NULL;

    IF v_driver_busy > 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'SQLSTATE 45000: Driver is already assigned to another active delivery';
    END IF;
END$$

-- Trigger 2: Automatically transition Tanker to 'Dispatched' & Booking to 'Assigned'
CREATE TRIGGER trg_delivery_after_insert
AFTER INSERT ON DELIVERY
FOR EACH ROW
BEGIN
    UPDATE TANKER SET Status = 'Dispatched' WHERE TankerID = NEW.TankerID;
    UPDATE BOOKING SET Status = 'Assigned' WHERE BookingID = NEW.BookingID;
END$$

-- Trigger 3: Automatically transition Tanker to 'Available' & Booking to 'Delivered'
CREATE TRIGGER trg_delivery_after_update
AFTER UPDATE ON DELIVERY
FOR EACH ROW
BEGIN
    IF OLD.DeliveredTime IS NULL AND NEW.DeliveredTime IS NOT NULL THEN
        UPDATE TANKER SET Status = 'Available' WHERE TankerID = NEW.TankerID;
        UPDATE BOOKING SET Status = 'Delivered' WHERE BookingID = NEW.BookingID;
    END IF;
END$$

DELIMITER ;

-- ---------------------------------------------------------------------
-- 5. INITIAL SEED DATA
-- ---------------------------------------------------------------------

-- Areas
INSERT INTO AREA (AreaID, AreaName, Pincode) VALUES
(1, 'Gandhi Nagar', '500101'),
(2, 'Lakshmi Nagar', '500102'),
(3, 'Ram Nagar', '500103'),
(4, 'Indira Colony', '500104'),
(5, 'Shanti Nagar', '500105'),
(6, 'Vivek Vihar', '500106');

-- Customers
INSERT INTO CUSTOMER (CustomerID, Name, Phone) VALUES
(1, 'Ravi Kumar', '9000000001'),
(2, 'Sneha Reddy', '9000000002'),
(3, 'Anil Sharma', '9000000003'),
(4, 'Lakshmi Devi', '9000000004'),
(5, 'Mohammed Imran', '9000000005'),
(6, 'Priya Nair', '9000000006'),
(7, 'Suresh Babu', '9000000007'),
(8, 'Kavitha Rao', '9000000008');

-- Addresses
INSERT INTO ADDRESS (AddressID, CustomerID, AreaID, Street, Latitude, Longitude) VALUES
(1, 1, 1, '12-3-45, Main Road', 17.401200, 78.480100),
(2, 2, 2, '4-18, Temple Street', 17.405800, 78.487300),
(3, 3, 3, '7-2-11, Market Lane', 17.398400, 78.491800),
(4, 4, 1, '9-1-7, Canal Road', 17.402600, 78.478400),
(5, 5, 4, '2-44, School Street', 17.410300, 78.470900),
(6, 6, 5, '15-8-2, Garden Road', 17.395100, 78.483700),
(7, 7, 6, '3-9-30, Station Road', 17.408800, 78.495200),
(8, 8, 2, '6-6-6, Lake View Colony', 17.403900, 78.489500);

-- Tanker Types
INSERT INTO TANKER_TYPE (TypeID, Capacity_Liters, Price) VALUES
(1, 3000, 600.00),
(2, 6000, 1000.00),
(3, 10000, 1500.00);

-- Tankers
INSERT INTO TANKER (TankerID, TypeID, License_Plate, Status) VALUES
(1, 1, 'TS01WT1001', 'Available'),
(2, 1, 'TS01WT1002', 'Available'),
(3, 2, 'TS01WT1003', 'Available'),
(4, 2, 'TS01WT1004', 'Available'),
(5, 3, 'TS01WT1005', 'Available'),
(6, 3, 'TS01WT1006', 'Maintenance');

-- Drivers
INSERT INTO DRIVER (DriverID, Name, Phone, License_No, IsOnDuty) VALUES
(1, 'Ramesh Goud', '9100000001', 'TS0920210001234', TRUE),
(2, 'Venkat Rao', '9100000002', 'TS0920200005678', TRUE),
(3, 'Syed Ahmed', '9100000003', 'TS0920190009012', TRUE),
(4, 'Krishna Murthy', '9100000004', 'TS0920220003456', TRUE),
(5, 'Santosh Yadav', '9100000005', 'TS0920230007890', FALSE);

-- Bookings
INSERT INTO BOOKING (BookingID, AddressID, TypeID, ScheduledDate, TimeSlot, Status) VALUES
(1, 1, 2, CURDATE(), '09:00-12:00', 'Pending'),
(2, 2, 1, CURDATE(), '09:00-12:00', 'Pending'),
(3, 3, 3, CURDATE(), '12:00-15:00', 'Pending');
