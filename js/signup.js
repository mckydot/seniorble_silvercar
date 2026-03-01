/**
 * ==========================================
 * 보호자 회원가입 JavaScript
 * ==========================================
 * 
 * 주요 기능:
 * 1. 입력값 실시간 검증 (비밀번호 일치 확인)
 * 2. 전화번호 자동 포맷팅
 * 3. 폼 제출 시 유효성 검사
 * 4. FastAPI 서버로 회원가입 요청 전송
 * 5. 성공 시 로그인 페이지로 이동
 */

// ==========================================
// 전역 변수 및 설정
// ==========================================

// API 서버 주소 (Render 배포)
const API_BASE_URL = 'https://seniorble-silvercar.onrender.com';

// DOM 요소 참조
let form;
let passwordInput;
let passwordConfirmInput;
let passwordMatchMessage;
let phoneInput;
let errorMessage;
let loadingOverlay;
let submitBtn;

// ==========================================
// 페이지 로드 시 초기화
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('보호자 회원가입 페이지 로드 완료');
    
    // DOM 요소 가져오기
    form = document.getElementById('signupForm');
    passwordInput = document.getElementById('password');
    passwordConfirmInput = document.getElementById('passwordConfirm');
    passwordMatchMessage = document.getElementById('passwordMatchMessage');
    phoneInput = document.getElementById('phone');
    errorMessage = document.getElementById('errorMessage');
    loadingOverlay = document.getElementById('loadingOverlay');
    submitBtn = document.getElementById('submitBtn');
    
    // 이벤트 리스너 등록
    initEventListeners();
});

// ==========================================
// 이벤트 리스너 초기화
// ==========================================
function initEventListeners() {
    // 폼 제출 이벤트
    form.addEventListener('submit', handleSubmit);
    
    // 비밀번호 확인 실시간 검증
    passwordConfirmInput.addEventListener('input', checkPasswordMatch);
    passwordInput.addEventListener('input', checkPasswordMatch);
    
    // 전화번호 자동 포맷팅
    phoneInput.addEventListener('input', formatPhoneNumber);
}

// ==========================================
// 비밀번호 일치 여부 확인
// ==========================================
function checkPasswordMatch() {
    const password = passwordInput.value;
    const passwordConfirm = passwordConfirmInput.value;
    
    // 비밀번호 확인 필드가 비어있으면 메시지 표시 안함
    if (passwordConfirm === '') {
        passwordMatchMessage.textContent = '';
        passwordMatchMessage.className = 'input-help';
        return;
    }
    
    // 비밀번호 일치 여부 확인
    if (password === passwordConfirm) {
        passwordMatchMessage.textContent = '✓ 비밀번호가 일치합니다';
        passwordMatchMessage.className = 'input-help success';
    } else {
        passwordMatchMessage.textContent = '✗ 비밀번호가 일치하지 않습니다';
        passwordMatchMessage.className = 'input-help error';
    }
}

// ==========================================
// 전화번호 자동 포맷팅 (010-1234-5678)
// ==========================================
function formatPhoneNumber(e) {
    // 숫자만 추출
    let value = e.target.value.replace(/[^0-9]/g, '');
    
    // 하이픈 자동 추가
    if (value.length > 3 && value.length <= 7) {
        value = value.slice(0, 3) + '-' + value.slice(3);
    } else if (value.length > 7) {
        value = value.slice(0, 3) + '-' + value.slice(3, 7) + '-' + value.slice(7, 11);
    }
    
    e.target.value = value;
}

// ==========================================
// 에러 메시지 표시 (문자열 또는 배열 가능)
// ==========================================
function showError(message) {
    const text = Array.isArray(message) ? message.join('\n') : String(message);
    errorMessage.textContent = text;
    errorMessage.classList.remove('hidden');
    errorMessage.style.whiteSpace = 'pre-line';
    errorMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => errorMessage.classList.add('hidden'), 8000);
}

// ==========================================
// 로딩 오버레이 표시/숨김
// ==========================================
function showLoading() {
    loadingOverlay.classList.remove('hidden');
    submitBtn.disabled = true;
}

function hideLoading() {
    loadingOverlay.classList.add('hidden');
    submitBtn.disabled = false;
}

