// Dropdown user menu
const userIcon = document.getElementById('userIcon');
const dropdownMenu = document.getElementById('dropdownMenu');
const userEmailDisplay = document.getElementById('userEmailDisplay');

userIcon.addEventListener('click', () => {
  dropdownMenu.style.display = dropdownMenu.style.display === 'block' ? 'none' : 'block';
});

userEmailDisplay.textContent = localStorage.getItem('userEmail') || "";

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('userEmail');
  window.location.href = 'index.html';
});

// Tabs switching
const tabs = document.querySelectorAll('.tab');
const leaveList = document.getElementById('leaveList');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const tabType = tab.getAttribute('data-tab');

    // For now, static content placeholder
    leaveList.innerHTML = `<p class="no-leave">No ${tabType} leave requests found</p>`;
  });
});

// New Leave Button (for now simple alert)
document.getElementById('newLeaveBtn').addEventListener('click', () => {
  alert("New Leave Request form will appear here.");
});
