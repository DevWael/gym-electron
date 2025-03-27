// --- START OF FILE renderer.js ---

var currentMembers = []; // Keep track of members loaded in the 'members' screen
var currentMemberId = null; // Store ID for member details view
var activeScreen = 'dashboard'; // Track the currently loaded screen

// --- Navigation and Screen Management ---

function setActiveNav(screenName) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        // Check the data-screen attribute instead of onclick
        if (btn.getAttribute('data-screen') === screenName) {
            btn.classList.add('active');
        }
    });
}

async function loadScreen(screenName) {
    // Prevent reloading same screen unnecessarily
    // if (screenName === activeScreen && screenName !== 'members') return; // Allow reloading members for search/refresh

    console.log(`Loading screen: ${screenName}`);
    activeScreen = screenName;
    try {
        const response = await fetch(`screens/${screenName}.html`);
        if (!response.ok) throw new Error(`Failed to fetch ${screenName}.html: ${response.statusText}`);
        const html = await response.text();
        document.getElementById('content').innerHTML = html;
        setActiveNav(screenName);
        await initializeScreen(screenName); // Ensure initialization happens after content is loaded
    } catch (error) {
        console.error(`Error loading screen ${screenName}:`, error);
        displayError(`Could not load the ${screenName} screen. Please try again.`);
        // Optionally load a default screen like dashboard on error
        // if (screenName !== 'dashboard') loadScreen('dashboard');
    }
}

function loadMemberDetails(id) {
    console.log(`Navigating to details for member ID: ${id}`);
    currentMemberId = id;
    loadScreen('member-details');
}

function backToMembers() {
    currentMemberId = null; // Clear the ID when going back
    loadScreen('members');
}

async function initializeScreen(screenName) {
    console.log(`Initializing screen: ${screenName}`);
    try {
        switch (screenName) {
            case 'dashboard':
                await loadDashboard();
                break;
            case 'members':
                await loadMembers(); // Initial load without search term
                setupMemberSearch(); // Set up search listener
                setDefaultDates(); // Set default start/end dates
                // Setup listener for the add/save button in members screen
                const memberFormButton = document.querySelector('#addMemberForm .add-btn');
                if (memberFormButton) {
                    // Ensure the correct handler is attached (it might change between add/save)
                    // The existing editMember/cancelEdit functions already handle this,
                    // but we ensure the initial state points to addNewMember.
                    if (memberFormButton.textContent.includes('Add')) {
                       memberFormButton.onclick = addNewMember; // Keep using onclick here is simpler for add/edit switching
                    }
                } else {
                    console.warn("Member form button not found during init.");
                }
                break;
            case 'workouts':
                await loadWorkouts();
                // Add listener for the workout form button
                const workoutBtn = document.getElementById('addWorkoutBtn');
                if (workoutBtn) {
                    workoutBtn.addEventListener('click', addNewWorkout);
                } else {
                     console.warn("Add workout button not found during init.");
                }
                break;
            case 'payments':
                await loadPayments();
                 // Add listener for the payment form button
                const paymentBtn = document.getElementById('recordPaymentBtn');
                if (paymentBtn) {
                    paymentBtn.addEventListener('click', recordPayment);
                } else {
                    console.warn("Record payment button not found during init.");
                }
                break;
            case 'attendance':
                await loadAttendance();
                 // Add listener for the attendance form button
                const checkinBtn = document.getElementById('recordCheckinBtn');
                if (checkinBtn) {
                    checkinBtn.addEventListener('click', recordCheckin);
                } else {
                     console.warn("Record check-in button not found during init.");
                }
                break;
            case 'reports':
                await loadReportsScreen();
                 // Add listener for the report generation button
                 const reportBtn = document.querySelector('.reports-screen .report-controls button');
                 if (reportBtn) {
                     reportBtn.addEventListener('click', generateReport);
                 } else {
                      console.warn("Generate report button not found during init.");
                 }
                break;
            case 'member-details':
                await loadMemberDetailsScreen();
                // Add listener for the back button
                const backBtn = document.querySelector('.member-details-screen .button-secondary');
                if (backBtn && backBtn.textContent.includes('Back')) {
                    backBtn.addEventListener('click', backToMembers);
                }
                break;
            default:
                console.warn(`No initialization logic for screen: ${screenName}`);
        }
    } catch (error) {
        console.error(`Error initializing screen ${screenName}:`, error);
        displayError(`Failed to initialize the ${screenName} screen: ${error.message}`);
    }
}

