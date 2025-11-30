// ==================== TIME TRACKER - SUPABASE READY ====================

let currentEmployee = null;
const ATT_KEY = "attendance_records";

// ==================== GET EMPLOYEES FROM STORAGE ====================

function getEmployeesFromStorage() {
    try {
        return JSON.parse(localStorage.getItem('employees')) || [];
    } catch {
        return [];
    }
}

// TODO: Replace with Supabase fetch
// async function getEmployeesFromSupabase() {
//     const { data, error } = await supabase
//         .from('employees')
//         .select(`
//             employee_id,
//             first_name,
//             last_name,
//             photo_url,
//             positions(
//                 position_name,
//                 departments(department_name)
//             )
//         `);
//
//     if (error) {
//         console.error('Error fetching employees:', error);
//         return [];
//     }
//
//     return data;
// }

function getEmployeeById(empId) {
    const employees = getEmployeesFromStorage();
    return employees.find(e => 
        e.empId === empId || 
        e.empId?.toString() === empId?.toString()
    );
}

// TODO: Replace with Supabase fetch by ID
// async function getEmployeeByIdFromSupabase(empId) {
//     const { data, error } = await supabase
//         .from('employees')
//         .select(`
//             *,
//             positions(
//                 position_name,
//                 departments(department_name)
//             )
//         `)
//         .eq('employee_id', empId)
//         .single();
//
//     if (error) {
//         console.error('Error fetching employee:', error);
//         return null;
//     }
//
//     return data;
// }

// ==================== STORAGE FUNCTIONS ====================

function getRecords() {
    try {
        return JSON.parse(localStorage.getItem(ATT_KEY)) || [];
    } catch {
        return [];
    }
}

function saveRecords(records) {
    localStorage.setItem(ATT_KEY, JSON.stringify(records));
}

function getTodayRecord(empId) {
    if (!empId) return null;
    const today = new Date().toISOString().split("T")[0];
    return getRecords().find(r => r.id === empId && r.date === today) || null;
}

// TODO: Replace with Supabase fetch today's attendance
// async function getTodayRecordFromSupabase(empId) {
//     const today = new Date().toISOString().split('T')[0];
//     
//     const { data, error } = await supabase
//         .from('attendance')
//         .select('*')
//         .eq('employee_id', empId)
//         .gte('timestamp', `${today}T00:00:00`)
//         .lte('timestamp', `${today}T23:59:59`)
//         .is('time_out', null)
//         .single();
//
//     if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
//         console.error('Error fetching today record:', error);
//         return null;
//     }
//
//     return data;
// }

// ==================== FORMATTING HELPERS ====================

function formatTime(date = new Date()) {
    return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
    });
}

function formatDate(date = new Date()) {
    return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric"
    });
}

// ==================== MODAL MANAGEMENT ====================

function showLoginModal() {
    document.getElementById('loginModal').classList.add('show');
    document.getElementById('clockModal').classList.remove('show');
}

function showClockModal(empId) {
    const employee = getEmployeeById(empId);
    
    if (!employee) {
        showAlert('Employee ID not found', 'error', 'alertBox');
        return;
    }

    // TODO: Use Supabase data
    // const employee = await getEmployeeByIdFromSupabase(empId);

    currentEmployee = employee;

    const fullName = `${employee.firstName} ${employee.lastName}`;
    const position = employee.position || 'N/A';
    const department = employee.department || 'N/A';
    const photo = employee.photo || createInitialAvatar(employee.firstName, employee.lastName);

    document.getElementById('profileImg').src = photo;
    document.getElementById('displayName').textContent = fullName;
    document.getElementById('displayPosition').textContent = position;
    document.getElementById('displayId').textContent = employee.empId;

    document.getElementById('detailId').textContent = employee.empId;
    document.getElementById('detailName').textContent = fullName;
    document.getElementById('detailPosition').textContent = position;
    document.getElementById('detailDept').textContent = department;

    const today = getTodayRecord(employee.empId);
    updateRecordsDisplay(today);

    document.getElementById('loginModal').classList.remove('show');
    document.getElementById('clockModal').classList.add('show');
}

function createInitialAvatar(firstName, lastName) {
    const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    const canvas = document.createElement('canvas');
    canvas.width = 120;
    canvas.height = 120;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#0f9e5e';
    ctx.fillRect(0, 0, 120, 120);
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, 60, 60);
    
    return canvas.toDataURL();
}

// ==================== UI UPDATES ====================

function updateRecordsDisplay(today) {
    const timeInDisplay = document.getElementById("timeInDisplay");
    const timeOutDisplay = document.getElementById("timeOutDisplay");

    if (today && today.timeIn) {
        timeInDisplay.textContent = today.timeIn;
    } else {
        timeInDisplay.textContent = "--:--:--";
    }

    if (today && today.timeOut) {
        timeOutDisplay.textContent = today.timeOut;
    } else {
        timeOutDisplay.textContent = "--:--:--";
    }
}

