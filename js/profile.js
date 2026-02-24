/**
 * ==========================================
 * 프로필 페이지 JavaScript
 * ==========================================
 * 
 * 주요 기능:
 * 1. 로그인된 보호자 정보 불러오기
 * 2. 등록된 환자 목록 불러오기
 * 3. 로그아웃 기능
 * 4. 네비게이션
 */

// ==========================================
// 전역 변수 및 설정
// ==========================================

// API 서버 주소
const API_BASE_URL = 'http://localhost:8000';

// 로컬 스토리지 키
const USER_KEY = 'seniorble_user';
const TOKEN_KEY = 'seniorble_token';

// 현재 로그인한 사용자 정보
let currentUser = null;

/**
 * Refresh 토큰으로 새 Access 토큰 발급 (httpOnly 쿠키 사용)
 * @returns {Promise<string|null>} 새 accessToken 또는 null
 */
async function tryRefreshToken() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        if (response.ok && data.accessToken) {
            sessionStorage.setItem(TOKEN_KEY, data.accessToken);
            return data.accessToken;
        }
    } catch (e) {
        console.warn('토큰 갱신 실패:', e);
    }
    return null;
}

/**
 * 사용할 Access 토큰 반환 (sessionStorage 또는 refresh로 발급)
 */
async function getAccessToken() {
    let token = sessionStorage.getItem(TOKEN_KEY);
    if (token) return token;
    token = await tryRefreshToken();
    return token;
}

/** API 관계 코드 → 한글 (공통 모듈 사용) */
function relationshipToKorean(code) {
    return (window.SeniorbleCommon && window.SeniorbleCommon.relationshipToKorean)
        ? window.SeniorbleCommon.relationshipToKorean(code) : (code || '—');
}

// ==========================================
// 페이지 로드 시 초기화
// ==========================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('프로필 페이지 로드 완료');
    
    const ok = await checkAuthentication();
    if (!ok) return;
    
    loadGuardianProfile();
    loadPatientsList();
});

// ==========================================
// 로그인 확인 (토큰 없으면 refresh 시도 후 판단)
// ==========================================
async function checkAuthentication() {
    const userString = localStorage.getItem(USER_KEY);
    let token = sessionStorage.getItem(TOKEN_KEY);
    if (!token && userString) {
        token = await tryRefreshToken();
    }
    
    if (!userString || !token) {
        console.log('로그인 정보 없음 - 로그인 페이지로 이동');
        alert('로그인이 필요한 서비스입니다.');
        window.location.href = 'login.html';
        return false;
    }
    
    try {
        currentUser = JSON.parse(userString);
        console.log('현재 로그인 사용자:', currentUser);
        return true;
    } catch (error) {
        console.error('사용자 정보 파싱 오류:', error);
        alert('로그인 정보가 올바르지 않습니다. 다시 로그인해주세요.');
        sessionStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        window.location.href = 'login.html';
        return false;
    }
}