// --- Utility Functions ---

function displayError(message) {
    // Replace alert with a less intrusive notification (optional, requires adding a notification element)
    console.error("Error Display:", message);
    alert(message); // Fallback to alert
}

function displaySuccess(message) {
    // Optional: Show a temporary success message
    console.log("Success:", message);
    // Example: Show a toast notification
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        // Assuming dateString is 'YYYY-MM-DD'
        const date = new Date(dateString + 'T00:00:00'); // Avoid timezone issues
        return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
        return dateString; // Return original if parsing fails
    }
}

function formatDateTime(dateTimeString) {
    if (!dateTimeString) return 'N/A';
    try {
        const date = new Date(dateTimeString);
        return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch (e) {
        return dateTimeString; // Return original if parsing fails
    }
}

// --- Dashboard ---
async function loadDashboard() {
    const stats = await window.api.getDashboardStats();
    document.getElementById('stat-total-members').textContent = stats.totalMembers;
    document.getElementById('stat-total-workouts').textContent = stats.totalWorkouts;
    document.getElementById('stat-total-payments').textContent = `$${(stats.totalPayments || 0).toFixed(2)}`;
    document.getElementById('stat-active-members-today').textContent = stats.activeMembers;
}

// --- Member Management ---

function setupMemberSearch() {
    const searchInput = document.getElementById('memberSearch');
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            const searchTerm = e.target.value.trim();
            // Debounce search to avoid too many calls
            debounceTimer = setTimeout(() => {
                loadMembers(searchTerm);
            }, 300); // 300ms delay
        });
    } else {
        console.warn("Member search input not found.");
    }
}

function setDefaultDates() {
    const startDateInput = document.getElementById('memberStartDate');
    const endDateInput = document.getElementById('memberEndDate');
    if (startDateInput && endDateInput) {
        const today = new Date();
        const nextYear = new Date(today);
        nextYear.setFullYear(today.getFullYear() + 1);

        startDateInput.valueAsDate = today;
        endDateInput.valueAsDate = nextYear;
    }
}


async function loadMembers(searchTerm = '') {
    try {
        currentMembers = await window.api.getMembers(searchTerm);
        renderMembersTable(currentMembers);
    } catch (error) {
        displayError(`Error loading members: ${error.message}`);
        // Clear table or show error message in table
        const tbody = document.getElementById('membersList');
        if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="error-message">Failed to load members.</td></tr>`;
    }
}

function renderMembersTable(members) {
    const tbody = document.getElementById('membersList');
    if (!tbody) return; // Exit if table body not found

    if (members.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="no-results">No members found.</td></tr>`;
        return;
    }

    tbody.innerHTML = members.map(member => `
        <tr id="member-row-${member.id}">
            <td>${member.name ?? 'N/A'}</td>
            <td>${member.email ?? 'N/A'}</td>
            <td>${member.phone ?? 'N/A'}</td>
            <td>${member.membership_type ?? 'N/A'}</td>
            <td>${formatDate(member.formatted_join_date)}</td>
            <td>${formatDate(member.formatted_end_date)}</td>
            <td class="status-cell">
                <span class="badge status-${member.status?.toLowerCase()}">
                    ${member.status ?? 'Unknown'}
                </span>
            </td>
            <td class="action-buttons">
                <button class="icon-btn edit-btn" title="Edit Member" onclick="editMember(${member.id})"><i class="fas fa-pencil-alt"></i></button>
                <button class="icon-btn view-btn" title="View Details" onclick="loadMemberDetails(${member.id})"><i class="fas fa-eye"></i></button>
                <button class="icon-btn delete-btn" title="Delete Member" onclick="deleteMember(${member.id})"><i class="fas fa-trash-alt"></i></button>
            </td>
        </tr>
    `).join('');
}

