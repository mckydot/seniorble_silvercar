/**
 * ==========================================
 * 환자 등록 JavaScript
 * ==========================================
 * 
 * 주요 기능:
 * 1. 로그인 여부 확인 (토큰 검증)
 * 2. 입력값 유효성 검사
 * 3. FastAPI 서버로 환자 등록 요청 전송
 * 4. 성공 시 메인 페이지로 이동
 * 
 * 중요: 
 * - 이 페이지는 로그인된 보호자만 접근 가능
 * - 환자(Patient)는 로그인하지 않는 관리 객체
 * - 환자와 센서(Device)를 매핑하여 등록
 */

// ==========================================
// 전역 변수 및 설정
// ==========================================

// API 서버 주소 (실제 배포 시 환경에 맞게 변경)
const API_BASE_URL = 'http://localhost:8000';

// DOM 요소 참조
let form;
let errorMessage;
let loadingOverlay;
let successModal;
let submitBtn;
let relationshipSelect;
let relationshipHiddenInput;
let customSelectWrapper; // wrapper 요소 추가
let customSelectBox;
let selectSelected;
let selectItems;
let otherRelationshipGroup;
let otherRelationshipInput;

// 로컬 스토리지 키
const TOKEN_KEY = 'seniorble_token';
const USER_KEY = 'seniorble_user';

// ==========================================
// 페이지 로드 시 초기화
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('환자 등록 페이지 로드 완료');
    
    // JWT 인증: 로그인된 보호자만 접근 가능
    if (!checkAuthentication()) return;
    
    // DOM 요소 가져오기
    form = document.getElementById('addPatientForm');
    errorMessage = document.getElementById('errorMessage');
    loadingOverlay = document.getElementById('loadingOverlay');
    successModal = document.getElementById('successModal');
    submitBtn = document.getElementById('submitBtn');
    relationshipHiddenInput = document.getElementById('relationship');
    customSelectWrapper = document.querySelector('.custom-select-wrapper');
    customSelectBox = document.getElementById('customSelect');
    selectSelected = customSelectBox.querySelector('.select-selected');
    selectItems = document.getElementById('selectItems');
    otherRelationshipGroup = document.getElementById('otherRelationshipGroup');
    otherRelationshipInput = document.getElementById('otherRelationship');
    
    // 이벤트 리스너 등록
    initEventListeners();
    
    // 커스텀 드롭다운 초기화
    initCustomSelect();
});

// ==========================================
// 로그인 여부 확인 (JWT 토큰 필수)
// ==========================================
function checkAuthentication() {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) {
        console.log('로그인 정보 없음 - 로그인 페이지로 이동');
        alert('로그인이 필요한 서비스입니다.');
        window.location.href = 'login.html';
        return false;
    }
    console.log('로그인 확인 완료');
    return true;
}

// ==========================================
// 이벤트 리스너 초기화
// ==========================================
function initEventListeners() {
    // 폼 제출 이벤트
    form.addEventListener('submit', handleSubmit);
    
    // 센서 시리얼 번호 대문자 변환
    const deviceSerialInput = document.getElementById('deviceSerial');
    deviceSerialInput.addEventListener('input', function(e) {
        e.target.value = e.target.value.toUpperCase();
    });
}

// ==========================================
// 커스텀 드롭다운 초기화
// ==========================================
function initCustomSelect() {
    // 드롭다운 열기/닫기 토글
    selectSelected.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleDropdown();
    });
    
    // 옵션 선택 이벤트
    const items = selectItems.querySelectorAll('.select-item');
    items.forEach(item => {
        item.addEventListener('click', function(e) {
            e.stopPropagation();
            selectOption(this);
        });
    });
    
    // 드롭다운 외부 클릭 시 닫기
    document.addEventListener('click', function(e) {
        if (!customSelectBox.contains(e.target) && !selectItems.contains(e.target)) {
            closeDropdown();
        }
    });
    
    // 스크롤 시 드롭다운 위치 재조정
    window.addEventListener('scroll', function() {
        if (!selectItems.classList.contains('hidden')) {
            updateDropdownPosition();
        }
    });
    
    // 창 크기 변경 시 드롭다운 위치 재조정
    window.addEventListener('resize', function() {
        if (!selectItems.classList.contains('hidden')) {
            updateDropdownPosition();
        }
    });
}

