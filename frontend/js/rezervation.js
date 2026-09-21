const modal = document.getElementById("modalOverlay");
const closeCross = document.querySelectorAll(".closeCross");

const formSide = document.querySelector(".rezervation_formular");
const messageSide = document.querySelector(".submit_message");
const messageContent = document.getElementById("message_content");
const modalWindow = document.querySelector(".modal_window")
const errorMessage = document.getElementById("error_message");

const calendarEl = document.getElementById('calendar');

const formSubmitButton = document.getElementById("formSubmitButton");

document.addEventListener('DOMContentLoaded', function () {
    // kalendář
    const calendar = new FullCalendar.Calendar(calendarEl, {
        locale: 'cs',
        initialView: 'timeGridWeek',

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
        height: 'auto',
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

    // odeslní objednacího formuláře
    document.getElementById("rezervationForm").addEventListener("submit", function(e) {
        e.preventDefault();

        // telefonní číslo - odstranění mezer a kontrola délky
        const phoneValue = document.getElementById("clientTel").value.replace(/\D/g, "");

        if (phoneValue.length !== 9) {
            e.preventDefault();
            document.getElementById("clientTel").focus();
            return;
        }

        // ověření správnosti vyplněného e-mailu
        const emailInput = document.getElementById("clientEmail").value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(emailInput)) {
            e.preventDefault();
            document.getElementById("clientEmail").focus();
            return;
        }

        // ověření jména a příjmení
        const nameInput = document.getElementById("clientName").value.trim();
        const surnameInput = document.getElementById("clientSurname").value.trim();
        const nameRegex = /^[a-zA-ZáčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ\s]{2,}$/;

        if (!nameRegex.test(nameInput)) {
            e.preventDefault();
            document.getElementById("clientName").focus();
            return;
        }
        if (!nameRegex.test(surnameInput)) {
            e.preventDefault();
            document.getElementById("clientSurname").focus();
            return;
        }
        
        // získání dat z vyplněného a odeslaného formuláře
        const formData = {
            event_id: window.selectedEventId,
            name: document.getElementById("clientName").value,
            surname: document.getElementById("clientSurname").value,
            email: document.getElementById("clientEmail").value,
            phone: document.getElementById("clientTel").value,
            date: document.getElementById("selectedDateInput").value,
            note: document.getElementById("clientNotes").value
        };

        formSubmitButton.disabled = true;
        formSubmitButton.textContent = "Odesílám...";

        // posílání dat na backend přes fetch na post endpoint do server.js
        fetch('http://localhost:3000/api/reservations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(res => {
            if (res.success) {
                formSide.style.display = "none";
                messageSide.style.display = "flex";

                // upravení jméno do 5. pádu pro oslovení v potvrzovacím modalu
                let formattedNamePlace = document.getElementById("formatted_name");
                let rawName = formData.name;
                let formattedName = getVocative(rawName);
                formattedNamePlace.textContent = formattedName;

                messageContent.innerHTML = `
                    <p><strong>Jméno a příjmení:</strong> ${formData.name} ${formData.surname}</p>
                    <p><strong>Email:</strong> ${formData.email}</p>
                `;

                modalWindow.classList.add("active");
                modalWindow.classList.remove("wrong");

                calendar.refetchEvents(); 
            } else {
                errorMessage.style.display = "flex";
                modalWindow.classList.add("wrong");
                modalWindow.classList.remove("active");
                errorMessage.textContent = "Došlo k chybě, obnovte stránku a zkuste to znovu.";

                formSubmitButton.disabled = false;
                formSubmitButton.textContent = "Odeslat rezervaci";
            }
        })
        .catch(error => console.error('Chyba:', error));
    });

    if(modal.style.display != "flex"){
        document.body.classList.remove("no-scroll");
    }

    closeCross.forEach(cross => {
        cross.addEventListener("click", closeModal);
    });

    window.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeModal();
    });
});

// nastavení inputu pro tel. číslo
const phoneInput = document.getElementById("clientTel");

phoneInput.addEventListener("input", function (e) {
    // 1. Odstraní všechno, co není číslo
    let cleaned = e.target.value.replace(/\D/g, "");

    // 2. Omezení na maximálně 9 čísel
    if (cleaned.length > 9) {
        cleaned = cleaned.substring(0, 9);
    }

    // 3. Formátování po třech číslech (např. 123 456 789)
    let formatted = "";
    if (cleaned.length > 0) {
        formatted = cleaned.substring(0, 3);
    }
    if (cleaned.length > 3) {
        formatted += " " + cleaned.substring(3, 6);
    }
    if (cleaned.length > 6) {
        formatted += " " + cleaned.substring(6, 9);
    }

    // 4. Vrácení naformátovaného textu zpět do inputu
    e.target.value = formatted;
});

// nastavení inputů pro jméno a příjmení
const nameInput = document.getElementById("clientName");
const surnameInput = document.getElementById("clientSurname");

nameInput.addEventListener("input", function(e) {
    e.target.value = e.target.value.replace(/[^a-zA-ZáčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ\s]/g, "");
});

surnameInput.addEventListener("input", function(e) {
    e.target.value = e.target.value.replace(/[^a-zA-ZáčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ\s]/g, "");
});