async function addNewMember() {
    // Get values and trim
    const name = document.getElementById('memberName').value.trim();
    const email = document.getElementById('memberEmail').value.trim(); // Send empty string, main handles null
    const phone = document.getElementById('memberPhone').value.trim(); // Send empty string, main handles null
    const membershipType = document.getElementById('membershipType').value;
    const startDate = document.getElementById('memberStartDate').value; // Format YYYY-MM-DD
    const endDate = document.getElementById('memberEndDate').value;     // Format YYYY-MM-DD

    // Basic frontend validation
    if (!name || !membershipType || !startDate || !endDate) {
        displayError('Please fill in all required fields: Name, Membership Type, Start Date, and End Date.');
        return;
    }
    if (new Date(endDate) < new Date(startDate)) {
        displayError('Membership End Date cannot be before the Start Date.');
        return;
    }

    try {
        const newMemberId = await window.api.addMember(name, email, phone, membershipType, startDate, endDate);
        displaySuccess(`Member "${name}" added successfully (ID: ${newMemberId}).`);
        await loadMembers(); // Refresh the list
        clearMemberForm(); // Clear the form
    } catch (error) {
        displayError(`Failed to add member: ${error.message}`);
    }
}


function clearMemberForm() {
    document.getElementById('addMemberForm').reset(); // Reset the form element
    setDefaultDates(); // Reset dates to default after clearing

    // Reset button state if needed (e.g., if in edit mode)
    const addBtn = document.querySelector('#addMemberForm .form-actions .add-btn');
    const cancelBtn = document.querySelector('#addMemberForm .form-actions .cancel-btn');
    if (addBtn) {
        addBtn.textContent = 'Add Member';
        addBtn.onclick = addNewMember; // Ensure correct handler
    }
    if (cancelBtn) {
        cancelBtn.style.display = 'none';
        cancelBtn.onclick = null;
    }
    // Clear any specific edit-related state if necessary
    document.getElementById('addMemberForm').removeAttribute('data-editing-id');
}

async function deleteMember(id) {
    // Find member name for confirmation message
    const member = currentMembers.find(m => m.id === id);
    const confirmMessage = member
        ? `Are you sure you want to delete member "${member.name}" (ID: ${id})? This will also delete their payment and attendance history and cannot be undone.`
        : `Are you sure you want to delete member with ID: ${id}? This will also delete their payment and attendance history and cannot be undone.`;

    if (confirm(confirmMessage)) {
        try {
            await window.api.deleteMember(id);
            displaySuccess(`Member (ID: ${id}) deleted successfully.`);
            // Optionally remove row directly instead of full reload for better UX
             const row = document.getElementById(`member-row-${id}`);
             if (row) {
                 row.remove();
                 // Update currentMembers array
                 currentMembers = currentMembers.filter(m => m.id !== id);
             } else {
                 await loadMembers(); // Fallback to full reload
             }
        } catch (error) {
            displayError(`Error deleting member: ${error.message}`);
        }
    }
}

function editMember(id) {
    const member = currentMembers.find(m => m.id === id);
    if (!member) {
        displayError('Could not find member data to edit.');
        return;
    }

    // Populate form - ensure date formats are correct for date inputs (YYYY-MM-DD)
    document.getElementById('memberName').value = member.name;
    document.getElementById('memberEmail').value = member.email || '';
    document.getElementById('memberPhone').value = member.phone || '';
    document.getElementById('membershipType').value = member.membership_type;
    // The API now returns formatted dates as YYYY-MM-DD, which is compatible with date input
    document.getElementById('memberStartDate').value = member.formatted_join_date;
    document.getElementById('memberEndDate').value = member.formatted_end_date;

    // Store the ID being edited
    document.getElementById('addMemberForm').setAttribute('data-editing-id', id);

    // Change button text and behavior
    const addBtn = document.querySelector('#addMemberForm .form-actions .add-btn');
    const cancelBtn = document.querySelector('#addMemberForm .form-actions .cancel-btn');

    if (addBtn) {
        addBtn.textContent = 'Save Changes';
        addBtn.onclick = () => saveMember(id); // Assign save handler
    }
    if (cancelBtn) {
        cancelBtn.style.display = 'inline-block'; // Show cancel button
        cancelBtn.onclick = cancelEdit; // Assign cancel handler
    }

    // Scroll to form or highlight it
    document.getElementById('addMemberForm').scrollIntoView({ behavior: 'smooth' });
    // Optional: Add a class to indicate editing state
    document.getElementById('addMemberForm').classList.add('editing');

    console.log(`Editing member ID: ${id}`);
}


