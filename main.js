// --- START OF FILE main.js ---

process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'; // Keep for dev, consider removing for prod builds

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { dbPromise, saveDatabase } = require('./database'); // Ensure this path is correct
let db;

// Function to create the main application window
async function createWindow() {
  const win = new BrowserWindow({
    width: 1520, // Consider making this configurable or remember last size
    height: 850, // Slightly taller to accommodate UI changes
    minWidth: 1024, // Set minimum reasonable size
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false, // Keep false for security
      spellcheck: true // Enable spellcheck in inputs
    },
    titleBarStyle: 'hidden', // Optional: For a more modern macOS look
    trafficLightPosition: { x: 15, y: 15 }, // Optional: Adjust traffic lights on macOS
    show: false // Don't show until ready
  });

//   win.webContents.openDevTools(); // Uncomment for debugging

  win.loadFile('index.html');

  // Show window gracefully when ready
  win.once('ready-to-show', () => {
    win.show();
  });
}

// App Lifecycle
app.whenReady().then(async () => {
  try {
    db = await dbPromise; // Wait for DB to be ready
    console.log('Database connection established for main process.');
    createWindow();

    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (error) {
      console.error('Failed to initialize application:', error);
      // Inform user or exit gracefully
      app.quit();
  }
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Before quitting, ensure the database is saved one last time
    if (db) {
        console.log('Saving database before exit...');
        saveDatabase();
    }
    app.quit();
  }
});

// --- IPC Handlers ---

// Helper function for running SQL queries safely
async function runQuery(sql, params = []) {
    try {
        const stmt = db.prepare(sql);
        const result = [];
        stmt.bind(params);
        while (stmt.step()) {
            result.push(stmt.getAsObject());
        }
        stmt.free();
        return result;
    } catch (error) {
        console.error(`Error executing query: ${sql}`, error);
        throw new Error(`Database query failed: ${error.message}`); // Re-throw customized error
    }
}

// Helper function for executing SQL commands (INSERT, UPDATE, DELETE)
async function runCommand(sql, params = []) {
    try {
        const stmt = db.prepare(sql);
        const info = stmt.run(params);
        stmt.free();
        saveDatabase(); // Save after every command
        return info; // Contains lastInsertRowid, changes
    } catch (error) {
        console.error(`Error executing command: ${sql}`, error);
        // Check for UNIQUE constraint errors specifically
        if (error.message.includes('UNIQUE constraint failed')) {
            throw new Error(`Database constraint violation: ${error.message}`);
        }
        throw new Error(`Database command failed: ${error.message}`);
    }
}


ipcMain.handle('get-dashboard-stats', async () => {
    try {
        const totalMembersRes = await runQuery("SELECT COUNT(*) AS count FROM members");
        const totalWorkoutsRes = await runQuery("SELECT COUNT(*) AS count FROM workouts"); // Use new workout table
        const totalPaymentsRes = await runQuery("SELECT SUM(amount) AS total FROM payments");
        const activeMembersRes = await runQuery(`
            SELECT COUNT(DISTINCT member_id) AS count
            FROM attendance
            WHERE date(check_in) = date('now')
        `);

        return {
            totalMembers: totalMembersRes[0]?.count ?? 0,
            totalWorkouts: totalWorkoutsRes[0]?.count ?? 0,
            totalPayments: totalPaymentsRes[0]?.total ?? 0,
            activeMembers: activeMembersRes[0]?.count ?? 0
        };
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        throw error; // Let preload handle throwing to renderer
    }
});

ipcMain.handle('get-members', async (event, searchTerm) => {
  const baseQuery = `
        SELECT id, name, email, phone, membership_type,
               strftime('%Y-%m-%d', join_date) as formatted_join_date,
               strftime('%Y-%m-%d', end_date) as formatted_end_date,
               CASE
                   WHEN date(end_date) >= date('now') THEN 'Active'
                   ELSE 'Expired'
               END as status -- Calculate status in SQL
        FROM members
    `;
  if (!searchTerm) {
    return await runQuery(baseQuery + " ORDER BY name COLLATE NOCASE");
  } else {
    const searchParam = `%${searchTerm}%`;
    const searchQuery = `
            WHERE
                LOWER(name) LIKE ? COLLATE NOCASE OR
                email LIKE ? COLLATE NOCASE OR
                phone LIKE ? COLLATE NOCASE OR
                LOWER(membership_type) LIKE ? COLLATE NOCASE
            ORDER BY name COLLATE NOCASE
        `;
    return await runQuery(baseQuery + searchQuery, [searchParam, searchParam, searchParam, searchParam]);
  }
});

