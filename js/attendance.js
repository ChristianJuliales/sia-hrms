// ==================== ATTENDANCE.JS - UNIVERSAL VERSION ====================
// Works for both admin table view and employee clock in/out view
// TIMEZONE: Asia/Manila (Philippines)
// ==================== INITIAL SETUP ====================

if (!window.supabaseClient) {
    console.error('Supabase client not initialized! Check script loading order.');
}

const supabase = window.supabaseClient;
let currentEmployee = null;

// ==================== DETECT PAGE TYPE ====================
const isTableView = !!document.getElementById('attendanceTable');
const isClockView = !!document.getElementById('btnClockInOut');

console.log('Page type:', isTableView ? 'TABLE VIEW' : isClockView ? 'CLOCK VIEW' : 'UNKNOWN');

// ==================== DATE FUNCTIONS (PHILIPPINES TIMEZONE) ====================

function getCurrentDate() {
    // Get current date in Philippines timezone (Asia/Manila)
    const now = new Date();
    const phTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    const year = phTime.getFullYear();
    const month = String(phTime.getMonth() + 1).padStart(2, '0');
    const day = String(phTime.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getCurrentTimestamp() {
    // Get current timestamp in Philippines timezone
    const now = new Date();
    const phTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    return phTime.toISOString();
}

function formatTime(date = new Date()) {
    if (typeof date === 'string') {
        date = new Date(date);
    }
    // Format time in Philippines timezone
    return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
        timeZone: 'Asia/Manila'
    });
}

function formatTimeFromISO(isoString) {
    if (!isoString) return "--:--:--";
    const date = new Date(isoString);
    return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
        timeZone: 'Asia/Manila'
    });
}

function formatTimeShort(isoString) {
    if (!isoString) return '--:--';
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Manila'
    });
}

function formatDate(date = new Date()) {
    if (typeof date === 'string') {
        date = new Date(date);
    }
    return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: 'Asia/Manila'
    });
}

function formatDateShort(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'Asia/Manila'
    });
}

function calculateHoursBetween(timeIn, timeOut) {
    if (!timeIn || !timeOut) return 0;
    
    const start = new Date(timeIn);
    const end = new Date(timeOut);
    const diffMs = end - start;
    const diffHours = diffMs / (1000 * 60 * 60);
    
    return Math.max(0, diffHours);
}

function formatHours(hours) {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
}

// ==================== EMPLOYEE FUNCTIONS ====================

async function getEmployeeByEmail(email) {
    if (!supabase) return null;
    
    try {
        const { data, error } = await supabase
            .from('employees')
            .select(`
                id,
                employee_id,
                first_name,
                last_name,
                email,
                photo_url,
                positions(
                    position_name,
                    departments(department_name)
                )
            `)
            .eq('email', email)
            .single();

        if (error) throw error;

        return {
            id: data.id,
            empId: data.employee_id,
            firstName: data.first_name,
            lastName: data.last_name,
            email: data.email,
            position: data.positions?.position_name || 'N/A',
            department: data.positions?.departments?.department_name || 'N/A',
            photo: data.photo_url
        };
    } catch (error) {
        console.error('Error fetching employee:', error);
        return null;
    }
}

async function getEmployeeById(empId) {
    if (!supabase) return null;
    
    try {
        const { data, error } = await supabase
            .from('employees')
            .select(`
                id,
                employee_id,
                first_name,
                last_name,
                email,
                photo_url,
                positions(
                    position_name,
                    departments(department_name)
                )
            `)
            .eq('employee_id', empId)
            .single();

        if (error) throw error;

        return {
            id: data.id,
            empId: data.employee_id,
            firstName: data.first_name,
            lastName: data.last_name,
            email: data.email,
            position: data.positions?.position_name || 'N/A',
            department: data.positions?.departments?.department_name || 'N/A',
            photo: data.photo_url
        };
    } catch (error) {
        console.error('Error fetching employee:', error);
        return null;
    }
}

// ==================== ATTENDANCE FUNCTIONS ====================

async function getAllTodayRecords(empId) {
    if (!supabase) return [];
    
    try {
        const today = getCurrentDate();
        
        const { data, error } = await supabase
            .from('attendance')
            .select('*')
            .eq('employee_id', empId)
            .eq('date', today)
            .order('time_in', { ascending: true });

        if (error) throw error;
        
        return data || [];
    } catch (error) {
        console.error('Error fetching today records:', error);
        return [];
    }
}

