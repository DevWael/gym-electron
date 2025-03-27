// --- START OF FILE database.js ---

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const { app } = require('electron'); // Add this line to access Electron's app module

let db;
// Store database in user data directory (Correct location)
const dbPath = path.join(app.getPath('userData'), 'supergym_pro.db'); // More specific name

async function initializeDatabase() {
    const SQL = await initSqlJs(/* optional WASM config */);

    try {
        console.log(`Database path: ${dbPath}`);
        if (fs.existsSync(dbPath)) {
            console.log('Loading existing database file.');
            const fileBuffer = fs.readFileSync(dbPath);
            db = new SQL.Database(fileBuffer);
        } else {
            console.log('Creating new database file.');
            db = new SQL.Database();
            // Initial save to create the file
            saveDatabase();
        }
        console.log('Database loaded/created successfully.');
    } catch (error) {
        console.error('Database initialization error:', error);
        // Consider more robust error handling, maybe notify the user
        // For now, rethrow to halt initialization if critical
        throw error;
    }

    try {
        // Enable Foreign Keys
        db.exec(`PRAGMA foreign_keys = ON;`);

        // Create tables with ON DELETE CASCADE for related data cleanup
        db.exec(`
            CREATE TABLE IF NOT EXISTS members (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE COLLATE NOCASE, -- Added UNIQUE and NOCASE
                phone TEXT UNIQUE,             -- Added UNIQUE
                membership_type TEXT,
                join_date DATE DEFAULT (date('now')),
                end_date DATE
            );

            CREATE TABLE IF NOT EXISTS workouts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE COLLATE NOCASE, -- Added UNIQUE and NOCASE
                duration INTEGER CHECK(duration > 0), -- Added basic validation
                difficulty TEXT
            );

            CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                member_id INTEGER,
                amount REAL NOT NULL CHECK(amount > 0), -- Added NOT NULL and validation
                payment_date DATE DEFAULT (date('now')),
                FOREIGN KEY(member_id) REFERENCES members(id) ON DELETE CASCADE -- Auto-delete payments if member is deleted
            );

            CREATE TABLE IF NOT EXISTS attendance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                member_id INTEGER,
                check_in DATETIME DEFAULT (datetime('now')),
                FOREIGN KEY(member_id) REFERENCES members(id) ON DELETE CASCADE -- Auto-delete attendance if member is deleted
            );
        `);

        console.log('Database schema verified/created.');
        saveDatabase(); // Save potentially newly created tables/schema changes
        return db;
    } catch (schemaError) {
        console.error("Error setting up database schema:", schemaError);
        throw schemaError; // Halt if schema setup fails
    }
}

// Function to save the database (no changes needed here, but added logs)
function saveDatabase() {
    if (!db) {
        console.error('Save failed: Database not initialized.');
        return;
    }
    try {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(dbPath, buffer);
        // console.log('Database saved successfully.'); // Optional: Can be noisy
    } catch (error) {
        console.error('Database save failed:', error);
    }
}

// Ensure initialization is called and export the promise
const dbPromise = initializeDatabase();

module.exports = {
    dbPromise: dbPromise,
    saveDatabase: saveDatabase
};
// --- END OF FILE database.js ---