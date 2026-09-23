const menuArrow = document.getElementById("menuArrow");
const menuWrapper = document.getElementById("adminMenuWrapper");

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
    menuArrow.classList.toggle("active");
    menuWrapper.classList.toggle("active");
});

singlePageAdmin(inboxIcon, inboxContent, allContents);
singlePageAdmin(eventsIcon, eventsContent, allContents);
singlePageAdmin(reservationsIcon, reservationsContent, allContents);
singlePageAdmin(dashboardIcon, dashboardContent, allContents);



