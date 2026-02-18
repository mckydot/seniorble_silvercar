/**
 * ==========================================
 * Seniorble 지도 페이지
 * ==========================================
 * - 좌표 변수로 지도 중심/마커 표시
 * - 카카오 지도 API + 근처 병원 키워드 검색
 */

// ==========================================
// 좌표 설정 (원하는 위도·경도로 변경)
// ==========================================
const MAP_COORDS = {
    lat: 34.7569,
    lng: 126.3933
};
// 예: 전남 (금호리조트 근처) — 필요 시 주소에 맞게 수정
// 서울: { lat: 37.5665, lng: 126.9780 }

const USER_KEY = 'seniorble_user';
const TOKEN_KEY = 'seniorble_token';

let map = null;
let marker = null;
let places = null;
let geocoder = null;

// ==========================================
// 페이지 로드 시 지도·병원 초기화
// ==========================================
document.addEventListener('DOMContentLoaded', function () {
    if (typeof kakao === 'undefined' || !kakao.maps) {
        document.getElementById('mapAddress').textContent = '카카오 지도 API 키를 설정해주세요. (map.html 스크립트 src의 appkey)';
        document.getElementById('hospitalLoading').textContent = '지도 API 키 설정 후 병원 목록을 불러올 수 있습니다.';
        return;
    }

    kakao.maps.load(function () {
        initMap();
        updateAddress();
        searchHospitals();
    });
});

// ==========================================
// 지도 초기화 및 마커 표시
// ==========================================
function initMap() {
    const container = document.getElementById('map');
    const options = {
        center: new kakao.maps.LatLng(MAP_COORDS.lat, MAP_COORDS.lng),
        level: 4
    };

    map = new kakao.maps.Map(container, options);

    const position = new kakao.maps.LatLng(MAP_COORDS.lat, MAP_COORDS.lng);
    marker = new kakao.maps.Marker({
        position: position,
        map: map
    });
}

// ==========================================
// 좌표 → 주소 표시 (Geocoder 사용, 없으면 좌표 표시)
// ==========================================
function updateAddress() {
    const el = document.getElementById('mapAddress');
    if (typeof kakao.maps.services !== 'undefined' && kakao.maps.services.Geocoder) {
        geocoder = new kakao.maps.services.Geocoder();
        geocoder.coord2Address(MAP_COORDS.lng, MAP_COORDS.lat, function (result, status) {
            if (status === kakao.maps.services.Status.OK && result[0]) {
                const addr = result[0].address;
                el.textContent = addr.address_name || (addr.region_1depth_name + ' ' + addr.region_2depth_name) || '현재 위치';
            } else {
                el.textContent = MAP_COORDS.lat.toFixed(5) + ', ' + MAP_COORDS.lng.toFixed(5);
            }
        });
    } else {
        el.textContent = MAP_COORDS.lat.toFixed(5) + ', ' + MAP_COORDS.lng.toFixed(5);
    }
}

// ==========================================
// 근처 병원 검색 (키워드: 병원)
// ==========================================
function searchHospitals() {
    const listEl = document.getElementById('hospitalList');
    const loadingEl = document.getElementById('hospitalLoading');

    if (typeof kakao.maps.services === 'undefined' || !kakao.maps.services.Places) {
        loadingEl.textContent = '병원 검색 서비스를 사용할 수 없습니다.';
        return;
    }

    places = new kakao.maps.services.Places();
    const center = new kakao.maps.LatLng(MAP_COORDS.lat, MAP_COORDS.lng);

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
                const lat = parseFloat(place.y);
                const lng = parseFloat(place.x);
                if (!isNaN(lat) && !isNaN(lng) && map) {
                    map.setCenter(new kakao.maps.LatLng(lat, lng));
                    map.setLevel(3);
                }
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
