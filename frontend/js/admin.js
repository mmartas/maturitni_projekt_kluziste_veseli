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

const adminEventsForm = document.getElementById("insertEventsForm");

const adminRefreshArrow = document.getElementById("adminRefreshArrow");

const today = new Date().toISOString().split('T')[0];

const deleteBtn = document.getElementById("deleteBtn");
const cancelBtn = document.getElementById("cancelBtn");
const submitBtn = document.getElementById("submitBtn");

const limitDateInput = document.getElementById("limitDate");
const dashboardLimitDate = document.getElementById("endEventsDate");

const bookedClientName = document.getElementById("bookedClientName");
const clientInfo = document.querySelectorAll(".clientInfo");
let adminBookedClientName = document.getElementById("adminBookedClientName");

const countAllRentDates = document.getElementById("countAllRentDates");
const countFreeRentDates = document.getElementById("countFreeRentDates");
const countRentedDates = document.getElementById("countRentedDates");

let changeEventTitle = document.getElementById("eventTitle");

let savedLimitDate = null; // Globální proměnná pro uložení limitu

let calendar;
let calendarInitialized = false;

let currentEditingId = null;
let currentEventIsBooked = false;

// vysunutí meníčka v levém admin panelu po kliknutí na šipku + (otočení šipky animací)
menuArrow.addEventListener("click", () => {
    menuArrowIn.classList.toggle("active");
    menuWrapper.classList.toggle("active");
})

// logika animovaného otáčení refresh šipky v content části admin panelu
let currentRotation = 0;
adminRefreshArrow.addEventListener("click", () => {
    currentRotation -= 360;
    adminRefreshArrow.style.transform = `rotate(${currentRotation}deg)`;
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

            if (item.content === eventsContent) {
                const calendarEl = document.getElementById('calendar');

                calendar = new FullCalendar.Calendar(calendarEl, {
                    locale: 'cs',
                    initialView: 'timeGridWeek',
                    height: '100%',

                    validRange: {
                        end: savedLimitDate ? savedLimitDate : undefined // Pokud je z DB načtené datum, použije se
                    },

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

                    eventClick: function(info) {
                        currentEditingId = info.event.id;
                        
                        // Spolehlivá detekce: Zjistíme, zda má event rezervaci (podle booked příznaku nebo přítomnosti příjmení klienta)
                        const props = info.event.extendedProps;
                        currentEventIsBooked = (props.booked === true || props.booked === 1);

                        const eventType = props.type;

                        document.getElementById("eventTitle").value = eventType;

                        const clientNameInput = adminBookedClientName;
                        const clientSurnameInput = document.getElementById("adminBookedClientSurname");
                        const clientTelInput = document.getElementById("adminBookedClientTel");
                        const clientEmailInput = document.getElementById("adminBookedClientEmail");

                        if (currentEventIsBooked) {
                            // Zobrazíme políčka klienta
                            clientInfo.forEach(element => element.classList.add("active"));

                            // Vyplníme data, která přišla z databáze přes extendedProps
                            clientNameInput.value = props.client_name || "";
                            clientSurnameInput.value = props.client_surname || "";
                            clientTelInput.value = props.client_phone || "";
                            clientEmailInput.value = props.client_email || "";
                        } else {
                            clientInfo.forEach(element => element.classList.remove("active"));
                            clientNameInput.value = "";
                            clientSurnameInput.value = "";
                            clientTelInput.value = "";
                            clientEmailInput.value = "";
                        }

                        document.getElementById("eventStart").value = info.event.startStr.slice(0, 16);
                        document.getElementById("eventEnd").value = info.event.endStr ? info.event.endStr.slice(0, 16) : "";

                        document.getElementById("submitBtn").textContent = "Potvrdit změny";
                        
                        if (currentEventIsBooked) {
                            deleteBtn.textContent = "Zrušit rezervaci"; // Jasně vidíme, že budeme rušit jen rezervaci
                        } else {
                            deleteBtn.textContent = "Odstranit událost"; // Budeme mazat celý event
                        }

                        deleteBtn.style.display = "inline-block";
                        document.getElementById("cancelBtn").style.display = "inline-block";
                    },

                    // cursor pointer na eventy pro pronájem a obarvení eventů podle typu
                    eventClassNames: function(arg) {
                        const type = arg.event.extendedProps.type;
                        const booked = arg.event.extendedProps.booked;

                        if(type === 'rent') {
                            if(!booked) {
                                return ['event-rent'];
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
                calendarInitialized = true;
            } else {
                setTimeout(() => {
                    calendar.updateSize();
                }, 50);
            }
        });
    }
});

// zobrazení inputů pro vyplnění údajů, po kliku na rezervovaný termín
changeEventTitle.addEventListener("change", function(e) {
    if(this.value === "booked") {
        clientInfo.forEach(element => {
            element.classList.add("active");
        })
    } else {
        clientInfo.forEach(element => {
            element.classList.remove("active");
        })
    }
})

// načítání z databáze uložené datum limitu rozsahu rozpisu
document.addEventListener("DOMContentLoaded", function() {

    fetch('http://localhost:3000/api/setting')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // 1. Nastavení limitního data (původní logika)
                if (data.limitDate) {
                    savedLimitDate = data.limitDate.split('T')[0];
                    limitDateInput.value = savedLimitDate;

                    const [year, month, day] = savedLimitDate.split('-');
                    const formattedDate = `${day}.${month}.${year}`;
                
                    dashboardLimitDate.innerHTML = formattedDate;
                }

                // 2. Vypsání statistik do tvých elementů
                if (countAllRentDates) countAllRentDates.textContent = data.allCount;
                if (countFreeRentDates) countFreeRentDates.textContent = data.freeCount;
                if (countRentedDates) countRentedDates.textContent = data.bookedCount;
            }
        })
    .catch(error => console.error('Chyba při načítání nastavení:', error));

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

// nastavení rozsahu zobrazení rozpisu - kalendáře
limitDateInput.addEventListener("change", function() {
    const selectedDate = this.value;
    const today = new Date().toISOString().split('T')[0];

    // 1. Odešleme data na backend do tabulky setting
    fetch('http://localhost:3000/api/setting', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ limitDate: selectedDate })
    })
    .then(response => response.json())
    .then(res => {
        if (res.success) {
            calendar.setOption('validRange', {
                end: selectedDate
            });
        }
    })
    .catch(error => console.error('Chyba při ukládání:', error));
});

