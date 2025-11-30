document.addEventListener("DOMContentLoaded", () => {

  // ===== Utilities & Data Layers =====
  const STORAGE_KEYS = {
    LEAVES: 'leaveRequests',
    BALANCES: 'leaveBalances',
    EMPLOYEES: 'employees'
  };

  function readLeaves() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.LEAVES) || '[]');
  }

  function writeLeaves(arr) {
    localStorage.setItem(STORAGE_KEYS.LEAVES, JSON.stringify(arr));
  }

  function readBalances() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.BALANCES) || '{}');
  }

  function writeBalances(obj) {
    localStorage.setItem(STORAGE_KEYS.BALANCES, JSON.stringify(obj));
  }

  function readEmployees() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.EMPLOYEES) || '[]');
  }

  // TODO: Replace with Supabase functions
  // async function fetchLeavesFromSupabase() {
  //   const { data, error } = await supabase
  //     .from('leave_requests')
  //     .select(`
  //       *,
  //       employees(employee_id, first_name, last_name, positions(position_name, departments(department_name)))
  //     `)
  //     .order('created_at', { ascending: false });
  //
  //   if (error) {
  //     console.error('Error fetching leaves:', error);
  //     return [];
  //   }
  //
  //   return data;
  // }

  // async function fetchEmployeesFromSupabase() {
  //   const { data, error } = await supabase
  //     .from('employees')
  //     .select(`
  //       employee_id,
  //       first_name,
  //       last_name,
  //       positions(position_name, departments(department_name))
  //     `);
  //
  //   if (error) {
  //     console.error('Error fetching employees:', error);
  //     return [];
  //   }
  //
  //   return data;
  // }

  function resetBalancesIfNewYear() {
    const balances = readBalances();
    const currentYear = new Date().getFullYear();
    let changed = false;

    for (const empId in balances) {
      if (!balances[empId].year || balances[empId].year < currentYear) {
        balances[empId].balance = 12;
        balances[empId].year = currentYear;
        changed = true;
      }
    }
    if (changed) writeBalances(balances);
  }

  function ensureBalancesForEmployees() {
    const employees = readEmployees();
    const balances = readBalances();
    const currentYear = new Date().getFullYear();
    let changed = false;

    employees.forEach(emp => {
      if (!balances[emp.id]) {
        balances[emp.id] = { balance: 12, year: currentYear };
        changed = true;
      } else if (!balances[emp.id].year || balances[emp.id].year < currentYear) {
        balances[emp.id].balance = 12;
        balances[emp.id].year = currentYear;
        changed = true;
      }
    });

    if (changed) writeBalances(balances);
  }

  function daysBetweenInclusive(startStr, endStr) {
    const s = new Date(startStr);
    const e = new Date(endStr);
    s.setHours(0,0,0,0);
    e.setHours(0,0,0,0);
    const msPerDay = 24 * 60 * 60 * 1000;
    const diff = Math.round((e - s) / msPerDay) + 1;
    return diff > 0 ? diff : 0;
  }

  // ===== Elements =====
  const tabs = document.querySelectorAll('.tab');
  const leaveList = document.getElementById('leaveList');
  const leaveModal = document.getElementById('leaveModal');
  const closeModal = document.getElementById('closeModal');
  const cancelBtn = document.getElementById('cancelBtn');
  const leaveForm = document.getElementById('leaveForm');

  const employeeIdInput = document.getElementById('employeeId');
  const employeeNameInput = document.getElementById('employeeName');
  const departmentInput = document.getElementById('department');
  const positionInput = document.getElementById('position');
  const remainingBalance = document.getElementById('remainingBalance');
  const leaveTypeSelect = document.getElementById('leaveType');
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');
  const reasonInput = document.getElementById('reason');

  // ===== Initialization =====
  resetBalancesIfNewYear();
  ensureBalancesForEmployees();

  // ===== Render Functions =====
  function renderBalancesTable() {
    const employees = readEmployees();
    const balances = readBalances();

    if (!employees || employees.length === 0) {
      leaveList.innerHTML = `<p class="no-leave">No employees found. Add employees from the Employee page first.</p>`;
      return;
    }

    // TODO: Use Supabase data
    // const employees = await fetchEmployeesFromSupabase();

    const html = `
      <div class="table-responsive">
        <table class="leaves-table">
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Employee Name</th>
              <th>Department</th>
              <th>Position</th>
              <th>Available Leaves</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
          ${
            employees.map(emp => {
                const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
                const empID = emp.empId || '';

                return `<tr><td>${empID}</td><td>${fullName}</td><td>${emp.department || '-'}</td><td>${emp.position || '-'}</td><td>${balances[empID] ? balances[empID].balance : 12}</td><td><button class="action-btn btn-open-request" data-id="${empID}" data-name="${fullName}" data-dept="${emp.department || ''}" data-pos="${emp.position || ''}">+ Leave Request</button></td></tr>`;
            }).join('')
          }
          </tbody>
        </table>
      </div>
    `;
    leaveList.innerHTML = html;
  }

  function renderLeavesTab(filter='all') {
    const leaves = readLeaves();
    let filtered = leaves;

    if (filter !== 'all') {
      filtered = leaves.filter(l => l.status === filter);
    }

    // TODO: Use Supabase data
    // const leaves = await fetchLeavesFromSupabase();
    // let filtered = leaves;
    // if (filter !== 'all') {
    //   filtered = leaves.filter(l => l.status === filter);
    // }

    if (!filtered.length) {
      leaveList.innerHTML = `<p class="no-leave">No ${filter} requests found.</p>`;
      return;
    }

    leaveList.innerHTML = filtered.map(l => `
      <div class="leave-card ${l.status}">
        <div class="leave-info">
          <h4>${l.employeeName} <span class="status ${l.status}">${l.status}</span></h4>
          <p><strong>ID:</strong> ${l.employeeId}</p>
          <p><strong>Type:</strong> ${l.leaveType}</p>
          <p><strong>Dates:</strong> ${l.startDate} → ${l.endDate}</p>
          <p><strong>Reason:</strong> ${l.reason}</p>
        </div>
      </div>
    `).join('');
  }

  // ===== Tabs =====
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');

      const type = tab.dataset.tab;
      if (type === 'balances') renderBalancesTable();
      else renderLeavesTab(type);
    });
  });

  // ===== Modal Open =====
  document.addEventListener('click', (e) => {
    if (!e.target.classList.contains('btn-open-request')) return;

    const id = e.target.dataset.id;
    const name = e.target.dataset.name;
    const dept = e.target.dataset.dept;
    const pos = e.target.dataset.pos;

    employeeIdInput.value = id;
    employeeNameInput.value = name;
    departmentInput.value = dept;
    positionInput.value = pos;

    const balances = readBalances();
    remainingBalance.textContent = balances[id] ? balances[id].balance : 12;

    startDateInput.value = '';
    endDateInput.value = '';
    reasonInput.value = '';

    leaveModal.classList.add('show');
  });

  closeModal.addEventListener('click', () => leaveModal.classList.remove('show'));
  cancelBtn.addEventListener('click', () => leaveModal.classList.remove('show'));

  window.addEventListener('click', (e) => {
    if (e.target === leaveModal) leaveModal.classList.remove('show');
  });

  // ===== Submit Leave Request =====
  leaveForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const employeeId = employeeIdInput.value.trim();
    const employeeName = employeeNameInput.value.trim();
    const leaveType = leaveTypeSelect.value;
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;
    const reason = reasonInput.value.trim();

    if (!startDate || !endDate) {
      alert('Please fill all required fields.');
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      alert("End date cannot be earlier than start date.");
      return;
    }

    // TODO: Insert to Supabase
    // const { data, error } = await supabase
    //   .from('leave_requests')
    //   .insert({
    //     employee_id: employeeId,
    //     leave_type: leaveType,
    //     start_date: startDate,
    //     end_date: endDate,
    //     reason: reason,
    //     status: 'pending'
    //   })
    //   .select()
    //   .single();
    //
    // if (error) {
    //   alert('Error submitting leave request: ' + error.message);
    //   return;
    // }

    const leaves = readLeaves();
    const newLeave = {
      id: Date.now(),
      employeeId,
      employeeName,
      department: departmentInput.value,
      position: positionInput.value,
      leaveType,
      startDate,
      endDate,
      reason,
      status: "pending",
      createdAt: new Date().toISOString()
    };

    leaves.push(newLeave);
    writeLeaves(leaves);

    leaveModal.classList.remove('show');

    document.querySelector('.tab[data-tab="pending"]').click();
  });

  // ===== Auto-update if employee page changes =====
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEYS.EMPLOYEES) {
      ensureBalancesForEmployees();
      renderBalancesTable();
    }
  });

  // ===== Initial Render =====
  renderBalancesTable();
  // TODO: Call fetchEmployeesFromSupabase() and fetchLeavesFromSupabase()
});