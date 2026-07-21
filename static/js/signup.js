// DOM Elements
const signupForm = document.getElementById('signupForm');
const fullNameInput = document.getElementById('fullName');
const emailInput = document.getElementById('email');
const usernameInput = document.getElementById('username');
const phoneInput = document.getElementById('phone');
const roleInput = document.getElementById('role');
const signupBtn = document.getElementById('signupBtn');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const successMessage = document.getElementById('successMessage');
const successText = document.getElementById('successText');

// Show error message
function showError(message) {
    successMessage.classList.remove('show');
    errorText.textContent = message;
    errorMessage.classList.add('show');
    setTimeout(() => {
        errorMessage.classList.remove('show');
    }, 5000);
}

// Show success message
function showSuccess(message) {
    errorMessage.classList.remove('show');
    successText.textContent = message;
    successMessage.classList.add('show');
    setTimeout(() => {
        successMessage.classList.remove('show');
    }, 5000);
}

// Signup form submission
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const fullName = fullNameInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();
    const username = usernameInput.value.trim();
    const phone = phoneInput.value.trim();
    const role = roleInput.value;

    // Validation
    if (!fullName || !email || !username || !role || !phone) {
        showError('Please fill in all fields');
        return;
    }

    if (!email.includes('@') || !email.includes('.')) {
        showError('Please enter a valid email address');
        return;
    }

    if (username.length < 3) {
        showError('Username must be at least 3 characters');
        return;
    }

    if (phone.length < 10) {
        showError('Please enter a valid phone number');
        return;
    }

    // Disable button and show loading
    signupBtn.disabled = true;
    signupBtn.innerHTML = '<span class="spinner"></span> Submitting request...';

    try {
        const response = await fetch('/api/signup-request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                full_name: fullName,
                email: email,
                username: username,
                role: role,
                phone: phone
            })
        });

        const data = await response.json();

        if (data.success) {
            signupBtn.classList.add('success');
            signupBtn.innerHTML = '✅ Request submitted!';
            showSuccess('Your request has been submitted. Admin will review and approve your account.');
            
            // Clear form
            signupForm.reset();
            
            setTimeout(() => {
                signupBtn.classList.remove('success');
                signupBtn.innerHTML = 'Request Access →';
                signupBtn.disabled = false;
            }, 5000);
        } else {
            showError(data.message || 'Signup failed. Please try again.');
            signupBtn.disabled = false;
            signupBtn.innerHTML = 'Request Access →';
        }
    } catch (error) {
        console.error('Signup error:', error);
        showError('Network error. Please check your connection.');
        signupBtn.disabled = false;
        signupBtn.innerHTML = 'Request Access →';
    }
});

// Login link
document.getElementById('loginLink').addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = '/login';
});

// Enter key support
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !signupBtn.disabled) {
        signupForm.dispatchEvent(new Event('submit'));
    }
});

// Focus on first input on load
window.addEventListener('load', () => {
    fullNameInput.focus();
});