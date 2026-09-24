const menuArrow = document.querySelector("#adminMenuArrow");
const menuArrowIn = document.querySelector("#adminMenuArrow i")
const menuWrapper = document.getElementById("adminMenuWrapper");

const inboxRefreshArrow = document.getElementById("inboxRefreshArrow");

const inboxIcon = document.getElementById("inboxIcon");
const dashboardIcon = document.getElementById("dashboardIcon");
const eventsIcon = document.getElementById("eventsIcon");
const reservationsIcon = document.getElementById("reservationsIcon");

const inboxContent = document.getElementById("inbox");
const dashboardContent = document.getElementById("dashboard");
const eventsContent = document.getElementById("events");
const reservationsContent = document.getElementById("reservations");
const allContents = document.querySelectorAll("#admin_table .content");

menuArrow.addEventListener("click", () => {
    menuArrowIn.classList.toggle("active");
    menuWrapper.classList.toggle("active");
})

let currentRotation = 0;
inboxRefreshArrow.addEventListener("click", () => {
    currentRotation -= 360;
    inboxRefreshArrow.style.transform = `rotate(${currentRotation}deg)`;
})

// Pole, které propojuje ikonu, textový odkaz a odpovídající obsah
const navItems = [
    { icon: dashboardIcon, content: dashboardContent },
    { icon: eventsIcon, content: eventsContent },
    { icon: reservationsIcon, content: reservationsContent },
    { icon: inboxIcon, content: inboxContent }
];

navItems.forEach(item => {
    if (item.icon && item.content) {
        item.icon.addEventListener("click", (e) => {
            e.preventDefault();

            // 1. Zneviditelníme všechen obsah a odebereme třídu active-icon VŠEM ikonám
            allContents.forEach(content => content.classList.remove("active"));
            navItems.forEach(nav => nav.icon.classList.remove("active"));

            // 2. Zviditelníme vybraný obsah a rozsvítíme červeně aktuální ikonu
            item.content.classList.add("active");
            item.icon.classList.add("active");

            // Pokud jde o inbox, rovnou načteme zprávy
            if (item.icon === inboxIcon) {
                loadMessages();
            }
        });
    }
});

// Pokud chceš, aby byla některá ikona červená už při prvním načtení stránky (např. Dashboard):
if (dashboardIcon) {
    dashboardIcon.classList.add("active");
}



