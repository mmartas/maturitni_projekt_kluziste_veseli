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




document.addEventListener('DOMContentLoaded', function() {
    const calendarEl = document.getElementById('calendar');

    const calendar = new FullCalendar.Calendar(calendarEl, {
        locale: 'cs',
        initialView: 'timeGridWeek',
        height: '100%',
        // validRange: {
        //     start: '2026-09-01',
        //     end: '2026-10-20'
        // },

        dayHeaderDidMount: function(info) {
            if (info.view.type === "dayGridMonth") return;
            info.el.style.cursor = "pointer";
            info.el.addEventListener("click", () => {
                calendar.changeView('timeGridDay', info.date);
            });
        },

        dayMaxEvents: 3,

        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'timeGridDay,timeGridWeek,dayGridMonth'
        },

        buttonText: {
            today: "Dnes",
            week: "Týden",
            day: "Den",
            month: "Měsíc"
        },
        
        expandRows: false,
        firstDay: 1,

        slotMinTime: '06:00:00',
        slotMaxTime: '23:00:00',

        slotDuration: '01:00:00',
        slotLabelInterval: '01:00',

        allDaySlot: false,
        moreLinkText: 'další',

        events: "http://localhost:3000/api/events",

        // cursor pointer na eventy pro pronájem a obarvení eventů podle typu
        eventClassNames: function(arg) {
            const type = arg.event.extendedProps.type;
            const booked = arg.event.extendedProps.booked;

            if(type === 'rent') {
                if(!booked) {
                    return ['event-rent-available'];
                } else {
                    return ['event-rent-booked'];
                }
            } else if (type === 'public') {
                return ['event-public'];
            } else if (type === 'booked') {
                return ['event-booked'];
            } else if (type === 'maintenance') {
                return ['event-maintenance'];
            } else if (type === 'school') {
                return ['event-school'];
            }
            return [];
        },

        // otevření objednacího modalu při kliknutí na volný pronájem
        eventClick: function(info){
            const type = info.event.extendedProps.type;
            const booked = info.event.extendedProps.booked;

            if (type !== "rent" || booked) {
                return;
            }

            window.selectedEventId = info.event.id;
            openModal(info.event.startStr, info.event.endStr);
        },

        dayCellDidMount: function(info) {
            if (info.view.type === "dayGridMonth") {
                info.el.style.cursor = "pointer";
            }
        },

        dateClick: function(info) {
            if (info.view.type === "dayGridMonth") {
                calendar.changeView('timeGridDay', info.date);
            }
        },

        // nezalomení hlavičky "po 11.4." při responzivitě
        dayHeaderContent: function(arg) {
            const date = arg.date;
            const day = date.toLocaleDateString('cs-CZ', { weekday: 'short' });
            const fullDate = date.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' });
            const dayDate = date.toLocaleDateString('cs-CZ', { day: 'numeric' });

            if (arg.view.type === "dayGridMonth") {
                return {
                    html: `<span class="day-name">${day}</span>`
                };
            }

            if (arg.view.type === "timeGridWeek" && window.innerWidth <= 430) {
                return {
                    html: `
                        <div class="day-header">
                            <span class="day-name">${day}</span>
                            <span class="day-date">${dayDate}</span>
                        </div>
                    `
                };
            }

            return {
                html: `
                    <div class="day-header">
                        <span class="day-name">${day}</span>
                        <span class="day-date">${fullDate}</span>
                    </div>
                `
            };
        },
    });

    calendar.render();
    

    document.getElementById("insertEventsForm").addEventListener("submit", function(e) {
        e.preventDefault();

        let eventTitle = document.getElementById("eventTitle").value;
        let eventType = "";

        if(eventTitle === "public") {
            eventType = "public";
        } else if (eventTitle === "school") {
            eventType =  "school";
        } else if (eventTitle === "rent") {
            eventType = "rent";
        } else if (eventTitle === "maintenance") {
            eventType = "maintenance";
        } else if (eventTitle === "booked") {
            eventType = "booked";
        }

        const formData = {
            title: eventTitle,
            start: document.getElementById("eventStart").value,
            end: document.getElementById("eventEnd").value,
            type: eventType
        };

        console.log(formData);

        fetch('http://localhost:3000/api/events', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(res => {
            if(res.success) {
                calendar.refetchEvents(); 
            }
        })
        .catch(error => console.error('Chyba:', error));
    })
});