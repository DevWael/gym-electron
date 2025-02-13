var currentMembers = [];

// Navigation and Screen Initialization
function loadScreen(screenName) {
    fetch(`screens/${screenName}.html`)
        .then(response => response.text())
        .then(html => {
            document.getElementById('content').innerHTML = html;
            initializeScreen(screenName);
        });
}

function loadMemberDetails(id) {
    window.currentMemberId = id;
    loadScreen('member-details');
}

function backToMembers() {
    loadScreen('members');
}

function initializeScreen(screenName) {
    switch (screenName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'members':
            loadMembers();
            const searchInput = document.getElementById('memberSearch');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    const searchTerm = e.target.value.trim().toLowerCase();
                    loadMembers(searchTerm);
                });
            }
            break;
        case 'workouts':
            loadWorkouts();
            break;
        case 'payments':
            loadPayments();
            break;
        case 'attendance':
            loadAttendance();
            break;
        case 'reports':
            loadReportsScreen();
            break;
        case 'member-details':
            loadMemberDetailsScreen();
            break;
    }
}

// Start with dashboard
loadScreen('dashboard');

// Dashboard Functions
async function loadDashboard() {
    try {
        const stats = await window.api.getDashboardStats();
        document.getElementById('total-members').textContent = stats.totalMembers;
        document.getElementById('total-workouts').textContent = stats.totalWorkouts;
        document.getElementById('total-payments').textContent = `$${(stats.totalPayments || 0).toFixed(2)}`;
        document.getElementById('active-members').textContent = stats.activeMembers;
    } catch (error) {
        alert('Error loading dashboard: ' + error.message);
    }
}

// Member Management
async function loadMembers(searchTerm = '') {
    try {
        currentMembers = await window.api.getMembers(searchTerm);
        renderMembersTable(currentMembers);
    } catch (error) {
        alert('Error loading members: ' + error.message);
    }
}

function renderMembersTable(members) {
    const tbody = document.getElementById('membersList');
    tbody.innerHTML = members.map(member => `
        <tr>
            <td>${member.name ?? ''}</td>
            <td>${member.phone ?? ''}</td>
            <td>${member.membership_type}</td>
            <td>${member.join_date ?? ''}</td>
            <td>${member.end_date ?? ''}</td>
            <td class="status-cell">
                <span class="badge ${isActive(member.end_date) ? 'active' : 'expired'}">
                    ${isActive(member.end_date) ? 'Active' : 'Expired'}
                </span>
            </td>
            <td>
                <button class="edit-btn" onclick="editMember(${member.id})">Edit</button>
                <button class="delete-btn" onclick="deleteMember(${member.id})">Delete</button>
                <button class="view-btn" onclick="loadMemberDetails(${member.id})">View Details</button>
            </td>
        </tr>
    `).join('');
}

function isActive(endDate) {
    return new Date(endDate) > new Date();
}

async function addNewMember() {
    const name = document.getElementById('memberName').value.trim();
    const email = document.getElementById('memberEmail').value.trim() || null;
    const phone = document.getElementById('memberPhone').value.trim() || null;
    const membershipType = document.getElementById('membershipType').value;
    const memberStartDate = document.getElementById('memberStartDate').value;
    const memberEndDate = document.getElementById('memberEndDate').value;

    try {
        await window.api.addMember(name, email, phone, membershipType, memberStartDate, memberEndDate);
        loadMembers();
        clearMemberForm();
    } catch (error) {
        alert(error.message);
    }
}

function clearMemberForm() {
    document.getElementById('memberName').value = '';
    document.getElementById('memberEmail').value = '';
    document.getElementById('memberPhone').value = '';
    document.getElementById('memberEndDate').value = '';
    document.getElementById('membershipType').value = 'Basic';
}

async function deleteMember(id) {
    if (confirm('Are you sure you want to delete this member?')) {
        try {
            await window.api.deleteMember(id);
            loadMembers();
        } catch (error) {
            alert('Error deleting member: ' + error.message);
        }
    }
}

function editMember(id) {
    const member = currentMembers.find(m => m.id === id);
    if (member) {
        document.getElementById('memberName').value = member.name;
        document.getElementById('memberEmail').value = member.email || '';
        document.getElementById('memberPhone').value = member.phone || '';
        document.getElementById('membershipType').value = member.membership_type;
        document.getElementById('memberStartDate').value = member.join_date;
        document.getElementById('memberEndDate').value = member.end_date;

        const cancelBtn = document.querySelector('.cancel-btn');
        cancelBtn.style.display = 'inline-block';
        cancelBtn.onclick = cancelEdit;

        const addBtn = document.querySelector('.add-member-form button.add-btn');
        addBtn.textContent = 'Save Changes';
        addBtn.onclick = () => saveMember(id);
    } else {
        alert('Member not found');
    }
}

async function saveMember(id) {
    const updates = {
        name: document.getElementById('memberName').value.trim(),
        email: document.getElementById('memberEmail').value.trim() || null,
        phone: document.getElementById('memberPhone').value.trim() || null,
        membership_type: document.getElementById('membershipType').value,
        join_date: document.getElementById('memberStartDate').value,
        end_date: document.getElementById('memberEndDate').value
    };

    try {
        await window.api.updateMember(id, updates);
        loadMembers();
        cancelEdit();
    } catch (error) {
        alert('Error saving member: ' + error.message);
    }
}

