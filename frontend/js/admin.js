const menuArrow = document.getElementById("menuArrow");
const menuWrapper = document.getElementById("adminMenuWrapper");

menuArrow.addEventListener("click", () => {
    menuArrow.classList.toggle("active");
    menuWrapper.classList.toggle("active");
});