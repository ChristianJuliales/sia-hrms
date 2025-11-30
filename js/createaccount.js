// DOM Elements
const form = document.getElementById('createAccountForm');
const firstNameInput = document.getElementById('firstName');
const lastNameInput = document.getElementById('lastName');
const employeeIdInput = document.getElementById('employeeId');
const emailInput = document.getElementById('email');
const roleSelect = document.getElementById('role');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const successMessage = document.getElementById('successMessage');
const errorMessage = document.getElementById('errorMessage');
const successModal = document.getElementById('successModal');

// Password Toggle Function
document.querySelectorAll('.toggle-password').forEach(icon => {
  icon.addEventListener('click', function() {
    const targetId = this.getAttribute('data-target');
    const input = document.getElementById(targetId);
    
    if (input.type === "password") {
      input.type = "text";
      this.src = "../images/view.png";
    } else {
      input.type = "password";
      this.src = "../images/hide.png";
    }
  });
});

// Form Submission - Ready for Supabase
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  successMessage.style.display = "none";
  errorMessage.style.display = "none";

  const firstName = firstNameInput.value.trim();
  const lastName = lastNameInput.value.trim();
  const employeeId = employeeIdInput.value.trim();
  const email = emailInput.value.trim();
  const role = roleSelect.value;
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  // Validation
  if (!firstName || !lastName || !employeeId || !email || !password || !confirmPassword || !role) {
    return showError("Please fill out all fields.");
  }

  if (password.length < 6) {
    return showError("Password must be at least 6 characters.");
  }
  
  if (password !== confirmPassword) {
    return showError("Passwords do not match.");
  }

  // TODO: Replace with Supabase user creation
  // Example:
  // try {
  //   // 1. Create auth user
  //   const { data: authData, error: authError } = await supabase.auth.signUp({
  //     email: email,
  //     password: password,
  //   });
  //
  //   if (authError) throw authError;
  //
  //   // 2. Get role_id from roles table
  //   const { data: roleData } = await supabase
  //     .from('roles')
  //     .select('id')
  //     .eq('role_name', role)
  //     .single();
  //
  //   // 3. Insert into employees table
  //   const { error: employeeError } = await supabase
  //     .from('employees')
  //     .insert({
  //       id: authData.user.id,
  //       employee_id: employeeId,
  //       first_name: firstName,
  //       last_name: lastName,
  //       email: email,
  //       created_at: new Date().toISOString()
  //     });
  //
  //   if (employeeError) throw employeeError;
  //
  //   // 4. Assign role in positions table
  //   await supabase
  //     .from('positions')
  //     .insert({
  //       employee_id: authData.user.id,
  //       role_id: roleData.id
  //     });
  //
  //   showModal();
  // } catch (error) {
  //   showError(error.message);
  // }

  showError("⚠️ Please connect to Supabase first");
});

// Error display
function showError(message) {
  errorMessage.textContent = "❌ " + message;
  errorMessage.style.display = "block";
  successMessage.style.display = "none";
}

// Success display
function showSuccess(message) {
  successMessage.textContent = "✅ " + message;
  successMessage.style.display = "block";
  errorMessage.style.display = "none";
}

// Show Success Modal
function showModal() {
  const modalMessage = document.getElementById('modalMessage');
  successModal.style.display = "flex";
  modalMessage.textContent = 'Account created successfully! Redirecting...';

  setTimeout(() => {
    successModal.classList.add('fade-out');
    setTimeout(() => {
      window.location.href = "index.html";
    }, 300);
  }, 2000);
}

// Hide error on input
document.querySelectorAll("input, select").forEach(input => {
  input.addEventListener("input", () => {
    errorMessage.style.display = "none";
  });
});