function showAlert(message, type = 'success', alertId = 'alertBox2') {
    const alertBox = document.getElementById(alertId);
    if (!alertBox) return;
    alertBox.textContent = message;
    alertBox.className = `alert show ${type}`;
    setTimeout(() => alertBox.classList.remove('show'), 3000);
}

// ==================== TIME IN/OUT HANDLERS ====================

function handleTimeIn() {
    if (!currentEmployee) {
        showAlert('No employee logged in', 'error');
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const records = getRecords();

    const alreadyLoggedIn = records.some(r =>
        r.id === currentEmployee.empId &&
        r.date === today &&
        r.timeOut === null
    );

    if (alreadyLoggedIn) {
        showAlert('Already clocked in today!', 'warning');
        return;
    }

    const newRecord = {
        id: currentEmployee.empId,
        name: `${currentEmployee.firstName} ${currentEmployee.lastName}`,
        department: currentEmployee.department,
        position: currentEmployee.position,
        date: today,
        timeIn: formatTime(now),
        timeOut: null
    };

    records.push(newRecord);
    saveRecords(records);

    // TODO: Insert to Supabase
    // const { error } = await supabase
    //     .from('attendance')
    //     .insert({
    //         employee_id: currentEmployee.employee_id || currentEmployee.empId,
    //         timestamp: now.toISOString(),
    //         time_in: now.toISOString(),
    //         time_out: null,
    //         date: today
    //     });
    //
    // if (error) {
    //     showAlert('Error recording time in: ' + error.message, 'error');
    //     return;
    // }

    showAlert('✓ Clocked In Successfully!', 'success');
    updateRecordsDisplay(getTodayRecord(currentEmployee.empId));
}

function handleTimeOut() {
    if (!currentEmployee) {
        showAlert('No employee logged in', 'error');
        return;
    }

    const todayRecord = getTodayRecord(currentEmployee.empId);

    if (!todayRecord || todayRecord.timeOut !== null) {
        showAlert('You need to clock in first!', 'error');
        return;
    }

    const now = new Date();
    const records = getRecords();

    const index = records.findIndex(r =>
        r.id === currentEmployee.empId &&
        r.date === todayRecord.date &&
        r.timeOut === null
    );

    if (index !== -1) {
        records[index].timeOut = formatTime(now);
        saveRecords(records);

        // TODO: Update Supabase
        // const { error } = await supabase
        //     .from('attendance')
        //     .update({ time_out: now.toISOString() })
        //     .eq('employee_id', currentEmployee.employee_id || currentEmployee.empId)
        //     .is('time_out', null)
        //     .eq('date', todayRecord.date);
        //
        // if (error) {
        //     showAlert('Error recording time out: ' + error.message, 'error');
        //     return;
        // }

        showAlert('✓ Clocked Out Successfully!', 'success');
        updateRecordsDisplay(getTodayRecord(currentEmployee.empId));
    } else {
        showAlert('Error recording time out', 'error');
    }
}

// ==================== CLOCK ====================

function startClock() {
    document.getElementById('currentTime').textContent = formatTime();
    setInterval(() => {
        document.getElementById('currentTime').textContent = formatTime();
    }, 1000);
}

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('currentDate').textContent = formatDate();

    const inputEmpId = document.getElementById("inputEmpId");
    const btnLogin = document.getElementById("btnLogin");
    const btnLogout = document.getElementById("btnLogout");
    const btnClockInOut = document.getElementById("btnClockInOut");

    btnLogin.addEventListener('click', () => {
        const empId = inputEmpId.value.trim();
        
        if (!empId) {
            showAlert('Please enter Employee ID', 'error', 'alertBox');
            return;
        }

        const employee = getEmployeeById(empId);
        
        if (!employee) {
            showAlert('Employee ID not found in system', 'error', 'alertBox');
            return;
        }

        // TODO: Use Supabase
        // const employee = await getEmployeeByIdFromSupabase(empId);
        // if (!employee) {
        //     showAlert('Employee ID not found in system', 'error', 'alertBox');
        //     return;
        // }

        showClockModal(empId);
        inputEmpId.value = '';
    });

    inputEmpId.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            btnLogin.click();
        }
    });

    btnLogout.addEventListener('click', () => {
        currentEmployee = null;
        showLoginModal();
    });

    btnClockInOut.addEventListener('click', () => {
        if (!currentEmployee) return;
        
        const today = getTodayRecord(currentEmployee.empId);
        
        if (!today || today.timeOut !== null) {
            handleTimeIn();
        } else {
            handleTimeOut();
        }
    });

    startClock();
    showLoginModal();
});