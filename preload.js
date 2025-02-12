const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // Dashboard
    getDashboardStats: () => ipcRenderer.invoke('get-dashboard-stats'),

    // Members
    getMembers: () => ipcRenderer.invoke('get-members'),

    addMember: async (name, email, phone, membershipType, endDate) => {
        try {
            return await ipcRenderer.invoke('add-member', name, email, phone, membershipType, endDate);
        } catch (error) {
            console.error('IPC Error:', error);
            throw error; // Rethrow to maintain original stack trace
        }
    },

    deleteMember: (id) => ipcRenderer.invoke('delete-member', id),

    // Payments
    addPayment: (memberId, amount) => 
        ipcRenderer.invoke('add-payment', memberId, amount),
    getPayments: () => ipcRenderer.invoke('get-payments'),

    // Attendance
    recordCheckin: (memberId) => ipcRenderer.invoke('record-checkin', memberId),
    getAttendance: () => ipcRenderer.invoke('get-attendance'),

    // Reports
    getMonthlyReport: (month) => ipcRenderer.invoke('get-monthly-report', month)
});