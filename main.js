const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { dbPromise, saveDatabase } = require('./database');

let db;

async function createWindow() {
  const win = new BrowserWindow({
    width: 1520,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  
  // win.webContents.openDevTools();
  
  win.loadFile('index.html');
}

app.whenReady().then(async () => {
  db = await dbPromise;
  createWindow();
});

// IPC Handlers
ipcMain.handle('get-dashboard-stats', async () => {
  const stats = {
    totalMembers: db.exec("SELECT COUNT(*) AS count FROM members")[0].values[0][0],
    totalWorkouts: db.exec("SELECT COUNT(*) AS count FROM workouts")[0].values[0][0],
    totalPayments: db.exec("SELECT SUM(amount) AS total FROM payments")[0].values[0][0] || 0,
    activeMembers: db.exec(`
      SELECT COUNT(DISTINCT member_id) AS count 
      FROM attendance 
      WHERE date(check_in) = date('now')
    `)[0].values[0][0]
  };
  return stats;
});

// Get Members Handler (corrected)
ipcMain.handle('get-members', async (event, searchTerm) => {
  try {
      if (!searchTerm) {
          // Fetch all members
          const stmt = db.prepare("SELECT *, strftime('%Y-%m-%d', join_date) as formatted_join_date, strftime('%Y-%m-%d', end_date) as formatted_end_date FROM members");
          const members = [];
          while (stmt.step()) {
              members.push(stmt.getAsObject());
          }
          stmt.free();
          return members;
      } else {
          // Prepare parameterized query with wildcard
          const searchParam = `%${searchTerm}%`;
          const stmt = db.prepare(`
              SELECT *,
              strftime('%Y-%m-%d', join_date) as formatted_join_date,
              strftime('%Y-%m-%d', end_date) as formatted_end_date 
              FROM members 
              WHERE 
                  LOWER(name) LIKE ? COLLATE NOCASE OR 
                  email LIKE ? COLLATE NOCASE OR 
                  phone LIKE ? COLLATE NOCASE OR 
                  LOWER(membership_type) LIKE ? COLLATE NOCASE
          `);
          const members = [];
          stmt.bind([searchParam, searchParam, searchParam, searchParam]);
          while (stmt.step()) {
              members.push(stmt.getAsObject());
          }
          stmt.free();
          return members;
      }
  } catch (error) {
      console.error('Error fetching members:', error);
      throw new Error('Failed to fetch members');
  }
});

ipcMain.handle('add-member', (_, name, email, phone, membershipType, startDate, endDate) => {
  try {
      const cleanEmail = email || null;
      const cleanPhone = phone || null;

      if (!name || !membershipType) {
          throw new Error('Name and membership type are required');
      }

      const stmt = db.prepare(`
          INSERT INTO members 
          (name, email, phone, membership_type, join_date, end_date)
          VALUES (?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run([name, cleanEmail, cleanPhone, membershipType, startDate, endDate]);

      stmt.free();
      saveDatabase();
      return info.lastInsertRowid;
  } catch (error) {
      throw new Error(`Failed to add member: ${error.message}`);
  }
});

ipcMain.handle('get-member', async (_, id) => {
  try {
      const stmt = db.prepare(`
          SELECT *
          FROM members
          WHERE id = ?
      `);
      const member = stmt.get([id]);
      stmt.free();
      return member;
  } catch (error) {
      throw new Error('Failed to retrieve member: ' + error.message);
  }
});

ipcMain.handle('update-member', async (_, id, updates) => {
  try {
      const allowedFields = [
          'name',
          'email',
          'phone',
          'membership_type',
          'join_date',
          'end_date'
      ];

      const fields = Object.keys(updates).filter(field => allowedFields.includes(field));
      if (fields.length === 0) throw new Error('No valid fields to update');

      const queryParts = fields.map(field => `${field} = ?`).join(', ');
      const values = Object.values(updates).map(value => value === null ? null : value);
      values.push(id);

      const stmt = db.prepare(`UPDATE members SET ${queryParts} WHERE id = ?`);
      stmt.run(values);
      stmt.free();
      saveDatabase();
  } catch (error) {
      throw new Error('Failed to update member: ' + error.message);
  }
});

ipcMain.handle('delete-member', (_, id) => {
  const stmt = db.prepare("DELETE FROM members WHERE id = :id");
  stmt.run({ ':id': id });
  return true;
});

// Add similar handlers for other features
ipcMain.handle('get-payments', () => {
  const stmt = db.prepare(`
    SELECT p.*, m.name as member_name 
    FROM payments p
    LEFT JOIN members m ON p.member_id = m.id
  `);
  const payments = [];
  while (stmt.step()) payments.push(stmt.getAsObject());
  return payments;
});

ipcMain.handle('add-payment', (_, memberId, amount) => {
  const stmt = db.prepare(`
    INSERT INTO payments (member_id, amount)
    VALUES (:memberId, :amount)
  `);
  stmt.run({ ':memberId': memberId, ':amount': amount });
  return true;
});

ipcMain.handle('get-attendance', async () => {
  try {
    const stmt = db.prepare(`
          SELECT a.*, m.name as member_name 
          FROM attendance a
          JOIN members m ON a.member_id = m.id
          ORDER BY a.check_in DESC
      `);
    const attendance = [];
    while (stmt.step()) {
      attendance.push(stmt.getAsObject());
    }
    stmt.free();
    return attendance;
  } catch (error) {
    console.error('Get attendance error:', error);
    throw new Error('Failed to load attendance');
  }
});

ipcMain.handle('record-checkin', (_, memberId) => {
  try {
    const stmt = db.prepare(`
          INSERT INTO attendance (member_id)
          VALUES (?)
      `);
    const info = stmt.run([memberId]);
    stmt.free();
    saveDatabase();
    return info.lastInsertRowid;
  } catch (error) {
    console.error('Checkin error:', error);
    throw new Error('Failed to record check-in');
  }
});

// Reports Handler
ipcMain.handle('get-monthly-report', (_, month) => {
  try {
    const [year, monthNumber] = month.split('-');

    // Total Payments
    const payments = db.prepare(`
          SELECT COALESCE(SUM(amount), 0) as totalPayments 
          FROM payments 
          WHERE strftime('%Y-%m', payment_date) = ?
      `).get([`${year}-${monthNumber}`]);

    // Attendance Statistics
    const attendance = db.prepare(`
          SELECT 
              COALESCE(COUNT(*), 0) as totalCheckins,
              COALESCE(COUNT(DISTINCT member_id), 0) as uniqueMembers
          FROM attendance 
          WHERE strftime('%Y-%m', check_in) = ?
      `).get([`${year}-${monthNumber}`]);

    // Calculate average attendance safely
    const activeMembers = attendance.uniqueMembers;
    const avgAttendance = activeMembers > 0
      ? (attendance.totalCheckins / activeMembers).toFixed(1)
      : '0.0';

    return {
      totalPayments: payments.totalPayments || 0,
      avgAttendanceDays: avgAttendance || 0,
      activeMembers: activeMembers
    };
  } catch (error) {
    console.error('Report error:', error);
    throw new Error('Failed to generate report: ' + error.message);
  }
});