ipcMain.handle('add-member', async (_, name, email, phone, membershipType, startDate, endDate) => {
    if (!name || !membershipType || !startDate || !endDate) { // Added date checks
        throw new Error('Name, membership type, start date, and end date are required.');
    }
    const sql = `
        INSERT INTO members (name, email, phone, membership_type, join_date, end_date)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    // Ensure optional fields are null if empty
    const params = [
        name,
        email || null,
        phone || null,
        membershipType,
        startDate,
        endDate
    ];
    const info = await runCommand(sql, params);
    return info.lastInsertRowid; // Return the ID of the newly added member
});

// Corrected get-member to return object
ipcMain.handle('get-member', async (_, id) => {
  const results = await runQuery(`
    SELECT id, name, email, phone, membership_type,
           strftime('%Y-%m-%d', join_date) as join_date,
           strftime('%Y-%m-%d', end_date) as end_date
    FROM members
    WHERE id = ?
  `, [id]);
  if (results.length === 0) {
      throw new Error(`Member with ID ${id} not found.`);
  }
  return results[0]; // Return the first (and only) result object
});


ipcMain.handle('update-member', async (_, id, updates) => {
    const allowedFields = ['name', 'email', 'phone', 'membership_type', 'join_date', 'end_date'];
    const fieldsToUpdate = Object.keys(updates)
        .filter(key => allowedFields.includes(key) && updates[key] !== undefined); // Check for undefined

    if (fieldsToUpdate.length === 0) {
        throw new Error('No valid fields provided for update.');
    }

    // Ensure optional fields are set to null if empty string provided
    const values = fieldsToUpdate.map(field => {
        const value = updates[field];
        return (field === 'email' || field === 'phone') && value === '' ? null : value;
    });
    values.push(id); // Add the ID for the WHERE clause

    const setClause = fieldsToUpdate.map(field => `${field} = ?`).join(', ');
    const sql = `UPDATE members SET ${setClause} WHERE id = ?`;

    await runCommand(sql, values);
    return true; // Indicate success
});

// Corrected delete-member (saveDatabase is now handled by runCommand)
ipcMain.handle('delete-member', async (_, id) => {
    const sql = "DELETE FROM members WHERE id = ?";
    await runCommand(sql, [id]);
    return true; // Indicate success
});

// --- Payments ---
ipcMain.handle('get-payments', async () => {
  return await runQuery(`
    SELECT p.id, p.amount, strftime('%Y-%m-%d', p.payment_date) as payment_date,
           m.id as member_id, m.name as member_name
    FROM payments p
    LEFT JOIN members m ON p.member_id = m.id
    ORDER BY p.payment_date DESC, m.name COLLATE NOCASE
  `);
});

ipcMain.handle('add-payment', async (_, memberId, amount) => {
    if (!memberId || !amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        throw new Error('Valid member ID and positive amount are required.');
    }
    const sql = `INSERT INTO payments (member_id, amount) VALUES (?, ?)`;
    await runCommand(sql, [memberId, parseFloat(amount)]);
    return true;
});

// --- Attendance ---
ipcMain.handle('get-attendance', async () => {
    return await runQuery(`
        SELECT a.id, a.check_in, strftime('%Y-%m-%d %H:%M:%S', a.check_in) as formatted_check_in,
               m.id as member_id, m.name as member_name
        FROM attendance a
        JOIN members m ON a.member_id = m.id
        ORDER BY a.check_in DESC
    `);
});

ipcMain.handle('record-checkin', async (_, memberId) => {
    const parsedMemberId = parseInt(memberId, 10);
    if (isNaN(parsedMemberId)) {
        throw new Error('Invalid member ID provided.');
    }
    // Optional: Check if member exists and is active?
    const sql = `INSERT INTO attendance (member_id) VALUES (?)`;
    await runCommand(sql, [parsedMemberId]);
    return true;
});

// --- Reports ---
ipcMain.handle('get-monthly-report', async (_, month) => { // month is 'YYYY-MM'
    if (!/^\d{4}-\d{2}$/.test(month)) {
        throw new Error('Invalid month format. Please use YYYY-MM.');
    }
    try {
        const paymentsRes = await runQuery(`
            SELECT COALESCE(SUM(amount), 0) as totalPayments
            FROM payments
            WHERE strftime('%Y-%m', payment_date) = ?
        `, [month]);

        const attendanceRes = await runQuery(`
            SELECT
                COUNT(*) as totalCheckins,
                COUNT(DISTINCT member_id) as uniqueMembers
            FROM attendance
            WHERE strftime('%Y-%m', check_in) = ?
        `, [month]);

        const totalPayments = paymentsRes[0]?.totalPayments ?? 0;
        const totalCheckins = attendanceRes[0]?.totalCheckins ?? 0;
        const uniqueMembers = attendanceRes[0]?.uniqueMembers ?? 0;

        const avgAttendanceDays = uniqueMembers > 0
            ? (totalCheckins / uniqueMembers).toFixed(1)
            : '0.0';

        return {
            totalPayments: totalPayments,
            avgAttendanceDays: avgAttendanceDays,
            activeMembers: uniqueMembers // Renamed from uniqueMembers for clarity in report context
        };
    } catch (error) {
        console.error(`Error generating report for month ${month}:`, error);
        throw error;
    }
});

// --- Workouts (NEW) ---
ipcMain.handle('get-workouts', async () => {
    return await runQuery("SELECT id, name, duration, difficulty FROM workouts ORDER BY name COLLATE NOCASE");
});

ipcMain.handle('add-workout', async (_, name, duration, difficulty) => {
    if (!name || !duration || !difficulty || isNaN(parseInt(duration)) || parseInt(duration) <= 0) {
        throw new Error('Valid name, positive duration (minutes), and difficulty are required.');
    }
    const sql = `INSERT INTO workouts (name, duration, difficulty) VALUES (?, ?, ?)`;
    await runCommand(sql, [name, parseInt(duration), difficulty]);
    return true;
});

// Optional: Add delete/update workout handlers if needed later
// ipcMain.handle('delete-workout', async (_, id) => { ... });
// ipcMain.handle('update-workout', async (_, id, updates) => { ... });

// --- END OF FILE main.js ---