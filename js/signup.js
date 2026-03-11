/**
 * ==========================================
 * 보호자 회원가입 JavaScript (이메일 인증 포함)
 * ==========================================
 */

const API_BASE_URL = 'https://seniorble-silvercar.onrender.com';

let form;
let emailInput;
let emailVerifyBtn;
let verificationCodeSection;
let verificationCodeInput;
let verifyCodeBtn;
let emailVerified = false;
let verificationTimer = null;
let timerSeconds = 0;

document.addEventListener('DOMContentLoaded', function() {
    console.log('보호자 회원가입 페이지 로드 완료');
    
    form = document.getElementById('signupForm');
    emailInput = document.getElementById('email');
    emailVerifyBtn = document.getElementById('emailVerifyBtn');
    verificationCodeSection = document.getElementById('verificationCodeSection');
    verificationCodeInput = document.getElementById('verificationCode');
    verifyCodeBtn = document.getElementById('verifyCodeBtn');
    
    initEventListeners();
});

function initEventListeners() {
    form.addEventListener('submit', handleSubmit);
    
    // 이메일 인증 버튼
    emailVerifyBtn.addEventListener('click', sendVerificationCode);
    
    // 인증 코드 확인 버튼
    verifyCodeBtn.addEventListener('click', verifyEmailCode);
    
    // 비밀번호 확인
    document.getElementById('passwordConfirm').addEventListener('input', checkPasswordMatch);
    document.getElementById('password').addEventListener('input', checkPasswordMatch);
    
    // 전화번호 포맷팅
    document.getElementById('phone').addEventListener('input', formatPhoneNumber);
    
    // 이메일 변경 시 인증 상태 초기화
    emailInput.addEventListener('input', function() {
        if (emailVerified) {
            emailVerified = false;
            verificationCodeSection.classList.add('hidden');
            emailVerifyBtn.disabled = false;
            emailVerifyBtn.textContent = '인증 코드 발송';
            document.getElementById('emailVerifiedMessage').classList.add('hidden');
        }
    });
}

// ==========================================
// 이메일 인증 코드 발송
// ==========================================
async function sendVerificationCode() {
    const email = emailInput.value.trim();
    
    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showError('올바른 이메일 형식을 입력해주세요.');
        return;
    }
    
    emailVerifyBtn.disabled = true;
    emailVerifyBtn.textContent = '발송 중...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/send-verification-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            // 인증 코드 입력 영역 표시
            verificationCodeSection.classList.remove('hidden');
            verificationCodeInput.focus();
            
            // 타이머 시작 (10분)
            startTimer(data.expiresIn || 600);
            
            showSuccess('인증 코드가 발송되었습니다. 이메일을 확인해주세요.');
        } else {
            showError(data.message || '인증 코드 발송에 실패했습니다.');
            emailVerifyBtn.disabled = false;
            emailVerifyBtn.textContent = '인증 코드 발송';
        }
    } catch (error) {
        console.error('인증 코드 발송 오류:', error);
        showError('서버와 통신 중 오류가 발생했습니다.');
        emailVerifyBtn.disabled = false;
        emailVerifyBtn.textContent = '인증 코드 발송';
    }
}

// ==========================================
// 이메일 인증 코드 확인
// ==========================================
async function verifyEmailCode() {
    const email = emailInput.value.trim();
    const code = verificationCodeInput.value.trim();
    
    if (code.length !== 6) {
        showError('인증 코드는 6자리입니다.');
        return;
    }
    
    verifyCodeBtn.disabled = true;
    verifyCodeBtn.textContent = '확인 중...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/verify-email-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, code })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            emailVerified = true;
            
            // 타이머 중지
            if (verificationTimer) {
                clearInterval(verificationTimer);
            }
            
            // UI 업데이트
            verificationCodeSection.classList.add('hidden');
            document.getElementById('emailVerifiedMessage').classList.remove('hidden');
            emailInput.disabled = true;
            emailVerifyBtn.style.display = 'none';
            
            showSuccess('이메일 인증이 완료되었습니다!');
        } else {
            showError(data.message || '인증 코드가 일치하지 않습니다.');
            verifyCodeBtn.disabled = false;
            verifyCodeBtn.textContent = '확인';
        }
    } catch (error) {
        console.error('인증 코드 확인 오류:', error);
        showError('서버와 통신 중 오류가 발생했습니다.');
        verifyCodeBtn.disabled = false;
        verifyCodeBtn.textContent = '확인';
    }
}

