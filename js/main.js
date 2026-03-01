/**
 * ==========================================
 * Seniorble 메인 페이지 JavaScript
 * ==========================================
 * 
 * 주요 기능:
 * 1. 로그인 확인
 * 2. 보호자 정보 표시
 * 3. 위험/안전 상황 UI 전환
 * 4. 긴급 호출
 */

// ==========================================
// 전역 변수 및 설정
// ==========================================

// API 서버 주소 (프로필·환자 목록과 동일)
const API_BASE_URL = 'https://seniorble-silvercar.onrender.com';

// ==========================================
// 좌표 설정 (원하는 위도·경도로 변경)
// ==========================================
const MAP_COORDS = {
    lat: 36.366444,
    lng: 127.344713
};

let map = null;
let marker = null;
let places = null;
let geocoder = null;

// 로컬 스토리지 키
const USER_KEY = 'seniorble_user';
const TOKEN_KEY = 'seniorble_token'; // sessionStorage에 저장됨

// 현재 로그인한 사용자 정보
let currentUser = null;

// ==========================================
// 페이지 로드 시 초기화
// ==========================================
window.addEventListener('DOMContentLoaded', function() {
    console.log('Seniorble 메인 페이지 로드 완료');
    
    // 로그인 확인
    checkAuthentication();
    
    // 사용자 정보 표시
    loadUserInfo();
    
    // 로그인한 사용자가 등록한 환자만 메인 카드에 표시
    loadPatientForMain();
    
    // 카카오 지도 API 로드 후 주소 업데이트
    if (typeof kakao !== 'undefined' && kakao.maps) {
        kakao.maps.load(function() {
            updateAddress();
        });
    } else {
        // 카카오 API가 없으면 좌표만 표시
        const el = document.getElementById('location_name');
        if (el) {
            el.textContent = MAP_COORDS.lat.toFixed(5) + ', ' + MAP_COORDS.lng.toFixed(5);
        }
    }
    
    // 충격 감지 알림은 기본적으로 숨김
    document.querySelector('.impact-alert')?.classList.add('hidden');
    
    // 하단 네비게이션 이벤트 등록
    setupBottomNavigation();
    
    console.log('Seniorble 보행보조기구 모니터링 시스템 초기화 완료');
});

// ==========================================
// 로그인 확인
// ==========================================
function checkAuthentication() {
    const userString = localStorage.getItem(USER_KEY);
    const token = sessionStorage.getItem(TOKEN_KEY);
    
    if (!userString || !token) {
        console.log('로그인 정보 없음 - 로그인 페이지로 이동');
        alert('로그인이 필요한 서비스입니다.');
        window.location.href = 'login.html';
        return;
    }
    
    try {
        currentUser = JSON.parse(userString);
        console.log('현재 로그인 사용자:', currentUser);
    } catch (error) {
        console.error('사용자 정보 파싱 오류:', error);
        alert('로그인 정보가 올바르지 않습니다. 다시 로그인해주세요.');
        localStorage.removeItem(USER_KEY);
        sessionStorage.removeItem(TOKEN_KEY);
        window.location.href = 'login.html';
    }
}

// ==========================================
// 좌표 → 주소 표시 (Geocoder 사용, 없으면 좌표 표시)
// ==========================================
function updateAddress() {
    const el = document.getElementById('location_name');
    if (!el) {
        console.warn('location_name 요소를 찾을 수 없습니다.');
        return;
    }
    
    if (typeof kakao.maps.services !== 'undefined' && kakao.maps.services.Geocoder) {
        geocoder = new kakao.maps.services.Geocoder();
        geocoder.coord2Address(MAP_COORDS.lng, MAP_COORDS.lat, function (result, status) {
            if (status === kakao.maps.services.Status.OK && result[0]) {
                const addr = result[0].address;
                el.textContent = addr.address_name || (addr.region_1depth_name + ' ' + addr.region_2depth_name) || '현재 위치';
                console.log('주소 업데이트 완료:', el.textContent);
            } else {
                el.textContent = MAP_COORDS.lat.toFixed(5) + ', ' + MAP_COORDS.lng.toFixed(5);
                console.log('주소 변환 실패 - 좌표 표시');
            }
        });
    } else {
        el.textContent = MAP_COORDS.lat.toFixed(5) + ', ' + MAP_COORDS.lng.toFixed(5);
        console.log('Geocoder 사용 불가 - 좌표 표시');
    }
}


// ==========================================
// 사용자 정보 표시
// ==========================================
function loadUserInfo() {
    if (!currentUser) {
        console.error('사용자 정보 없음');
        return;
    }
    
    // 주 보호자 이름 표시 (상단 카드)
    const guardianNameElement = document.querySelector('.guardian_name span');
    if (guardianNameElement) {
        guardianNameElement.textContent = currentUser.name;
    }
    // 환자별 카드의 주보호자는 loadPatientForMain()에서 채움

    console.log('사용자 정보 표시 완료:', currentUser.name);
}