async function saveMember(id) {
    // Get updated values
    const updates = {
        name: document.getElementById('memberName').value.trim(),
        email: document.getElementById('memberEmail').value.trim(), // Send empty string, main handles null
        phone: document.getElementById('memberPhone').value.trim(), // Send empty string, main handles null
        membership_type: document.getElementById('membershipType').value,
        join_date: document.getElementById('memberStartDate').value, // YYYY-MM-DD
        end_date: document.getElementById('memberEndDate').value     // YYYY-MM-DD
    };

    // Basic frontend validation
    if (!updates.name || !updates.membership_type || !updates.join_date || !updates.end_date) {
        displayError('Please ensure Name, Membership Type, Start Date, and End Date are filled.');
        return;
    }
    if (new Date(updates.end_date) < new Date(updates.join_date)) {
        displayError('Membership End Date cannot be before the Start Date.');
        return;
    }


    try {
        await window.api.updateMember(id, updates);
        displaySuccess(`Member "${updates.name}" (ID: ${id}) updated successfully.`);
        await loadMembers(); // Refresh the list
        cancelEdit(); // Reset form state
    } catch (error) {
        displayError(`Error saving member updates: ${error.message}`);
    }
}

function cancelEdit() {
    clearMemberForm(); // Use the clearing function which also resets buttons/state
    document.getElementById('addMemberForm').classList.remove('editing'); // Remove editing class
    console.log("Edit cancelled.");
}

// --- Payment Management ---
async function loadPayments() {
    const [payments, members] = await Promise.all([
        window.api.getPayments(),
        window.api.getMembers() // Fetch all members for dropdown
    ]);

    // Populate member dropdown
    const memberSelect = document.getElementById('paymentMember');
    if (memberSelect) {
        memberSelect.innerHTML = '<option value="">Select Member...</option>' +
            members
                .sort((a, b) => a.name.localeCompare(b.name)) // Sort members alphabetically
                .map(m => `<option value="${m.id}">${m.name} (ID: ${m.id})</option>`)
                .join('');
    }

    const tbody = document.getElementById('paymentsList');
    if (!tbody) return;
    if (payments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="no-results">No payments recorded yet.</td></tr>`; // Added colspan=4
        return;
    }
    tbody.innerHTML = payments.map(p => `
        <tr>
            <td>${p.member_name || `(Deleted Member ID: ${p.member_id})`}</td>
            <td class="amount">$${p.amount?.toFixed(2) ?? '0.00'}</td>
            <td>${formatDate(p.payment_date)}</td>
            <td>
                <button class="icon-btn delete-btn" title="Delete Payment (Not Implemented)" disabled><i class="fas fa-trash-alt"></i></button>
                 <!-- Add delete payment functionality later if needed -->
            </td>
        </tr>
    `).join('');
}

async function recordPayment() {
    const memberSelect = document.getElementById('paymentMember');
    const amountInput = document.getElementById('paymentAmount');
    const memberId = parseInt(memberSelect.value, 10);
    const amount = amountInput.value.trim();

    if (isNaN(memberId) || memberId <= 0) {
        displayError('Please select a valid member.');
        memberSelect.focus();
        return;
    }
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        displayError('Please enter a valid positive payment amount.');
        amountInput.focus();
        return;
    }

    try {
        await window.api.addPayment(memberId, amount);
        const memberName = memberSelect.options[memberSelect.selectedIndex].text;
        displaySuccess(`Payment of $${parseFloat(amount).toFixed(2)} recorded for ${memberName}.`);
        await loadPayments(); // Refresh list
        // Reset form
        amountInput.value = '';
        memberSelect.value = ''; // Reset dropdown selection
    } catch (error) {
        displayError(`Error recording payment: ${error.message}`);
    }
}


// --- Attendance Management ---
async function loadAttendance() {
    const [attendance, members] = await Promise.all([
        window.api.getAttendance(),
        window.api.getMembers() // Fetch all members for dropdown
    ]);

    // Populate member dropdown
    const memberSelect = document.getElementById('attendanceMember');
     if (memberSelect) {
        memberSelect.innerHTML = '<option value="">Select Member for Check-in...</option>' +
            members
                .sort((a, b) => a.name.localeCompare(b.name)) // Sort members alphabetically
                .map(m => `<option value="${m.id}">${m.name} (ID: ${m.id})</option>`)
                .join('');
    }

    const tbody = document.getElementById('attendanceList');
    if (!tbody) return;
    if (attendance.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2" class="no-results">No attendance records found.</td></tr>`;
        return;
    }
    tbody.innerHTML = attendance.map(entry => `
        <tr>
            <td>${entry.member_name || `(Deleted Member ID: ${entry.member_id})`}</td>
            <td>${formatDateTime(entry.formatted_check_in)}</td>
             <!-- Add delete attendance functionality later if needed -->
             <!-- <td><button>Delete</button></td> -->
        </tr>
    `).join('');
}

