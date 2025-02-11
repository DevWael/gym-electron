let members = JSON.parse(localStorage.getItem('members')) || [];
let workouts = JSON.parse(localStorage.getItem('workouts')) || [];

function saveMembers() {
    localStorage.setItem('members', JSON.stringify(members));
}

function saveWorkouts() {
    localStorage.setItem('workouts', JSON.stringify(workouts));
}

// Members CRUD
function addMember(name, email, phone, membershipType) {
    members.push({
        id: Date.now(),
        name,
        email,
        phone,
        membershipType,
        joinDate: new Date().toLocaleDateString()
    });
    saveMembers();
}

function deleteMember(id) {
    members = members.filter(member => member.id !== id);
    saveMembers();
}

// Workouts CRUD
function addWorkout(name, duration, difficulty) {
    workouts.push({
        id: Date.now(),
        name,
        duration,
        difficulty
    });
    saveWorkouts();
}