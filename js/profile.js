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

// ==========================================
// 페이지 로드 시 초기화
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('프로필 페이지 로드 완료');
    
    // 로그인 확인
    checkAuthentication();
    
    // 보호자 정보 로드
    loadGuardianProfile();
    
    // 환자 목록 로드
    loadPatientsList();
});

// ==========================================
// 로그인 확인
// ==========================================
function checkAuthentication() {
    const userString = localStorage.getItem(USER_KEY);
    const token = localStorage.getItem(TOKEN_KEY);
    
    if (!userString || !token) {
        console.log('로그인 정보 없음 - 로그인 페이지로 이동');
        alert('로그인이 필요한 서비스입니다.');
        window.location.href = 'seniorble-login.html';
        return;
    }
    
    try {
        currentUser = JSON.parse(userString);
        console.log('현재 로그인 사용자:', currentUser);
    } catch (error) {
        console.error('사용자 정보 파싱 오류:', error);
        alert('로그인 정보가 올바르지 않습니다. 다시 로그인해주세요.');
        handleLogout();
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
// 환자 목록 불러오기
// ==========================================
async function loadPatientsList() {
    const patientsList = document.getElementById('patientsList');
    const emptyState = document.getElementById('emptyState');
    
    try {
        console.log('환자 목록 불러오기 시작...');
        
        // TODO: 실제 API 연동 시 사용
        // const token = localStorage.getItem(TOKEN_KEY);
        // const response = await fetch(`${API_BASE_URL}/patients`, {
        //     method: 'GET',
        //     headers: {
        //         'Authorization': `Bearer ${token}`
        //     }
        // });
        // const data = await response.json();
        // const patients = data.patients;
        
        // ==========================================
        // 임시 데모 데이터 (실제로는 서버에서 받아옴)
        // ==========================================
        
        // 로딩 시뮬레이션 (1초)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 예시 환자 데이터
        const patients = [
            {
                id: 1,
                name: '김철수',
                age: 78,
                gender: 'male',
                relationship: '부모님',
                device_status: 'active',
                last_checkup: '골다공증',
                checkup_date: '1개월전'
            },
            {
                id: 2,
                name: '박영희',
                age: 75,
                gender: 'female',
                relationship: '조부모',
                device_status: 'active',
                last_checkup: '고혈압',
                checkup_date: '2주전'
            }
        ];
        
        // 로딩 상태 제거
        patientsList.innerHTML = '';
        
        if (patients.length === 0) {
            // 환자 없음 - 빈 상태 표시
            patientsList.classList.add('hidden');
            emptyState.classList.remove('hidden');
        } else {
            // 환자 있음 - 카드 생성
            patientsList.classList.remove('hidden');
            emptyState.classList.add('hidden');
            
            patients.forEach(patient => {
                const patientCard = createPatientCard(patient);
                patientsList.appendChild(patientCard);
            });
        }
        
        console.log(`환자 목록 로드 완료: ${patients.length}명`);
        
    } catch (error) {
        console.error('환자 목록 로드 중 오류:', error);
        
        // 에러 시 빈 상태 표시
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
// 환자 카드 생성 (메인 페이지 스타일과 동일)
// ==========================================
function createPatientCard(patient) {
    const card = document.createElement('div');
    card.className = 'patient-card';
    card.onclick = () => goToPatientDetail(patient.id);
    
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
                    <span class="patient-value">${patient.age}세</span>
                </div>
                <div class="patient-detail">
                    <span class="patient-label">관계:</span>
                    <span class="patient-value">${patient.relationship}</span>
                </div>
                <div class="patient-detail">
                    <span class="patient-label">최근진료:</span>
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
        
        // 로컬 스토리지에서 사용자 정보 삭제
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(TOKEN_KEY);
        
        // 로그인 페이지로 이동
        alert('로그아웃되었습니다.');
        window.location.href = 'seniorble-login.html';
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

function goToAddPatient() {
    window.location.href = 'add_patient.html';
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

/**
 * 나이 계산 (생년월일 → 만 나이)
 */
function calculateAge(birthdate) {
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    
    return age;
}

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