const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // Dashboard
    getDashboardStats: () => ipcRenderer.invoke('get-dashboard-stats'),
    
    // Members
    getMembers: (searchTerm) => ipcRenderer.invoke('get-members', searchTerm),
    addMember: async (name, email, phone, membershipType, startDate, endDate) => {
        try {
            return await ipcRenderer.invoke('add-member', name, email, phone, membershipType, startDate, endDate);
        } catch (error) {
            console.error('IPC Error:', error);
            throw error; // Rethrow to maintain original stack trace
        }
    },
    getMember: (id) => ipcRenderer.invoke('get-member', id),
    updateMember: async (id, updates) => ipcRenderer.invoke('update-member', id, updates),
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