async function getTodayActiveRecord(empId) {
    if (!supabase) return null;
    
    try {
        const today = getCurrentDate();
        
        const { data, error } = await supabase
            .from('attendance')
            .select('*')
            .eq('employee_id', empId)
            .eq('date', today)
            .is('time_out', null)
            .order('time_in', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;
        
        return data || null;
    } catch (error) {
        console.error('Error fetching active record:', error);
        return null;
    }
}

async function fetchAttendanceRecords(selectedDate = null) {
    if (!supabase) return [];
    
    try {
        // First, get attendance records
        let query = supabase
            .from('attendance')
            .select('id, employee_id, date, time_in, time_out')
            .order('date', { ascending: false })
            .order('time_in', { ascending: false });

        if (selectedDate) {
            query = query.eq('date', selectedDate);
        }

        const { data: attendanceData, error: attError } = await query;

        if (attError) throw attError;

        if (!attendanceData || attendanceData.length === 0) {
            return [];
        }

        // Get unique employee IDs
        const employeeIds = [...new Set(attendanceData.map(r => r.employee_id))];

        // Fetch employee details separately
        const { data: employeesData, error: empError } = await supabase
            .from('employees')
            .select(`
                employee_id,
                first_name,
                last_name,
                position_id
            `)
            .in('employee_id', employeeIds);

        if (empError) {
            console.error('Error fetching employees:', empError);
        }

        // Get all position IDs
        const positionIds = employeesData
            ?.filter(e => e.position_id)
            .map(e => e.position_id) || [];

        // Fetch positions separately
        let positionsData = [];
        if (positionIds.length > 0) {
            const { data: posData, error: posError } = await supabase
                .from('positions')
                .select('id, position_name, department_id')
                .in('id', positionIds);

            if (posError) {
                console.error('Error fetching positions:', posError);
            } else {
                positionsData = posData || [];
            }
        }

        // Get all department IDs
        const departmentIds = positionsData
            .filter(p => p.department_id)
            .map(p => p.department_id);

        // Fetch departments separately
        let departmentsData = [];
        if (departmentIds.length > 0) {
            const { data: deptData, error: deptError } = await supabase
                .from('departments')
                .select('id, department_name')
                .in('id', departmentIds);

            if (deptError) {
                console.error('Error fetching departments:', deptError);
            } else {
                departmentsData = deptData || [];
            }
        }

        // Build lookup maps
        const employeeMap = {};
        employeesData?.forEach(emp => {
            employeeMap[emp.employee_id] = emp;
        });

        const positionMap = {};
        positionsData.forEach(pos => {
            positionMap[pos.id] = pos;
        });

        const departmentMap = {};
        departmentsData.forEach(dept => {
            departmentMap[dept.id] = dept;
        });

        // Combine all data
        const enrichedRecords = attendanceData.map(record => {
            const employee = employeeMap[record.employee_id] || {};
            const position = employee.position_id ? positionMap[employee.position_id] : null;
            const department = position?.department_id ? departmentMap[position.department_id] : null;

            return {
                ...record,
                employees: {
                    first_name: employee.first_name || '',
                    last_name: employee.last_name || '',
                    positions: {
                        position_name: position?.position_name || 'N/A',
                        departments: {
                            department_name: department?.department_name || 'N/A'
                        }
                    }
                }
            };
        });

        console.log('✅ Fetched attendance records:', enrichedRecords.length);
        return enrichedRecords;
        
    } catch (error) {
        console.error('❌ Error fetching attendance records:', error);
        return [];
    }
}

// ==================== TABLE VIEW FUNCTIONS ====================

async function renderAttendanceTable(records) {
    const tableBody = document.getElementById('attendanceTable');
    const totalAttendance = document.getElementById('totalAttendance');
    
    if (!tableBody) return;

    if (totalAttendance) {
        totalAttendance.textContent = `Total Attendance: ${records.length}`;
    }

    tableBody.innerHTML = '';

    if (records.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 40px; color: #999;">
                    No attendance records found
                </td>
            </tr>
        `;
        return;
    }

    records.forEach(record => {
        const employee = record.employees || {};
        const fullName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Unknown';
        const position = employee.positions?.position_name || 'N/A';
        const department = employee.positions?.departments?.department_name || 'N/A';
        
        const timeIn = formatTimeShort(record.time_in);
        const timeOut = formatTimeShort(record.time_out);
        const totalHours = record.time_out ? formatHours(calculateHoursBetween(record.time_in, record.time_out)) : '--';
        const date = formatDateShort(record.date);

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${record.employee_id}</td>
            <td><strong>${fullName}</strong></td>
            <td>${department}</td>
            <td>${position}</td>
            <td>${date}</td>
            <td><span style="color: #27ae60; font-weight: 600;">${timeIn}</span></td>
            <td><span style="color: ${record.time_out ? '#e74c3c' : '#f39c12'}; font-weight: 600;">${timeOut}</span></td>
            <td><strong>${totalHours}</strong></td>
            <td>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

function filterRecords(records, searchTerm) {
    if (!searchTerm) return records;
    
    searchTerm = searchTerm.toLowerCase();
    
    return records.filter(record => {
        const employee = record.employees || {};
        const fullName = `${employee.first_name || ''} ${employee.last_name || ''}`.toLowerCase();
        const empId = (record.employee_id || '').toLowerCase();
        const position = (employee.positions?.position_name || '').toLowerCase();
        const department = (employee.positions?.departments?.department_name || '').toLowerCase();
        
        return fullName.includes(searchTerm) ||
               empId.includes(searchTerm) ||
               position.includes(searchTerm) ||
               department.includes(searchTerm);
    });
}

// ==================== CLOCK VIEW FUNCTIONS ====================

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

async function refreshRecordsDisplay() {
    if (!currentEmployee) {
        const recordsGrid = document.querySelector('.records-grid');
        if (recordsGrid) {
            recordsGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #999;">
                    Please log in to view records
                </div>
            `;
        }
        return;
    }
    
    const records = await getAllTodayRecords(currentEmployee.empId);
    const activeRecord = await getTodayActiveRecord(currentEmployee.empId);
    
    updateRecordsDisplay(records, activeRecord);
    updateClockButton(activeRecord);
}

