document.addEventListener("DOMContentLoaded", () => {
    // Tab switching (Keep existing logic)
    const tabs = document.querySelectorAll(".tab-btn");
    const contents = document.querySelectorAll(".tab-content");

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            contents.forEach(c => c.classList.remove("active"));
            tab.classList.add("active");
            document.getElementById(tab.dataset.tab).classList.add("active");
        });
    });

    // Sample Data
    const attendanceData = [
        { name: "Arjie Veloria", present: 5, late: 1, absent: 0, total: 45 },
        { name: "Leigh Moreno", present: 4, late: 2, absent: 1, total: 40 },
        { name: "Earvin Lopez", present: 6, late: 0, absent: 0, total: 48 },
    ];

    const leaveData = [
        { name: "Arjie Veloria", type: "Sick Leave", status: "Approved", duration: "2 Days" },
        { name: "Leigh Moreno", type: "Vacation Leave", status: "Pending", duration: "3 Days" },
    ];

    const payrollData = [
        { name: "Arjie Veloria", period: "Nov 1–15, 2025", net: 25000, status: "Processed" },
        { name: "Leigh Moreno", period: "Nov 1–15, 2025", net: 23000, status: "Processed" },
    ];
    
    // --- 1. Populate Summary KPIs (New Element ID) ---
    document.getElementById("summaryTotalEmployees").textContent = attendanceData.length;
    // Note: You would calculate active employees/payroll here in a real app.

    // --- 2. Populate Attendance Tab (Existing Logic) ---
    const tbody = document.getElementById("attendanceTable");
    let totalPresent = 0, totalLate = 0, totalAbsent = 0;
    
    // Clear table first to prevent duplicates
    tbody.innerHTML = '';
    
    attendanceData.forEach(emp => {
        totalPresent += emp.present;
        totalLate += emp.late;
        totalAbsent += emp.absent;
        tbody.innerHTML += `
            <tr>
                <td>${emp.name}</td>
                <td>${emp.present}</td>
                <td>${emp.late}</td>
                <td>${emp.absent}</td>
                <td>${emp.total}</td>
            </tr>`;
    });
    document.getElementById("presentCount").textContent = totalPresent;
    document.getElementById("lateCount").textContent = totalLate;
    document.getElementById("absentCount").textContent = totalAbsent;
    document.getElementById("totalCount").textContent = attendanceData.length;

    // --- 3. Populate Leave & Payroll Tabs (Existing Logic) ---
    const leaveTable = document.getElementById("leaveTable");
    leaveTable.innerHTML = '';
    leaveData.forEach(l => {
        leaveTable.innerHTML += `
            <tr><td>${l.name}</td><td>${l.type}</td><td>${l.status}</td><td>${l.duration}</td></tr>`;
    });

    const payrollTable = document.getElementById("payrollTable");
    payrollTable.innerHTML = '';
    payrollData.forEach(p => {
        payrollTable.innerHTML += `
            <tr><td>${p.name}</td><td>${p.period}</td><td>₱${p.net.toLocaleString()}</td><td>${p.status}</td></tr>`;
    });


    // --- 4. Initialize Charts (Chart.js) ---

    // A. Headcount Bar Chart
    const headcountCtx = document.getElementById('headcountChart').getContext('2d');
    new Chart(headcountCtx, {
        type: 'bar',
        data: {
            labels: ['HR', 'Sales', 'IT', 'Marketing', 'Product'],
            datasets: [{
                label: 'Employees',
                data: [3, 8, 4, 6, 5],
                backgroundColor: '#10B981',
                borderRadius: 5,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, display: false },
                x: { grid: { display: false } }
            },
            plugins: { legend: { display: false }, title: { display: false } }
        }
    });
    
    // B. Leave Status Donut Chart
    const leaveCtx = document.getElementById('leaveStatusChart').getContext('2d');
    new Chart(leaveCtx, {
        type: 'doughnut',
        data: {
            labels: ['Approved', 'Pending', 'Rejected'],
            datasets: [{
                data: [70, 20, 10],
                backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#333', font: { size: 13, weight: '600' } } },
                title: { display: false }
            }
        }
    });

    // C. Payroll Role Distribution Donut Chart
    const payrollRoleCtx = document.getElementById('payrollRoleChart').getContext('2d');
    new Chart(payrollRoleCtx, {
        type: 'doughnut',
        data: {
            labels: ['Management', 'Engineering', 'Support'],
            datasets: [{
                data: [35, 45, 20],
                backgroundColor: ['#8B5CF6', '#1D4ED8', '#059669'],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#333', font: { size: 13, weight: '600' } } },
                title: { display: false }
            }
        }
    });
});