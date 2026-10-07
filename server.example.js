/**
 * AquaFlow - Local MySQL Backend Bridge (Express + mysql2)
 * 
 * Usage:
 * 1. Install dependencies:
 *    npm install express mysql2 dotenv cors
 * 
 * 2. Configure .env:
 *    DB_HOST=localhost
 *    DB_PORT=3306
 *    DB_USER=root
 *    DB_PASSWORD=your_mysql_password
 *    DB_NAME=water_tanker_db
 *    PORT=5000
 * 
 * 3. Run:
 *    node server.example.js
 */

import express from 'express';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

// Enable CORS for Vite dev server (port 3000)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Create MySQL Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'water_tanker_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 AS connected');
    res.json({ status: 'ok', mysql: 'connected', version: '8.0+' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Get all database state (Synchronize React app with MySQL)
app.get('/api/database', async (req, res) => {
  try {
    const [customers] = await pool.query('SELECT * FROM CUSTOMER');
    const [areas] = await pool.query('SELECT * FROM AREA');
    const [addresses] = await pool.query('SELECT * FROM ADDRESS');
    const [tankerTypes] = await pool.query('SELECT * FROM TANKER_TYPE');
    const [tankers] = await pool.query('SELECT * FROM TANKER');
    const [drivers] = await pool.query('SELECT * FROM DRIVER');
    const [bookings] = await pool.query('SELECT * FROM BOOKING');
    const [deliveries] = await pool.query('SELECT * FROM DELIVERY');
    const [payments] = await pool.query('SELECT * FROM PAYMENT');
    const [bookingDetails] = await pool.query('SELECT * FROM vw_booking_details');

    res.json({
      customers,
      areas,
      addresses,
      tankerTypes,
      tankers,
      drivers,
      bookings,
      deliveries,
      payments,
      bookingDetailsView: bookingDetails
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CUSTOMERS API
app.post('/api/customers', async (req, res) => {
  const { Name, Phone } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO CUSTOMER (Name, Phone) VALUES (?, ?)',
      [Name, Phone]
    );
    res.status(201).json({ CustomerID: result.insertId, Name, Phone });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/customers/:id', async (req, res) => {
  const { id } = req.params;
  const { Name, Phone } = req.body;
  try {
    await pool.query(
      'UPDATE CUSTOMER SET Name = COALESCE(?, Name), Phone = COALESCE(?, Phone) WHERE CustomerID = ?',
      [Name, Phone, id]
    );
    res.json({ success: true, CustomerID: Number(id) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM CUSTOMER WHERE CustomerID = ?', [id]);
    res.json({ success: true, deletedId: Number(id) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// BOOKINGS API
app.post('/api/bookings', async (req, res) => {
  const { AddressID, TypeID, ScheduledDate, TimeSlot } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO BOOKING (AddressID, TypeID, ScheduledDate, TimeSlot, Status) VALUES (?, ?, ?, ?, "Pending")',
      [AddressID, TypeID, ScheduledDate, TimeSlot]
    );
    res.status(201).json({ BookingID: result.insertId });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DISPATCH TANKER (Enforces MySQL Triggers)
app.post('/api/dispatch', async (req, res) => {
  const { BookingID, TankerID, DriverID, DispatchTime } = req.body;
  try {
    const dispatchTimeVal = DispatchTime || new Date().toISOString().slice(0, 19).replace('T', ' ');
    const [result] = await pool.query(
      'INSERT INTO DELIVERY (BookingID, TankerID, DriverID, DispatchTime, DeliveredTime) VALUES (?, ?, ?, ?, NULL)',
      [BookingID, TankerID, DriverID, dispatchTimeVal]
    );
    res.status(201).json({ DeliveryID: result.insertId, message: 'Dispatched successfully' });
  } catch (err) {
    // Returns trigger validation errors directly from MySQL
    res.status(400).json({ error: err.message });
  }
});

// COMPLETE DELIVERY (Fires trg_delivery_after_update)
app.post('/api/deliveries/:id/complete', async (req, res) => {
  const { id } = req.params;
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  try {
    await pool.query('UPDATE DELIVERY SET DeliveredTime = ? WHERE DeliveryID = ?', [now, id]);
    res.json({ success: true, deliveredTime: now });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// RUN CUSTOM SQL (SQL Studio Console)
app.post('/api/query', async (req, res) => {
  const { sql } = req.body;
  try {
    const [rows] = await pool.query(sql);
    res.json({ rows });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`AquaFlow MySQL Backend running on http://localhost:${PORT}`);
  console.log(`Connected to MySQL database: ${process.env.DB_NAME || 'water_tanker_db'}`);
});
