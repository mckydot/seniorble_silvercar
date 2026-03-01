/**
 * ==========================================
 * 로그인 JavaScript
 * ==========================================
 * 
 * 주요 기능:
 * 1. 입력값 유효성 검사
 * 2. Node.js 백엔드로 로그인 요청
 * 3. 로그인 성공 시 사용자 정보 저장 (localStorage)
 * 4. 메인 페이지로 이동
 */

// ==========================================
// 전역 변수 및 설정
// ==========================================

// API 서버 주소 (Render 배포)
const API_BASE_URL = 'https://seniorble-silvercar.onrender.com';

// 로컬 스토리지 키
const USER_KEY = 'seniorble_user';
const TOKEN_KEY = 'seniorble_token';

// DOM 요소 참조
let form;
let emailInput;
let passwordInput;
let rememberMeCheckbox;

// ==========================================
// 페이지 로드 시 초기화
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('로그인 페이지 로드 완료');
    
    // 이미 로그인되어 있는지 확인
    checkExistingLogin();
    
    // DOM 요소 가져오기
    form = document.querySelector('form');
    emailInput = document.getElementById('email');
    passwordInput = document.getElementById('password');
    rememberMeCheckbox = document.querySelector('.remember-me input[type="checkbox"]');
    
    // 이벤트 리스너 등록
    initEventListeners();
    
    // 저장된 이메일 불러오기
    loadSavedEmail();
});

// ==========================================
// 이미 로그인되어 있는지 확인
// ==========================================
function checkExistingLogin() {
    const user = localStorage.getItem(USER_KEY);
    
    if (user) {
        console.log('이미 로그인되어 있습니다.');
        // 메인 페이지로 리다이렉트
        // window.location.href = 'index.html';
    }
}

// ==========================================
// 저장된 이메일 불러오기
// ==========================================
function loadSavedEmail() {
    const savedEmail = localStorage.getItem('saved_email');
    
    if (savedEmail) {
        emailInput.value = savedEmail;
        rememberMeCheckbox.checked = true;
    }
}

// ==========================================
// 이벤트 리스너 초기화
// ==========================================
function initEventListeners() {
    // 폼 제출 이벤트
    form.addEventListener('submit', handleSubmit);
    
    // 입력 필드 포커스 효과
    const inputs = document.querySelectorAll('input[type="email"], input[type="password"]');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.parentElement.style.transform = 'translateX(2px)';
        });
        input.addEventListener('blur', function() {
            this.parentElement.parentElement.style.transform = 'translateX(0)';
        });
    });
}

// ==========================================
// 입력값 유효성 검증
// ==========================================
function validateForm(formData) {
    const { email, password } = formData;
    
    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showError('올바른 이메일 형식을 입력해주세요.');
        return false;
    }
    
    // 비밀번호 검증
    if (password.length === 0) {
        showError('비밀번호를 입력해주세요.');
        return false;
    }
    
    return true;
}

