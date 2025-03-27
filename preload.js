// --- START OF FILE preload.js ---

const { contextBridge, ipcRenderer } = require('electron');

// Helper to wrap IPC calls for consistent error handling
async function invokeAndHandleError(channel, ...args) {
    try {
        return await ipcRenderer.invoke(channel, ...args);
    } catch (error) {
        console.error(`IPC Error on channel ${channel}:`, error.message);
        // Rethrow the error to be caught by the renderer's try/catch
        throw new Error(error.message || 'An unexpected error occurred in the main process.');
    }
}

contextBridge.exposeInMainWorld('api', {
    // Dashboard
    getDashboardStats: () => invokeAndHandleError('get-dashboard-stats'),

    // Members
    getMembers: (searchTerm) => invokeAndHandleError('get-members', searchTerm),
    addMember: (name, email, phone, membershipType, startDate, endDate) =>
        invokeAndHandleError('add-member', name, email, phone, membershipType, startDate, endDate),
    getMember: (id) => invokeAndHandleError('get-member', id),
    updateMember: (id, updates) => invokeAndHandleError('update-member', id, updates),
    deleteMember: (id) => invokeAndHandleError('delete-member', id),

    // Payments
    getPayments: () => invokeAndHandleError('get-payments'),
    addPayment: (memberId, amount) => invokeAndHandleError('add-payment', memberId, amount),

    // Attendance
    getAttendance: () => invokeAndHandleError('get-attendance'),
    recordCheckin: (memberId) => invokeAndHandleError('record-checkin', memberId),

    // Reports
    getMonthlyReport: (month) => invokeAndHandleError('get-monthly-report', month),

    // Workouts (NEW)
    getWorkouts: () => invokeAndHandleError('get-workouts'),
    addWorkout: (name, duration, difficulty) => invokeAndHandleError('add-workout', name, duration, difficulty),

    // You could add delete/update workout here if implemented in main.js
    // deleteWorkout: (id) => invokeAndHandleError('delete-workout', id),
    // updateWorkout: (id, updates) => invokeAndHandleError('update-workout', id, updates),
});
// --- END OF FILE preload.js ---