function cancelEdit() {
    const cancelBtn = document.querySelector('.cancel-btn');
    cancelBtn.style.display = 'none';
    clearMemberForm();
    const addBtn = document.querySelector('.add-member-form button.add-btn');
    addBtn.textContent = 'Add Member';
    addBtn.onclick = addNewMember;
}

// Payment Management
async function loadPayments() {
    try {
        const payments = await window.api.getPayments();
        const members = await window.api.getMembers();

        // Populate member dropdown
        const memberSelect = document.getElementById('paymentMember');
        memberSelect.innerHTML = '<option value="">Select Member</option>' +
            members.map(m => `<option value="${m.id}">${m.name}</option>`).join('');

        const tbody = document.getElementById('paymentsList');
        tbody.innerHTML = payments.map(payment => `
            <tr>
                <td>${payment.member_name || '(Deleted Member)'}</td>
                <td>$${payment.amount}</td>
                <td>${new Date(payment.payment_date).toLocaleDateString()}</td>
            </tr>
        `).join('');
    } catch (error) {
        alert('Error loading payments: ' + error.message);
    }
}

async function recordPayment() {
    const memberId = parseInt(document.getElementById('paymentMember').value, 10);
    const amount = document.getElementById('paymentAmount').value;

    if (isNaN(memberId) || !amount) {
        alert('Please select a member and enter an amount');
        return;
    }

    try {
        await window.api.addPayment(memberId, amount);
        loadPayments();
        document.getElementById('paymentAmount').value = '';
    } catch (error) {
        alert('Error recording payment: ' + error.message);
    }
}

// Attendance Management
async function loadAttendance() {
    try {
        const attendance = await window.api.getAttendance();
        const members = await window.api.getMembers();

        // Populate member dropdown
        const memberSelect = document.getElementById('attendanceMember');
        memberSelect.innerHTML = '<option value="">Select Member</option>' +
            members.map(m => `<option value="${m.id}">${m.name}</option>`).join('');

        const tbody = document.getElementById('attendanceList');
        tbody.innerHTML = attendance.map(entry => `
            <tr>
                <td>${entry.member_name || '(Deleted Member)'}</td>
                <td>${new Date(entry.check_in).toLocaleString()}</td>
            </tr>
        `).join('');
    } catch (error) {
        alert('Error loading attendance: ' + error.message);
    }
}

async function recordCheckin() {
    const memberId = parseInt(document.getElementById('attendanceMember').value, 10);

    if (isNaN(memberId)) {
        alert('Please select a member');
        return;
    }

    try {
        await window.api.recordCheckin(memberId);
        loadAttendance();
    } catch (error) {
        alert('Error recording check-in: ' + error.message);
    }
}

// Reports Management
async function loadReportsScreen() {
    // Set default month to current month
    const now = new Date();
    document.getElementById('reportMonth').value = now.toISOString().slice(0, 7);
    await generateReport();
}

async function generateReport() {
    const month = document.getElementById('reportMonth').value;

    if (!month) {
        alert('Please select a month');
        return;
    }

    try {
        const report = await window.api.getMonthlyReport(month);

        document.getElementById('totalPayments').textContent =
            `$${report.totalPayments.toFixed(2)}`;
        document.getElementById('avgAttendance').textContent =
            `${report.avgAttendanceDays} days`;
        document.getElementById('activeMembers').textContent =
            report.activeMembers;
    } catch (error) {
        alert(error.message);
    }
}

// Workout Management
async function loadWorkouts() {
    try {
        const workouts = await window.api.getWorkouts();
        const tbody = document.getElementById('workoutsList');
        tbody.innerHTML = workouts.map(workout => `
            <tr>
                <td>${workout.name}</td>
                <td>${workout.duration} mins</td>
                <td>${workout.difficulty}</td>
            </tr>
        `).join('');
    } catch (error) {
        alert('Error loading workouts: ' + error.message);
    }
}

async function addNewWorkout() {
    const name = document.getElementById('workoutName').value;
    const duration = document.getElementById('workoutDuration').value;
    const difficulty = document.getElementById('workoutDifficulty').value;

    if (!name || !duration || !difficulty) {
        alert('Please fill in all fields');
        return;
    }

    try {
        await window.api.addWorkout(name, duration, difficulty);
        loadWorkouts();
        document.getElementById('workoutName').value = '';
        document.getElementById('workoutDuration').value = '';
        document.getElementById('workoutDifficulty').value = 'Beginner';
    } catch (error) {
        alert('Error adding workout: ' + error.message);
    }
}

async function loadMemberDetailsScreen() {
    try {
        const id = window.currentMemberId;
        if (!id) {
            alert('No member selected');
            loadScreen('members');
            return;
        }

        const member = await window.api.getMember(id);
        if (!member) {
            alert('Member not found');
            loadScreen('members');
            return;
        }

        document.getElementById('memberName').textContent = member[1];
        document.getElementById('memberEmail').textContent = member[2] || 'N/A';
        document.getElementById('memberPhone').textContent = member[3] || 'N/A';
        document.getElementById('memberMembership').textContent = member[4];
        document.getElementById('memberStartDate').textContent = member[5];
        document.getElementById('memberEndDate').textContent = member[6];

    } catch (error) {
        alert('Error loading member details: ' + error.message);
    }
}