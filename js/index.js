document.addEventListener("DOMContentLoaded", () => {

    // Sample default accounts for testing
    const sampleUsers = [
        { id: "hr", role: "Admin", password: "hr" },
        { id: "emp", role: "Employee", password: "emp" },
    ];

    const loginForm = document.getElementById("loginForm");
    const createBtn = document.getElementById("createBtn");

    if (!loginForm) {
        console.error("⚠ loginForm not found — Check index.html ID");
        return;
    }

    // LOGIN HANDLER
    loginForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const empId = document.getElementById("employeeId").value.trim();
        const pwd = document.getElementById("password").value.trim();

        // Find user in sample list
        const user = sampleUsers.find(u => u.id === empId);

        if (!user || user.password !== pwd) {
            alert("Invalid Employee ID or Password.");
            return;
        }

        // Store login session
        localStorage.setItem("loggedInUser", JSON.stringify(user));

        // Redirect based on role
        if (user.role === "Admin") {
            window.location.href = "dashboard.html";
        } else {
            window.location.href = "attendance.html";
        }
    });

    // CREATE ACCOUNT BUTTON
    if (createBtn) {
        createBtn.addEventListener("click", () => {
            window.location.href = "createaccount.html";
        });
    }
});
