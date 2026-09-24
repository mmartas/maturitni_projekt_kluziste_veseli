const menuArrow = document.querySelector("#adminMenuArrow");
const menuArrowIn = document.querySelector("#adminMenuArrow i")
const menuWrapper = document.getElementById("adminMenuWrapper");

const dashboardIcon = document.getElementById("dashboardIcon");
const eventsIcon = document.getElementById("eventsIcon");
const reservationsIcon = document.getElementById("reservationsIcon");
const inboxIcon = document.getElementById("inboxIcon");

const dashboardContent = document.getElementById("dashboard");
const eventsContent = document.getElementById("events");
const reservationsContent = document.getElementById("reservations");
const inboxContent = document.getElementById("inbox");
const allContents = document.querySelectorAll("#adminContent .content");

const inboxRefreshArrow = document.getElementById("inboxRefreshArrow");

// vysunutí meníčka v levém admin panelu po kliknutí na šipku + (otočení šipky animací)
menuArrow.addEventListener("click", () => {
    menuArrowIn.classList.toggle("active");
    menuWrapper.classList.toggle("active");
})

// logika animovaného otáčení refresh šipky v content části admin panelu
let currentRotation = 0;
inboxRefreshArrow.addEventListener("click", () => {
    currentRotation -= 360;
    inboxRefreshArrow.style.transform = `rotate(${currentRotation}deg)`;
})

// pole, které propojuje ikonu, textový odkaz a obsah v celém admin panelu
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

            allContents.forEach(content => content.classList.remove("active"));
            navItems.forEach(nav => nav.icon.classList.remove("active"));

            item.content.classList.add("active");
            item.icon.classList.add("active");
        });
    }
});

// po každém obnovení stránky pro jistotu znovunačtení zpráv a aktualizace odznáčku s počtem nepřečtených zpráv
// + ošetření toho, aby se v 5s intervalu stránka nerefreshnula zrovna pokud má admin rozkliknutý nějaký email
document.addEventListener("DOMContentLoaded", function() {
    loadMessages();
    updateUnreadBadge();
    setInterval(() => {
        const hasExpandedMessage = document.querySelector('.one_message.expanded');
        if(!hasExpandedMessage) {
            loadMessages();
            updateUnreadBadge();
        }
    }, 5000);
});