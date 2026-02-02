// 부드러운 폼 제출 애니메이션
document.querySelector('form').addEventListener('submit', function(e) {
    e.preventDefault();
    const button = this.querySelector('.login-button');
    button.style.transform = 'scale(0.95)';
    setTimeout(() => {
        button.style.transform = 'scale(1)';
        // 실제 앱에서는 여기서 로그인 API 호출
        alert('로그인 기능은 백엔드 연동 후 작동합니다.');
    }, 200);
});

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

// 모바일에서 viewport height 조정 (주소창 문제 해결)
function setVH() {
    let vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}
setVH();
window.addEventListener('resize', setVH);