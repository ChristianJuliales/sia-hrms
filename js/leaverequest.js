document.addEventListener("DOMContentLoaded", () => {
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

  const leaveList = document.getElementById('leaveList');
  const dateFilter = document.getElementById('dateFilter');

  // filter helpers
  function inThisWeek(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay()); // sunday of this week
    start.setHours(0,0,0,0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23,59,59,999);
    return d >= start && d <= end;
  }

  function inThisMonth(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }

  function applyDateFilter(leaves, filter) {
    if (filter === 'this_week') {
      return leaves.filter(l => inThisWeek(l.startDate) || inThisWeek(l.endDate));
    } else if (filter === 'this_month') {
      return leaves.filter(l => inThisMonth(l.startDate) || inThisMonth(l.endDate));
    } else {
      return leaves;
    }
  }

  function renderManagerTable(filter = 'all') {
    const leaves = readLeaves().filter(l => l.status === 'pending');
    const filtered = applyDateFilter(leaves, filter);

    if (!filtered || filtered.length === 0) {
      leaveList.innerHTML = `<p class="no-leave">No pending leave requests</p>`;
      return;
    }

    const tableHTML = `
      <div class="table-responsive">
        <table class="leaves-table">
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Employee ID</th>
              <th>Employee Name</th>
              <th>Department</th>
              <th>Position</th>
              <th>Type</th>
              <th>Dates</th>
              <th>Days</th>
              <th>Reason</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(r => {
              const days = (function(s,e){
                const sd = new Date(s); sd.setHours(0,0,0,0);
                const ed = new Date(e); ed.setHours(0,0,0,0);
                const ms = 24*60*60*1000;
                const diff = Math.round((ed - sd)/ms) + 1;
                return diff > 0 ? diff : 0;
              })(r.startDate, r.endDate);

              return `
                <tr>
                  <td>${r.id}</td>
                  <td>${r.employeeId}</td>
                  <td>${r.employeeName}</td>
                  <td>${r.department || '-'}</td>
                  <td>${r.position || '-'}</td>
                  <td>${r.leaveType}</td>
                  <td>${r.startDate} → ${r.endDate}</td>
                  <td>${days}</td>
                  <td>${r.reason || '-'}</td>
                  <td>
                    <button class="action-btn btn-approve" data-id="${r.id}">Approve</button>
                    <button class="action-btn btn-reject" data-id="${r.id}" style="background:#b91c1c;">Reject</button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
    leaveList.innerHTML = tableHTML;
  }

  // Approve / Reject handlers
  leaveList.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-approve')) {
      const id = parseInt(e.target.dataset.id);
      handleDecision(id, 'approved');
    } else if (e.target.classList.contains('btn-reject')) {
      const id = parseInt(e.target.dataset.id);
      handleDecision(id, 'rejected');
    }
  });

  function handleDecision(id, decision) {
    const leaves = readLeaves();
    const idx = leaves.findIndex(l => l.id === id);
    if (idx === -1) return;
    const request = leaves[idx];

    if (decision === 'approved') {
      // deduct days from balance
      const days = (function(s,e){
        const sd = new Date(s); sd.setHours(0,0,0,0);
        const ed = new Date(e); ed.setHours(0,0,0,0);
        const ms = 24*60*60*1000;
        const diff = Math.round((ed - sd)/ms) + 1;
        return diff > 0 ? diff : 0;
      })(request.startDate, request.endDate);

      const balances = readBalances();
      if (!balances[request.employeeId]) {
        // ensure a balance object
        balances[request.employeeId] = { balance: 12, year: new Date().getFullYear() };
      }

      balances[request.employeeId].balance = Math.max(0, (balances[request.employeeId].balance || 12) - days);
      writeBalances(balances);

      leaves[idx].status = 'approved';
      leaves[idx].decisionAt = new Date().toISOString();
      writeLeaves(leaves);
      renderManagerTable(dateFilter.value);
    } else if (decision === 'rejected') {
      leaves[idx].status = 'rejected';
      leaves[idx].decisionAt = new Date().toISOString();
      writeLeaves(leaves);
      renderManagerTable(dateFilter.value);
    }
  }

  // initial render and filter binding
  renderManagerTable('all');

  dateFilter.addEventListener('change', () => {
    renderManagerTable(dateFilter.value);
  });

});
