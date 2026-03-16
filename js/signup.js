/**
 * ==========================================
 * 보호자 회원가입 JavaScript
 * ==========================================
 */

const API_BASE_URL = 'https://seniorble-silvercar.onrender.com';

let form;

document.addEventListener('DOMContentLoaded', function() {
    console.log('보호자 회원가입 페이지 로드 완료');

    form = document.getElementById('signupForm');
    initEventListeners();
});

function initEventListeners() {
    form.addEventListener('submit', handleSubmit);

    document.getElementById('passwordConfirm').addEventListener('input', checkPasswordMatch);
    document.getElementById('password').addEventListener('input', checkPasswordMatch);
    document.getElementById('phone').addEventListener('input', formatPhoneNumber);
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

function showLoading() {
    document.getElementById('loadingOverlay').classList.remove('hidden');
    document.getElementById('submitBtn').disabled = true;
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.add('hidden');
    document.getElementById('submitBtn').disabled = false;
}
