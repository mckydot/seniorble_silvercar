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

// API 서버 주소 (실제 배포 시 환경에 맞게 변경)
const API_BASE_URL = 'http://localhost:8000'; // 또는 'https://your-api-server.com'

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
// 에러 메시지 표시
// ==========================================
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
    
    // 3초 후 자동으로 사라지게
    setTimeout(() => {
        errorMessage.classList.add('hidden');
    }, 5000);
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

// ==========================================
// 입력값 유효성 검증
// ==========================================
function validateForm(formData) {
    const { name, email, phone, password, passwordConfirm } = formData;
    
    // 이름 검증
    if (name.trim().length < 2) {
        showError('이름은 2자 이상 입력해주세요.');
        return false;
    }
    
    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showError('올바른 이메일 형식을 입력해주세요.');
        return false;
    }
    
    // 전화번호 검증 (010-XXXX-XXXX 형식)
    const phoneRegex = /^010-\d{4}-\d{4}$/;
    if (!phoneRegex.test(phone)) {
        showError('올바른 전화번호 형식을 입력해주세요. (010-XXXX-XXXX)');
        return false;
    }
    
    // 비밀번호 길이 검증
    if (password.length < 8) {
        showError('비밀번호는 8자 이상이어야 합니다.');
        return false;
    }
    
    // 비밀번호 일치 확인
    if (password !== passwordConfirm) {
        showError('비밀번호가 일치하지 않습니다.');
        return false;
    }
    
    // 약관 동의 확인
    const terms1 = document.getElementById('terms1').checked;
    const terms2 = document.getElementById('terms2').checked;
    
    if (!terms1 || !terms2) {
        showError('필수 약관에 모두 동의해주세요.');
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
        // FastAPI 서버로 회원가입 요청
        console.log('서버로 회원가입 요청 전송...');
        
        const response = await fetch(`${API_BASE_URL}/users/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                password: formData.password
                // passwordConfirm은 서버로 보내지 않음 (클라이언트에서만 검증)
            })
        });
        
        console.log('서버 응답 상태:', response.status);
        
        // 응답 데이터 파싱
        const data = await response.json();
        console.log('서버 응답 데이터:', data);
        
        // 성공 응답 처리 (HTTP 201 Created)
        if (response.ok) {
            console.log('회원가입 성공!');
            
            // 성공 알림
            alert('회원가입이 완료되었습니다!\n로그인 페이지로 이동합니다.');
            
            // 로그인 페이지로 이동
            window.location.href = 'login.html';
            
        } else {
            // 에러 응답 처리
            console.error('회원가입 실패:', data);
            
            // 서버에서 보낸 에러 메시지 표시
            if (data.detail) {
                showError(data.detail);
            } else if (data.message) {
                showError(data.message);
            } else {
                showError('회원가입에 실패했습니다. 다시 시도해주세요.');
            }
        }
        
    } catch (error) {
        // 네트워크 에러 또는 기타 예외 처리
        console.error('회원가입 요청 중 에러 발생:', error);
        showError('서버와 통신 중 오류가 발생했습니다. 네트워크 연결을 확인해주세요.');
        
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
 * FastAPI 백엔드에서 받을 것으로 예상되는 요청 형식:
 * 
 * POST /users/register
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
 *   "id": 1,
 *   "name": "홍길동",
 *   "email": "hong@example.com",
 *   "phone": "010-1234-5678",
 *   "created_at": "2024-01-01T00:00:00"
 * }
 * 
 * 실패 응답 (400 Bad Request):
 * {
 *   "detail": "이미 등록된 이메일입니다."
 * }
 */