const eventForm = document.getElementById('event-form');
const eventsList = document.getElementById('events-list');
const regTbody = document.getElementById('registrations-tbody');
const modal = document.getElementById('register-modal');
const closeModal = document.getElementById('close-modal');
const registerForm = document.getElementById('register-form');

async function loadStats() {
  const res = await fetch('/api/stats');
  const data = await res.json();
  document.getElementById('stat-total-events').textContent = data.totalEvents || 0;
  document.getElementById('stat-total-regs').textContent = data.totalRegistrations || 0;
  document.getElementById('stat-total-seats').textContent = data.totalAvailableSeats || 0;
}

async function loadEvents() {
  const res = await fetch('/api/events');
  const events = await res.json();
  eventsList.innerHTML = '';

  if (events.length === 0) {
    eventsList.innerHTML = '<p style="color:#888;">No events available. Add one!</p>';
    return;
  }

  events.forEach(event => {
    const isFull = event.available_seats <= 0;
    const card = document.createElement('div');
    card.className = 'event-card';
    card.innerHTML = `
      <div class="event-info">
        <h4>${event.event_name}</h4>
        <p>📅 ${event.event_date} | 📍 ${event.location}</p>
        <p>${event.description || ''}</p>
        <span class="seats-badge ${isFull ? 'full' : ''}">
          ${isFull ? 'Sold Out' : `${event.available_seats} / ${event.total_seats} seats left`}
        </span>
      </div>
      <div>
        <button ${isFull ? 'disabled style="background:#aaa;cursor:not-allowed;"' : ''} onclick="openRegisterModal(${event.id}, '${event.event_name.replace(/'/g, "\\'")}')">
          Register
        </button>
      </div>
    `;
    eventsList.appendChild(card);
  });
}

async function loadRegistrations() {
  const res = await fetch('/api/registrations');
  const regs = await res.json();
  regTbody.innerHTML = '';

  if (regs.length === 0) {
    regTbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#888;">No registrations yet.</td></tr>';
    return;
  }

  regs.forEach(reg => {
    const row = document.createElement('tr');
    const dateStr = new Date(reg.registration_date).toLocaleString();
    row.innerHTML = `
      <td>${reg.id}</td>
      <td>${reg.name}</td>
      <td>${reg.email}</td>
      <td>${reg.phone}</td>
      <td>${reg.event_name}</td>
      <td>${dateStr}</td>
    `;
    regTbody.appendChild(row);
  });
}

eventForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const newEvent = {
    event_name: document.getElementById('event_name').value,
    event_date: document.getElementById('event_date').value,
    location: document.getElementById('location').value,
    total_seats: parseInt(document.getElementById('total_seats').value, 10),
    description: document.getElementById('description').value
  };

  const res = await fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newEvent)
  });

  if (res.ok) {
    eventForm.reset();
    loadAll();
  } else {
    const err = await res.json();
    alert(err.error || 'Failed to create event');
  }
});

function openRegisterModal(eventId, eventTitle) {
  document.getElementById('reg-event-id').value = eventId;
  document.getElementById('modal-event-title').textContent = `Register for: ${eventTitle}`;
  modal.style.display = 'flex';
}

closeModal.addEventListener('click', () => {
  modal.style.display = 'none';
  registerForm.reset();
});

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const regData = {
    event_id: document.getElementById('reg-event-id').value,
    name: document.getElementById('reg-name').value,
    email: document.getElementById('reg-email').value,
    phone: document.getElementById('reg-phone').value
  };

  const res = await fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(regData)
  });

  const data = await res.json();
  if (res.ok) {
    alert(`Success! Registration ID: #${data.registrationId}`);
    modal.style.display = 'none';
    registerForm.reset();
    loadAll();
  } else {
    alert(data.error || 'Registration failed');
  }
});

function loadAll() {
  loadStats();
  loadEvents();
  loadRegistrations();
}

loadAll();
