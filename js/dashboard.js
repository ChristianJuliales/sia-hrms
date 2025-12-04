// ===================================================
// DASHBOARD.JS - FIXED VERSION
// Matches actual HTML IDs from dashboard.html
// ===================================================

document.addEventListener("DOMContentLoaded", async () => {
  if (!window.supabaseClient) {
    console.error("❌ Supabase client not found!");
    alert("Database connection error. Please check supabase-config.js");
    return;
  }

  const supabase = window.supabaseClient;
  console.log("✅ Dashboard.js loaded with Supabase");

  // ==================== DISPLAY LOGGED IN USER ====================
  const welcomeText = document.getElementById('welcomeText');
  const userEmailDisplay = document.getElementById('userEmailDisplay');
  
  const loggedInUserString = localStorage.getItem('loggedInUser');
  if (loggedInUserString) {
    try {
      const loggedInUser = JSON.parse(loggedInUserString);
      const displayName = loggedInUser.email || loggedInUser.first_name || loggedInUser.username || 'User';
      
      if (welcomeText) welcomeText.textContent = `Welcome, ${displayName}`;
      if (userEmailDisplay) userEmailDisplay.textContent = displayName;
      
      console.log("👤 Logged in user:", loggedInUser);
    } catch (e) {
      console.error("Error parsing logged in user:", e);
    }
  }

  // ==================== FETCH FUNCTIONS ====================
  
  // 1. Fetch all employees with positions and departments
  async function fetchEmployees() {
    try {
      console.log("📊 Fetching employees...");
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          positions!employees_position_id_fkey(
            position_name,
            departments(department_name)
          )
        `);
      
      if (error) throw error;
      console.log(`✅ Found ${data?.length || 0} employees`);
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching employees:', error);
      return [];
    }
  }

  // 2. Fetch today's attendance
  async function fetchTodayAttendance() {
    try {
      console.log("📊 Fetching today's attendance...");
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('attendance')
        .select('employee_id')
        .eq('date', today);
      
      if (error) throw error;
      
      // Get unique employee IDs who have attendance today
      const uniqueEmployeeIds = [...new Set(data.map(r => r.employee_id))];
      console.log(`✅ ${uniqueEmployeeIds.length} employees present today`);
      return uniqueEmployeeIds;
    } catch (error) {
      console.error('❌ Error fetching attendance:', error);
      return [];
    }
  }

  // 3. Fetch pending leave requests
  async function fetchPendingLeaves() {
    try {
      console.log("📊 Fetching pending leaves...");
      const { data, error } = await supabase
        .from('leave_requests')
        .select(`
          *,
          employees(
            employee_id,
            first_name,
            last_name
          )
        `)
        .ilike('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      console.log(`✅ Found ${data?.length || 0} pending leave requests`);
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching pending leaves:', error);
      return [];
    }
  }

  // 4. Fetch current month payroll
  async function fetchCurrentMonthPayroll() {
    try {
      console.log("📊 Fetching current month payroll...");
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const startDate = `${year}-${month}-01`;
      
      const { data, error } = await supabase
        .from('payroll')
        .select('*, employees(first_name, last_name, employee_id)')
        .gte('pay_period_start', startDate)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      console.log(`✅ Found ${data?.length || 0} payroll records this month`);
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching payroll:', error);
      return [];
    }
  }

  // 5. Fetch recent leave requests (for the list)
  async function fetchRecentLeaveRequests() {
    try {
      console.log("📊 Fetching recent leave requests...");
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
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      console.log(`✅ Found ${data?.length || 0} recent leave requests`);
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching recent leaves:', error);
      return [];
    }
  }

  // 6. Fetch department distribution
  async function fetchDepartmentDistribution() {
    try {
      console.log("📊 Fetching department distribution...");
      const { data, error } = await supabase
        .from('employees')
        .select(`
          id,
          positions!employees_position_id_fkey(
            departments(department_name)
          )
        `);
      
      if (error) throw error;
      
      // Count employees per department
      const deptCounts = {};
      let unassignedCount = 0;
      
      data.forEach(emp => {
        const deptName = emp.positions?.departments?.department_name;
        if (deptName) {
          deptCounts[deptName] = (deptCounts[deptName] || 0) + 1;
        } else {
          unassignedCount++;
        }
      });
      
      console.log("✅ Department distribution calculated:", deptCounts);
      return { deptCounts, unassignedCount, total: data.length };
    } catch (error) {
      console.error('❌ Error fetching department distribution:', error);
      return { deptCounts: {}, unassignedCount: 0, total: 0 };
    }
  }

  // ==================== UPDATE DASHBOARD CARDS ====================
  
  async function updateDashboardCards() {
    console.log('🔄 Updating dashboard cards...');
    
    // Fetch all data in parallel
    const [
      employees,
      todayAttendance,
      pendingLeaves,
      currentPayroll,
      recentLeaves,
      deptData
    ] = await Promise.all([
      fetchEmployees(),
      fetchTodayAttendance(),
      fetchPendingLeaves(),
      fetchCurrentMonthPayroll(),
      fetchRecentLeaveRequests(),
      fetchDepartmentDistribution()
    ]);

    // 1. Total Employees Card (FIXED IDs)
    const totalEmployees = employees.length;
    const activeEmployees = employees.filter(e => 
      e.employment_status === 'Regular' || e.employment_status === 'Probationary'
    ).length;
    
    const totalEmpElement = document.getElementById('totalEmployees');
    const activeEmpElement = document.getElementById('activeEmployees');
    
    if (totalEmpElement) {
      totalEmpElement.textContent = totalEmployees;
      console.log("✅ Updated Total Employees:", totalEmployees);
    }
    if (activeEmpElement) {
      activeEmpElement.textContent = `${activeEmployees} Active`;
      console.log("✅ Updated Active Employees:", activeEmployees);
    }

    // 2. Present Today Card (FIXED IDs)
    const presentCount = todayAttendance.length;
    
    const presentElement = document.getElementById('presentToday');
    const presentDetailElement = document.getElementById('presentTodayText');
    
    if (presentElement) {
      presentElement.textContent = presentCount;
      console.log("✅ Updated Present Today:", presentCount);
    }
    if (presentDetailElement) {
      presentDetailElement.textContent = `Out of ${totalEmployees}`;
    }

    // 3. Pending Leaves Card (FIXED IDs)
    const pendingCount = pendingLeaves.length;
    
    const pendingElement = document.getElementById('pendingLeaves');
    
    if (pendingElement) {
      pendingElement.textContent = pendingCount;
      console.log("✅ Updated Pending Leaves:", pendingCount);
    }

    // 4. Monthly Payroll Card (FIXED IDs)
    const totalPayroll = currentPayroll.reduce((sum, p) => sum + (parseFloat(p.net_pay) || 0), 0);
    const processedCount = currentPayroll.length;
    
    const payrollElement = document.getElementById('monthlyPayroll');
    const payrollDetailElement = document.getElementById('payrollProcessed');
    
    if (payrollElement) {
      payrollElement.textContent = `₱${totalPayroll.toLocaleString('en-PH', {minimumFractionDigits: 2})}`;
      console.log("✅ Updated Monthly Payroll:", totalPayroll);
    }
    if (payrollDetailElement) {
      payrollDetailElement.textContent = `${processedCount} processed`;
    }

    // 5. Recent Leave Requests (FIXED ID)
    renderRecentLeaveRequests(recentLeaves);

    // 6. Department Distribution (FIXED ID)
    renderDepartmentDistribution(deptData);

    console.log('✅ Dashboard updated successfully!');
  }

  // ==================== RENDER RECENT LEAVE REQUESTS ====================
  
  function renderRecentLeaveRequests(leaves) {
    const container = document.getElementById('leaveRequestsList');
    if (!container) {
      console.warn("⚠️ #leaveRequestsList not found");
      return;
    }

    if (!leaves || leaves.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 20px;">No recent leave requests</p>';
      console.log("ℹ️ No recent leave requests to display");
      return;
    }

    const html = leaves.map(leave => {
      const empName = leave.employees 
        ? `${leave.employees.first_name} ${leave.employees.last_name}` 
        : 'Unknown';
      const empId = leave.employees?.employee_id || leave.employee_id;
      const dept = leave.employees?.positions?.departments?.department_name || 'N/A';
      const position = leave.employees?.positions?.position_name || 'N/A';
      
      let statusClass = '';
      let statusColor = '';
      
      if (leave.status === 'Pending') {
        statusClass = 'pending';
        statusColor = '#f59e0b';
      } else if (leave.status === 'Approved') {
        statusClass = 'approved';
        statusColor = '#10b981';
      } else if (leave.status === 'Rejected') {
        statusClass = 'rejected';
        statusColor = '#ef4444';
      }

      return `
        <div style="padding: 14px; margin-bottom: 12px; border-left: 4px solid ${statusColor}; background: #f9fafb; border-radius: 8px; transition: all 0.2s;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <strong style="color: #111827;">${empName}</strong>
            <span style="padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; background: ${statusColor}20; color: ${statusColor};">
              ${leave.status.toUpperCase()}
            </span>
          </div>
          <div style="font-size: 0.85rem; color: #6b7280;">
            <p style="margin: 4px 0;">📋 ${empId} • ${dept} • ${position}</p>
            <p style="margin: 4px 0;">📅 ${leave.start_date} to ${leave.end_date}</p>
            <p style="margin: 4px 0;">📝 ${leave.leave_type} • ${leave.number_of_days} day(s)</p>
            ${leave.comments ? `<p style="margin: 4px 0; font-style: italic;">"${leave.comments}"</p>` : ''}
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
    console.log("✅ Recent leave requests rendered");
  }

  // ==================== RENDER DEPARTMENT DISTRIBUTION ====================
  
  function renderDepartmentDistribution(deptData) {
    const container = document.getElementById('departmentDistribution');
    if (!container) {
      console.warn("⚠️ #departmentDistribution not found");
      return;
    }

    const { deptCounts, unassignedCount, total } = deptData;
    
    if (total === 0) {
      container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 20px;">No employees found</p>';
      console.log("ℹ️ No employees to display in department distribution");
      return;
    }

    let html = '';

    // Unassigned employees
    if (unassignedCount > 0) {
      const percentage = ((unassignedCount / total) * 100).toFixed(1);
      html += `
        <div class="dept" style="margin-bottom: 16px; padding: 14px; background: #f9fafb; border-radius: 10px;">
          <span style="display: block; font-size: 0.9rem; font-weight: 600; color: #374151; margin-bottom: 8px;">
            Unassigned
          </span>
          <div class="bar" style="background: #e5e7eb; border-radius: 8px; height: 8px; overflow: hidden;">
            <div class="fill" style="width: ${percentage}%; height: 100%; background: #94a3b8; border-radius: 8px; transition: width 0.6s ease;"></div>
          </div>
          <span class="count" style="font-size: 0.8rem; color: #6b7280; display: block; margin-top: 4px;">
            ${unassignedCount} employee(s) • ${percentage}%
          </span>
        </div>
      `;
    }

    // Department-wise breakdown
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    let colorIndex = 0;

    Object.entries(deptCounts).forEach(([deptName, count]) => {
      const percentage = ((count / total) * 100).toFixed(1);
      const color = colors[colorIndex % colors.length];
      colorIndex++;

      html += `
        <div class="dept" style="margin-bottom: 16px; padding: 14px; background: #f9fafb; border-radius: 10px;">
          <span style="display: block; font-size: 0.9rem; font-weight: 600; color: #374151; margin-bottom: 8px;">
            ${deptName}
          </span>
          <div class="bar" style="background: #e5e7eb; border-radius: 8px; height: 8px; overflow: hidden;">
            <div class="fill" style="width: ${percentage}%; height: 100%; background: ${color}; border-radius: 8px; transition: width 0.6s ease;"></div>
          </div>
          <span class="count" style="font-size: 0.8rem; color: #6b7280; display: block; margin-top: 4px;">
            ${count} employee(s) • ${percentage}%
          </span>
        </div>
      `;
    });

    // Summary
    const numDepartments = Object.keys(deptCounts).length;
    html += `
      <div class="note" style="color: #2d6e4e; font-size: 0.9rem; margin-top: 16px; padding: 12px; background: #f0fdf4; border-left: 3px solid #2d6e4e; border-radius: 6px; font-weight: 600;">
        📊 Total: ${total} employees across ${numDepartments} department${numDepartments !== 1 ? 's' : ''}
      </div>
    `;

    container.innerHTML = html;
    console.log("✅ Department distribution rendered");
  }

  // ==================== REALTIME SUBSCRIPTIONS ====================
  
  console.log("📡 Setting up realtime subscriptions...");

  // Subscribe to employee changes
  supabase
    .channel('dashboard-employees')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => {
      console.log('🔄 Employee data changed - refreshing dashboard');
      updateDashboardCards();
    })
    .subscribe();

  // Subscribe to attendance changes
  supabase
    .channel('dashboard-attendance')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => {
      console.log('🔄 Attendance data changed - refreshing dashboard');
      updateDashboardCards();
    })
    .subscribe();

  // Subscribe to leave request changes
  supabase
    .channel('dashboard-leaves')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, () => {
      console.log('🔄 Leave request data changed - refreshing dashboard');
      updateDashboardCards();
    })
    .subscribe();

  // Subscribe to payroll changes
  supabase
    .channel('dashboard-payroll')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'payroll' }, () => {
      console.log('🔄 Payroll data changed - refreshing dashboard');
      updateDashboardCards();
    })
    .subscribe();

  // ==================== INITIAL LOAD ====================
  console.log('🚀 Dashboard initializing...');
  await updateDashboardCards();
  console.log('✅ Dashboard ready!');
});