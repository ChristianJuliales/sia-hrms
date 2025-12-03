/* ===============================
   ATTENDANCE PAGE - UNIVERSAL VIEW with MODAL CLOCKING
    FIX: All helper functions are hoisted, and the main logic is wrapped correctly.
================================ */

// --- GLOBAL HELPER FUNCTIONS (MUST BE OUTSIDE THE MAIN BLOCK) ---

// FIX 1: Define formatting functions here to resolve "ReferenceError: formatTime is not defined"
function formatTime(isoString) {
    if (!isoString) return '--';
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
}

function showAlert(message, type = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert ${type}`;
    alertDiv.textContent = message;
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'error' ? '#e74c3c' : '#27ae60'};
        color: white;
        border-radius: 5px;
        z-index: 9999;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        font-weight: bold;
    `;
    document.body.appendChild(alertDiv);
    setTimeout(() => {
        alertDiv.style.opacity = '0';
        alertDiv.style.transition = 'opacity 0.3s';
        setTimeout(() => alertDiv.remove(), 300);
    }, 3000);
}

function parseTimeToSeconds(t) {
    if (!t || t === "--") return null;
    const m = t.match(/(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)/i);
    if (!m) return null;

    let hh = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    const ss = parseInt(m[3], 10);
    const ampm = m[4].toUpperCase();

    if (ampm === "AM") {
        if (hh === 12) hh = 0;
    } else {
        if (hh !== 12) hh += 12;
    }

    return hh * 3600 + mm * 60 + ss;
}

function computeHours(timeIn, timeOut) {
    if (!timeIn || !timeOut || timeOut === "--") return "--";
    const s1 = parseTimeToSeconds(timeIn);
    const s2 = parseTimeToSeconds(timeOut);
    if (s1 === null || s2 === null) return "--";

    let diffSec = s2 - s1;
    if (diffSec < 0) diffSec += 24 * 3600;

    return (diffSec / 3600).toFixed(2);
}


// --- Main Logic Block ---

