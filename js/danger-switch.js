/**
 * 위험 상황 전환 페이지
 * - 시리얼 번호로 메인에 표시할 환자 선택
 * - 특정 시리얼로 위험 신호 보내기 / 원상 복구
 */

const API_BASE_URL = 'https://seniorble-silvercar.onrender.com';
const USER_KEY = 'seniorble_user';
const TOKEN_KEY = 'seniorble_token';
const SELECTED_SERIAL_KEY = 'seniorble_selected_serial';

document.addEventListener('DOMContentLoaded', function () {
    checkAuth();
    document.getElementById('btnSelectForMain').addEventListener('click', selectForMain);
    document.getElementById('btnSendDanger').addEventListener('click', sendDanger);
    document.getElementById('btnRestoreNormal').addEventListener('click', restoreNormal);
});

function checkAuth() {
    const user = localStorage.getItem(USER_KEY);
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!user || !token) {
        alert('로그인이 필요합니다.');
        window.location.href = 'login.html';
    }
}

function getToken() {
    return sessionStorage.getItem(TOKEN_KEY);
}

function showResult(elId, message, isError) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.textContent = message;
    el.classList.remove('hidden', 'success', 'error');
    el.classList.add(isError ? 'error' : 'success');
    setTimeout(function () {
        el.classList.add('hidden');
    }, 5000);
}

function selectForMain() {
    const input = document.getElementById('selectSerial');
    const serial = (input.value || '').trim();
    if (!serial) {
        showResult('selectResult', '시리얼 번호를 입력해주세요.', true);
        return;
    }

    const token = getToken();
    fetch(`${API_BASE_URL}/patients/by-serial/${encodeURIComponent(serial)}`, {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
    })
        .then(function (res) { return res.json(); })
        .then(function (data) {
            if (data.success && data.patient) {
                localStorage.setItem(SELECTED_SERIAL_KEY, serial);
                showResult('selectResult', '메인 페이지에 "' + (data.patient.name || '') + '" 환자 정보가 표시됩니다. 메인으로 이동해 확인하세요.', false);
            } else {
                showResult('selectResult', data.message || '해당 시리얼 번호로 등록된 환자가 없습니다.', true);
            }
        })
        .catch(function () {
            showResult('selectResult', '서버와 통신 중 오류가 발생했습니다.', true);
        });
}

function sendDanger() {
    const input = document.getElementById('dangerSerial');
    const serial = (input.value || '').trim();
    if (!serial) {
        showResult('dangerResult', '시리얼 번호를 입력해주세요.', true);
        return;
    }

    const token = getToken();
    fetch(`${API_BASE_URL}/device-state`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_serial_number: serial, status: 'danger' })
    })
        .then(function (res) { return res.json(); })
        .then(function (data) {
            if (data.success) {
                showResult('dangerResult', data.message || '위험 신호가 반영되었습니다. 메인 페이지를 새로고침하면 위험 UI가 표시됩니다.', false);
            } else {
                showResult('dangerResult', data.message || '처리 실패', true);
            }
        })
        .catch(function () {
            showResult('dangerResult', '서버와 통신 중 오류가 발생했습니다.', true);
        });
}

function restoreNormal() {
    const input = document.getElementById('normalSerial');
    const serial = (input.value || '').trim();
    if (!serial) {
        showResult('normalResult', '시리얼 번호를 입력해주세요.', true);
        return;
    }

    const token = getToken();
    fetch(`${API_BASE_URL}/device-state`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_serial_number: serial, status: 'normal' })
    })
        .then(function (res) { return res.json(); })
        .then(function (data) {
            if (data.success) {
                showResult('normalResult', data.message || '원상 복구되었습니다.', false);
            } else {
                showResult('normalResult', data.message || '처리 실패', true);
            }
        })
        .catch(function () {
            showResult('normalResult', '서버와 통신 중 오류가 발생했습니다.', true);
        });
}