// ==========================================
// 메인 환자 카드 표시 (등록된 모든 환자 목록 표시)
// ==========================================
var SeniorbleCommon = window.SeniorbleCommon || {};

async function loadPatientForMain() {
    const container = document.getElementById('mainPatientList');
    if (!container) return;

    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) {
        container.innerHTML = '<p class="main-patient-empty">등록된 환자가 없습니다. 로그인 후 프로필에서 환자를 등록해 주세요.</p>';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/patients`, {
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        const patients = (data.success && data.patients) ? data.patients : [];

        if (patients.length === 0) {
            container.innerHTML = '<p class="main-patient-empty">등록된 환자가 없습니다. 프로필에서 환자를 등록해 주세요.</p>';
            return;
        }

        const guardianName = currentUser ? currentUser.name : '—';
        container.innerHTML = '';

        var calculateAge = SeniorbleCommon.calculateAge || function (b) { return b ? '—' : null; };
        var formatRelativeDate = SeniorbleCommon.formatRelativeDate || function () { return ''; };
        var escapeHtml = SeniorbleCommon.escapeHtml || function (t) { return (t == null || t === '') ? '' : String(t); };

        patients.forEach(function (p) {
            var name = p.name || '—';
            var age = p.birthdate ? calculateAge(p.birthdate) : '—';
            var diagnosis = (p.notes && p.notes.trim()) ? p.notes : '—';
            var timeline = p.created_at ? ' (' + formatRelativeDate(p.created_at) + ')' : '';
            var profileImg = 'src/profile.png';

            var card = document.createElement('div');
            card.className = 'patientContent main-patient-card';
            card.innerHTML =
                '<div class="profileWrap">' +
                '  <div class="patientProfile"><img src="' + escapeHtml(profileImg) + '" alt="' + escapeHtml(name) + ' 프로필"></div>' +
                '</div>' +
                '<div class="patientInfo">' +
                '  <p class="name profileValue"><span class="profileC">이름</span> : <span class="nameValue">' + escapeHtml(name) + '</span></p>' +
                '  <p class="age profileValue"><span class="profileC">나이</span> : <span class="ageValue">' + escapeHtml(String(age)) + '</span>세</p>' +
                '  <p class="mainG profileValue"><span class="profileC">주보호자</span> : <span class="guardianValue">' + escapeHtml(guardianName) + '</span></p>' +
                '  <p class="record profileValue"><span class="profileC">특징</span> : <span class="diagnosis">' + escapeHtml(diagnosis) + '</span><span class="recordTimeline">' + escapeHtml(timeline) + '</span></p>' +
                '</div>';
            card.addEventListener('click', function () {
                if (typeof window.showPatientPopup === 'function') window.showPatientPopup(p);
            });
            container.appendChild(card);
        });
    } catch (err) {
        console.error('메인 환자 로드 오류:', err);
        container.innerHTML = '<p class="main-patient-empty">환자 정보를 불러오지 못했습니다. 다시 시도해 주세요.</p>';
    }
}

// ==========================================
// 위험 상황 UI 토글 기능
// ==========================================

// 위험 상황으로 전환 (낙상 감지)
document.getElementById('change')?.addEventListener('click', function() {
    activateDangerMode();
});

// 안전 상황으로 전환
document.getElementById('change2')?.addEventListener('click', function() {
    activateSafeMode();
});

function activateDangerMode() {
    // 경고 메시지 표시
    document.querySelector('.alert')?.classList.remove('hidden');
    
    // 상태 모니터 위험 모드
    document.querySelector('.status-monitor')?.classList.add('danger-mode');
    
    // 긴급 버튼 활성화
    document.getElementById('emergency_wrap')?.classList.add('danger-active');
    document.querySelector('.emergency-btn')?.classList.add('danger-active');
    
    // 상태 배지 변경
    document.querySelector('.safe-text')?.classList.add('hidden');
    document.querySelector('.danger-text')?.classList.remove('hidden');
    const indicator = document.querySelector('.status-indicator');
    if (indicator) {
        indicator.classList.remove('safe-indicator');
        indicator.classList.add('danger-indicator');
    }
    
    // 이동 속도 - 급격히 감소 (넘어지는 순간)
    const velocityValue = document.querySelector('.monitor-grid .monitor-item:nth-child(1) .monitor-value');
    const velocityDesc = document.querySelector('.monitor-grid .monitor-item:nth-child(1) .monitor-description');
    if (velocityValue) {
        velocityValue.textContent = '0.1';
        velocityValue.classList.remove('safe-value');
        velocityValue.classList.add('danger-value');
    }
    if (velocityDesc) {
        velocityDesc.textContent = '비정상적인 속도 감소';
        velocityDesc.style.color = 'var(--danger)';
    }
    
    // 기울기 센서 - 위험 각도
    const tiltStatus = document.querySelector('.monitor-grid .monitor-item:nth-child(2) .monitor-status');
    const tiltDesc = document.querySelector('.monitor-grid .monitor-item:nth-child(2) .monitor-description');
    if (tiltStatus) {
        tiltStatus.textContent = '위험';
        tiltStatus.classList.remove('safe-status');
        tiltStatus.classList.add('danger-status');
    }
    if (tiltDesc) {
        tiltDesc.textContent = '기울기 임계값 초과 (45°)';
        tiltDesc.style.color = 'var(--danger)';
    }
    
    // 충격 감지 알림 표시
    document.querySelector('.impact-alert')?.classList.remove('hidden');
    
    console.log('위험 상황 UI 활성화 - 낙상 감지됨');
}

function activateSafeMode() {
    // 경고 메시지 숨김
    document.querySelector('.alert')?.classList.add('hidden');
    
    // 상태 모니터 안전 모드
    document.querySelector('.status-monitor')?.classList.remove('danger-mode');
    
    // 긴급 버튼 비활성화
    document.getElementById('emergency_wrap')?.classList.remove('danger-active');
    document.querySelector('.emergency-btn')?.classList.remove('danger-active');
    
    // 상태 배지 변경
    document.querySelector('.safe-text')?.classList.remove('hidden');
    document.querySelector('.danger-text')?.classList.add('hidden');
    const indicator = document.querySelector('.status-indicator');
    if (indicator) {
        indicator.classList.remove('danger-indicator');
        indicator.classList.add('safe-indicator');
    }
    
    // 이동 속도 - 정상
    const velocityValue = document.querySelector('.monitor-grid .monitor-item:nth-child(1) .monitor-value');
    const velocityDesc = document.querySelector('.monitor-grid .monitor-item:nth-child(1) .monitor-description');
    if (velocityValue) {
        velocityValue.textContent = '0.8';
        velocityValue.classList.remove('danger-value');
        velocityValue.classList.add('safe-value');
    }
    if (velocityDesc) {
        velocityDesc.textContent = '적정 보행 속도';
        velocityDesc.style.color = 'var(--text-light)';
    }
    
    // 기울기 센서 - 안전
    const tiltStatus = document.querySelector('.monitor-grid .monitor-item:nth-child(2) .monitor-status');
    const tiltDesc = document.querySelector('.monitor-grid .monitor-item:nth-child(2) .monitor-description');
    if (tiltStatus) {
        tiltStatus.textContent = '안정';
        tiltStatus.classList.remove('danger-status');
        tiltStatus.classList.add('safe-status');
    }
    if (tiltDesc) {
        tiltDesc.textContent = '정상 범위 (±15°)';
        tiltDesc.style.color = 'var(--text-light)';
    }
    
    // 충격 감지 알림 숨김
    document.querySelector('.impact-alert')?.classList.add('hidden');
    
    console.log('안전 상황 UI 활성화 - 정상 상태');
}

// ==========================================
// 긴급 호출 기능
// ==========================================
document.querySelector('.emergency-btn')?.addEventListener('click', function() {
    const guardianName = currentUser ? currentUser.name : '보호자';
    
    if (confirm(`${guardianName}님에게 긴급 호출을 발송하시겠습니까?`)) {
        alert(`긴급 호출이 발송되었습니다.\n보호자: ${guardianName}\n현재 위치가 전송되었습니다.`);
        // TODO: 실제 앱에서는 여기서 긴급 호출 API를 호출
        console.log('긴급 호출 발송:', guardianName);
    }
});

// ==========================================
// 하단 네비게이션 설정
// ==========================================
function setupBottomNavigation() {
    const navItems = document.querySelectorAll('.bottom-nav .nav-item');
    
    navItems.forEach((item, index) => {
        item.addEventListener('click', function() {
            // 각 메뉴별 동작
            switch(index) {
                case 0: // 홈
                    // 이미 홈 페이지 - 페이지 새로고침
                    window.location.reload();
                    break;
                case 1: // 지도
                    goToMap();
                    break;
                case 2: // 연락처
                    goToContacts();
                    break;
                case 3: // 프로필
                    goToProfile();
                    break;
            }
        });
    });
}

// ==========================================
// 네비게이션 함수
// ==========================================
function goToProfile() {
    window.location.href = 'profile.html';
}

function goToMap() {
    window.location.href = 'map.html';
}

function goToContacts() {
    console.log('연락처 페이지로 이동');
    // TODO: 연락처 페이지 구현
    alert('연락처 페이지는 준비 중입니다.');
}