// ==========================================
// 타이머 시작
// ==========================================
function startTimer(seconds) {
    timerSeconds = seconds;
    
    const timerDisplay = document.getElementById('timerDisplay');
    timerDisplay.classList.remove('hidden');
    
    updateTimerDisplay();
    
    verificationTimer = setInterval(() => {
        timerSeconds--;
        
        if (timerSeconds <= 0) {
            clearInterval(verificationTimer);
            timerDisplay.textContent = '인증 시간이 만료되었습니다. 다시 발송해주세요.';
            timerDisplay.style.color = 'var(--danger)';
            emailVerifyBtn.disabled = false;
            emailVerifyBtn.textContent = '재발송';
        } else {
            updateTimerDisplay();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timerSeconds / 60);
    const seconds = timerSeconds % 60;
    document.getElementById('timerDisplay').textContent = 
        `남은 시간: ${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// ==========================================
// 비밀번호 일치 확인
// ==========================================
function checkPasswordMatch() {
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('passwordConfirm').value;
    const message = document.getElementById('passwordMatchMessage');
    
    if (passwordConfirm === '') {
        message.textContent = '';
        message.className = 'input-help';
        return;
    }
    
    if (password === passwordConfirm) {
        message.textContent = '✓ 비밀번호가 일치합니다';
        message.className = 'input-help success';
    } else {
        message.textContent = '✗ 비밀번호가 일치하지 않습니다';
        message.className = 'input-help error';
    }
}

// ==========================================
// 전화번호 포맷팅
// ==========================================
function formatPhoneNumber(e) {
    let value = e.target.value.replace(/[^0-9]/g, '');
    
    if (value.length > 3 && value.length <= 7) {
        value = value.slice(0, 3) + '-' + value.slice(3);
    } else if (value.length > 7) {
        value = value.slice(0, 3) + '-' + value.slice(3, 7) + '-' + value.slice(7, 11);
    }
    
    e.target.value = value;
}

// ==========================================
// 폼 제출
// ==========================================
async function handleSubmit(e) {
    e.preventDefault();
    
    // 이메일 인증 확인
    if (!emailVerified) {
        showError('이메일 인증을 완료해주세요.');
        return;
    }
    
    const formData = {
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        password: document.getElementById('password').value,
        passwordConfirm: document.getElementById('passwordConfirm').value
    };
    
    if (!validateForm(formData)) {
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(`${API_BASE_URL}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                password: formData.password
            })
        });
        
        const data = await response.json();
        
        if (response.status === 201 && data.success) {
            alert(`회원가입이 완료되었습니다!\n\n환영합니다, ${formData.name}님!\n로그인 페이지로 이동합니다.`);
            window.location.href = 'login.html';
        } else {
            showError(data.message || '회원가입에 실패했습니다.');
        }
    } catch (error) {
        console.error('회원가입 오류:', error);
        showError('서버와 통신 중 오류가 발생했습니다.');
    } finally {
        hideLoading();
    }
}

// ==========================================
// 유효성 검증
// ==========================================
function validateForm(formData) {
    const { name, email, phone, password, passwordConfirm } = formData;
    const errors = [];
    
    if (name.trim().length < 2) errors.push('이름은 2자 이상 입력해주세요.');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) errors.push('올바른 이메일 형식을 입력해주세요.');
    if (!/^010-\d{4}-\d{4}$/.test(phone)) errors.push('전화번호 형식이 올바르지 않습니다.');
    
    const pwErrors = getPasswordPolicyErrors(password);
    if (pwErrors.length) errors.push(...pwErrors);
    else if (password !== passwordConfirm) errors.push('비밀번호가 일치하지 않습니다.');
    
    const terms1 = document.getElementById('terms1').checked;
    const terms2 = document.getElementById('terms2').checked;
    if (!terms1 || !terms2) errors.push('필수 약관에 모두 동의해주세요.');
    
    if (errors.length) {
        showError(errors);
        return false;
    }
    return true;
}

function getPasswordPolicyErrors(password) {
    const err = [];
    if (password.length < 12) err.push('비밀번호는 12자 이상이어야 합니다.');
    else if (password.length > 72) err.push('비밀번호는 72자 이하여야 합니다.');
    if (!/[a-z]/.test(password)) err.push('소문자를 1개 이상 포함해주세요.');
    if (!/[A-Z]/.test(password)) err.push('대문자를 1개 이상 포함해주세요.');
    if (!/\d/.test(password)) err.push('숫자를 1개 이상 포함해주세요.');
    if (!/[^A-Za-z0-9]/.test(password)) err.push('특수문자를 1개 이상 포함해주세요.');
    return err;
}

// ==========================================
// UI 헬퍼 함수
// ==========================================
function showError(message) {
    const text = Array.isArray(message) ? message.join('\n') : String(message);
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = text;
    errorMessage.classList.remove('hidden');
    errorMessage.style.whiteSpace = 'pre-line';
    errorMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => errorMessage.classList.add('hidden'), 8000);
}

function showSuccess(message) {
    const successMessage = document.getElementById('successMessage');
    if (successMessage) {
        successMessage.textContent = message;
        successMessage.classList.remove('hidden');
        setTimeout(() => successMessage.classList.add('hidden'), 5000);
    }
}

function showLoading() {
    document.getElementById('loadingOverlay').classList.remove('hidden');
    document.getElementById('submitBtn').disabled = true;
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.add('hidden');
    document.getElementById('submitBtn').disabled = false;
}