// ===================================================
// LEAVE REQUEST - SUPABASE READY
// ===================================================

document.addEventListener("DOMContentLoaded", () => {
  const supabase = window.supabaseClient;

  /* ========== SUPABASE FUNCTIONS ========== */
  async function fetchLeaves() {
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .select(`
          *,
          employees(
            employee_id,
            first_name,
            last_name,
            positions(
              position_name,
              departments(department_name)
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(leave => ({
        id: leave.id,
        employeeId: leave.employee_id,
        employeeName: `${leave.employees.first_name} ${leave.employees.last_name}`,
        department: leave.employees.positions?.departments?.department_name || '-',
        position: leave.employees.positions?.position_name || '-',
        leaveType: leave.leave_type,
        startDate: leave.start_date,
        endDate: leave.end_date,
        reason: leave.reason,
        status: leave.status,
        createdAt: leave.created_at
      }));
    } catch (error) {
      console.error('Error fetching leaves:', error);
      return [];
    }
  }

  async function fetchEmployees() {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          id,
          employee_id,
          first_name,
          last_name,
          positions(
            position_name,
            departments(department_name)
          )
        `);

      if (error) throw error;

      return (data || []).map(emp => ({
        id: emp.id,
        empId: emp.employee_id,
        firstName: emp.first_name,
        lastName: emp.last_name,
        department: emp.positions?.departments?.department_name || '',
        position: emp.positions?.position_name || ''
      }));
    } catch (error) {
      console.error('Error fetching employees:', error);
      return [];
    }
  }

  async function fetchLeaveBalance(employeeId) {
    try {
      const { data, error } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('employee_id', employeeId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      // Return balance or default 12 days
      return data ? data.balance : 12;
    } catch (error) {
      console.error('Error fetching balance:', error);
      return 12;
    }
  }

  async function ensureLeaveBalance(employeeId) {
    try {
      const { data: existing } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('employee_id', employeeId)
        .single();

      if (!existing) {
        await supabase
          .from('leave_balances')
          .insert({
            employee_id: employeeId,
            balance: 12,
            year: new Date().getFullYear()
          });
      }
    } catch (error) {
      console.error('Error ensuring balance:', error);
    }
  }

  async function insertLeaveRequest(leaveData) {
    try {
      const { error } = await supabase
        .from('leave_requests')
        .insert({
          employee_id: leaveData.employeeId,
          leave_type: leaveData.leaveType,
          start_date: leaveData.startDate,
          end_date: leaveData.endDate,
          reason: leaveData.reason,
          status: 'pending'
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error inserting leave:', error);
      alert('Error submitting leave request: ' + error.message);
      return false;
    }
  }

  /* ========== HELPERS ========== */
  function daysBetweenInclusive(startStr, endStr) {
    const s = new Date(startStr);
    const e = new Date(endStr);
    s.setHours(0,0,0,0);
    e.setHours(0,0,0,0);
    const msPerDay = 24 * 60 * 60 * 1000;
    const diff = Math.round((e - s) / msPerDay) + 1;
    return diff > 0 ? diff : 0;
  }

  /* ========== DOM ELEMENTS ========== */
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

  /* ========== RENDER FUNCTIONS ========== */
  async function renderBalancesTable() {
    const employees = await fetchEmployees();

    if (!employees || employees.length === 0) {
      leaveList.innerHTML = `<p class="no-leave">No employees found. Add employees from the Employee page first.</p>`;
      return;
    }

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
            await Promise.all(employees.map(async emp => {
              const fullName = `${emp.firstName} ${emp.lastName}`;
              const balance = await fetchLeaveBalance(emp.empId);
              await ensureLeaveBalance(emp.empId);

              return `
                <tr>
                  <td>${emp.empId}</td>
                  <td>${fullName}</td>
                  <td>${emp.department || '-'}</td>
                  <td>${emp.position || '-'}</td>
                  <td>${balance}</td>
                  <td>
                    <button 
                      class="action-btn btn-open-request" 
                      data-id="${emp.empId}" 
                      data-name="${fullName}" 
                      data-dept="${emp.department || ''}" 
                      data-pos="${emp.position || ''}">
                      + Leave Request
                    </button>
                  </td>
                </tr>
              `;
            })).then(rows => rows.join(''))
          }
          </tbody>
        </table>
      </div>
    `;
    leaveList.innerHTML = html;
  }

  async function renderLeavesTab(filter='all') {
    const leaves = await fetchLeaves();
    let filtered = leaves;

    if (filter !== 'all') {
      filtered = leaves.filter(l => l.status === filter);
    }

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

  /* ========== TABS ========== */
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');

      const type = tab.dataset.tab;
      if (type === 'balances') renderBalancesTable();
      else renderLeavesTab(type);
    });
  });

  /* ========== MODAL OPEN ========== */
  document.addEventListener('click', async (e) => {
    if (!e.target.classList.contains('btn-open-request')) return;

    const id = e.target.dataset.id;
    const name = e.target.dataset.name;
    const dept = e.target.dataset.dept;
    const pos = e.target.dataset.pos;

    employeeIdInput.value = id;
    employeeNameInput.value = name;
    departmentInput.value = dept;
    positionInput.value = pos;

    const balance = await fetchLeaveBalance(id);
    remainingBalance.textContent = balance;

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

  /* ========== SUBMIT LEAVE REQUEST ========== */
  leaveForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const employeeId = employeeIdInput.value.trim();
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

    const success = await insertLeaveRequest({
      employeeId,
      leaveType,
      startDate,
      endDate,
      reason
    });

    if (success) {
      leaveModal.classList.remove('show');
      document.querySelector('.tab[data-tab="pending"]').click();
    }
  });

  /* ========== REALTIME UPDATES ========== */
  supabase
    .channel('leave-request-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, () => {
      const activeTab = document.querySelector('.tab.active');
      if (activeTab) {
        const type = activeTab.dataset.tab;
        if (type === 'balances') renderBalancesTable();
        else renderLeavesTab(type);
      }
    })
    .subscribe();

  /* ========== INITIAL RENDER ========== */
  renderBalancesTable();
});