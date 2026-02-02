// 부드러운 폼 제출 애니메이션
document.querySelector('form').addEventListener('submit', function(e) {
    e.preventDefault();
    const button = this.querySelector('.login-button');
    button.style.transform = 'scale(0.95)';
    setTimeout(() => {
        button.style.transform = 'scale(1)';
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