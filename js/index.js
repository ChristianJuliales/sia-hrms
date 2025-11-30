document.addEventListener("DOMContentLoaded", () => {

    // HR/Manager Access PIN (6 digits)
    const ADMIN_PIN = "123456"; // Change this to your desired PIN

    const loginForm = document.getElementById("loginForm");
    const createBtn = document.getElementById("createBtn");
    const errorMessage = document.getElementById("errorMessage");

    if (!loginForm) {
        console.error("⚠ loginForm not found — Check index.html ID");
        return;
    }

    // LOGIN HANDLER - Ready for Supabase
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const empId = document.getElementById("employeeId").value.trim();
        const pwd = document.getElementById("password").value.trim();

        // TODO: Replace with Supabase authentication
        // Example:
        // const { data, error } = await supabase.auth.signInWithPassword({
        //     email: empId + '@rmt.com',
        //     password: pwd
        // });
        //
        // if (error) {
        //     errorMessage.textContent = "❌ Invalid Employee ID or Password.";
        //     errorMessage.style.display = "block";
        //     return;
        // }
        //
        // // Fetch user profile from employees table
        // const { data: profile } = await supabase
        //     .from('employees')
        //     .select('*, positions(roles(role_name))')
        //     .eq('id', data.user.id)
        //     .single();
        //
        // // Store session
        // localStorage.setItem("loggedInUser", JSON.stringify({
        //     id: profile.id,
        //     role: profile.positions.roles.role_name,
        //     email: profile.email,
        //     firstName: profile.first_name,
        //     lastName: profile.last_name,
        //     department: profile.positions.departments.department_name,
        //     position: profile.positions.position_name
        // }));
        //
        // // Redirect based on role
        // if (profile.positions.roles.role_name === "Admin") {
        //     window.location.href = "dashboard.html";
        // } else {
        //     window.location.href = "attendance.html";
        // }

        errorMessage.textContent = "⚠️ Please connect to Supabase first";
        errorMessage.style.display = "block";
    });

    // CREATE ACCOUNT BUTTON - Shows PIN Modal
    if (createBtn) {
        createBtn.addEventListener("click", () => {
            showPinModal();
        });
    }

    // Clear error on input
    document.querySelectorAll("input").forEach(input => {
        input.addEventListener("input", () => {
            errorMessage.style.display = "none";
        });
    });

    // PIN MODAL FUNCTIONS
    function showPinModal() {
        // Create modal overlay
        const modalHTML = `
            <div id="pinModal" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            ">
                <div style="
                    background: white;
                    padding: 30px;
                    border-radius: 10px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    max-width: 400px;
                    width: 90%;
                ">
                    <h2 style="margin-top: 0; color: #333; text-align: center;">🔒 Authorization Required</h2>
                    <p style="color: #666; text-align: center; margin-bottom: 20px;">
                        Enter 6-digit PIN to access account creation
                    </p>
                    
                    <div style="margin-bottom: 20px;">
                        <input 
                            type="password" 
                            id="pinInput" 
                            maxlength="6" 
                            placeholder="Enter 6-digit PIN"
                            style="
                                width: 100%;
                                padding: 12px;
                                font-size: 18px;
                                text-align: center;
                                border: 2px solid #ddd;
                                border-radius: 5px;
                                box-sizing: border-box;
                                letter-spacing: 5px;
                            "
                        >
                    </div>
                    
                    <div id="pinError" style="
                        color: #d32f2f;
                        text-align: center;
                        margin-bottom: 15px;
                        display: none;
                        font-size: 14px;
                    "></div>
                    
                    <div style="display: flex; gap: 10px;">
                        <button id="pinSubmit" style="
                            flex: 1;
                            padding: 12px;
                            background: #4CAF50;
                            color: white;
                            border: none;
                            border-radius: 5px;
                            cursor: pointer;
                            font-size: 16px;
                            font-weight: bold;
                        ">Verify</button>
                        
                        <button id="pinCancel" style="
                            flex: 1;
                            padding: 12px;
                            background: #f44336;
                            color: white;
                            border: none;
                            border-radius: 5px;
                            cursor: pointer;
                            font-size: 16px;
                            font-weight: bold;
                        ">Cancel</button>
                    </div>
                    
                    <p style="
                        margin-top: 15px;
                        font-size: 12px;
                        color: #999;
                        text-align: center;
                    ">
                        Only HR and Managers can create accounts
                    </p>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        const modal = document.getElementById("pinModal");
        const pinInput = document.getElementById("pinInput");
        const pinSubmit = document.getElementById("pinSubmit");
        const pinCancel = document.getElementById("pinCancel");
        const pinError = document.getElementById("pinError");

        // Focus on input
        pinInput.focus();

        // Only allow numbers
        pinInput.addEventListener("input", (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
            pinError.style.display = "none";
        });

        // Submit on Enter key
        pinInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                verifyPin();
            }
        });

        // Verify PIN
        pinSubmit.addEventListener("click", verifyPin);

        function verifyPin() {
            const enteredPin = pinInput.value.trim();

            if (enteredPin.length !== 6) {
                pinError.textContent = "PIN must be exactly 6 digits";
                pinError.style.display = "block";
                pinInput.focus();
                return;
            }

            if (enteredPin === ADMIN_PIN) {
                // PIN is correct - redirect to create account
                modal.remove();
                window.location.href = "createaccount.html";
            } else {
                // PIN is incorrect
                pinError.textContent = "❌ Incorrect PIN. Access denied.";
                pinError.style.display = "block";
                pinInput.value = "";
                pinInput.focus();
            }
        }

        // Cancel button
        pinCancel.addEventListener("click", () => {
            modal.remove();
        });

        // Close on outside click
        modal.addEventListener("click", (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
});