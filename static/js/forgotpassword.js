// DOM Elements
const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');
const phoneInput = document.getElementById('phone');
const sendCodeBtn = document.getElementById('sendCodeBtn');
const resetBtn = document.getElementById('resetBtn');
const newPasswordInput = document.getElementById('newPassword');
const backBtn = document.getElementById('backBtn');
const resendCode = document.getElementById('resendCode');
const timerSpan = document.getElementById('timer');
const message = document.getElementById('message');
const messageText = document.getElementById('messageText');
const messageIcon = document.getElementById('messageIcon');

// Code inputs
const codeInputs = document.querySelectorAll('.code-input');
let verificationCode = '';
let timerInterval = null;
let timerSeconds = 30;
let phoneNumber = '';

// Auto-focus next code input
codeInputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
        if (e.target.value.length === 1 && index < 3) {
            codeInputs[index + 1].focus();
        }
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && index > 0 && e.target.value === '') {
            codeInputs[index - 1].focus();
        }
    });
});

// Show message
function showMessage(text, type) {
    message.className = 'message show ' + type;
    messageText.textContent = text;
    messageIcon.textContent = type === 'error' ? '⚠️' : '✅';
    setTimeout(() => {
        message.classList.remove('show');
    }, 5000);
}

// Send verification code
sendCodeBtn.addEventListener('click', async () => {
    const phone = phoneInput.value.trim();

    if (!phone) {
        showMessage('Please enter your phone number', 'error');
        return;
    }

    if (phone.length < 10) {
        showMessage('Please enter a valid phone number', 'error');
        return;
    }

    sendCodeBtn.disabled = true;
    sendCodeBtn.innerHTML = '<span class="spinner"></span> Sending...';

    try {
        const response = await fetch('/api/forgot-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phone })
        });

        const data = await response.json();

        if (data.success) {
            phoneNumber = phone;
            verificationCode = data.code;
            showMessage('📱 Verification code sent to your phone!', 'success');
            
            // Show step 2
            step1.style.display = 'none';
            step2.classList.add('show');
            codeInputs[0].focus();
            startTimer();
        } else {
            showMessage(data.message || 'Phone number not found', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
    } finally {
        sendCodeBtn.disabled = false;
        sendCodeBtn.innerHTML = 'Send Verification Code →';
    }
});

// Reset password
resetBtn.addEventListener('click', async () => {
    const code = Array.from(codeInputs).map(input => input.value).join('');
    const newPassword = newPasswordInput.value.trim();

    if (code.length !== 4) {
        showMessage('Please enter the 4-digit verification code', 'error');
        return;
    }

    if (!newPassword || newPassword.length < 4) {
        showMessage('Password must be at least 4 characters', 'error');
        return;
    }

    resetBtn.disabled = true;
    resetBtn.innerHTML = '<span class="spinner"></span> Resetting...';

    try {
        const response = await fetch('/api/reset-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                phone: phoneNumber,
                code: code,
                new_password: newPassword
            })
        });

        const data = await response.json();

        if (data.success) {
            showMessage('✅ Password reset successfully! Redirecting to login...', 'success');
            resetBtn.classList.add('btn-success');
            resetBtn.innerHTML = '✅ Password Reset!';
            
            setTimeout(() => {
                window.location.href = '/login';
            }, 2000);
        } else {
            showMessage(data.message || 'Invalid code. Please try again.', 'error');
            codeInputs.forEach(input => input.value = '');
            codeInputs[0].focus();
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
    } finally {
        resetBtn.disabled = false;
        resetBtn.innerHTML = 'Reset Password →';
    }
});

// Back button
backBtn.addEventListener('click', () => {
    step2.classList.remove('show');
    step1.style.display = 'block';
    codeInputs.forEach(input => input.value = '');
    newPasswordInput.value = '';
    clearInterval(timerInterval);
    message.classList.remove('show');
});

// Resend code
resendCode.addEventListener('click', () => {
    if (timerSeconds === 0) {
        sendCodeBtn.click();
    }
});

// Timer
function startTimer() {
    timerSeconds = 30;
    timerSpan.textContent = timerSeconds;
    clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        timerSeconds--;
        timerSpan.textContent = timerSeconds;
        if (timerSeconds <= 0) {
            clearInterval(timerInterval);
            timerSpan.textContent = '0';
            resendCode.style.color = '#667eea';
            resendCode.innerHTML = 'Resend Code';
        }
    }, 1000);
}

// Enter key support
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        if (step2.classList.contains('show')) {
            resetBtn.click();
        } else {
            sendCodeBtn.click();
        }
    }
});

// Focus on phone input on load
window.addEventListener('load', () => {
    phoneInput.focus();
});