function updateRecordsDisplay(records, activeRecord) {
    const recordsGrid = document.querySelector('.records-grid');
    if (!recordsGrid) return;
    
    if (!records || records.length === 0) {
        recordsGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #999;">
                No time entries yet today
            </div>
        `;
        return;
    }
    
    const record = records[0];
    const timeIn = formatTimeFromISO(record.time_in);
    const timeOut = record.time_out ? formatTimeFromISO(record.time_out) : '--:--:--';
    const isActive = record.time_out === null;
    const hours = record.time_out ? calculateHoursBetween(record.time_in, record.time_out) : 0;
    
    let html = `
        <div class="time-record in ${isActive ? 'active' : ''}">
            <span class="record-label">TIME IN</span>
            <span class="record-time">${timeIn}</span>
        </div>
        <div class="time-record out ${isActive ? 'active' : ''}">
            <span class="record-label">TIME OUT</span>
            <span class="record-time">${timeOut}</span>
            ${record.time_out ? `<span class="record-duration">${formatHours(hours)}</span>` : '<span class="record-duration" style="color:#f39c12;">Active</span>'}
        </div>
    `;
    
    if (record.time_out) {
        html += `
            <div class="time-record total" style="grid-column: 1 / -1; background: #e8f5e9; border: 2px solid #4caf50;">
                <span class="record-label" style="font-weight: bold; font-size: 16px;">TOTAL HOURS TODAY</span>
                <span class="record-time" style="font-weight: bold; font-size: 20px; color: #2e7d32;">${formatHours(hours)}</span>
            </div>
        `;
    }
    
    recordsGrid.innerHTML = html;
}

function updateClockButton(activeRecord) {
    const btn = document.getElementById('btnClockInOut');
    if (!btn) return;
    
    if (activeRecord) {
        btn.innerHTML = '<span class="icon">🔴</span> CLOCK OUT';
        btn.style.background = '#e74c3c';
    } else {
        btn.innerHTML = '<span class="icon">🟢</span> CLOCK IN';
        btn.style.background = '#27ae60';
    }
}

function showAlert(message, type = 'success') {
    const alertBox = document.getElementById('alertBox2');
    if (alertBox) {
        alertBox.textContent = message;
        alertBox.className = `alert show ${type}`;
        setTimeout(() => alertBox.classList.remove('show'), 3000);
    } else {
        console.log('Alert:', message);
    }
}

async function handleTimeIn() {
    if (!currentEmployee) {
        showAlert('No employee loaded. Please log in first.', 'error');
        return;
    }

    const today = getCurrentDate();
    const now = getCurrentTimestamp();

    console.log('🟢 CLOCK IN (Philippines Time)');
    console.log('Date:', today);
    console.log('Time:', now);

    try {
        const allTodayRecords = await getAllTodayRecords(currentEmployee.empId);
        
        if (allTodayRecords && allTodayRecords.length > 0) {
            showAlert('⚠️ You already have attendance record(s) for today!', 'warning');
            return;
        }

        const insertData = {
            employee_id: currentEmployee.empId,
            employee_uuid: currentEmployee.id,
            date: today,
            time_in: now,
            time_out: null
        };

        const { data, error } = await supabase
            .from('attendance')
            .insert(insertData)
            .select()
            .single();

        if (error) throw error;

        console.log('✅ Clocked in successfully');
        showAlert('✅ Clocked In Successfully!', 'success');
        setTimeout(() => refreshRecordsDisplay(), 500);
        
    } catch (error) {
        console.error('Error clocking in:', error);
        showAlert('❌ Error: ' + error.message, 'error');
    }
}

async function handleTimeOut() {
    if (!currentEmployee) {
        showAlert('No employee loaded. Please log in first.', 'error');
        return;
    }

    const now = getCurrentTimestamp();

    console.log('🔴 CLOCK OUT (Philippines Time)');
    console.log('Time:', now);

    try {
        const activeRecord = await getTodayActiveRecord(currentEmployee.empId);

        if (!activeRecord) {
            showAlert('⚠️ No active session! Clock in first.', 'warning');
            return;
        }

        const { data, error } = await supabase
            .from('attendance')
            .update({ time_out: now })
            .eq('id', activeRecord.id)
            .select()
            .single();

        if (error) throw error;

        const duration = calculateHoursBetween(activeRecord.time_in, now);
        console.log('✅ Clocked out successfully');
        showAlert(`✅ Clocked Out! Session: ${formatHours(duration)}`, 'success');
        setTimeout(() => refreshRecordsDisplay(), 500);
        
    } catch (error) {
        console.error('Error clocking out:', error);
        showAlert('❌ Error: ' + error.message, 'error');
    }
}

function startClock() {
    const timeEl = document.getElementById('currentTime');
    const dateEl = document.getElementById('currentDate');
    
    if (timeEl) {
        timeEl.textContent = formatTime();
        setInterval(() => {
            timeEl.textContent = formatTime();
        }, 1000);
    }
    
    if (dateEl) {
        dateEl.textContent = formatDate();
    }
}

async function loadLoggedInEmployee() {
    try {
        const loggedInUserString = localStorage.getItem('loggedInUser');
        
        if (!loggedInUserString) {
            throw new Error('Please log in first');
        }

        const loggedInUser = JSON.parse(loggedInUserString);

        let employee = null;

        if (loggedInUser.email) {
            employee = await getEmployeeByEmail(loggedInUser.email);
        }

        if (!employee && loggedInUser.employee_id) {
            employee = await getEmployeeById(loggedInUser.employee_id);
        }

        if (!employee) {
            throw new Error('Employee data not found in database');
        }

        currentEmployee = employee;
        const fullName = `${employee.firstName} ${employee.lastName}`;
        const photo = employee.photo || createInitialAvatar(employee.firstName, employee.lastName);

        const elements = {
            profileImg: document.getElementById('profileImg'),
            displayName: document.getElementById('displayName'),
            displayPosition: document.getElementById('displayPosition'),
            displayId: document.getElementById('displayId'),
            detailId: document.getElementById('detailId'),
            detailName: document.getElementById('detailName'),
            detailPosition: document.getElementById('detailPosition'),
            detailDept: document.getElementById('detailDept')
        };

        if (elements.profileImg) elements.profileImg.src = photo;
        if (elements.displayName) elements.displayName.textContent = fullName;
        if (elements.displayPosition) elements.displayPosition.textContent = employee.position;
        if (elements.displayId) elements.displayId.textContent = employee.empId;
        if (elements.detailId) elements.detailId.textContent = employee.empId;
        if (elements.detailName) elements.detailName.textContent = fullName;
        if (elements.detailPosition) elements.detailPosition.textContent = employee.position;
        if (elements.detailDept) elements.detailDept.textContent = employee.department;

        console.log('✅ Employee loaded:', fullName);
        
        await refreshRecordsDisplay();
        return true;

    } catch (error) {
        console.error('Error loading employee:', error);
        showAlert(error.message, 'error');
        return false;
    }
}

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', async () => {
    if (!supabase) {
        alert('Database connection failed. Please refresh the page.');
        return;
    }

    console.log('✅ Attendance System Initializing (Philippines Timezone)...');

    // ==================== TABLE VIEW INITIALIZATION ====================
    if (isTableView) {
        console.log('📊 Initializing TABLE VIEW');

        let allRecords = [];
        const dateInput = document.getElementById('attendanceDate');
        const searchInput = document.getElementById('search');

        // Get logged-in user info
        const loggedInUserString = localStorage.getItem('loggedInUser');
        let loggedInUser = null;
        let userRole = 'Employee';
        let userEmployeeId = null;

        if (loggedInUserString) {
            loggedInUser = JSON.parse(loggedInUserString);
            userRole = loggedInUser.role || 'Employee';
            userEmployeeId = loggedInUser.empId || loggedInUser.employee_id;
        }

        console.log('👤 Table View User:', {
            role: userRole,
            employeeId: userEmployeeId
        });

        const today = getCurrentDate();
        if (dateInput) {
            dateInput.value = today;
        }

        async function loadTableData() {
            const selectedDate = dateInput ? dateInput.value : today;
            allRecords = await fetchAttendanceRecords(selectedDate);
            
            // 🔒 FILTER BY USER ROLE
            let filteredByRole = allRecords;
            
            if (userRole === 'Employee' || userRole === 'Dispatcher' || userRole === 'Driver') {
                // Show only their own records
                filteredByRole = allRecords.filter(record => 
                    record.employee_id === userEmployeeId
                );
                console.log(`🔒 Employee view: Filtered to ${filteredByRole.length} own records`);
            } else {
                console.log(`👔 Admin/HR/Manager view: Showing all ${allRecords.length} records`);
            }
            
            const searchTerm = searchInput ? searchInput.value : '';
            const filteredRecords = filterRecords(filteredByRole, searchTerm);
            
            await renderAttendanceTable(filteredRecords);
        }

        await loadTableData();

        if (dateInput) {
            dateInput.addEventListener('change', loadTableData);
        }

        if (searchInput) {
            searchInput.addEventListener('input', () => {
                const searchTerm = searchInput.value;
                const filteredRecords = filterRecords(allRecords, searchTerm);
                renderAttendanceTable(filteredRecords);
            });
        }

        supabase
            .channel('attendance-table-changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'attendance'
            }, () => {
                console.log('🔄 Data changed, refreshing...');
                loadTableData();
            })
            .subscribe();

        console.log('✅ Table View Ready');
    }

    // ==================== CLOCK VIEW INITIALIZATION ====================
    if (isClockView) {
        console.log('⏰ Initializing CLOCK VIEW');

        await loadLoggedInEmployee();

        const btnLogout = document.getElementById("btnLogout");
        const btnClockInOut = document.getElementById("btnClockInOut");

        btnLogout?.addEventListener('click', () => {
            currentEmployee = null;
            const elements = ['displayName', 'displayPosition', 'displayId', 'detailId', 'detailName', 'detailPosition', 'detailDept'];
            elements.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = '--';
            });
            
            const recordsGrid = document.querySelector('.records-grid');
            if (recordsGrid) {
                recordsGrid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #999;">Please log in</div>';
            }
            
            showAlert('Session cleared.', 'success');
        });

        btnClockInOut?.addEventListener('click', async () => {
            if (!currentEmployee) {
                showAlert('Please log in first', 'warning');
                return;
            }
            
            const activeRecord = await getTodayActiveRecord(currentEmployee.empId);
            
            if (!activeRecord) {
                await handleTimeIn();
            } else {
                await handleTimeOut();
            }
        });

        startClock();
        
        setInterval(async () => {
            if (currentEmployee) {
                await refreshRecordsDisplay();
            }
        }, 30000);

        console.log('✅ Clock View Ready');
    }
});