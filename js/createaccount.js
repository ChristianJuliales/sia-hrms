// ===================================================
// CREATE ACCOUNT - SUPABASE READY
// ===================================================

const supabase = window.supabaseClient;

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

// Form Submission
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

  try {
    // 1. Create auth user in Supabase
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email,
      password: password,
      }, {
     emailRedirectTo: window.location.origin + '/index.html', // Use your desired login/redirect page
      });
    

    if (authError) throw authError;

    // 2. Get position_id from positions table based on role_name
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('role_name', role)
      .single();

    if (roleError) throw roleError;

    // 3. Find or get the position_id that matches this role
    // (Assuming you have positions already created with role_id)
    const { data: positionData, error: positionError } = await supabase
      .from('positions')
      .select('id')
      .eq('role_id', roleData.id)
      .limit(1)
      .single();

    if (positionError) throw positionError;

    // 4. Insert into employees table
    const { error: employeeError } = await supabase
      .from('employees')
      .insert({
        user_id: authData.user.id,
        employee_id: employeeId,
        first_name: firstName,
        last_name: lastName,
        email: email,
        position_id: positionData.id
      });

    if (employeeError) throw employeeError;

    showModal();
  } catch (error) {
    console.error('Error creating account:', error);
    showError(error.message);
  }
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