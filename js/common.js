/**
 * ==========================================
 * Seniorble 공통 모듈
 * ==========================================
 * - 환자/날짜 표시 유틸 (여러 페이지에서 재사용)
 * - 환자 정보 팝업 (지도, 메인, 프로필 공통)
 */

(function (global) {
    'use strict';

    // ==========================================
    // 환자/날짜 유틸
    // ==========================================

    /** 관계 코드 → 한글 */
    function relationshipToKorean(code) {
        if (!code || typeof code !== 'string') return '—';
        const trimmed = code.trim();
        const map = {
            son: '아들',
            daughter: '딸',
            spouse: '배우자',
            grandson: '손자',
            granddaughter: '손녀',
            caregiver: '요양보호사',
            other: '기타'
        };
        return map[trimmed] !== undefined ? map[trimmed] : trimmed;
    }

    /** 생년월일 → 만 나이 (숫자) */
    function calculateAge(birthdate) {
        if (!birthdate) return null;
        const today = new Date();
        const birth = new Date(birthdate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
        return age;
    }

    /** 날짜 문자열 → 상대 표시 (오늘, 어제, n일 전 등) */
    function formatRelativeDate(dateString) {
        if (!dateString) return '—';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
        if (diffDays === 0) return '오늘';
        if (diffDays === 1) return '어제';
        if (diffDays < 7) return diffDays + '일 전';
        if (diffDays < 30) return Math.floor(diffDays / 7) + '주 전';
        if (diffDays < 365) return Math.floor(diffDays / 30) + '개월 전';
        return Math.floor(diffDays / 365) + '년 전';
    }

    /** HTML 이스케이프 */
    function escapeHtml(text) {
        if (text == null || text === '') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 전역에 노출 (다른 스크립트에서 사용)
    global.SeniorbleCommon = {
        relationshipToKorean: relationshipToKorean,
        calculateAge: calculateAge,
        formatRelativeDate: formatRelativeDate,
        escapeHtml: escapeHtml
    };

    // ==========================================
    // 환자 정보 팝업 (DOM 없으면 생성 후 표시)
    // ==========================================

    function ensurePatientPopupDOM() {
        if (document.getElementById('patientPopup')) return;
        const wrap = document.createElement('div');
        wrap.id = 'patientPopup';
        wrap.className = 'popup-overlay hidden';
        wrap.setAttribute('aria-hidden', 'true');
        wrap.innerHTML =
            '<div class="popup-backdrop" onclick="closePatientPopup()"></div>' +
            '<div class="popup-card popup-card-patient">' +
            '  <button type="button" class="popup-close" onclick="closePatientPopup()" aria-label="닫기">×</button>' +
            '  <h3 class="popup-title">환자 정보</h3>' +
            '  <div class="popup-body">' +
            '    <p class="popup-row"><span class="popup-label">이름</span><span id="patientPopupName">—</span></p>' +
            '    <p class="popup-row"><span class="popup-label">나이</span><span id="patientPopupAge">—</span></p>' +
            '    <p class="popup-row"><span class="popup-label">성별</span><span id="patientPopupGender">—</span></p>' +
            '    <p class="popup-row"><span class="popup-label">관계</span><span id="patientPopupRelation">—</span></p>' +
            '    <p class="popup-row"><span class="popup-label">특징</span><span id="patientPopupNotes">—</span></p>' +
            '  </div>' +
            '</div>';
        document.body.appendChild(wrap);
    }

    /** 환자 정보 팝업 표시 (API 환자 객체: name, birthdate, gender, relationship, notes) */
    function showPatientPopup(patient) {
        ensurePatientPopupDOM();
        const popup = document.getElementById('patientPopup');
        const nameEl = document.getElementById('patientPopupName');
        const ageEl = document.getElementById('patientPopupAge');
        const genderEl = document.getElementById('patientPopupGender');
        const relationEl = document.getElementById('patientPopupRelation');
        const notesEl = document.getElementById('patientPopupNotes');
        if (!popup || !nameEl) return;

        var ageText = '—';
        if (patient && patient.birthdate) {
            var age = calculateAge(patient.birthdate);
            ageText = age !== null ? age + '세' : '—';
        }
        var name = (patient && patient.name) ? patient.name : '—';
        var gender = '—';
        if (patient && patient.gender) {
            gender = patient.gender === 'male' ? '남성' : patient.gender === 'female' ? '여성' : patient.gender;
        }
        var relation = (patient && patient.relationship) ? relationshipToKorean(patient.relationship) : '—';
        var notes = (patient && patient.notes && patient.notes.trim()) ? patient.notes.trim() : '—';

        nameEl.textContent = name;
        ageEl.textContent = ageText;
        genderEl.textContent = gender;
        relationEl.textContent = relation;
        notesEl.textContent = notes;

        popup.classList.remove('hidden');
        popup.setAttribute('aria-hidden', 'false');
    }

    function closePatientPopup() {
        var popup = document.getElementById('patientPopup');
        if (popup) {
            popup.classList.add('hidden');
            popup.setAttribute('aria-hidden', 'true');
        }
    }

    global.showPatientPopup = showPatientPopup;
    global.closePatientPopup = closePatientPopup;
})(typeof window !== 'undefined' ? window : this);
