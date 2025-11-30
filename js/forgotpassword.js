let currentEmail = null;
let verificationCode = null;

const stepEmail = document.getElementById('stepEmail');
const stepCode = document.getElementById('stepCode');
const stepReset = document.getElementById('stepReset');

const forgotForm = document.getElementById('forgotForm');
const codeForm = document.getElementById('codeForm');
const resetForm = document.getElementById('resetForm');

const resetEmailInput = document.getElementById('resetEmail');
const verificationInput = document.getElementById('verificationCode');
const newPasswordInput = document.getElementById('newPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');

const successMessage = document.getElementById('successMessage');
const errorMessage = document.getElementById('errorMessage');
const codeError = document.getElementById('codeError');
const resetError = document.getElementById('resetError');

// Step 1: Send verification code - Ready for Supabase
forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = resetEmailInput.value.trim().toLowerCase();

    successMessage.style.display = 'none';
    errorMessage.style.display = 'none';

    // TODO: Replace with Supabase email verification
    // Example:
    // try {
    //   // Check if email exists in employees table
    //   const { data: employee, error } = await supabase
    //     .from('employees')
    //     .select('email')
    //     .eq('email', email)
    //     .single();
    //
    //   if (error || !employee) {
    //     errorMessage.textContent = '❌ Email not found!';
    //     errorMessage.style.display = 'block';
    //     return;
    //   }
    //
    //   // Send password reset email using Supabase Auth
    //   const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
    //     redirectTo: 'https://your-app-url.com/reset-password.html'
    //   });
    //
    //   if (resetError) throw resetError;
    //
    //   currentEmail = email;
    //   successMessage.textContent = '✅ Password reset email sent! Check your inbox.';
    //   successMessage.style.display = 'block';
    //
    //   // Option 1: Use Supabase's built-in email reset (recommended)
    //   // The user will receive an email with a reset link
    //   
    //   // Option 2: Use custom verification code (if you prefer)
    //   // Generate and store verification code in a separate table
    //   // verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    //   // await supabase.from('verification_codes').insert({
    //   //   email: email,
    //   //   code: verificationCode,
    //   //   expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    //   // });
    //
    //   stepEmail.style.display = 'none';
    //   stepCode.style.display = 'block';
    // } catch (error) {
    //   errorMessage.textContent = '❌ ' + error.message;
    //   errorMessage.style.display = 'block';
    // }

    errorMessage.textContent = '⚠️ Please connect to Supabase first';
    errorMessage.style.display = 'block';
});

// Step 2: Verify code - Ready for Supabase
codeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    codeError.style.display = 'none';

    const enteredCode = verificationInput.value.trim();

    // TODO: Replace with Supabase verification
    // Example:
    // try {
    //   // Verify code from database
    //   const { data: codeData, error } = await supabase
    //     .from('verification_codes')
    //     .select('*')
    //     .eq('email', currentEmail)
    //     .eq('code', enteredCode)
    //     .gt('expires_at', new Date().toISOString())
    //     .single();
    //
    //   if (error || !codeData) {
    //     codeError.textContent = '❌ Incorrect or expired verification code.';
    //     codeError.style.display = 'block';
    //     return;
    //   }
    //
    //   // Delete used code
    //   await supabase
    //     .from('verification_codes')
    //     .delete()
    //     .eq('id', codeData.id);
    //
    //   stepCode.style.display = 'none';
    //   stepReset.style.display = 'block';
    // } catch (error) {
    //   codeError.textContent = '❌ ' + error.message;
    //   codeError.style.display = 'block';
    // }

    codeError.textContent = '⚠️ Please connect to Supabase first';
    codeError.style.display = 'block';
});

// Step 3: Reset password - Ready for Supabase
resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    resetError.style.display = 'none';

    const newPass = newPasswordInput.value.trim();
    const confirmPass = confirmPasswordInput.value.trim();

    if (newPass.length < 6) {
        resetError.textContent = '❌ Password must be at least 6 characters.';
        resetError.style.display = 'block';
        return;
    }

    if (newPass !== confirmPass) {
        resetError.textContent = '❌ Passwords do not match.';
        resetError.style.display = 'block';
        return;
    }

    // TODO: Replace with Supabase password update
    // Example:
    // try {
    //   // Update password in Supabase Auth
    //   const { error } = await supabase.auth.updateUser({
    //     password: newPass
    //   });
    //
    //   if (error) throw error;
    //
    //   alert('✅ Password reset successful! Redirecting to login page.');
    //   window.location.href = 'index.html';
    // } catch (error) {
    //   resetError.textContent = '❌ ' + error.message;
    //   resetError.style.display = 'block';
    // }

    resetError.textContent = '⚠️ Please connect to Supabase first';
    resetError.style.display = 'block';
});