// ==========================================
// 보호자 프로필 정보 표시
// ==========================================
function loadGuardianProfile() {
    if (!currentUser) {
        console.error('사용자 정보 없음');
        return;
    }
    
    // 보호자 이름
    const nameElement = document.getElementById('guardianName');
    if (nameElement) {
        nameElement.textContent = currentUser.name;
    }
    
    // 보호자 이메일
    const emailElement = document.getElementById('guardianEmail');
    if (emailElement) {
        emailElement.textContent = currentUser.email;
    }
    
    // 보호자 전화번호
    const phoneElement = document.getElementById('guardianPhone');
    if (phoneElement) {
        phoneElement.textContent = currentUser.phone;
    }
    
    // 가입일 (날짜 포맷팅)
    const joinDateElement = document.getElementById('guardianJoinDate');
    if (joinDateElement && currentUser.created_at) {
        const date = new Date(currentUser.created_at);
        const formattedDate = `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
        joinDateElement.textContent = formattedDate;
    }
    
    console.log('보호자 프로필 정보 로드 완료');
}

// ==========================================
// 환자 목록 불러오기 (로그인한 보호자가 등록한 환자만 API에서 수신)
// ==========================================
async function loadPatientsList() {
    const patientsList = document.getElementById('patientsList');
    const emptyState = document.getElementById('emptyState');
    
    try {
        console.log('환자 목록 불러오기 시작...');
        
        let token = await getAccessToken();
        if (!token) {
            patientsList.innerHTML = '';
            patientsList.classList.add('hidden');
            emptyState.classList.remove('hidden');
            alert('로그인이 만료되었습니다. 다시 로그인해주세요.');
            sessionStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            window.location.href = 'login.html';
            return;
        }

        let response = await fetch(`${API_BASE_URL}/patients`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (response.status === 401) {
            token = await tryRefreshToken();
            if (token) {
                response = await fetch(`${API_BASE_URL}/patients`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include'
                });
            }
        }

        const data = await response.json();

        if (!response.ok) {
            if (response.status === 401) {
                alert('로그인이 만료되었습니다. 다시 로그인해주세요.');
                sessionStorage.removeItem(TOKEN_KEY);
                localStorage.removeItem(USER_KEY);
                window.location.href = 'login.html';
                return;
            }
            console.error('환자 목록 API 오류:', data.message || response.status);
            throw new Error(data.message || '환자 목록을 불러올 수 없습니다.');
        }

        const rawPatients = data.patients || [];
        const calcAge = (window.SeniorbleCommon && window.SeniorbleCommon.calculateAge) || function () { return '—'; };
        const fmtRel = (window.SeniorbleCommon && window.SeniorbleCommon.formatRelativeDate) || function () { return '—'; };
        const patients = rawPatients.map(p => ({
            id: p.id,
            name: p.name,
            age: p.birthdate ? calcAge(p.birthdate) : '—',
            gender: p.gender || '',
            relationship: relationshipToKorean(p.relationship),
            last_checkup: p.notes && p.notes.trim() ? p.notes : '—',
            checkup_date: p.created_at ? fmtRel(p.created_at) : '—'
        }));

        patientsList.innerHTML = '';

        if (patients.length === 0) {
            patientsList.classList.add('hidden');
            emptyState.classList.remove('hidden');
        } else {
            patientsList.classList.remove('hidden');
            emptyState.classList.add('hidden');
            patients.forEach((patient, i) => {
                const patientCard = createPatientCard(patient, rawPatients[i]);
                patientsList.appendChild(patientCard);
            });
        }

        console.log(`환자 목록 로드 완료: ${patients.length}명 (본인 등록만)`);
    } catch (error) {
        console.error('환자 목록 로드 중 오류:', error);
        patientsList.innerHTML = '';
        patientsList.classList.remove('hidden');
        emptyState.classList.add('hidden');
        patientsList.innerHTML = `
            <div class="error-state" style="text-align: center; padding: 40px 20px; color: var(--danger);">
                <p>환자 목록을 불러오는 중 오류가 발생했습니다.</p>
                <button onclick="loadPatientsList()" style="margin-top: 16px; padding: 8px 16px; background: var(--primary); color: white; border: none; border-radius: 8px; cursor: pointer;">
                    다시 시도
                </button>
            </div>
        `;
    }
}

// ==========================================
// 환자 카드 생성 (메인 페이지 스타일과 동일, 클릭 시 환자 정보 팝업)
// ==========================================
function createPatientCard(patient, rawPatient) {
    const card = document.createElement('div');
    card.className = 'patient-card';
    card.onclick = function () {
        if (typeof window.showPatientPopup === 'function' && rawPatient) {
            window.showPatientPopup(rawPatient);
        } else {
            goToPatientDetail(patient.id);
        }
    };
    
    // 프로필 이미지 경로 (성별에 따라 다른 이미지 사용 가능)
    const profileImage = patient.gender === 'male' 
        ? 'src/profile.png' 
        : 'src/profile.png'; // 실제로는 다른 이미지 사용
    
    card.innerHTML = `
        <div class="patient-header">
            <div class="patient-avatar">
                <img src="${profileImage}" alt="${patient.name} 프로필">
            </div>
            <div class="patient-info">
                <h4 class="patient-name">${patient.name}</h4>
                <div class="patient-detail">
                    <span class="patient-label">나이:</span>
                    <span class="patient-value">${patient.age === '—' ? '—' : patient.age + '세'}</span>
                </div>
                <div class="patient-detail">
                    <span class="patient-label">관계:</span>
                    <span class="patient-value">${patient.relationship}</span>
                </div>
                <div class="patient-detail">
                    <span class="patient-label">특징:</span>
                    <span class="patient-value">${patient.last_checkup} (${patient.checkup_date})</span>
                </div>
                <div class="patient-status">
                    <span class="status-dot"></span>
                    정상 작동 중
                </div>
            </div>
        </div>
    `;
    
    return card;
}

// ==========================================
// 환자 상세 페이지로 이동
// ==========================================
function goToPatientDetail(patientId) {
    console.log(`환자 상세 페이지로 이동: ${patientId}`);
    // TODO: 환자 상세 페이지 구현 후 이동
    // window.location.href = `patient-detail.html?id=${patientId}`;
    alert(`환자 ID ${patientId}의 상세 페이지로 이동합니다.\n(준비 중)`);
}

// ==========================================
// 로그아웃
// ==========================================
function handleLogout() {
    if (confirm('로그아웃 하시겠습니까?')) {
        console.log('로그아웃 처리');

        // 서버 refresh token revoke + 쿠키 삭제
        fetch(`${API_BASE_URL}/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
        
        // 로컬 스토리지에서 사용자 정보 삭제
        localStorage.removeItem(USER_KEY);
        sessionStorage.removeItem(TOKEN_KEY);
        
        // 로그인 페이지로 이동
        alert('로그아웃되었습니다.');
        window.location.href = 'login.html';
    }
}