cancelBtn.addEventListener("click", function() {
    resetFormMode();
});

adminEventsForm.addEventListener("submit", function(e) {
    e.preventDefault();

    const selectedType = document.getElementById("eventTitle").value;
    const clientNameVal = adminBookedClientName.value;
    const clientSurnameVal = document.getElementById("adminBookedClientSurname").value;
    const clientTelVal = document.getElementById("adminBookedClientTel").value;
    const clientEmailVal = document.getElementById("adminBookedClientEmail").value;
    
    let eventType = selectedType;
    let eventTitleText = "";

    if(selectedType === "public") eventTitleText = "Veřejné bruslení";
    else if (selectedType === "school") eventTitleText = "Školní akce";
    else if (selectedType === "rent") eventTitleText = "Možnost pronájmu";
    else if (selectedType === "maintenance") eventTitleText = "Údržba ledu";
    else if (selectedType === "booked") {
        eventTitleText = "Možnost pronájmu";
        eventType = "rent";
    }

    let finalTitle = eventTitleText;
    // if (selectedType === "booked" && clientNameVal.trim() !== "") {
    //     finalTitle = `${eventTitleText} (${clientNameVal})`;
    // }

    const startVal = document.getElementById("eventStart").value;
    const endVal = document.getElementById("eventEnd").value;

    // TADY PŘIDÁVÁME KLIENTSKSÁ DATA DO FORMULAR DATA
    const formData = {
        title: finalTitle,
        start: startVal,
        end: endVal,
        type: eventType,
        name: clientNameVal,
        surname: clientSurnameVal,
        phone: clientTelVal,
        email: clientEmailVal,
        date: startVal // Pro tabulku reservations (sloupec date)
    };

    const url = currentEditingId 
        ? `http://localhost:3000/api/events/${currentEditingId}` 
        : 'http://localhost:3000/api/events';
    
    const method = currentEditingId ? 'PUT' : 'POST';

    fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(res => {
        if(res.success) {
            calendar.refetchEvents(); 
            resetFormMode(); 
        }
    })
    .catch(error => console.error('Chyba:', error));
});

// tlačítko pro smazání rezervace ve formuláři
deleteBtn.addEventListener("click", function() {
    if (!currentEditingId) return;

    // Zjistíme aktuální stav přímo z kalendáře
    const event = calendar.getEventById(currentEditingId);
    const isBooked = event.extendedProps.booked;

    if (isBooked) {
        // SCÉNÁŘ A: Jde o rezervaci -> mažeme POUZE rezervaci v tabulce reservations, event v events zůstane!
        if (confirm("Opravdu chceš zrušit tuto rezervaci? Blok v kalendáři zůstane a vrátí se jako volný pronájem.")) {
            fetch(`http://localhost:3000/api/reservations/by-event/${currentEditingId}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(res => {
                if (res.success) {
                    calendar.refetchEvents();
                    resetFormMode();
                } else {
                    alert("Nepodařilo se zrušit rezervaci.");
                }
            })
            .catch(error => console.error('Chyba při rušení rezervace:', error));
        }
    } else {
        // SCÉNÁŘ B: Jde o obyčejný volný event -> mažeme celou událost z tabulky events!
        if (confirm("Opravdu chceš tuto událost smazat?")) {
            fetch(`http://localhost:3000/api/events/${currentEditingId}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(res => {
                if (res.success) {
                    calendar.refetchEvents();
                    resetFormMode();
                }
            })
            .catch(error => console.error('Chyba při mazání události:', error));
        }
    }
});