// ==========================================
// 드롭다운 위치 업데이트 (스크롤/리사이즈 시)
// ==========================================
function updateDropdownPosition() {
    const rect = selectSelected.getBoundingClientRect();
    
    selectItems.style.top = `${rect.bottom + 4}px`;
    selectItems.style.left = `${rect.left}px`;
    selectItems.style.width = `${rect.width}px`;
    
    // 화면 아래로 넘어가는지 재확인
    const dropdownHeight = 300;
    const spaceBelow = window.innerHeight - rect.bottom;
    
    if (spaceBelow < dropdownHeight + 10) {
        selectItems.style.top = `${rect.top - Math.min(dropdownHeight, spaceBelow) - 4}px`;
    }
}

// ==========================================
// 드롭다운 열기/닫기 토글
// ==========================================
function toggleDropdown() {
    const isOpen = !selectItems.classList.contains('hidden');
    
    if (isOpen) {
        closeDropdown();
    } else {
        openDropdown();
    }
}

function openDropdown() {
    // 드롭다운 위치 계산 (select 버튼의 위치 기준)
    const rect = selectSelected.getBoundingClientRect();
    
    // 드롭다운 옵션 목록 위치 설정
    selectItems.style.top = `${rect.bottom + 4}px`; // 버튼 아래 4px
    selectItems.style.left = `${rect.left}px`; // 버튼 왼쪽과 정렬
    selectItems.style.width = `${rect.width}px`; // 버튼과 같은 너비
    
    // 화면 아래로 넘어가는지 확인
    const dropdownHeight = 300; // max-height
    const spaceBelow = window.innerHeight - rect.bottom;
    
    if (spaceBelow < dropdownHeight + 10) {
        // 아래 공간이 부족하면 위로 표시
        selectItems.style.top = `${rect.top - Math.min(dropdownHeight, spaceBelow) - 4}px`;
    }
    
    // 드롭다운 표시
    selectItems.classList.remove('hidden');
    selectSelected.classList.add('active');
    customSelectWrapper.classList.add('active');
}

function closeDropdown() {
    selectItems.classList.add('hidden');
    selectSelected.classList.remove('active');
    customSelectWrapper.classList.remove('active');
}

// ==========================================
// 옵션 선택 처리
// ==========================================
function selectOption(selectedItem) {
    const value = selectedItem.getAttribute('data-value');
    const text = selectedItem.textContent;
    
    // 선택된 값 표시
    selectSelected.textContent = text;
    
    // placeholder 클래스 제거
    if (value) {
        selectSelected.classList.remove('placeholder');
    } else {
        selectSelected.classList.add('placeholder');
    }
    
    // hidden input에 값 설정
    relationshipHiddenInput.value = value;
    
    // 이전 선택 항목에서 selected 클래스 제거
    const allItems = selectItems.querySelectorAll('.select-item');
    allItems.forEach(item => item.classList.remove('selected'));
    
    // 현재 선택 항목에 selected 클래스 추가
    if (value) {
        selectedItem.classList.add('selected');
    }
    
    // 드롭다운 닫기
    closeDropdown();
    
    // '기타' 선택 여부에 따라 입력 필드 표시/숨김
    handleRelationshipChange(value);
}
// ==========================================
// 관계 선택 변경 처리
// ==========================================
function handleRelationshipChange(selectedValue) {
    if (selectedValue === 'other') {
        // '기타' 선택 시 입력 필드 표시
        otherRelationshipGroup.style.display = 'block';
        otherRelationshipInput.required = true;
    } else {
        // 다른 옵션 선택 시 입력 필드 숨김
        otherRelationshipGroup.style.display = 'none';
        otherRelationshipInput.required = false;
        otherRelationshipInput.value = ''; // 값 초기화
    }
}

// ==========================================
// 뒤로가기 버튼
// ==========================================
function goBack() {
    // 이전 페이지로 이동 (일반적으로 메인 페이지)
    window.history.back();
    
    // 또는 명시적으로 메인 페이지로 이동
    // window.location.href = 'index.html';
}

// ==========================================
// 메인 페이지로 이동 (등록 완료 후)
// ==========================================
function goToHome() {
    window.location.href = 'index.html';
}

