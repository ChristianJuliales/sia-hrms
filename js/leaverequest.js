document.addEventListener("DOMContentLoaded", () => {
  const supabase = window.supabaseClient;
  
  // ===================================================
  // FETCH DATA FROM SUPABASE
  // ===================================================
  async function fetchLeaves() {
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('status', 'pending')
        .order('id', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching leaves:', error);
      return [];
    }
  }

  async function updateLeaveStatus(id, status) {
    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({ 
          status: status,
          decisionAt: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating leave status:', error);
      alert('❌ Error updating leave: ' + error.message);
      return false;
    }
  }

  async function fetchLeaveBalances() {
    try {
      const { data, error } = await supabase.from('leave_balances').select('*');
      if (error) throw error;
      
      // Convert array to object keyed by employeeId
      const balances = {};
      (data || []).forEach(item => {
        balances[item.employeeId] = item;
      });
      return balances;
    } catch (error) {
      console.error('Error fetching balances:', error);
      return {};
    }
  }

  async function updateLeaveBalance(employeeId, newBalance) {
    try {
      // Check if balance exists
      const { data: existing } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('employeeId', employeeId)
        .single();

      if (existing) {
        // Update existing balance
        const { error } = await supabase
          .from('leave_balances')
          .update({ balance: newBalance })
          .eq('employeeId', employeeId);
        
        if (error) throw error;
      } else {
        // Insert new balance
        const { error } = await supabase
          .from('leave_balances')
          .insert([{ 
            employeeId: employeeId, 
            balance: newBalance,
            year: new Date().getFullYear()
          }]);
        
        if (error) throw error;
      }
      return true;
    } catch (error) {
      console.error('Error updating balance:', error);
      return false;
    }
  }

  // ===================================================
  // DOM ELEMENTS
  // ===================================================
  const leaveList = document.getElementById('leaveList');
  const dateFilter = document.getElementById('dateFilter');

  // ===================================================
  // FILTER HELPERS
  // ===================================================
  function inThisWeek(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
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

  // ===================================================
  // CALCULATE LEAVE DAYS
  // ===================================================
  function calculateDays(startDate, endDate) {
    const sd = new Date(startDate); 
    sd.setHours(0,0,0,0);
    const ed = new Date(endDate); 
    ed.setHours(0,0,0,0);
    const ms = 24*60*60*1000;
    const diff = Math.round((ed - sd)/ms) + 1;
    return diff > 0 ? diff : 0;
  }

  // ===================================================
  // RENDER TABLE
  // ===================================================
  async function renderManagerTable(filter = 'all') {
    leaveList.innerHTML = '<p class="no-leave">Loading...</p>';
    
    const leaves = await fetchLeaves();
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
              const days = calculateDays(r.startDate, r.endDate);

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
                    <button class="action-btn btn-approve" data-id="${r.id}" data-days="${days}" data-emp="${r.employeeId}">Approve</button>
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

  // ===================================================
  // APPROVE / REJECT HANDLERS
  // ===================================================
  leaveList.addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-approve')) {
      const id = parseInt(e.target.dataset.id);
      const days = parseInt(e.target.dataset.days);
      const empId = e.target.dataset.emp;
      await handleDecision(id, 'approved', days, empId);
    } else if (e.target.classList.contains('btn-reject')) {
      const id = parseInt(e.target.dataset.id);
      await handleDecision(id, 'rejected');
    }
  });

  async function handleDecision(id, decision, days = 0, empId = null) {
    if (decision === 'approved') {
      if (!confirm(`Approve this leave request for ${days} day(s)?`)) return;
      
      // Deduct days from balance
      const balances = await fetchLeaveBalances();
      
      if (!balances[empId]) {
        balances[empId] = { balance: 12, year: new Date().getFullYear() };
      }

      const currentBalance = balances[empId].balance || 12;
      const newBalance = Math.max(0, currentBalance - days);
      
      // Update balance first
      const balanceUpdated = await updateLeaveBalance(empId, newBalance);
      
      if (balanceUpdated) {
        // Then update leave status
        const statusUpdated = await updateLeaveStatus(id, 'approved');
        
        if (statusUpdated) {
          alert(`✅ Leave request approved! New balance: ${newBalance} days`);
          await renderManagerTable(dateFilter.value);
        }
      }
    } else if (decision === 'rejected') {
      if (!confirm('Reject this leave request?')) return;
      
      const statusUpdated = await updateLeaveStatus(id, 'rejected');
      
      if (statusUpdated) {
        alert('❌ Leave request rejected');
        await renderManagerTable(dateFilter.value);
      }
    }
  }

  // ===================================================
  // INITIAL RENDER AND FILTER BINDING
  // ===================================================
  renderManagerTable('all');

  dateFilter.addEventListener('change', () => {
    renderManagerTable(dateFilter.value);
  });

  // ===================================================
  // REALTIME SUBSCRIPTION
  // ===================================================
  supabase
    .channel('leave-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, () => {
      renderManagerTable(dateFilter.value);
    })
    .subscribe();

});