if (window.location.pathname.includes("attendance.html")) {
    const supabase = window.supabaseClient;
    
    if (!supabase) {
        console.error('Supabase client not initialized!');
        showAlert('Database connection error. Please refresh the page.', 'error');
        throw new Error('Supabase not initialized');
    }

    // --- DOM Elements (Must be defined inside the main block) ---
    const dateInput = document.getElementById("attendanceDate");
    const searchInput = document.getElementById("search");
    const tableElement = document.getElementById("attendanceTable");
    const totalAttendance = document.getElementById("totalAttendance");
    const logAttendanceBtn = document.getElementById("logAttendanceBtn");
    
    // FIX 2: Added references for the modal elements (assuming you added the modal HTML from the previous response)
    const attendanceLogModal = document.getElementById('attendanceLogModal');
    const modalEmployeeIdInput = document.getElementById('modalEmployeeId');
    const employeeNameDisplay = document.getElementById('employeeNameDisplay');
    const modalAttendanceDateInput = document.getElementById('modalAttendanceDate');
    const modalTimeInInput = document.getElementById('modalTimeIn');
    const modalTimeOutInput = document.getElementById('modalTimeOut');
    const recordIdInput = document.getElementById('recordId');
    const attendanceLogForm = document.getElementById('attendanceLogForm');


    let currentPage = 1;
    const rowsPerPage = 10;
    let filteredData = [];

    const today = new Date().toISOString().split("T")[0];
    dateInput.value = today;

    // Get logged in user info
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
    const userRole = loggedInUser.role || 'Employee';
    const userId = loggedInUser.empId || loggedInUser.employee_id || '';
    const userPosition = loggedInUser.position || '';
    const userName = `${loggedInUser.first_name || ''} ${loggedInUser.last_name || ''}`.trim() || loggedInUser.email || 'User';

    const RESTRICTED_POSITIONS = ['Employee', 'Driver', 'Dispatcher', 'employee', 'driver', 'dispatcher'];
    const isRestrictedUser = RESTRICTED_POSITIONS.some(p => p.toLowerCase() === userPosition.toLowerCase()) || userRole === "Employee";


    /* ---------------------------
       DATA FETCHING FUNCTIONS
    --------------------------- */
    
    async function getEmployeeDetailsMap(empIds) {
        if (empIds.length === 0) return {};
        // Placeholder for employee details lookup (using simplified Supabase structure from previous analysis)
        try {
            const { data: employees, error: empError } = await supabase
                .from('employees')
                .select(`
                    employee_id, first_name, last_name,
                    positions!inner (
                        position_name,
                        departments!inner (department_name)
                    )
                `)
                .in('employee_id', empIds);

            if (empError) throw empError;

            const map = {};
            (employees || []).forEach(e => {
                map[e.employee_id] = {
                    name: `${e.first_name} ${e.last_name}`,
                    position: e.positions?.position_name || '-',
                    department: e.positions?.departments?.department_name || '-'
                };
            });
            return map;
        } catch (error) {
            console.error('Error fetching employee details:', error);
            return {};
        }
    }


    async function fetchAttendanceRecords() {
        try {
            let query = supabase
                .from('attendance')
                .select('id, employee_id, date, time_in, time_out')
                .order('date', { ascending: false })
                .order('time_in', { ascending: false });

            if (isRestrictedUser && userId) {
                query = query.eq('employee_id', userId);
            }

            const { data: attendanceData, error: attError } = await query;
            if (attError) throw attError;

            if (!attendanceData || attendanceData.length === 0) return [];

            const empIds = [...new Set(attendanceData.map(a => a.employee_id).filter(Boolean))];
            const empDetailsMap = await getEmployeeDetailsMap(empIds);

            return attendanceData.map(record => {
                const emp = empDetailsMap[record.employee_id] || {
                    name: 'Unknown',
                    position: '-',
                    department: '-'
                };

                return {
                    recordId: record.id,
                    id: record.employee_id,
                    name: emp.name,
                    department: emp.department,
                    position: emp.position,
                    date: record.date,
                    timeIn: formatTime(record.time_in), // formatTime is now global
                    timeOut: record.time_out ? formatTime(record.time_out) : '--', // formatTime is now global
                    timeInRaw: record.time_in,
                    timeOutRaw: record.time_out
                };
            });

        } catch (error) {
            console.error('Error in fetchAttendanceRecords:', error);
            showAlert('Error loading attendance: ' + error.message, 'error');
            return [];
        }
    }

    /* ---------------------------
       ATTENDANCE SAVE LOGIC
    --------------------------- */

    function getHourAndMinute(isoString) {
        if (!isoString) return '';
        const date = new Date(isoString);
        const h = String(date.getHours()).padStart(2, '0');
        const m = String(date.getMinutes()).padStart(2, '0');
        return `${h}:${m}`;
    }
    
    function convertTimeToISO(dateStr, timeStr) {
        if (!timeStr) return null;
        return new Date(`${dateStr}T${timeStr}:00`).toISOString();
    }
    
    function calculateHours(timeInISO, timeOutISO) {
        if (!timeInISO || !timeOutISO) return 0;
        const start = new Date(timeInISO);
        const end = new Date(timeOutISO);
        const diffMs = end - start;
        if (diffMs < 0) return 0;
        return diffMs / (1000 * 60 * 60);
    }
    
    function formatHoursDisplay(hours) {
        if (hours === 0) return '0.00 hrs';
        return hours.toFixed(2) + ' hrs';
    }

    async function saveAttendanceRecord(record) {
        if (!supabase) return false;
        
        const timeInISO = convertTimeToISO(record.date, record.timeIn);
        const timeOutISO = record.timeOut ? convertTimeToISO(record.date, record.timeOut) : null;
        const totalHours = calculateHours(timeInISO, timeOutISO);

        const updateData = {
            employee_id: record.employeeId,
            date: record.date,
            time_in: timeInISO,
            time_out: timeOutISO,
            total_hours: totalHours
        };
        
        try {
            let result;
            if (record.id) {
                // Update existing record
                result = await supabase
                    .from('attendance')
                    .update(updateData)
                    .eq('id', record.id)
                    .select()
                    .single();
            } else {
                // Insert new record
                result = await supabase
                    .from('attendance')
                    .insert(updateData)
                    .select()
                    .single();
            }

            if (result.error) throw result.error;
            
            showAlert(`✅ Attendance record saved successfully! Hours: ${formatHoursDisplay(totalHours)}`, 'success');
            return true;
        } catch (error) {
            console.error('Error saving attendance record:', error);
            showAlert('❌ Error saving attendance: ' + error.message, 'error');
            return false;
        }
    }


    /* ---------------------------
       MODAL CONTROL
    --------------------------- */
    
    function closeLogModalHandler() {
        // FIX 3: Null check on modal element
        if (attendanceLogModal) {
            attendanceLogModal.style.display = 'none';
        }
        if (attendanceLogForm) {
            attendanceLogForm.reset();
        }
    }

    function openLogModal(record = null) {
        // FIX 3: Null check on modal element and setting display
        if (!attendanceLogModal) {
            console.error("Modal element not found. Check ID 'attendanceLogModal'.");
            return; 
        }
        attendanceLogModal.style.display = 'block'; 
        
        // FIX 4: Null checks on input elements before setting values
        if (!modalEmployeeIdInput || !employeeNameDisplay || !modalAttendanceDateInput) {
             console.error("Modal inputs not found. Cannot proceed.");
             return;
        }
        
        // --- Common Setup ---
        modalEmployeeIdInput.value = userId;
        employeeNameDisplay.textContent = userName;
        modalAttendanceDateInput.value = dateInput.value; 
        recordIdInput.value = ''; // Reset ID for new log
        
        if (record) {
            // --- Edit mode (HR/Manager) ---
            recordIdInput.value = record.recordId;
            modalEmployeeIdInput.readOnly = true;
            modalTimeInInput.value = getHourAndMinute(record.timeInRaw);
            modalTimeOutInput.value = record.timeOutRaw ? getHourAndMinute(record.timeOutRaw) : '';
            modalTimeInInput.readOnly = false;
            modalTimeOutInput.readOnly = false;
            employeeNameDisplay.textContent = `Editing: ${record.name}`;
        } else {
            // --- Clock-In/Log New mode (Universal) ---
            modalEmployeeIdInput.readOnly = true; 
            
            const todayRecords = filteredData.filter(r => r.id === userId && r.date === dateInput.value);
            const activeRecord = todayRecords.find(r => r.timeOut === '--');

            if (activeRecord) {
                // Clock Out Mode
                recordIdInput.value = activeRecord.recordId;
                modalTimeInInput.value = getHourAndMinute(activeRecord.timeInRaw);
                modalTimeInInput.readOnly = true; 
                modalTimeOutInput.value = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }).substring(0, 5);
                modalTimeOutInput.readOnly = false;
                showAlert('Ready to Clock Out.', 'warning');
            } else {
                // Clock In Mode
                modalTimeInInput.value = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }).substring(0, 5);
                modalTimeInInput.readOnly = false;
                modalTimeOutInput.value = '';
                modalTimeOutInput.readOnly = true; 
                
                // Allow HR/Manager to manually set Time Out on new record
                if (!isRestrictedUser) {
                     modalTimeOutInput.readOnly = false;
                }
            }
        }
    }


    /* ---------------------------
       UI ADJUSTMENTS / RENDERING
    --------------------------- */
    function adjustUIForRole() {
        if (logAttendanceBtn) {
            logAttendanceBtn.style.display = "block"; // Always visible as per request
        }
        
        if (isRestrictedUser) {
            if (searchInput && searchInput.parentElement) {
                searchInput.parentElement.style.display = "none";
            }
            const header = document.querySelector("header h1");
            if (header) { header.textContent = "My Attendance"; }
            const headerDesc = document.querySelector("header p");
            if (headerDesc) { headerDesc.textContent = "View your attendance records"; }
            hideTimeColumns();
        } 
    }

    function hideTimeColumns() {
        const style = document.createElement('style');
        style.textContent = `
            table thead tr th:nth-child(6),
            table thead tr th:nth-child(7),
            table tbody tr td:nth-child(6),
            table tbody tr td:nth-child(7) {
                display: none !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    // --- MAIN LOADING FUNCTION ---
    // FIX 5: loadTable is now defined inside the main block but is available to pagination via global scope
    async function loadTable() {
        const selectedDate = dateInput.value;
        const searchValue = searchInput ? searchInput.value.toLowerCase() : '';

        tableElement.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 20px; color: #999;">Loading records...</td></tr>`;

        let all = await fetchAttendanceRecords();

        filteredData = all.filter(r => {
            const matchesDate = r.date === selectedDate;
            const matchesSearch = isRestrictedUser || searchValue === '' ||
                (r.name || "").toLowerCase().includes(searchValue) ||
                (r.id || "").toLowerCase().includes(searchValue);
            return matchesDate && matchesSearch;
        });

        updateTotalAttendance(filteredData.length);
        renderPaginatedTable();
    }

    function updateTotalAttendance(count) {
        if (!totalAttendance) return;
        totalAttendance.textContent = isRestrictedUser ? `My Records: ${count}` : `Total Attendance: ${count}`;
    }
    
    function renderPaginatedTable() {
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        renderTable(filteredData.slice(start, end));
        renderPaginationControls();
    }

    function renderTable(list) {
        if (!tableElement) return;

        let html = "";
        if (list.length === 0) {
            html = `<tr><td colspan="9" style="text-align:center; padding: 20px; color: #999;">No records found for this date</td></tr>`;
        } else {
            list.forEach(r => {
                const totalHours = computeHours(r.timeIn, r.timeOut);
                const statusHtml = r.timeOut === "--" ?
                    `<span style="color:#f39c12;font-size:12px;">⏳ In Progress</span>` :
                    `<span style="color:#27ae60;font-size:12px;">✓ Completed</span>`;
                
                // If the user is HR/Manager, show the Edit button which opens the modal
                const actionButton = !isRestrictedUser ? 
                    `<button class="action-edit-btn" data-id="${r.recordId}" onclick="openEditModal('${r.recordId}')" style="background: #3498db; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Edit</button>`
                    : statusHtml; 

                html += `
                    <tr>
                        <td>${r.id}</td>
                        <td>${r.name}</td>
                        <td>${r.department}</td>
                        <td>${r.position}</td>
                        <td>${r.date}</td>
                        <td>${r.timeIn}</td>
                        <td>${r.timeOut}</td>
                        <td>
                            ${totalHours === "--"
                                ? '<span style="color:#999;">--</span>'
                                : `<span style="color:#27ae60;font-weight:bold;">${totalHours} hrs</span>`
                            }
                        </td>
                        <td>
                            ${actionButton}
                        </td>
                    </tr>
                `;
            });
        }
        tableElement.innerHTML = html;
    }
    
    function renderPaginationControls() {
        let paginationDiv = document.getElementById("paginationControls");

        if (!paginationDiv) {
            paginationDiv = document.createElement("div");
            paginationDiv.id = "paginationControls";
            paginationDiv.style.cssText = `margin-top: 20px; display: flex; justify-content: center; align-items: center; gap: 15px;`;
            const mainSection = document.querySelector(".main");
            if (mainSection) { mainSection.appendChild(paginationDiv); }
        }
        
        if (filteredData.length === 0) { paginationDiv.innerHTML = ""; return; }

        const totalPages = Math.ceil(filteredData.length / rowsPerPage) || 1;

        paginationDiv.innerHTML = `
            <button style="background: #8e44ad; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; ${currentPage === 1 ? 'opacity: 0.5; cursor: not-allowed;' : ''}"
                ${currentPage === 1 ? "disabled" : ""} onclick="prevPage()">← Previous</button>
            <span style="font-weight: bold; color: #333;">Page ${currentPage} of ${totalPages}</span>
            <button style="background: #8e44ad; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; ${currentPage === totalPages ? 'opacity: 0.5; cursor: not-allowed;' : ''}"
                ${currentPage === totalPages ? "disabled" : ""} onclick="nextPage()">Next →</button>
        `;
    }

    // --- Pagination Functions exposed globally ---
    window.prevPage = function() {
        if (currentPage > 1) { currentPage--; renderPaginatedTable(); }
    };

    window.nextPage = function() {
        const totalPages = Math.ceil(filteredData.length / rowsPerPage);
        if (currentPage < totalPages) { currentPage++; renderPaginatedTable(); }
    };
    
    // --- Expose Edit Function for HR/Manager (used by the table's onclick) ---
    window.openEditModal = async function(recordId) {
        const allRecords = await fetchAttendanceRecords();
        const recordToEdit = allRecords.find(r => r.recordId.toString() === recordId.toString());
        if (recordToEdit) {
            openLogModal(recordToEdit);
        } else {
            showAlert('Record not found.', 'error');
        }
    }


    /* ---------------------------
       EVENT LISTENERS
    --------------------------- */

    if (logAttendanceBtn) {
        logAttendanceBtn.addEventListener("click", () => {
            openLogModal(null); // Opens modal for new log (clock in/out)
        });
    }

    const closeLogModalButton = document.getElementById('closeLogModal');
    const cancelLogButton = document.getElementById('cancelLog');

    if (closeLogModalButton) closeLogModalButton.addEventListener('click', closeLogModalHandler);
    if (cancelLogButton) cancelLogButton.addEventListener('click', closeLogModalHandler);
    
    // Close modal if user clicks outside of it
    window.addEventListener('click', (e) => {
        if (e.target === attendanceLogModal) {
            closeLogModalHandler();
        }
    });

    if (attendanceLogForm) {
        attendanceLogForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const recordData = {
                id: recordIdInput.value || null,
                employeeId: modalEmployeeIdInput.value.trim(),
                date: modalAttendanceDateInput.value,
                timeIn: modalTimeInInput.value,
                timeOut: modalTimeOutInput.value
            };

            if (!recordData.timeIn) { showAlert('Time In is required.', 'error'); return; }
            if (recordData.timeOut && (new Date(recordData.date + 'T' + recordData.timeIn) >= new Date(recordData.date + 'T' + recordData.timeOut))) {
                 showAlert('Time Out must be later than Time In.', 'error');
                 return;
            }

            if (await saveAttendanceRecord(recordData)) {
                closeLogModalHandler();
                loadTable(); 
            }
        });
    }
    
    if (dateInput) { dateInput.addEventListener("change", () => { currentPage = 1; loadTable(); }); }
    if (searchInput) { searchInput.addEventListener("input", () => { currentPage = 1; loadTable(); }); }

    /* ---------------------------
       INITIALIZATION
    --------------------------- */
    adjustUIForRole();
    loadTable();
}