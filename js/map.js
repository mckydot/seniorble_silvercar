/**
 * ==========================================
 * Seniorble 지도 페이지
 * ==========================================
 * - JWT 인증 후 접근, 로그인 안 되어 있으면 로그인 페이지로 이동
 * - 등록된 환자 목록 조회 후 환자별 탭 표시 (1명이면 탭 1개, 2명 이상이면 탭으로 전환)
 * - 탭별로 해당 환자 위치(좌표) 기준 지도·병원 검색
 * - 카카오 지도 API + 근처 병원 키워드 검색
 */

// ==========================================
// 설정 및 전역 변수
// ==========================================
const API_BASE_URL = 'https://seniorble-silvercar.onrender.com';
const USER_KEY = 'seniorble_user';
const TOKEN_KEY = 'seniorble_token';

// 기본 좌표 (환자별 위치 API 없을 때 공통 사용)
const DEFAULT_MAP_COORDS = { lat: 36.366444, lng: 127.344713 };

let map = null;
let marker = null;
let places = null;
let geocoder = null;
let hospitalMarkers = {};
let selectedHospitalId = null;

// 환자 목록 및 선택 인덱스
let patients = [];
let selectedPatientIndex = 0;

// ==========================================
// 인증 (토큰 갱신·조회·로그인 확인)
// ==========================================
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

async function getAccessToken() {
    let token = sessionStorage.getItem(TOKEN_KEY);
    if (token) return token;
    token = await tryRefreshToken();
    return token;
}

async function checkAuthentication() {
    const userString = localStorage.getItem(USER_KEY);
    let token = sessionStorage.getItem(TOKEN_KEY);
    if (!token && userString) token = await tryRefreshToken();

    if (!userString || !token) {
        alert('로그인이 필요한 서비스입니다.');
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// 현재 선택된 환자의 좌표 (환자별 위치 필드 없으면 기본값)
function getCurrentCoords() {
    return DEFAULT_MAP_COORDS;
}

// 현재 선택된 환자
function getCurrentPatient() {
    return patients[selectedPatientIndex] || null;
}

// ==========================================
// 병원 정보 팝업 (지도 전용)
// ==========================================
function showHospitalPopup(place) {
    const popup = document.getElementById('hospitalPopup');
    const nameEl = document.getElementById('hospitalPopupName');
    const addrEl = document.getElementById('hospitalPopupAddress');
    const telEl = document.getElementById('hospitalPopupTel');
    const callLink = document.getElementById('hospitalPopupCall');
    const copyBtn = document.getElementById('hospitalPopupCopy');
    if (!popup || !nameEl) return;

    const name = (place && place.place_name) ? place.place_name : '—';
    const addr = (place && (place.road_address_name || place.address_name)) ? (place.road_address_name || place.address_name) : '—';
    const tel = (place && place.phone) ? place.phone : '';

    nameEl.textContent = name;
    addrEl.textContent = addr;
    telEl.textContent = tel || '—';

    const actionsEl = popup.querySelector('.popup-actions');
    if (tel) {
        callLink.href = 'tel:' + tel.replace(/\s/g, '');
        callLink.style.display = '';
        copyBtn.style.display = '';
        if (actionsEl) actionsEl.style.display = 'flex';
        copyBtn.onclick = function () {
            navigator.clipboard.writeText(tel).then(function () {
                if (typeof alert === 'function') alert('전화번호가 복사되었습니다.');
            }).catch(function () {
                if (typeof alert === 'function') alert('복사에 실패했습니다.');
            });
        };
    } else {
        if (actionsEl) actionsEl.style.display = 'none';
    }

    popup.classList.remove('hidden');
    popup.setAttribute('aria-hidden', 'false');
}

function closeHospitalPopup() {
    const popup = document.getElementById('hospitalPopup');
    if (popup) {
        popup.classList.add('hidden');
        popup.setAttribute('aria-hidden', 'true');
    }
}

// 환자 정보 팝업은 공통 모듈(common.js)의 showPatientPopup / closePatientPopup 사용

// ==========================================
// 페이지 로드: 인증 → 환자 목록 → 지도 초기화
// ==========================================
document.addEventListener('DOMContentLoaded', async function () {
    const authOk = await checkAuthentication();
    if (!authOk) return;

    const tabsWrap = document.getElementById('patientTabsWrap');
    const tabsContainer = document.getElementById('patientTabs');
    const noPatientsEl = document.getElementById('mapNoPatients');
    const contentArea = document.getElementById('mapContentArea');

    if (typeof kakao === 'undefined' || !kakao.maps) {
        if (contentArea) {
            const addrEl = document.getElementById('mapAddress');
            if (addrEl) addrEl.textContent = '카카오 지도 API 키를 설정해주세요.';
            const loadingEl = document.getElementById('hospitalLoading');
            if (loadingEl) loadingEl.textContent = '지도 API 키 설정 후 병원 목록을 불러올 수 있습니다.';
        }
        return;
    }

    let token = await getAccessToken();
    if (!token) {
        alert('로그인이 필요한 서비스입니다.');
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/patients`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        const data = await response.json();

        if (response.status === 401 && data.message) {
            const newToken = await tryRefreshToken();
            if (newToken) {
                const retryRes = await fetch(`${API_BASE_URL}/patients`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${newToken}`, 'Content-Type': 'application/json' },
                    credentials: 'include'
                });
                const retryData = await retryRes.json();
                if (retryRes.ok && retryData.patients) {
                    patients = retryData.patients;
                } else {
                    alert('인증이 만료되었습니다. 다시 로그인해 주세요.');
                    window.location.href = 'login.html';
                    return;
                }
            } else {
                alert('인증이 만료되었습니다. 다시 로그인해 주세요.');
                window.location.href = 'login.html';
                return;
            }
        } else if (!response.ok || !data.success) {
            patients = [];
        } else {
            patients = data.patients || [];
        }
    } catch (err) {
        console.error('환자 목록 조회 오류:', err);
        patients = [];
    }

    if (patients.length === 0) {
        if (noPatientsEl) noPatientsEl.classList.remove('hidden');
        if (tabsWrap) tabsWrap.classList.add('hidden');
        if (contentArea) contentArea.classList.add('hidden');
        return;
    }

    if (noPatientsEl) noPatientsEl.classList.add('hidden');
    if (contentArea) contentArea.classList.remove('hidden');

    // 환자 탭 렌더링 (1명이어도 탭으로 통일하여 동일 코드 경로)
    if (tabsWrap && tabsContainer) {
        tabsWrap.classList.remove('hidden');
        tabsContainer.innerHTML = '';
        patients.forEach(function (p, idx) {
            const tab = document.createElement('button');
            tab.type = 'button';
            tab.className = 'patient-tab' + (idx === 0 ? ' active' : '');
            tab.textContent = p.name || '환자 ' + (idx + 1);
            tab.setAttribute('role', 'tab');
            tab.setAttribute('aria-selected', idx === 0 ? 'true' : 'false');
            tab.dataset.index = String(idx);
            tab.addEventListener('click', function () {
                const idx = Number(tab.dataset.index);
                switchPatientTab(idx);
                showPatientPopup(patients[idx]);
            });
            tabsContainer.appendChild(tab);
        });
    }

    selectedPatientIndex = 0;

    kakao.maps.load(function () {
        initMap();
        updateAddress();
        searchHospitals();
    });
});

