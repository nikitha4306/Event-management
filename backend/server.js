const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB, getPool } = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/api/stats', async (req, res) => {
  try {
    const pool = getPool();
    const [[eventsCount]] = await pool.query('SELECT COUNT(*) as totalEvents, COALESCE(SUM(available_seats), 0) as totalAvailableSeats FROM events');
    const [[regsCount]] = await pool.query('SELECT COUNT(*) as totalRegistrations FROM registrations');
    
    res.json({
      totalEvents: eventsCount.totalEvents,
      totalRegistrations: regsCount.totalRegistrations,
      totalAvailableSeats: eventsCount.totalAvailableSeats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/events', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM events ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/events', async (req, res) => {
  const { event_name, description, event_date, location, total_seats } = req.body;
  if (!event_name || !event_date || !location || !total_seats) {
    return res.status(400).json({ error: 'Please provide all required fields' });
  }
  try {
    const pool = getPool();
    const [result] = await pool.query(
      'INSERT INTO events (event_name, description, event_date, location, total_seats, available_seats) VALUES (?, ?, ?, ?, ?, ?)',
      [event_name, description || '', event_date, location, total_seats, total_seats]
    );
    res.json({ message: 'Event created successfully', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/registrations', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(`
      SELECT r.id, r.name, r.email, r.phone, r.registration_date, e.event_name 
      FROM registrations r 
      JOIN events e ON r.event_id = e.id 
      ORDER BY r.id DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/register', async (req, res) => {
  const { event_id, name, email, phone } = req.body;
  if (!event_id || !name || !email || !phone) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const pool = getPool();
    const [[event]] = await pool.query('SELECT available_seats FROM events WHERE id = ?', [event_id]);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    if (event.available_seats <= 0) {
      return res.status(400).json({ error: 'No available seats for this event' });
    }

    const [existing] = await pool.query('SELECT id FROM registrations WHERE event_id = ? AND email = ?', [event_id, email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'This email is already registered for this event' });
    }

    const [regResult] = await pool.query(
      'INSERT INTO registrations (event_id, name, email, phone) VALUES (?, ?, ?, ?)',
      [event_id, name, email, phone]
    );

    await pool.query('UPDATE events SET available_seats = available_seats - 1 WHERE id = ?', [event_id]);

    res.json({ message: 'Registration successful', registrationId: regResult.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MySQL:', err.message);
  });
