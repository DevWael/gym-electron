function loadScreen(screenName) {
    fetch(`screens/${screenName}.html`)
        .then(response => response.text())
        .then(html => {
            document.getElementById('content').innerHTML = html;
            initializeScreen(screenName);
        });
}

function initializeScreen(screenName) {
    switch(screenName) {
        case 'members':
            loadMembers();
            break;
        case 'workouts':
            loadWorkouts();
            break;
        case 'dashboard':
            loadDashboard();
            break;
    }
}

// Start with dashboard
loadScreen('dashboard');