// ==========================================
// 환자 탭 전환
// ==========================================
function switchPatientTab(index) {
    if (index === selectedPatientIndex || index < 0 || index >= patients.length) return;
    selectedPatientIndex = index;

    const tabs = document.querySelectorAll('.patient-tab');
    tabs.forEach(function (t, i) {
        t.classList.toggle('active', i === index);
        t.setAttribute('aria-selected', i === index ? 'true' : 'false');
    });

    // 기존 병원 마커 제거
    Object.keys(hospitalMarkers).forEach(function (placeId) {
        if (hospitalMarkers[placeId]) {
            hospitalMarkers[placeId].marker.setMap(null);
        }
    });
    hospitalMarkers = {};
    selectedHospitalId = null;
    document.querySelectorAll('.hospital-card.selected').forEach(function (el) {
        el.classList.remove('selected');
    });

    const coords = getCurrentCoords();
    if (map && marker) {
        const position = new kakao.maps.LatLng(coords.lat, coords.lng);
        map.setCenter(position);
        map.setLevel(4);
        marker.setPosition(position);
    }
    updateAddress();
    searchHospitals();
}

// ==========================================
// 지도 초기화 및 마커
// ==========================================
function initMap() {
    const container = document.getElementById('map');
    if (!container) return;

    const coords = getCurrentCoords();
    const options = {
        center: new kakao.maps.LatLng(coords.lat, coords.lng),
        level: 4
    };

    map = new kakao.maps.Map(container, options);

    const position = new kakao.maps.LatLng(coords.lat, coords.lng);
    marker = new kakao.maps.Marker({
        position: position,
        map: map
    });
}

