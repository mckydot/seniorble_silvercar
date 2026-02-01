// 위험 상황 UI 토글 기능 - 보행보조기구 낙상 감지 시스템

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
    
    // 가속도 - 비정상 증가
    const accelValue = document.querySelector('.monitor-grid .monitor-item:nth-child(3) .monitor-value');
    const accelDesc = document.querySelector('.monitor-grid .monitor-item:nth-child(3) .monitor-description');
    if (accelValue) {
        accelValue.textContent = '3.8';
        accelValue.classList.remove('safe-value');
        accelValue.classList.add('danger-value');
    }
    if (accelDesc) {
        accelDesc.textContent = '급격한 가속도 변화';
        accelDesc.style.color = 'var(--danger)';
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
    
    // 가속도 - 정상
    const accelValue = document.querySelector('.monitor-grid .monitor-item:nth-child(3) .monitor-value');
    const accelDesc = document.querySelector('.monitor-grid .monitor-item:nth-child(3) .monitor-description');
    if (accelValue) {
        accelValue.textContent = '1.2';
        accelValue.classList.remove('danger-value');
        accelValue.classList.add('safe-value');
    }
    if (accelDesc) {
        accelDesc.textContent = '정상적인 움직임';
        accelDesc.style.color = 'var(--text-light)';
    }
    
    // 충격 감지 알림 숨김
    document.querySelector('.impact-alert')?.classList.add('hidden');
    
    console.log('안전 상황 UI 활성화 - 정상 상태');
}

// 긴급 호출 버튼 클릭 이벤트
document.querySelector('.emergency-btn')?.addEventListener('click', function() {
    if (confirm('보호자에게 긴급 호출을 발송하시겠습니까?')) {
        alert('긴급 호출이 발송되었습니다.\n보호자: 정상엽\n현재 위치가 전송되었습니다.');
        // 실제 앱에서는 여기서 긴급 호출 API를 호출
    }
});

// 페이지 로드 시 초기 설정 (안전 모드)
window.addEventListener('DOMContentLoaded', function() {
    console.log('Seniorble 보행보조기구 모니터링 시스템 초기화 완료');
    
    // 충격 감지 알림은 기본적으로 숨김
    document.querySelector('.impact-alert')?.classList.add('hidden');
});