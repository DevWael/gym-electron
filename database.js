
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

let db;
const dbPath = path.join(__dirname, 'gym.db');

async function initializeDatabase() {
    const SQL = await initSqlJs();
    
    try {
        if (fs.existsSync(dbPath)) {
            const fileBuffer = fs.readFileSync(dbPath);
            db = new SQL.Database(fileBuffer);
        } else {
            db = new SQL.Database();
            saveDatabase(); // Create initial empty database file
        }
    } catch (error) {
        console.error('Database error:', error);
        throw error;
    }

    // Create tables
    db.exec(`
        CREATE TABLE IF NOT EXISTS members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            membership_type TEXT,
            join_date DATE DEFAULT (date('now')),
            end_date DATE
        );

        CREATE TABLE IF NOT EXISTS workouts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            duration INTEGER,
            difficulty TEXT
        );

        CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            member_id INTEGER,
            amount REAL,
            payment_date DATE DEFAULT (date('now')),
            FOREIGN KEY(member_id) REFERENCES members(id)
        );

        CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            member_id INTEGER,
            check_in DATETIME DEFAULT (datetime('now')),
            FOREIGN KEY(member_id) REFERENCES members(id)
        );
    `);
    saveDatabase(); // Save table structure
    return db;
}

// Add this function to save the database
function saveDatabase() {
    try {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(dbPath, buffer);
    } catch (error) {
        console.error('Save failed:', error);
    }
}

module.exports = {
    dbPromise: initializeDatabase(),
    saveDatabase
};