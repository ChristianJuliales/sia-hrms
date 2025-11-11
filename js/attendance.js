// Attendance Tracking JS
document.addEventListener("DOMContentLoaded", () => {
  const logButtons = document.querySelectorAll(".log-btn");
  const logAllBtn = document.getElementById("logAllBtn");

  // Individual employee log buttons
  logButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      btn.textContent = "Attendance Logged";
      btn.classList.add("btn-logged");
      btn.disabled = true;
    });
  });

  // "Log All" button — marks all employees present
  logAllBtn.addEventListener("click", () => {
    logButtons.forEach((btn) => {
      if (!btn.disabled) {
        btn.textContent = "Attendance Logged";
        btn.classList.add("btn-logged");
        btn.disabled = true;
      }
    });
    alert("All employees marked as present for today!");
  });
});
