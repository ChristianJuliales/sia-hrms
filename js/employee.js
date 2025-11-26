// ==================== FIXED employee.js ====================
// Includes: View-page file-link fix + Photo 2x2 consistency + Professional View Page

(function(){
  /* ---------- Utilities ---------- */
  function getEmployees() {
    return JSON.parse(localStorage.getItem('employees')) || [];
  }
  function setEmployees(arr) {
    localStorage.setItem('employees', JSON.stringify(arr));
  }
  function qs(id) { return document.getElementById(id); }
  function getQueryParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
  }
  function toBase64(file) {
    return new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result);
      reader.onerror = err => rej(err);
      reader.readAsDataURL(file);
    });
  }
  function createDownloadLinkFromBase64(base64, filename) {
    const parts = base64.split(',');
    const mime = parts[0].match(/:(.*?);/)[1];
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8 = new Uint8Array(n);
    while (n--) u8[n] = bstr.charCodeAt(n);
    const blob = new Blob([u8], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.textContent = filename;
    return a;
  }

  /* ---------- Determine Page ---------- */
  const isListPage = !!qs('employeeTable');
  const isAddPage = !!qs('employeeForm') && !qs('employeeForm').dataset.mode;
  const isEditPage = !!qs('employeeForm') && qs('employeeForm').dataset.mode === 'edit';
  const isViewPage = !!qs('viewContent');

  /* ---------- Helper ---------- */
  function getUniqueDepartments(employees) {
    const set = new Set();
    employees.forEach(e => { if (e.department) set.add(e.department); });
    return Array.from(set).sort((a,b)=> a.localeCompare(b));
  }

  /* ========================= LIST PAGE ========================= */
  if (isListPage) {
    const search = qs('search');
    const table = qs('employeeTable');
    const totalEmployees = qs('totalEmployees');
    const departmentFilter = qs('departmentFilter');
    const gotoAdd = qs('gotoAdd');
    const prevBtn = qs('prevPage');
    const nextBtn = qs('nextPage');
    const pageInfo = qs('pageInfo');

    let employees = getEmployees();
    let currentPage = 1;
    const rowsPerPage = 10;

    gotoAdd && gotoAdd.addEventListener('click', ()=> window.location.href = 'employee_add.html');

    function populateDeptOptions(preserveValue) {
      const depts = getUniqueDepartments(getEmployees());
      const selected = preserveValue !== undefined ? preserveValue : departmentFilter.value;
      departmentFilter.innerHTML = '';
      const allOpt = document.createElement('option');
      allOpt.value = '';
      allOpt.textContent = 'All Departments';
      departmentFilter.appendChild(allOpt);
      depts.forEach(d => {
        const o = document.createElement('option');
        o.value = d;
        o.textContent = d;
        departmentFilter.appendChild(o);
      });
      if (selected !== undefined) departmentFilter.value = selected;
    }

    function renderPage() {
      employees = getEmployees();
      const searchTerm = (search && search.value || '').toLowerCase();
      const deptTerm = departmentFilter ? departmentFilter.value : '';

      const filtered = employees.filter(emp => {
        const fullname = `${emp.firstName} ${emp.lastName}`.toLowerCase();
        const matchesName = fullname.includes(searchTerm) || (emp.email||'').toLowerCase().includes(searchTerm);
        const matchesDept = !deptTerm || emp.department === deptTerm;
        return matchesName && matchesDept;
      });

      const total = filtered.length;
      const maxPage = Math.max(1, Math.ceil(total / rowsPerPage));
      if (currentPage > maxPage) currentPage = maxPage;
      const start = (currentPage - 1) * rowsPerPage;
      const pageItems = filtered.slice(start, start + rowsPerPage);

      table.innerHTML = '';
      pageItems.forEach((emp, idxOnPage) => {
        const globalIndex = employees.indexOf(emp);
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${emp.lastName}, ${emp.firstName}</strong><br><span>${emp.email}</span></td>
          <td>${emp.position || ''}</td>
          <td>${emp.department || ''}</td>
          <td>${emp.status || ''}</td>
          <td>₱${emp.salary || ''}</td>
          <td>
            <button class="view" data-id="${globalIndex}">View</button>
            <button class="edit" data-id="${globalIndex}">Edit</button>
            <button class="delete" data-id="${globalIndex}">Delete</button>
          </td>
        `;
        table.appendChild(tr);
      });

      pageInfo.textContent = `Page ${currentPage} of ${maxPage}`;
      prevBtn.disabled = currentPage <= 1;
      nextBtn.disabled = currentPage >= maxPage;
      totalEmployees.textContent = `${employees.length} total employees`;
      populateDeptOptions(deptTerm);
    }

    populateDeptOptions('');
    renderPage();

    search && search.addEventListener('input', ()=> { currentPage = 1; renderPage(); });
    departmentFilter && departmentFilter.addEventListener('change', ()=> { currentPage = 1; renderPage(); });
    prevBtn && prevBtn.addEventListener('click', ()=> { currentPage = Math.max(1, currentPage - 1); renderPage(); });
    nextBtn && nextBtn.addEventListener('click', ()=> { currentPage++; renderPage(); });

    table.addEventListener('click', (e)=> {
      const id = e.target.dataset.id;
      if (id === undefined) return;
      const employeesAll = getEmployees();
      const empIndex = Number(id);

      if (e.target.classList.contains('delete')) {
        if (!confirm('Delete this employee?')) return;
        employeesAll.splice(empIndex,1);
        setEmployees(employeesAll);
        renderPage();
        return;
      }
      if (e.target.classList.contains('edit')) {
        window.location.href = `employee_edit.html?id=${empIndex}`;
        return;
      }
      if (e.target.classList.contains('view')) {
        window.location.href = `employee_view.html?id=${empIndex}`;
        return;
      }
    });

    window.addEventListener('storage', ()=> { renderPage(); });
  }

  /* ========================= ADD PAGE ========================= */
  if (isAddPage) {
    const form = qs('employeeForm');
    const cancelBtn = qs('cancelAdd');
    form && form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const employees = getEmployees();

      const photoInput = qs('empPhoto');
      const filesInput = qs('empFiles');

      const photoBase64 = photoInput.files.length ? await toBase64(photoInput.files[0]) : null;

      const filesArr = [];
      for (let f of filesInput.files) {
        const base = await toBase64(f);
        filesArr.push({ name: f.name, data: base });
      }

      const emp = {
        empId: qs('empId').value,
        email: qs('empEmail').value,
        firstName: qs('firstName').value,
        lastName: qs('lastName').value,
        middleName: qs('middleName').value,
        dob: qs('dob').value,
        gender: qs('gender').value,
        phone: qs('phone').value,
        address: qs('address').value,
        position: qs('position').value,
        department: qs('department').value,
        dateHired: qs('dateHired').value,
        status: qs('status').value,
        salary: qs('salary').value,
        photo: photoBase64,
        files: filesArr
      };

      employees.push(emp);
      setEmployees(employees);
      window.location.href = 'employee.html';
    });

    cancelBtn && cancelBtn.addEventListener('click', ()=> window.location.href = 'employee.html');
  }

  /* ========================= EDIT PAGE ========================= */
  if (isEditPage) {
    const employees = getEmployees();
    const id = getQueryParam('id');
    const idx = id !== null ? Number(id) : null;
    if (idx === null || isNaN(idx) || !employees[idx]) {
      alert('Invalid employee ID'); window.location.href = 'employee.html'; return;
    }
    const emp = employees[idx];

    ['empId','empEmail','firstName','lastName','middleName','dob','gender','phone','address','position','department','dateHired','status','salary'].forEach(fid => {
      const el = qs(fid);
      if (el) el.value = emp[fid === 'empEmail' ? 'email' : fid] || emp[fid];
    });

    const photoPreview = qs('photoPreview');
    if (emp.photo && photoPreview) {
      photoPreview.innerHTML = `<img class="photo-2x2" src="${emp.photo}">`;
    }

    const filesList = qs('filesList');
    if (filesList) {
      filesList.innerHTML = '';
      (emp.files || []).forEach((f, i) => {
        const div = document.createElement('div');
        const a = createDownloadLinkFromBase64(f.data, f.name);
        div.appendChild(a);
        const removeBtn = document.createElement('button');
        removeBtn.textContent = ' Remove';
        removeBtn.style.marginLeft = '8px';
        removeBtn.addEventListener('click', ()=> {
          if (!confirm('Remove this uploaded file?')) return;
          emp.files.splice(i,1);
          employees[idx] = emp;
          setEmployees(employees);
          window.location.reload();
        });
        div.appendChild(removeBtn);
        filesList.appendChild(div);
      });
    }

    const form = qs('employeeForm');
    form && form.addEventListener('submit', async (e)=> {
      e.preventDefault();
      const photoInput = qs('empPhoto');
      const filesInput = qs('empFiles');

      let photoBase64 = emp.photo;
      if (photoInput.files.length) {
        photoBase64 = await toBase64(photoInput.files[0]);
      }

      const filesArr = Array.isArray(emp.files) ? emp.files.slice() : [];
      for (let f of filesInput.files) {
        const base = await toBase64(f);
        filesArr.push({ name: f.name, data: base });
      }

      const updated = {
        empId: qs('empId').value,
        email: qs('empEmail').value,
        firstName: qs('firstName').value,
        lastName: qs('lastName').value,
        middleName: qs('middleName').value,
        dob: qs('dob').value,
        gender: qs('gender').value,
        phone: qs('phone').value,
        address: qs('address').value,
        position: qs('position').value,
        department: qs('department').value,
        dateHired: qs('dateHired').value,
        status: qs('status').value,
        salary: qs('salary').value,
        photo: photoBase64,
        files: filesArr
      };

      employees[idx] = updated;
      setEmployees(employees);
      window.location.href = 'employee.html';
    });

    qs('cancelEdit') && qs('cancelEdit').addEventListener('click', ()=> window.location.href = 'employee.html');
  }

  /* ========================= VIEW PAGE ========================= */
  if (isViewPage) {
    const id = getQueryParam('id');
    const employees = getEmployees();
    const idx = id !== null ? Number(id) : null;
    if (idx === null || isNaN(idx) || !employees[idx]) {
      alert('Invalid employee ID'); 
      window.location.href = 'employee.html'; 
      return;
    }
    const emp = employees[idx];
    const content = qs('viewContent');

    // Get initials for placeholder
    const initials = (emp.firstName.charAt(0) + emp.lastName.charAt(0)).toUpperCase();

    // Photo HTML
    const photoHTML = emp.photo 
      ? `<img class="profile-photo" src="${emp.photo}" alt="${emp.firstName} ${emp.lastName}">` 
      : `<div class="profile-photo-placeholder">${initials}</div>`;

    // Status class
    const statusClass = `status-${emp.status.toLowerCase()}`;

    // Build profile HTML
    content.innerHTML = `
      <div class="profile-container">
        <!-- Profile Header -->
        <div class="profile-header">
          <div class="profile-photo-container">
            ${photoHTML}
          </div>
          <div class="profile-basic-info">
            <h1 class="employee-name">${emp.lastName}, ${emp.firstName} ${emp.middleName}</h1>
            <p class="employee-id">Employee ID: ${emp.empId}</p>
            <div>
              <span class="employee-position">💼 ${emp.position}</span>
              <span class="employee-department">🏢 ${emp.department}</span>
            </div>
            <div>
              <span class="status-badge ${statusClass}">${emp.status}</span>
            </div>
          </div>
        </div>

        <!-- Contact Information -->
        <div class="profile-section">
          <div class="section-title">📞 Contact Information</div>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Email Address</span>
              <span class="info-value">${emp.email}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Phone Number</span>
              <span class="info-value">${emp.phone}</span>
            </div>
            <div class="info-item" style="grid-column: 1 / -1;">
              <span class="info-label">Address</span>
              <span class="info-value">${emp.address}</span>
            </div>
          </div>
        </div>

        <!-- Personal Information -->
        <div class="profile-section">
          <div class="section-title">👤 Personal Information</div>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Date of Birth</span>
              <span class="info-value">${emp.dob}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Gender</span>
              <span class="info-value">${emp.gender}</span>
            </div>
          </div>
        </div>

        <!-- Employment Details -->
        <div class="profile-section">
          <div class="section-title">💼 Employment Details</div>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Date Hired</span>
              <span class="info-value">${emp.dateHired}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Employment Status</span>
              <span class="info-value">${emp.status}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Position</span>
              <span class="info-value">${emp.position}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Department</span>
              <span class="info-value">${emp.department}</span>
            </div>
            <div class="info-item" style="grid-column: 1 / -1;">
              <span class="info-label">Monthly Salary</span>
              <span class="info-value salary-highlight">₱${Number(emp.salary).toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
          </div>
        </div>

        <!-- Uploaded Files -->
        <div class="profile-section">
          <div class="section-title">📎 Uploaded Documents</div>
          <div class="files-list" id="filesList"></div>
        </div>
      </div>
    `;

    // Add files
    const filesContainer = content.querySelector('#filesList');
    if (emp.files && emp.files.length > 0) {
      emp.files.forEach(f => {
        const fileItem = document.createElement('a');
        fileItem.className = 'file-item';
        fileItem.href = f.data;
        fileItem.download = f.name;
        
        // Determine file icon based on extension
        const ext = f.name.split('.').pop().toLowerCase();
        let icon = '📄';
        if (['pdf'].includes(ext)) icon = '📕';
        if (['doc', 'docx'].includes(ext)) icon = '📘';
        if (['jpg', 'jpeg', 'png'].includes(ext)) icon = '🖼️';
        
        fileItem.innerHTML = `
          <span class="file-icon">${icon}</span>
          <span class="file-name">${f.name}</span>
          <span class="download-icon">⬇️</span>
        `;
        filesContainer.appendChild(fileItem);
      });
    } else {
      filesContainer.innerHTML = '<div class="no-files">No documents uploaded</div>';
    }
  }

})();