// ==========================================
// 좌표 → 주소 표시 (현재 선택 환자 기준 라벨)
// ==========================================
function updateAddress() {
    const el = document.getElementById('mapAddress');
    if (!el) return;

    const patient = getCurrentPatient();
    const coords = getCurrentCoords();

    if (typeof kakao.maps.services !== 'undefined' && kakao.maps.services.Geocoder) {
        if (!geocoder) geocoder = new kakao.maps.services.Geocoder();
        geocoder.coord2Address(coords.lng, coords.lat, function (result, status) {
            if (status === kakao.maps.services.Status.OK && result[0]) {
                const addr = result[0].address;
                const addrText = addr.address_name || (addr.region_1depth_name + ' ' + addr.region_2depth_name) || '현재 위치';
                el.textContent = patient ? patient.name + '님 위치 · ' + addrText : addrText;
            } else {
                el.textContent = (patient ? patient.name + '님 위치 · ' : '') + coords.lat.toFixed(5) + ', ' + coords.lng.toFixed(5);
            }
        });
    } else {
        el.textContent = (patient ? patient.name + '님 위치 · ' : '') + coords.lat.toFixed(5) + ', ' + coords.lng.toFixed(5);
    }
}

// ==========================================
// 병원 마커 토글
// ==========================================
function toggleHospitalMarker(place, cardElement) {
    const placeId = place.id;
    const lat = parseFloat(place.y);
    const lng = parseFloat(place.x);

    if (isNaN(lat) || isNaN(lng) || !map) return;

    const coords = getCurrentCoords();

    if (selectedHospitalId === placeId) {
        if (hospitalMarkers[placeId]) {
            hospitalMarkers[placeId].marker.setMap(null);
            delete hospitalMarkers[placeId];
        }
        cardElement.classList.remove('selected');
        selectedHospitalId = null;
        const position = new kakao.maps.LatLng(coords.lat, coords.lng);
        map.setCenter(position);
        map.setLevel(4);
        return;
    }

    if (selectedHospitalId && hospitalMarkers[selectedHospitalId]) {
        hospitalMarkers[selectedHospitalId].marker.setMap(null);
        hospitalMarkers[selectedHospitalId].element.classList.remove('selected');
        delete hospitalMarkers[selectedHospitalId];
    }

    const position = new kakao.maps.LatLng(lat, lng);
    const imageSrc = 'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_red.png';
    const imageSize = new kakao.maps.Size(36, 37);
    const imageOption = { offset: new kakao.maps.Point(18, 37) };
    const markerImage = new kakao.maps.MarkerImage(imageSrc, imageSize, imageOption);

    const hospitalMarker = new kakao.maps.Marker({
        position: position,
        image: markerImage,
        map: map
    });

    hospitalMarkers[placeId] = { marker: hospitalMarker, element: cardElement };
    cardElement.classList.add('selected');
    selectedHospitalId = placeId;
    map.setCenter(position);
    map.setLevel(3);
}

// ==========================================
// 근처 병원 검색 (현재 선택 환자 좌표 기준)
// ==========================================
function searchHospitals() {
    const listEl = document.getElementById('hospitalList');
    const loadingEl = document.getElementById('hospitalLoading');
    if (!listEl) return;

    if (typeof kakao.maps.services === 'undefined' || !kakao.maps.services.Places) {
        if (loadingEl) loadingEl.textContent = '병원 검색 서비스를 사용할 수 없습니다.';
        return;
    }

    places = new kakao.maps.services.Places();
    const coords = getCurrentCoords();
    const center = new kakao.maps.LatLng(coords.lat, coords.lng);

    places.keywordSearch('병원', function (data, status) {
        if (loadingEl) loadingEl.remove();

        if (status !== kakao.maps.services.Status.OK) {
            listEl.innerHTML = '<p class="hospital-empty">근처 병원을 찾을 수 없습니다.</p>';
            return;
        }

        const list = Array.isArray(data) ? data : (data && data.documents) || [];
        const sorted = list.slice(0, 15);
        listEl.innerHTML = '';

        sorted.forEach(function (place) {
            const card = document.createElement('div');
            card.className = 'hospital-card';
            const addr = place.road_address_name || place.address_name || '';
            const tel = place.phone || '';
            card.innerHTML =
                '<div class="hospital-name">' + escapeHtml(place.place_name) + '</div>' +
                (addr ? '<div class="hospital-address">' + escapeHtml(addr) + '</div>' : '') +
                (tel ? '<div class="hospital-tel"><a href="tel:' + escapeHtml(tel) + '">' + escapeHtml(tel) + '</a></div>' : '');

            card.addEventListener('click', function () {
                toggleHospitalMarker(place, card);
                showHospitalPopup(place);
            });
            listEl.appendChild(card);
        });
    }, {
        location: center,
        radius: 2000
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==========================================
// 네비게이션
// ==========================================
function goBack() {
    window.history.back();
}

function goToHome() {
    window.location.href = 'index.html';
}

function goToProfile() {
    window.location.href = 'profile.html';
}

function goToContacts() {
    console.log('연락처 페이지로 이동');
    alert('연락처 페이지는 준비 중입니다.');
}
