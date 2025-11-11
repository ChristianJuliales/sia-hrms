// JS for Payroll & Reports pages

// Payroll: handle process payroll button
const processBtn = document.querySelector(".btn-green");
if (processBtn) {
  processBtn.addEventListener("click", () => {
    alert("Payroll processing initiated!");
  });
}

// Reports: handle tab switching
const tabs = document.querySelectorAll(".tab-btn");
tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
  });
});