// ==========================================
// 에러 메시지 표시
// ==========================================
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
    
    // 스크롤을 에러 메시지 위치로 이동
    errorMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // 5초 후 자동으로 사라지게
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
// 성공 모달 표시
// ==========================================
function showSuccessModal(patientName) {
    const successMessage = document.getElementById('successMessage');
    successMessage.textContent = `${patientName} 님이 성공적으로 등록되었습니다.`;
    successModal.classList.remove('hidden');
}

// ==========================================
// 나이 계산 (생년월일 → 만 나이)
// ==========================================
function calculateAge(birthdate) {
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    // 생일이 아직 안 지났으면 -1
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    
    return age;
}

// ==========================================
// 입력값 유효성 검증
// ==========================================
function validateForm(formData) {
    const { patientName, birthdate, gender, deviceSerial, relationship, otherRelationship } = formData;
    
    // 환자 이름 검증
    if (patientName.trim().length < 2) {
        showError('환자 이름은 2자 이상 입력해주세요.');
        return false;
    }
    
    // 생년월일 검증 (미래 날짜 방지)
    const today = new Date();
    const birth = new Date(birthdate);
    
    if (birth > today) {
        showError('생년월일은 오늘 날짜보다 이전이어야 합니다.');
        return false;
    }
    
    // 나이 확인 (예: 최소 50세 이상)
    const age = calculateAge(birthdate);
    if (age < 0) {
        showError('올바른 생년월일을 입력해주세요.');
        return false;
    }
    
    // 참고: 시니어 케어 서비스이므로 나이 제한을 둘 수도 있음
    // if (age < 50) {
    //     showError('본 서비스는 50세 이상 대상입니다.');
    //     return false;
    // }
    
    console.log(`환자 나이: ${age}세`);
    
    // 성별 검증
    if (!gender) {
        showError('성별을 선택해주세요.');
        return false;
    }
    
    // 센서 시리얼 번호 검증 (테스트용: 규제 미적용, 비어있지만 않으면 통과)
    if (!deviceSerial || deviceSerial.trim().length === 0) {
        showError('센서 시리얼 번호를 입력해주세요.');
        return false;
    }
    // [규제 적용 시 복원] SN- 접두사·최소 길이 검증
    // if (!deviceSerial.startsWith('SN-')) { showError('...'); return false; }
    // if (deviceSerial.length < 10) { showError('...'); return false; }
    
    // 관계 검증
    if (!relationship) {
        showError('환자와의 관계를 선택해주세요.');
        return false;
    }
    
    // '기타' 선택 시 직접 입력 값 검증
    if (relationship === 'other') {
        if (!otherRelationship || otherRelationship.trim().length < 2) {
            showError('관계를 2자 이상 입력해주세요.');
            return false;
        }
        
        if (otherRelationship.trim().length > 20) {
            showError('관계는 20자 이하로 입력해주세요.');
            return false;
        }
    }
    
    return true;
}

