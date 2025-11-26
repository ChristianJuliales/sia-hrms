// ==================== TIME TRACKER LOGIC ====================

// Get employee data from localStorage
function getEmployeeData() {
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser')) || {};
    const userEmail = localStorage.getItem('userEmail') || 'Unknown';
    return {
        id: loggedInUser.id || 'N/A',
        name: loggedInUser.name || userEmail,
        department: loggedInUser.department || 'N/A',
        position: loggedInUser.position || 'N/A'
    };
}

// Get attendance records
function getRecords() {
    return JSON.parse(localStorage.getItem('attendance_records')) || [];
}

// Save attendance records
function saveRecords(data) {
    localStorage.setItem('attendance_records', JSON.stringify(data));
}

// Get today's record
function getTodayRecord(empId) {
    const today = new Date().toISOString().split('T')[0];
    const records = getRecords();
    return records.find(r => r.id === empId && r.date === today);
}

// Format time
function formatTime(date = new Date()) {
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
}

// Format date
function formatDate(date = new Date()) {
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Render tracker UI
function renderTracker() {
    const employee = getEmployeeData();
    const todayRecord = getTodayRecord(employee.id);
    const isCheckedIn = todayRecord && todayRecord.timeOut === '--';

    return `
        <div class="tracker-header">
            <div class="tracker-logo">●⮕ RMT</div>
            <div class="tracker-title">Time Management</div>
            <div class="tracker-subtitle">Employee Attendance System</div>
        </div>

        <div class="time-display">
            <div class="label">Current Time</div>
            <div class="current-time" id="currentTime">${formatTime()}</div>
            <div class="current-date">${formatDate()}</div>
        </div>

        <div class="employee-info">
            <div class="info-row"><span class="info-label">Employee ID:</span><span class="info-value">${employee.id}</span></div>
            <div class="info-row"><span class="info-label">Name:</span><span class="info-value">${employee.name}</span></div>
            <div class="info-row"><span class="info-label">Department:</span><span class="info-value">${employee.department}</span></div>
            <div class="info-row"><span class="info-label">Position:</span><span class="info-value">${employee.position}</span></div>
        </div>

        <div class="status-section">
            <div class="status-label">Current Status</div>
            <div class="status-badge ${isCheckedIn ? 'active' : 'inactive'}">
                ${isCheckedIn ? '● Clocked In' : '○ Clocked Out'}
            </div>
        </div>

        <div class="alert" id="alertBox"></div>

        <div class="button-group">
            <button class="btn btn-login" id="btnTimeIn" ${isCheckedIn ? 'disabled' : ''}>
                <span class="icon">↓</span> TIME IN
            </button>
            <button class="btn btn-logout" id="btnTimeOut" ${!isCheckedIn ? 'disabled' : ''}>
                <span class="icon">↑</span> TIME OUT
            </button>
        </div>

        ${todayRecord ? `
            <div class="records-section">
                <div class="records-title">Today's Records</div>
                <div class="time-record in">
                    <span class="record-label">Time In</span>
                    <span class="record-time">${todayRecord.timeIn}</span>
                </div>
                ${todayRecord.timeOut !== '--' ? `
                    <div class="time-record out">
                        <span class="record-label">Time Out</span>
                        <span class="record-time">${todayRecord.timeOut}</span>
                    </div>
                ` : ''}
            </div>
        ` : ''}

        <button class="btn btn-close" id="btnClose" style="margin-top: 15px;">Close</button>
    `;
}

// Alerts
function showAlert(message, type = 'success') {
    const alertBox = document.getElementById('alertBox');
    alertBox.textContent = message;
    alertBox.className = `alert show ${type}`;
    setTimeout(() => alertBox.classList.remove('show'), 3000);
}

// Time In
function handleTimeIn() {
    const employee = getEmployeeData();
    const today = new Date().toISOString().split('T')[0];
    const todayRecord = getTodayRecord(employee.id);

    if (todayRecord && todayRecord.timeOut === '--') {
        showAlert('You are already clocked in!', 'warning');
        return;
    }

    const now = new Date();
    const records = getRecords();

    records.push({
        id: employee.id,
        name: employee.name,
        department: employee.department,
        position: employee.position,
        date: today,
        timeIn: formatTime(now),
        timeOut: '--'
    });

    saveRecords(records);
    showAlert('Time In recorded successfully!', 'success');

    setTimeout(reloadTracker, 1000);
}

// Time Out
function handleTimeOut() {
    const employee = getEmployeeData();
    const todayRecord = getTodayRecord(employee.id);

    if (!todayRecord || todayRecord.timeOut !== '--') {
        showAlert('You need to Time In first!', 'error');
        return;
    }

    const now = new Date();
    const records = getRecords();

    const index = records.findIndex(r =>
        r.id === employee.id &&
        r.date === todayRecord.date &&
        r.timeOut === '--'
    );

    if (index !== -1) {
        records[index].timeOut = formatTime(now);
        saveRecords(records);
        showAlert('Time Out recorded successfully!', 'success');
        setTimeout(reloadTracker, 1000);
    }
}

// Reload UI
function reloadTracker() {
    const html = renderTracker();
    document.getElementById('trackerContent').innerHTML = html;
    document.getElementById('mainContainer').innerHTML = html;

    attachEventListeners();
    updateClock();
}

// Event listeners
function attachEventListeners() {
    const btnTimeIn = document.getElementById('btnTimeIn');
    const btnTimeOut = document.getElementById('btnTimeOut');
    const btnClose = document.getElementById('btnClose');

    if (btnTimeIn) btnTimeIn.addEventListener('click', handleTimeIn);
    if (btnTimeOut) btnTimeOut.addEventListener('click', handleTimeOut);
    if (btnClose) btnClose.addEventListener('click', () => {
        document.getElementById('modalOverlay').classList.remove('show');
        window.location.href = 'index.html';
    });
}

// Live clock
function updateClock() {
    setInterval(() => {
        const el = document.getElementById('currentTime');
        if (el) el.textContent = formatTime();
    }, 1000);
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    reloadTracker();
    document.getElementById('modalOverlay').classList.add('show');
});

window.showTimeTracker = function () {
    reloadTracker();
    document.getElementById('modalOverlay').classList.add('show');
};

window.hideTimeTracker = function () {
    document.getElementById('modalOverlay').classList.remove('show');
};