async function recordCheckin() {
    const memberSelect = document.getElementById('attendanceMember');
    const memberId = parseInt(memberSelect.value, 10);

    if (isNaN(memberId) || memberId <= 0) {
        displayError('Please select a member to record check-in.');
        memberSelect.focus();
        return;
    }

    try {
        await window.api.recordCheckin(memberId);
        const memberName = memberSelect.options[memberSelect.selectedIndex].text;
        displaySuccess(`Check-in recorded for ${memberName}.`);
        await loadAttendance(); // Refresh list
        memberSelect.value = ''; // Reset dropdown selection
    } catch (error) {
        displayError(`Error recording check-in: ${error.message}`);
    }
}

// --- Reports Management ---
async function loadReportsScreen() {
    // Set default month to current month
    const reportMonthInput = document.getElementById('reportMonth');
    if (reportMonthInput) {
        reportMonthInput.value = new Date().toISOString().slice(0, 7); // YYYY-MM
        await generateReport(); // Generate report for default month automatically
    }
}

async function generateReport() {
    const monthInput = document.getElementById('reportMonth');
    const month = monthInput.value; // YYYY-MM

    if (!month) {
        displayError('Please select a month for the report.');
        monthInput.focus();
        return;
    }

    // Indicate loading state
    const resultsContainer = document.querySelector('.report-results');
    resultsContainer.classList.add('loading');

    try {
        const report = await window.api.getMonthlyReport(month);

        document.getElementById('report-total-payments').textContent = `$${report.totalPayments.toFixed(2)}`;
        document.getElementById('report-avg-attendance').textContent = `${report.avgAttendanceDays} days / member`;
        document.getElementById('report-active-members').textContent = report.activeMembers;

        // Update report title/header if exists
        const reportTitle = document.getElementById('reportMonthDisplay');
        if(reportTitle) {
            const date = new Date(month + '-02T00:00:00'); // Use day 02 to avoid timezone issues near month end
            reportTitle.textContent = date.toLocaleDateString(undefined, {year: 'numeric', month: 'long'});
        }

    } catch (error) {
        displayError(`Error generating report: ${error.message}`);
        // Clear report fields on error
        document.getElementById('report-total-payments').textContent = 'Error';
        document.getElementById('report-avg-attendance').textContent = 'Error';
        document.getElementById('report-active-members').textContent = 'Error';
        const reportTitle = document.getElementById('reportMonthDisplay');
         if(reportTitle) reportTitle.textContent = 'Error Loading Report';
    } finally {
        resultsContainer.classList.remove('loading'); // Remove loading state
    }
}