// 서버와 동일한 비밀번호 정책 (12~72자, 대/소/숫/특수 각 1개 이상)
function passwordMeetsPolicy(password) {
    if (typeof password !== 'string') return false;
    if (password.length < 12 || password.length > 72) return false;
    return /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
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
// 입력값 유효성 검증
// ==========================================
function validateForm(formData) {
    const { name, email, phone, password, passwordConfirm } = formData;
    const errors = [];
    
    if (name.trim().length < 2) errors.push('이름은 2자 이상 입력해주세요.');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) errors.push('올바른 이메일 형식을 입력해주세요.');
    if (!/^010-\d{4}-\d{4}$/.test(phone)) errors.push('전화번호 형식이 올바르지 않습니다. (010-XXXX-XXXX)');
    
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

// ==========================================
// 폼 제출 처리
// ==========================================
async function handleSubmit(e) {
    // 기본 폼 제출 동작 방지 (페이지 새로고침 방지)
    e.preventDefault();
    
    console.log('회원가입 폼 제출 시작');
    
    // 폼 데이터 수집
    const formData = {
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        password: document.getElementById('password').value,
        passwordConfirm: document.getElementById('passwordConfirm').value
    };
    
    console.log('수집된 폼 데이터:', { ...formData, password: '***', passwordConfirm: '***' });
    
    // 입력값 검증
    if (!validateForm(formData)) {
        console.log('유효성 검증 실패');
        return;
    }
    
    // 로딩 표시
    showLoading();
    
    try {
        // Node.js 백엔드 서버로 회원가입 요청
        console.log('서버로 회원가입 요청 전송...');
        
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
        
        const data = await response.json().catch(() => ({ success: false, message: '응답을 읽을 수 없습니다.' }));
        console.log('서버 응답 상태:', response.status, data);
        
        if (response.status === 201 && data.success) {
            alert(`회원가입이 완료되었습니다!\n\n환영합니다, ${formData.name}님!\n로그인 페이지로 이동합니다.`);
            window.location.href = 'login.html';
            return;
        }
        
        if (response.status === 409) {
            showError(data.message || '이미 가입된 이메일입니다.');
            return;
        }
        
        if (response.status === 400) {
            if (data.errors && data.errors.length > 0) {
                showError(data.errors);
            } else {
                showError(data.message || '입력값이 올바르지 않습니다.');
            }
            return;
        }
        
        if (response.status >= 500) {
            showError(data.message || '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
            return;
        }
        
        showError(data.message || '회원가입에 실패했습니다. 다시 시도해주세요.');
        
    } catch (error) {
        // 네트워크 에러 또는 기타 예외 처리
        console.error('회원가입 요청 중 에러 발생:', error);
        showError('서버와 통신 중 오류가 발생했습니다.\n잠시 후 다시 시도해주세요.');
        
    } finally {
        // 로딩 숨김
        hideLoading();
    }
}

// ==========================================
// 유틸리티 함수들
// ==========================================

/**
 * 모바일에서 viewport height 조정
 * (모바일 브라우저 주소창 표시/숨김 시 레이아웃 깨짐 방지)
 */
function setVH() {
    let vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}

// 초기 실행 및 리사이즈 이벤트 등록
setVH();
window.addEventListener('resize', setVH);

// ==========================================
// 개발 참고사항
// ==========================================
/**
 * Node.js 백엔드에서 받을 것으로 예상되는 요청/응답 형식:
 * 
 * POST /signup
 * Content-Type: application/json
 * 
 * Request Body:
 * {
 *   "name": "홍길동",
 *   "email": "hong@example.com",
 *   "phone": "010-1234-5678",
 *   "password": "securepassword123"
 * }
 * 
 * 성공 응답 (201 Created):
 * {
 *   "success": true,
 *   "message": "회원가입이 완료되었습니다.",
 *   "user": {
 *     "id": "uuid-string",
 *     "name": "홍길동",
 *     "email": "hong@example.com",
 *     "phone": "010-1234-5678",
 *     "created_at": "2024-01-01T00:00:00Z"
 *   }
 * }
 * 
 * 이메일 중복 (409 Conflict):
 * {
 *   "success": false,
 *   "message": "이미 가입된 이메일입니다."
 * }
 * 
 * 입력값 오류 (400 Bad Request):
 * {
 *   "success": false,
 *   "message": "입력값이 올바르지 않습니다.",
 *   "errors": ["비밀번호는 8자 이상이어야 합니다."]
 * }
 */