// ==========================================
// 네비게이션 함수들
// ==========================================

function goBack() {
    window.history.back();
}

function goToHome() {
    window.location.href = 'index.html';
}

function goToMap() {
    window.location.href = 'map.html';
}

function goToAddPatient() {
    window.location.href = 'addpatient.html';
}

// ==========================================
// 설정 메뉴 함수들
// ==========================================

function editProfile() {
    console.log('프로필 수정');
    alert('프로필 수정 페이지는 준비 중입니다.');
    // TODO: 프로필 수정 페이지 구현
    // window.location.href = 'edit-profile.html';
}

function changePassword() {
    console.log('비밀번호 변경');
    alert('비밀번호 변경 페이지는 준비 중입니다.');
    // TODO: 비밀번호 변경 페이지 구현
    // window.location.href = 'change-password.html';
}

function notificationSettings() {
    console.log('알림 설정');
    alert('알림 설정 페이지는 준비 중입니다.');
    // TODO: 알림 설정 페이지 구현
    // window.location.href = 'notification-settings.html';
}

// ==========================================
// 유틸리티 함수
// ==========================================

/**
 * 날짜 포맷팅 (YYYY-MM-DD → YYYY년 MM월 DD일)
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

// calculateAge, formatRelativeDate → 공통 모듈(common.js) SeniorbleCommon 사용

// ==========================================
// 개발 참고사항
// ==========================================
/**
 * 환자 목록 API 명세 (예정):
 * 
 * GET /patients
 * Authorization: Bearer <TOKEN>
 * 
 * Response (200 OK):
 * {
 *   "success": true,
 *   "patients": [
 *     {
 *       "id": 1,
 *       "name": "김철수",
 *       "birthdate": "1945-03-15",
 *       "age": 78,
 *       "gender": "male",
 *       "device_serial_number": "SN-ABC123456789",
 *       "notes": "골다공증",
 *       "relationship": "son",
 *       "device_status": "active",
 *       "created_at": "2024-01-01T00:00:00Z"
 *     }
 *   ]
 * }
 */