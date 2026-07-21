// DOM Elements
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const togglePassword = document.getElementById('togglePassword');

// Password visibility toggle
let passwordVisible = false;
togglePassword.addEventListener('click', () => {
    passwordVisible = !passwordVisible;
    passwordInput.type = passwordVisible ? 'text' : 'password';
    togglePassword.textContent = passwordVisible ? '🙈' : '👁️';
});

// Show error message
function showError(message) {
    errorText.textContent = message;
    errorMessage.classList.add('show');
    setTimeout(() => {
        errorMessage.classList.remove('show');
    }, 5000);
}

// Sign Up Button Click - Goes to signup page
signupBtn.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = '/signup';
});

// Login form submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
        showError('Please enter both email and password');
        return;
    }

    if (!email.includes('@') || !email.includes('.')) {
        showError('Please enter a valid email address');
        return;
    }

    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="spinner"></span> Logging in...';

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            loginBtn.classList.add('success');
            loginBtn.innerHTML = '✅ Logged in successfully!';
            
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 500);
        } else {
            showError(data.message || 'Login failed. Please try again.');
            loginBtn.disabled = false;
            loginBtn.innerHTML = 'Log In →';
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Network error. Please check your connection.');
        loginBtn.disabled = false;
        loginBtn.innerHTML = 'Log In →';
    }
});

// Forgot Password - Redirect to forgot password page
document.getElementById('forgotPassword').addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = '/forgot-password';
});

// Help link
document.getElementById('helpLink').addEventListener('click', (e) => {
    e.preventDefault();
    showError('For technical support, please contact IT support team.');
});

// Enter key support
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !loginBtn.disabled) {
        loginForm.dispatchEvent(new Event('submit'));
    }
});

// Focus on email input on load
window.addEventListener('load', () => {
    emailInput.focus();
});