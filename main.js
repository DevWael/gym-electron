const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { dbPromise, saveDatabase } = require('./database');

let db;

async function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }

    // show dev tools
  });
  win.webContents.openDevTools();

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
ipcMain.handle('get-members', () => {
  try {
    const stmt = db.prepare("SELECT *, strftime('%Y-%m-%d', join_date) as join_date FROM members");
    const members = [];
    while (stmt.step()) {
      members.push(stmt.getAsObject());
    }
    stmt.free();
    return members;
  } catch (error) {
    console.error('Get members error:', error);
    throw new Error('Failed to fetch members');
  }
});

ipcMain.handle('add-member', (_, name, email, phone, membershipType) => {
  try {
      // Convert undefined values to null
      const cleanEmail = email || null;
      const cleanPhone = phone || null;
      
      // Validate required fields
      if (!name || !membershipType) {
          throw new Error('Name and membership type are required');
      }

      const stmt = db.prepare(`
          INSERT INTO members (name, email, phone, membership_type)
          VALUES (?, ?, ?, ?)
      `);
      
      const info = stmt.run([
          name,
          cleanEmail,  // Now either string or null
          cleanPhone,  // Now either string or null
          membershipType
      ]);
      
      stmt.free();
      saveDatabase();
      return info.lastInsertRowid;
  } catch (error) {
      console.error('Database error details:', error);
      throw new Error(`Failed to add member: ${error.message}`);
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