// ===================================================
// AUTOMATED PAYROLL DASHBOARD WITH SUPABASE
// ===================================================

const PayrollCalculator = {
  parseTimeToSeconds: (timeStr) => {
    if (!timeStr || timeStr === "--" || timeStr === null) return null;
    const match = timeStr.match(/(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return null;

    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const seconds = parseInt(match[3], 10);
    const meridiem = match[4].toUpperCase();

    if (meridiem === "AM") {
      if (hours === 12) hours = 0;
    } else {
      if (hours !== 12) hours += 12;
    }

    return hours * 3600 + minutes * 60 + seconds;
  },

  calculateDailyHours: (timeIn, timeOut) => {
    if (!timeIn || !timeOut) return 0;
    
    const inSeconds = PayrollCalculator.parseTimeToSeconds(timeIn);
    const outSeconds = PayrollCalculator.parseTimeToSeconds(timeOut);
    
    if (inSeconds === null || outSeconds === null) return 0;

    let diffSeconds = outSeconds - inSeconds;
    if (diffSeconds < 0) diffSeconds += 24 * 3600;

    return diffSeconds / 3600;
  },

  calculateRegularHours: (attendanceRecords) => {
    let regularHours = 0;
    attendanceRecords.forEach(record => {
      const hoursWorked = PayrollCalculator.calculateDailyHours(record.timeIn, record.timeOut);
      regularHours += Math.min(hoursWorked, 8);
    });
    return regularHours;
  },

  calculateOvertimeHours: (attendanceRecords) => {
    let overtimeHours = 0;
    attendanceRecords.forEach(record => {
      const hoursWorked = PayrollCalculator.calculateDailyHours(record.timeIn, record.timeOut);
      if (hoursWorked > 8) {
        overtimeHours += hoursWorked - 8;
      }
    });
    return overtimeHours;
  },

  calculateNightDifferentialHours: (attendanceRecords) => {
    let nightHours = 0;
    const nightStart = 22;
    const nightEnd = 6;

    attendanceRecords.forEach(record => {
      if (!record.timeIn || !record.timeOut) return;

      const inSeconds = PayrollCalculator.parseTimeToSeconds(record.timeIn);
      const outSeconds = PayrollCalculator.parseTimeToSeconds(record.timeOut);
      
      if (inSeconds === null || outSeconds === null) return;

      let currentSeconds = inSeconds;
      const endSeconds = outSeconds > inSeconds ? outSeconds : outSeconds + 24 * 3600;

      while (currentSeconds < endSeconds) {
        const hour = Math.floor((currentSeconds % (24 * 3600)) / 3600);
        if (hour >= nightStart || hour < nightEnd) {
          nightHours += 1/3600;
        }
        currentSeconds += 1;
      }
    });

    return nightHours;
  },

  calculateBasicPay: (monthlySalary, daysWorked, workingDaysInMonth = 22) => {
    const dailyRate = monthlySalary / workingDaysInMonth;
    return dailyRate * daysWorked;
  },

  calculateHourlyRate: (monthlySalary, workingDaysInMonth = 22, hoursPerDay = 8) => {
    return monthlySalary / (workingDaysInMonth * hoursPerDay);
  },

  calculateOTPay: (hourlyRate, overtimeHours) => {
    return overtimeHours * hourlyRate * 1.25;
  },

  calculateNightDiffPay: (hourlyRate, nightHours) => {
    return nightHours * hourlyRate * 0.10;
  },

  calculateGrossPay: (basicPay, otPay, nightDiffPay, allowances = 0) => {
    return basicPay + otPay + nightDiffPay + allowances;
  },

  calculateSSS: (grossPay) => {
    return grossPay * 0.05;
  },

  calculatePhilHealth: (grossPay) => {
    return grossPay * 0.025;
  },

  calculatePagIBIG: (grossPay) => {
    if (grossPay <= 1500) return grossPay * 0.01;
    if (grossPay <= 5000) return grossPay * 0.02;
    return 100;
  },

  calculateWithholdingTax: (grossPay) => {
    if (grossPay <= 20833) return 0;
    if (grossPay <= 33332) return (grossPay - 20833) * 0.15;
    if (grossPay <= 66666) return 1875 + (grossPay - 33332) * 0.20;
    if (grossPay <= 166666) return 8541.80 + (grossPay - 66666) * 0.25;
    if (grossPay <= 666666) return 33541.80 + (grossPay - 166666) * 0.30;
    return 183541.80 + (grossPay - 666666) * 0.35;
  }
};

// ===================================================
// MAIN APPLICATION
// ===================================================
document.addEventListener("DOMContentLoaded", () => {
  const supabase = window.supabaseClient;
  const periodSelect = document.getElementById("periodSelect");
  const tableBody = document.querySelector(".payroll-table tbody");
  const detailsModal = document.getElementById("detailsModal");
  const closeDetailsModal = document.getElementById("closeDetailsModal");
  const closeDetailsBtn = document.getElementById("closeDetailsBtn");
  const printReceiptBtn = document.getElementById("printReceiptBtn");

  // Hide the "+ Process Payroll" button
  const processBtn = document.getElementById("processBtn");
  if (processBtn) {
    processBtn.style.display = "none";
  }

  let payrollRecords = [];
  let selectedPeriod = getCurrentPeriod();

  // ===================================================
  // GET CURRENT PERIOD
  // ===================================================
  function getCurrentPeriod() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const firstDay = `${year}-${month}-01`;
    const lastDay = new Date(year, now.getMonth() + 1, 0);
    const lastDayStr = `${year}-${month}-${String(lastDay.getDate()).padStart(2, '0')}`;
    
    return { start: firstDay, end: lastDayStr };
  }

  // ===================================================
  // FETCH DATA FROM SUPABASE
  // ===================================================
  async function fetchAllEmployees() {
    try {
      const { data, error } = await supabase.from('employees').select('*');
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching employees:', error);
      return [];
    }
  }

  async function fetchAttendanceRecords(employeeId, periodStart, periodEnd) {
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('id', employeeId)
        .gte('date', periodStart)
        .lte('date', periodEnd);
      
      if (error) throw error;
      
      // Filter out records with no timeOut
      return (data || []).filter(r => r.timeOut && r.timeOut !== "--" && r.timeOut !== null);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      return [];
    }
  }

  async function fetchProcessedPayroll(employeeId, period) {
    try {
      const { data, error } = await supabase
        .from('payroll_records')
        .select('*')
        .eq('employeeNo', employeeId)
        .eq('period', period)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" error
      return data || null;
    } catch (error) {
      console.error('Error fetching payroll:', error);
      return null;
    }
  }

  async function fetchAllPayrollRecords() {
    try {
      const { data, error } = await supabase.from('payroll_records').select('*');
      if (error) throw error;
      payrollRecords = data || [];
      return payrollRecords;
    } catch (error) {
      console.error('Error fetching payroll records:', error);
      payrollRecords = [];
      return [];
    }
  }

  async function savePayrollRecord(record) {
    try {
      const { data, error } = await supabase
        .from('payroll_records')
        .insert([record])
        .select();
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        payrollRecords.push(data[0]);
      }
      return data;
    } catch (error) {
      console.error('Error saving payroll:', error);
      alert('❌ Error saving payroll: ' + error.message);
      return null;
    }
  }

  async function deletePayrollRecord(id) {
    try {
      const { error } = await supabase
        .from('payroll_records')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      payrollRecords = payrollRecords.filter(p => p.id !== id);
    } catch (error) {
      console.error('Error deleting payroll:', error);
      alert('❌ Error deleting payroll: ' + error.message);
    }
  }

  // ===================================================
  // CALCULATE PAYROLL FOR EMPLOYEE
  // ===================================================
  async function calculateEmployeePayroll(employee, periodStart, periodEnd) {
    const attendanceRecords = await fetchAttendanceRecords(employee.empId, periodStart, periodEnd);
    const monthlySalary = parseFloat(employee.basicSalary) || parseFloat(employee.monthlySalary) || 17000;

    if (attendanceRecords.length === 0) {
      return null;
    }

    const daysWorked = attendanceRecords.length;
    const regularHours = PayrollCalculator.calculateRegularHours(attendanceRecords);
    const overtimeHours = PayrollCalculator.calculateOvertimeHours(attendanceRecords);
    const nightDiffHours = PayrollCalculator.calculateNightDifferentialHours(attendanceRecords);

    const hourlyRate = PayrollCalculator.calculateHourlyRate(monthlySalary);
    const basicPay = PayrollCalculator.calculateBasicPay(monthlySalary, daysWorked);
    const otPay = PayrollCalculator.calculateOTPay(hourlyRate, overtimeHours);
    const nightDiffPay = PayrollCalculator.calculateNightDiffPay(hourlyRate, nightDiffHours);

    const grossPay = PayrollCalculator.calculateGrossPay(basicPay, otPay, nightDiffPay);

    const sss = PayrollCalculator.calculateSSS(grossPay);
    const philHealth = PayrollCalculator.calculatePhilHealth(grossPay);
    const pagibig = PayrollCalculator.calculatePagIBIG(grossPay);
    const wtax = PayrollCalculator.calculateWithholdingTax(grossPay);

    const totalDeductions = sss + philHealth + pagibig + wtax;
    const netPay = grossPay - totalDeductions;

    return {
      daysWorked,
      regularHours: regularHours.toFixed(2),
      overtimeHours: overtimeHours.toFixed(2),
      nightDiffHours: nightDiffHours.toFixed(2),
      basicPay,
      otPay,
      nightDiffPay,
      grossPay,
      sss,
      philHealth,
      pagibig,
      wtax,
      totalDeductions,
      netPay
    };
  }

  // ===================================================
  // RENDER TABLE
  // ===================================================
  async function renderEmployeeTable() {
    tableBody.innerHTML = '<tr><td colspan="9" class="empty">Loading...</td></tr>';
    
    const employees = await fetchAllEmployees();
    
    if (employees.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="9" class="empty">No employees found</td></tr>`;
      updateSummaryCards();
      return;
    }

    const periodKey = `${selectedPeriod.start} → ${selectedPeriod.end}`;
    const rows = [];

    for (const emp of employees) {
      const processed = await fetchProcessedPayroll(emp.empId, periodKey);
      const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim();

      if (processed) {
        rows.push(`
          <tr>
            <td>${emp.empId}</td>
            <td>${fullName}</td>
            <td>${emp.position || 'N/A'}</td>
            <td>${emp.empStatus || 'N/A'}</td>
            <td>${periodKey}</td>
            <td>₱${processed.grossPay.toLocaleString("en-PH", {minimumFractionDigits:2})}</td>
            <td>₱${processed.totalDeductions.toLocaleString("en-PH", {minimumFractionDigits:2})}</td>
            <td>₱${processed.netPay.toLocaleString("en-PH", {minimumFractionDigits:2})}</td>
            <td>
              <div class="action-buttons">
                <button class="view-btn" onclick="showPayrollDetails(${processed.id})">👁 View</button>
                <button class="delete-btn" onclick="deletePayroll(${processed.id})">🗑 Delete</button>
              </div>
            </td>
          </tr>
        `);
      } else {
        rows.push(`
          <tr>
            <td>${emp.empId}</td>
            <td>${fullName}</td>
            <td>${emp.position || 'N/A'}</td>
            <td>${emp.empStatus || 'N/A'}</td>
            <td>${periodKey}</td>
            <td class="empty">—</td>
            <td class="empty">—</td>
            <td class="empty">—</td>
            <td>
              <button 
                class="btn-green" 
                onclick="processEmployeePayroll('${emp.empId}')"
                style="padding:6px 12px;font-size:13px;"
              >
                💼 Process Payroll
              </button>
            </td>
          </tr>
        `);
      }
    }

    tableBody.innerHTML = rows.join("");
    updateSummaryCards();
  }

  // ===================================================
  // PROCESS PAYROLL FOR EMPLOYEE
  // ===================================================
  window.processEmployeePayroll = async function(empId) {
    const employees = await fetchAllEmployees();
    const employee = employees.find(e => e.empId === empId);

    if (!employee) {
      alert("❌ Employee not found!");
      return;
    }

    const calculation = await calculateEmployeePayroll(employee, selectedPeriod.start, selectedPeriod.end);

    if (!calculation) {
      alert(`⚠️ No attendance records found for ${employee.firstName} ${employee.lastName} in this period.`);
      return;
    }

    const confirmMsg = `📊 PAYROLL SUMMARY for ${employee.firstName} ${employee.lastName}\n\n` +
          `Period: ${selectedPeriod.start} to ${selectedPeriod.end}\n` +
          `Days Worked: ${calculation.daysWorked}\n` +
          `Regular Hours: ${calculation.regularHours} hrs\n` +
          `Overtime: ${calculation.overtimeHours} hrs\n` +
          `Night Diff: ${calculation.nightDiffHours} hrs\n\n` +
          `💰 GROSS PAY: ₱${calculation.grossPay.toLocaleString('en-PH', {minimumFractionDigits:2})}\n` +
          `📉 DEDUCTIONS: ₱${calculation.totalDeductions.toLocaleString('en-PH', {minimumFractionDigits:2})}\n` +
          `💵 NET PAY: ₱${calculation.netPay.toLocaleString('en-PH', {minimumFractionDigits:2})}\n\n` +
          `Process this payroll?`;

    if (!confirm(confirmMsg)) return;

    const newRecord = {
      employeeNo: employee.empId,
      employeeStatus: employee.empStatus || 'Regular',
      employeePosition: employee.position || 'N/A',
      employee: `${employee.firstName} ${employee.lastName}`,
      period: `${selectedPeriod.start} → ${selectedPeriod.end}`,
      daysWorked: calculation.daysWorked,
      regularHours: calculation.regularHours,
      overtimeHours: calculation.overtimeHours,
      nightDiffHours: calculation.nightDiffHours,
      basicSalary: calculation.basicPay,
      otPay: calculation.otPay,
      nightDiffPay: calculation.nightDiffPay,
      grossPay: calculation.grossPay,
      sss: calculation.sss,
      philHealth: calculation.philHealth,
      pagibig: calculation.pagibig,
      withholdingTax: calculation.wtax,
      totalDeductions: calculation.totalDeductions,
      netPay: calculation.netPay,
      status: "Processed",
      processedDate: new Date().toLocaleDateString()
    };

    const result = await savePayrollRecord(newRecord);
    if (result) {
      alert("✅ Payroll processed successfully!");
      await renderEmployeeTable();
    }
  };

  // ===================================================
  // DELETE PAYROLL
  // ===================================================
  window.deletePayroll = async function(id) {
    if (!confirm("Are you sure you want to delete this payroll record?")) return;

    await deletePayrollRecord(id);
    alert("✅ Payroll record deleted!");
    await renderEmployeeTable();
  };

  // ===================================================
  // VIEW PAYROLL DETAILS
  // ===================================================
  window.showPayrollDetails = function(id) {
    const p = payrollRecords.find(x => x.id === id);
    if (!p) return;

    document.getElementById("detailsContent").innerHTML = `
      <div class="detail-row"><strong>Employee No:</strong> <span>${p.employeeNo}</span></div>
      <div class="detail-row"><strong>Name:</strong> <span>${p.employee}</span></div>
      <div class="detail-row"><strong>Position:</strong> <span>${p.employeePosition}</span></div>
      <div class="detail-row"><strong>Status:</strong> <span>${p.employeeStatus}</span></div>
      <div class="detail-row"><strong>Period:</strong> <span>${p.period}</span></div>
      <div class="detail-row"><strong>Processed Date:</strong> <span>${p.processedDate}</span></div>
      <hr>
      <div class="detail-row"><strong>Days Worked:</strong> ${p.daysWorked}</div>
      <div class="detail-row"><strong>Regular Hours:</strong> ${p.regularHours} hrs</div>
      <div class="detail-row"><strong>Overtime Hours:</strong> ${p.overtimeHours} hrs</div>
      <div class="detail-row"><strong>Night Diff Hours:</strong> ${p.nightDiffHours} hrs</div>
      <hr>
      <div class="detail-row"><strong>Basic Pay:</strong> ₱${p.basicSalary.toLocaleString("en-PH",{minimumFractionDigits:2})}</div>
      <div class="detail-row"><strong>Overtime Pay:</strong> ₱${p.otPay.toLocaleString("en-PH",{minimumFractionDigits:2})}</div>
      <div class="detail-row"><strong>Night Differential:</strong> ₱${p.nightDiffPay.toLocaleString("en-PH",{minimumFractionDigits:2})}</div>
      <hr>
      <div class="detail-row"><strong>GROSS PAY:</strong> <strong>₱${p.grossPay.toLocaleString("en-PH",{minimumFractionDigits:2})}</strong></div>
      <hr>
      <div class="detail-row"><strong>SSS (5%):</strong> ₱${p.sss.toLocaleString("en-PH",{minimumFractionDigits:2})}</div>
      <div class="detail-row"><strong>PhilHealth (2.5%):</strong> ₱${p.philHealth.toLocaleString("en-PH",{minimumFractionDigits:2})}</div>
      <div class="detail-row"><strong>Pag-IBIG:</strong> ₱${p.pagibig.toLocaleString("en-PH",{minimumFractionDigits:2})}</div>
      <div class="detail-row"><strong>Withholding Tax:</strong> ₱${p.withholdingTax.toLocaleString("en-PH",{minimumFractionDigits:2})}</div>
      <div class="detail-row"><strong>Total Deductions:</strong> ₱${p.totalDeductions.toLocaleString("en-PH",{minimumFractionDigits:2})}</div>
      <hr>
      <div class="detail-row"><strong>NET PAY:</strong> <span style="color:green;font-weight:bold;font-size:1.3em">₱${p.netPay.toLocaleString("en-PH",{minimumFractionDigits:2})}</span></div>
    `;
    detailsModal.style.display = "flex";
  };

  // ===================================================
  // MODAL CONTROLS
  // ===================================================
  closeDetailsModal?.addEventListener("click", () => detailsModal.style.display = "none");
  closeDetailsBtn?.addEventListener("click", () => detailsModal.style.display = "none");
  window.addEventListener("click", (e) => {
    if (e.target === detailsModal) detailsModal.style.display = "none";
  });
  printReceiptBtn?.addEventListener("click", () => window.print());

  // ===================================================
  // SUMMARY CARDS
  // ===================================================
  async function updateSummaryCards() {
    let totalPayroll = 0;
    let totalDeductions = 0;
    let processedCount = 0;

    const periodKey = `${selectedPeriod.start} → ${selectedPeriod.end}`;

    payrollRecords.forEach(p => {
      if (p.period === periodKey) {
        totalPayroll += p.grossPay;
        totalDeductions += p.totalDeductions;
        processedCount++;
      }
    });

    if (document.getElementById("totalPayroll")) {
      document.getElementById("totalPayroll").textContent = "₱" + totalPayroll.toLocaleString("en-PH", { minimumFractionDigits: 2 });
    }
    if (document.getElementById("totalDeductions")) {
      document.getElementById("totalDeductions").textContent = "₱" + totalDeductions.toLocaleString("en-PH", { minimumFractionDigits: 2 });
    }
    if (document.getElementById("processedCount")) {
      document.getElementById("processedCount").textContent = processedCount;
    }
  }

  // ===================================================
  // PERIOD FILTER
  // ===================================================
  if (periodSelect) {
    periodSelect.addEventListener("change", async (e) => {
      if (e.target.value !== "All Periods") {
        // Add period filtering logic here
      }
      await renderEmployeeTable();
    });
  }

  // ===================================================
  // INITIALIZE
  // ===================================================
  (async function init() {
    await fetchAllPayrollRecords();
    await renderEmployeeTable();
  })();

  // ===================================================
  // REALTIME SUBSCRIPTION
  // ===================================================
  supabase
    .channel('payroll-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'payroll_records' }, async () => {
      await fetchAllPayrollRecords();
      await renderEmployeeTable();
    })
    .subscribe();
});