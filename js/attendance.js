/* ===============================
   GLOBAL STORAGE KEYS
================================ */
const ATT_KEY = "attendance_records";

function getRecords() {
    try {
        return JSON.parse(localStorage.getItem(ATT_KEY)) || [];
    } catch (e) {
        console.error("Failed to parse attendance records:", e);
        return [];
    }
}
function saveRecords(data) {
    localStorage.setItem(ATT_KEY, JSON.stringify(data));
}

/* ===============================
   HELPERS
================================ */
// Parse a time string like "08:30:00 AM" into seconds since 00:00
function parseTimeToSeconds(t) {
    if (!t) return null;
    // Accept either "HH:MM:SS AM/PM" or "H:MM:SS AM/PM"
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
    if (!timeIn || !timeOut) return "--";
    const s1 = parseTimeToSeconds(timeIn);
    const s2 = parseTimeToSeconds(timeOut);
    if (s1 === null || s2 === null) return "--";
    let diffSec = s2 - s1;
    // crossing midnight?
    if (diffSec < 0) diffSec += 24 * 3600;
    const hours = diffSec / 3600;
    // round to 2 decimals
    return hours.toFixed(2);
}

/* ===============================
   PAGE: attendance.html
================================ */
if (window.location.pathname.includes("attendance.html")) {

    const dateInput = document.getElementById("attendanceDate");
    const searchInput = document.getElementById("search");
    const tableElement = document.querySelector("table");
    const totalAttendance = document.getElementById("totalAttendance");

    // Pagination state
    let currentPage = 1;
    const rowsPerPage = 10;
    let filteredData = [];

    // Set today’s date
    const today = new Date().toISOString().split("T")[0];
    dateInput.value = today;

    /* -----------------------------------
       MAIN LOADING FUNCTION
    ----------------------------------- */
    function loadTable() {
        const selectedDate = dateInput.value;
        const searchValue = searchInput.value.toLowerCase();

        const all = getRecords();

        // Filter by date + search (search both id & name)
        filteredData = all.filter(r =>
            r.date === selectedDate &&
            (
                (r.name || "").toLowerCase().includes(searchValue) ||
                (r.id || "").toLowerCase().includes(searchValue)
            )
        );

        updateTotalAttendance(filteredData.length);
        renderPaginatedTable();
    }

    /* -----------------------------------
       Update total attendance label
    ----------------------------------- */
    function updateTotalAttendance(count) {
        totalAttendance.textContent = `Total Attendance: ${count}`;
    }

    /* -----------------------------------
       Render Pagination Table
    ----------------------------------- */
    function renderPaginatedTable() {
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;

        const paginatedRows = filteredData.slice(start, end);

        renderTable(paginatedRows);
        renderPaginationControls();
    }

    /* -----------------------------------
       Render Table Rows
    ----------------------------------- */
    function renderTable(list) {
        let html = `
        <thead>
            <tr>
              <th>EMPLOYEE ID</th>
              <th>EMPLOYEE NAME</th>
              <th>DEPARTMENT</th>
              <th>POSITION</th>
              <th>DATE</th>
              <th>TIME IN</th>
              <th>TIME OUT</th>
              <th>TOTAL HOURS</th>
            </tr>
        </thead>
        <tbody>
        `;

        if (list.length === 0) {
            html += `<tr><td colspan="9" style="text-align:center;">No records found</td></tr>`;
        } else {
            list.forEach(r => {
                const showLogout = r.timeOut === null;
                const timeOutDisplay = r.timeOut ? r.timeOut : "--";
                const totalHours = computeHours(r.timeIn, r.timeOut);

                html += `
                <tr>
                    <td>${r.id}</td>
                    <td>${r.name}</td>
                    <td>${r.department}</td>
                    <td>${r.position}</td>
                    <td>${r.date}</td>
                    <td>${r.timeIn}</td>
                    <td>${timeOutDisplay}</td>
                    <td>${totalHours}</td>
                </tr>`;
            });
        }

        html += `</tbody>`;
        tableElement.innerHTML = html;
    }

    /* -----------------------------------
       Pagination Buttons
    ----------------------------------- */
    function renderPaginationControls() {
        let paginationDiv = document.getElementById("paginationControls");

        if (!paginationDiv) {
            paginationDiv = document.createElement("div");
            paginationDiv.id = "paginationControls";
            paginationDiv.style.marginTop = "10px";
            paginationDiv.style.display = "flex";
            paginationDiv.style.justifyContent = "center";
            paginationDiv.style.gap = "10px";
            tableElement.insertAdjacentElement("afterend", paginationDiv);
        }

        const totalPages = Math.ceil(filteredData.length / rowsPerPage) || 1;

        paginationDiv.innerHTML = `
            <div style = "display: flex; justify-content: center;">
            <button style ="background: #8e44ad; color: white; border: none; padding: 10px; border-radius: 3px;" ${currentPage === 1 ? "disabled" : ""} onclick="prevPage()">Previous</button>
            <span>Page ${currentPage} of ${totalPages}</span>
            <button style ="background: #8e44ad; color: white; border: none; padding: 10px; border-radius: 3px;" ${currentPage === totalPages ? "disabled" : ""} onclick="nextPage()">Next</button>
            </div>
        `;
    }

    window.prevPage = function() {
        if (currentPage > 1) {
            currentPage--;
            renderPaginatedTable();
        }
    };

    window.nextPage = function() {
        const totalPages = Math.ceil(filteredData.length / rowsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderPaginatedTable();
        }
    };

    /* EVENT LISTENERS */
    dateInput.addEventListener("change", () => { currentPage = 1; loadTable(); });
    searchInput.addEventListener("input", () => { currentPage = 1; loadTable(); });

    // If you have a button to add manual Time In (btn-green), ensure it exists before adding handler
    const btnGreen = document.querySelector(".btn-green");
    if (btnGreen) {
        btnGreen.addEventListener("click", () => {
            window.location.href = "attendance_login.html";
        });
    }

    loadTable();
}
