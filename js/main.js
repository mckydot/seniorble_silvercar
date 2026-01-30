const emergency_wrap = document.getElementById("emergency_wrap");
const change = document.getElementById("change");
const alertBtn = document.querySelector(".alert");
const safe = document.querySelector(".safe");
const danger = document.querySelector(".danger");
const value = document.querySelector(".value");
const inclinationValue = document.querySelector(".inclinationValue");
const inclinationValue2 = document.querySelector(".inclinationValue2");


emergency_wrap.addEventListener("click", ()=>{
    alert("긴급상황 발생!");
});

change.addEventListener("click", ()=>{
    alertBtn.classList.remove("hidden");
    danger.classList.remove("hidden");
    safe.classList.add("hidden");
    value.classList.remove("valueColor1");
    value.classList.add("valueColor2");
    inclinationValue2.classList.remove("hidden");
    inclinationValue.classList.add("hidden");
});