// ==========================================
// 폼 제출 처리
// ==========================================
async function handleSubmit(e) {
    // 기본 폼 제출 동작 방지
    e.preventDefault();
    
    console.log('환자 등록 폼 제출 시작');
    
    // 폼 데이터 수집
    const formData = {
        patientName: document.getElementById('patientName').value.trim(),
        birthdate: document.getElementById('birthdate').value,
        gender: document.querySelector('input[name="gender"]:checked')?.value,
        deviceSerial: document.getElementById('deviceSerial').value.trim(),
        notes: document.getElementById('notes').value.trim(),
        relationship: document.getElementById('relationship').value,
        otherRelationship: document.getElementById('otherRelationship').value.trim()
    };
    
    console.log('수집된 폼 데이터:', formData);
    
    // 입력값 검증
    if (!validateForm(formData)) {
        console.log('유효성 검증 실패');
        return;
    }
    
    // 로딩 표시
    showLoading();
    
    try {
        // 로컬 스토리지에서 인증 토큰 가져오기
        const token = sessionStorage.getItem(TOKEN_KEY);
        
        console.log('서버로 환자 등록 요청 전송...');
        
        // FastAPI 서버로 환자 등록 요청
        if (!token) {
            alert('로그인이 만료되었습니다. 다시 로그인해주세요.');
            window.location.href = 'login.html';
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/patients`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            credentials: 'include',
            body: JSON.stringify({
                name: formData.patientName,
                birthdate: formData.birthdate,
                gender: formData.gender,
                device_serial_number: formData.deviceSerial,
                notes: formData.notes || null, // 빈 문자열이면 null
                // '기타' 선택 시 otherRelationship 값 사용, 아니면 relationship 값 사용
                relationship: formData.relationship === 'other' 
                    ? formData.otherRelationship 
                    : formData.relationship
            })
        });
        
        console.log('서버 응답 상태:', response.status);
        
        // 응답 데이터 파싱
        const data = await response.json();
        console.log('서버 응답 데이터:', data);
        
        if (response.status === 401) {
            alert('로그인이 만료되었습니다. 다시 로그인해주세요.');
            sessionStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            window.location.href = 'login.html';
            return;
        }
        
        if (response.ok) {
            console.log('환자 등록 성공!');
            showSuccessModal(formData.patientName);
            setTimeout(() => goToHome(), 3000);
            return;
        }
        
        console.error('환자 등록 실패:', data);
        if (data.detail) showError(data.detail);
        else if (data.message) showError(data.message);
        else showError('환자 등록에 실패했습니다. 다시 시도해주세요.');
        
    } catch (error) {
        // 네트워크 에러 또는 기타 예외 처리
        console.error('환자 등록 요청 중 에러 발생:', error);
        
        // 인증 에러인 경우 로그인 페이지로 이동
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            alert('로그인이 만료되었습니다. 다시 로그인해주세요.');
            sessionStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            window.location.href = 'login.html';
            return;
        }
        
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
 * 토큰 유효성 검증 (선택사항)
 * 서버에 토큰이 유효한지 확인하는 API 호출
 */
async function validateToken(token) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/verify`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            // 토큰이 유효하지 않으면 로그아웃 처리
            console.log('토큰 검증 실패 - 로그아웃');
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            window.location.href = 'login.html';
        }
    } catch (error) {
        console.error('토큰 검증 에러:', error);
    }
}

// ==========================================
// 개발 참고사항
// ==========================================
/**
 * FastAPI 백엔드에서 받을 것으로 예상되는 요청 형식:
 * 
 * POST /patients
 * Content-Type: application/json
 * Authorization: Bearer <JWT_TOKEN>
 * 
 * Request Body:
 * {
 *   "name": "김철수",
 *   "birthdate": "1945-03-15",
 *   "gender": "male",
 *   "device_serial_number": "SN-ABC123456789",
 *   "notes": "고혈압, 무릎 수술 이력",
 *   "relationship": "son"  // 또는 '기타' 선택 시: "조카", "친구" 등
 * }
 * 
 * 성공 응답 (201 Created):
 * {
 *   "id": 1,
 *   "name": "김철수",
 *   "birthdate": "1945-03-15",
 *   "age": 79,
 *   "gender": "male",
 *   "device_serial_number": "SN-ABC123456789",
 *   "notes": "고혈압, 무릎 수술 이력",
 *   "relationship": "son",
 *   "guardian_id": 5,  // 현재 로그인한 보호자 ID
 *   "created_at": "2024-01-01T00:00:00"
 * }
 * 
 * 실패 응답 (400 Bad Request):
 * {
 *   "detail": "해당 센서는 이미 다른 환자에게 등록되어 있습니다."
 * }
 * 
 * 인증 실패 (401 Unauthorized):
 * {
 *   "detail": "로그인이 필요합니다."
 * }
 * 
 * ==========================================
 * 데이터베이스 관계 구조:
 * ==========================================
 * 
 * User (보호자)
 * ├── id (PK)
 * ├── email
 * ├── password_hash
 * ├── name
 * └── phone
 * 
 * Patient (환자)
 * ├── id (PK)
 * ├── name
 * ├── birthdate
 * ├── gender
 * ├── notes
 * └── device_serial_number (FK to Device)
 * 
 * Device (센서)
 * ├── serial_number (PK)
 * ├── patient_id (FK to Patient)
 * └── status
 * 
 * UserPatient (보호자-환자 매핑, Many-to-Many)
 * ├── user_id (FK to User)
 * ├── patient_id (FK to Patient)
 * ├── relationship (보호자 관계)
 * └── created_at
 * 
 * 한 환자에게 여러 보호자가 연결될 수 있음 (1:N)
 * 한 보호자가 여러 환자를 관리할 수 있음 (1:N)
 */