// --- Workout Management (Updated) ---
async function loadWorkouts() {
    try {
        const workouts = await window.api.getWorkouts();
        const tbody = document.getElementById('workoutsList');
        if (!tbody) return;

        if (workouts.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="no-results">No workouts defined yet.</td></tr>`; // colspan=4 assuming actions added
            return;
        }

        tbody.innerHTML = workouts.map(workout => `
            <tr>
                <td>${workout.name}</td>
                <td>${workout.duration} mins</td>
                <td>${workout.difficulty}</td>
                 <td class="action-buttons">
                    <button class="icon-btn edit-btn" title="Edit Workout (Not Implemented)" disabled><i class="fas fa-pencil-alt"></i></button>
                    <button class="icon-btn delete-btn" title="Delete Workout (Not Implemented)" disabled><i class="fas fa-trash-alt"></i></button>
                    <!-- Add edit/delete workout functionality later if needed -->
                </td>
            </tr>
        `).join('');
    } catch (error) {
        displayError(`Error loading workouts: ${error.message}`);
        const tbody = document.getElementById('workoutsList');
        if (tbody) tbody.innerHTML = `<tr><td colspan="4" class="error-message">Failed to load workouts.</td></tr>`;
    }
}

async function addNewWorkout() {
    const nameInput = document.getElementById('workoutName');
    const durationInput = document.getElementById('workoutDuration');
    const difficultySelect = document.getElementById('workoutDifficulty');

    const name = nameInput.value.trim();
    const duration = durationInput.value.trim();
    const difficulty = difficultySelect.value;

    if (!name || !duration || !difficulty) {
        displayError('Please fill in all workout fields: Name, Duration, and Difficulty.');
        return;
    }
    const durationNum = parseInt(duration, 10);
    if (isNaN(durationNum) || durationNum <= 0) {
         displayError('Please enter a valid positive number for duration (minutes).');
         durationInput.focus();
         return;
    }

    try {
        await window.api.addWorkout(name, durationNum, difficulty);
        displaySuccess(`Workout "${name}" added successfully.`);
        await loadWorkouts(); // Refresh the list
        // Clear the form
        nameInput.value = '';
        durationInput.value = '';
        difficultySelect.value = 'Beginner'; // Reset select to default
    } catch (error) {
        displayError(`Error adding workout: ${error.message}`);
    }
}


// --- Member Details Screen (Updated) ---
async function loadMemberDetailsScreen() {
    if (currentMemberId === null) {
        displayError('No member selected to view details.');
        loadScreen('members'); // Redirect back to members list
        return;
    }

    try {
        const member = await window.api.getMember(currentMemberId);
        // Use property names now, matching the object returned by getMember
        document.getElementById('detail-memberName').textContent = member.name ?? 'N/A';
        document.getElementById('detail-memberEmail').textContent = member.email ?? 'N/A';
        document.getElementById('detail-memberPhone').textContent = member.phone ?? 'N/A';
        document.getElementById('detail-memberMembership').textContent = member.membership_type ?? 'N/A';
        document.getElementById('detail-memberStartDate').textContent = formatDate(member.join_date);
        document.getElementById('detail-memberEndDate').textContent = formatDate(member.end_date);

        // Calculate and display status
        const statusSpan = document.getElementById('detail-memberStatus');
        const isActive = member.end_date && new Date(member.end_date) >= new Date();
        statusSpan.textContent = isActive ? 'Active' : 'Expired';
        statusSpan.className = `badge status-${isActive ? 'active' : 'expired'}`; // Reuse badge styling

        // TODO: Add sections for member's payment history and attendance history
        // These would require new IPC handlers like 'get-payments-for-member' and 'get-attendance-for-member'

    } catch (error) {
        displayError(`Error loading member details: ${error.message}`);
        // Optionally redirect back if member loading fails critically
        // loadScreen('members');
    }
}


// --- Initial Load ---
document.addEventListener('DOMContentLoaded', () => {
    loadScreen('dashboard'); // Start with the dashboard
});

// --- Event Listener Setup ---
function setupNavigation() {
    const navButtons = document.querySelectorAll('.navbar .nav-btn[data-screen]');
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const screenName = button.getAttribute('data-screen');
            if (screenName) {
                loadScreen(screenName);
            } else {
                console.error('Navigation button clicked without a data-screen attribute:', button);
            }
        });
    });
    console.log('Navigation listeners attached.');
}


// --- Initial Load ---
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation(); // Setup navigation listeners first
    loadScreen('dashboard'); // Start with the dashboard
});


// --- END OF FILE renderer.js ---