// ==========================================
// 에러 메시지 표시
// ==========================================
function showError(message) {
    // 기존 에러 메시지 제거
    const existingError = document.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // 새 에러 메시지 생성
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
        padding: 12px 16px;
        background: rgba(230, 57, 70, 0.1);
        border: 2px solid #E63946;
        border-radius: 10px;
        color: #E63946;
        font-size: 13px;
        font-weight: 500;
        margin-bottom: 20px;
        animation: shake 0.5s ease-in-out;
    `;
    
    // 로그인 버튼 앞에 삽입
    const loginButton = document.querySelector('.login-button');
    loginButton.parentNode.insertBefore(errorDiv, loginButton);
    
    // 3초 후 자동으로 사라지게
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// ==========================================
// 로딩 상태 표시
// ==========================================
function setLoading(isLoading) {
    const loginButton = document.querySelector('.login-button');
    
    if (isLoading) {
        loginButton.disabled = true;
        loginButton.textContent = '로그인 중...';
        loginButton.style.opacity = '0.7';
    } else {
        loginButton.disabled = false;
        loginButton.textContent = '로그인';
        loginButton.style.opacity = '1';
    }
}

// ==========================================
// 폼 제출 처리
// ==========================================
async function handleSubmit(e) {
    // 기본 폼 제출 동작 방지
    e.preventDefault();
    
    console.log('로그인 폼 제출 시작');
    
    // 폼 데이터 수집
    const formData = {
        email: emailInput.value.trim(),
        password: passwordInput.value
    };
    
    console.log('수집된 폼 데이터:', { ...formData, password: '***' });
    
    // 입력값 검증
    if (!validateForm(formData)) {
        console.log('유효성 검증 실패');
        return;
    }
    
    // 로딩 상태 시작
    setLoading(true);
    
    try {
        // Node.js 백엔드 서버로 로그인 요청
        console.log('서버로 로그인 요청 전송...');
        
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include', // refresh cookie 수신
            body: JSON.stringify({
                email: formData.email,
                password: formData.password
            })
        });
        
        console.log('서버 응답 상태:', response.status);
        
        // 응답 데이터 파싱
        const data = await response.json();
        console.log('서버 응답 데이터:', data);
        
        // 성공 응답 처리 (HTTP 200 OK)
        if (response.status === 200 && data.success) {
            console.log('✅ 로그인 성공!');
            
            // 사용자 정보 저장
            localStorage.setItem(USER_KEY, JSON.stringify(data.user));
            
            // 서버에서 발급한 Access Token 저장 (Refresh Token은 httpOnly cookie)
            if (data.accessToken) {
                // XSS 노출 면에서 localStorage보다 sessionStorage 권장
                sessionStorage.setItem(TOKEN_KEY, data.accessToken);
            }
            
            // 이메일 저장 (로그인 상태 유지 체크 시)
            if (rememberMeCheckbox.checked) {
                localStorage.setItem('saved_email', formData.email);
            } else {
                localStorage.removeItem('saved_email');
            }
            
            console.log('사용자 정보 저장 완료');
            
            // 성공 알림
            alert(`환영합니다, ${data.user.name}님!\n메인 페이지로 이동합니다.`);
            
            // 메인 페이지로 이동
            window.location.href = 'index.html';
            
        } else if (response.status === 401) {
            // 인증 실패 (401 Unauthorized)
            console.warn('❌ 로그인 실패:', data.message);
            showError(data.message || '이메일 또는 비밀번호가 올바르지 않습니다.');
            
        } else if (response.status === 400) {
            // 잘못된 요청 (400 Bad Request)
            console.error('입력값 오류:', data);
            if (data.errors && data.errors.length > 0) {
                showError(data.errors.join('\n'));
            } else {
                showError(data.message || '입력값이 올바르지 않습니다.');
            }
            
        } else {
            // 기타 에러
            console.error('로그인 실패:', data);
            showError(data.message || '로그인에 실패했습니다. 다시 시도해주세요.');
        }
        
    } catch (error) {
        // 네트워크 에러 또는 기타 예외 처리
        console.error('로그인 요청 중 에러 발생:', error);
        showError('서버와 통신 중 오류가 발생했습니다.\n잠시 후 다시 시도해주세요.');
        
    } finally {
        // 로딩 상태 종료
        setLoading(false);
    }
}

// ==========================================
// 유틸리티 함수들
// ==========================================

/**
 * 모바일에서 viewport height 조정
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
 * Node.js 백엔드 API 명세:
 * 
 * POST /login
 * Content-Type: application/json
 * 
 * Request Body:
 * {
 *   "email": "test@test.com",
 *   "password": "12345678"
 * }
 * 
 * 성공 응답 (200 OK):
 * {
 *   "success": true,
 *   "message": "로그인에 성공했습니다.",
 *   "user": {
 *     "id": "uuid",
 *     "email": "test@test.com",
 *     "name": "홍길동",
 *     "phone": "010-1234-5678",
 *     "created_at": "2024-01-01T00:00:00Z"
 *   }
 * }
 * 
 * 인증 실패 (401 Unauthorized):
 * {
 *   "success": false,
 *   "message": "이메일 또는 비밀번호가 올바르지 않습니다."
 * }
 */