const modal = document.getElementById("modalOverlay");
const closeCross = document.querySelectorAll(".closeCross");

const formSide = document.querySelector(".rezervation_formular");
const messageSide = document.querySelector(".submit_message");
const messageContent = document.getElementById("message_content");
const modalWindow = document.querySelector(".modal_window")
const errorMessage = document.getElementById("error_message");

const calendarEl = document.getElementById('calendar');

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

        // cursor pointer na políčka "možnost pronájmu"
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

        // otevření modalu při kliknutí na políčko "možnost pronájmu"
        eventClick: function(info){
            const type = info.event.extendedProps.type;
            const booked = info.event.extendedProps.booked;

            if (type !== "rent" || booked) {
                return;
            }

            window.selectedEventId = info.event.id; // Uložíme ID vybraného eventu do globální proměnné
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

        /* nezalomení hlavičky "po 11.4." při responzivitě */
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

    // formulář
    document.getElementById("rezervationForm").addEventListener("submit", function(e) {
        e.preventDefault();

        // 1. Získáme hodnotu z telefonu a odstraníme z ní mezery
        const phoneValue = document.getElementById("clientTel").value.replace(/\D/g, "");

        // 2. Ověříme, jestli má přesně 9 čísel
        if (phoneValue.length !== 9) {
            // Zastavíme odeslání formuláře
            e.preventDefault();
            
            // Upozorníme uživatele
            alert("Telefonní číslo musí obsahovat přesně 9 čísel!");
            
            // Vrátíme kurzor do políčka pro telefon
            document.getElementById("clientTel").focus();
            return;
        }

        const emailInput = document.getElementById("clientEmail").value.trim();

        // Regulární výraz pro ověření platného e-mailu
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(emailInput)) {
            alert("Zadejte platnou e-mailovou adresu (např. jan@email.cz)!");
            e.preventDefault(); // Zastaví odeslání formuláře
            document.getElementById("clientEmail").focus();
            return;
        }

        const nameInput = document.getElementById("clientName").value.trim();
        const surnameInput = document.getElementById("clientSurname").value.trim();

        // Regulární výraz pro ověření, že řetězec obsahuje pouze písmena a mezery
        const nameRegex = /^[a-zA-ZáčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ\s]{2,}$/;

        if (!nameRegex.test(nameInput) || !nameRegex.test(surnameInput)) {
            e.preventDefault();
            alert("Jméno a příjmení musí obsahovat pouze platná písmena (minimálně 2 znaky)!");
            return;
        }
        
        // 1. Získáme data z formuláře
        const formData = {
            event_id: window.selectedEventId, // Přibalíme ID vybraného eventu z kalendáře
            name: document.getElementById("clientName").value,     // Uprav si podle reálných ID tvých inputů ve formuláři
            surname: document.getElementById("clientSurname").value, // Uprav si podle reálných ID tvých inputů ve formuláři
            email: document.getElementById("clientEmail").value,    // Uprav si podle reálných ID tvých inputů ve formuláři
            phone: document.getElementById("clientTel").value,    // Uprav si podle reálných ID tvých inputů ve formuláři
            date: document.getElementById("selectedDateInput").value,    // Uprav
            note: document.getElementById("clientNotes").value    // Uprav
        };

        console.log("Odesílám data:", formData); // Pro kontrolu, co se odesílá

        // 2. Pošleme data přes fetch na náš nový POST endpoint do server.js
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

                // Klíčový krok: Přinutí FullCalendar znova stáhnout data a překreslit slot na červeno ("Obsazeno")
                calendar.refetchEvents(); 
            } else {
                errorMessage.style.display = "flex";
                modalWindow.classList.add("wrong");
                modalWindow.classList.remove("active");
                errorMessage.textContent = "Došlo k chybě, obnovte stránku a zkuste to znovu.";
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


// Příklad funkce, která se zavolá po odeslání tvého modálního formuláře:
function handleReservationSubmit(eventData) {
    fetch('http://localhost:3000/api/reservations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData) // např. { event_id, name, email }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // 1. Zavřeme modal
            closeModal();
            
            // 2. Klíčový krok: Přinutíme FullCalendar znova stáhnout data z backendu!
            calendar.refetchEvents(); 
        } else {
            alert("Chyba: " . data.error);
        }
    })
    .catch(error => console.error('Chyba:', error));
}

// konfigurace vyplnění telefonního čísla s mezerami po 3 číslech
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

// Pro pole jména (a stejně tak můžeš použít pro příjmení)
const nameInput = document.getElementById("clientName");
const surnameInput = document.getElementById("clientSurname");

nameInput.addEventListener("input", function(e) {
    // Povolí pouze písmena (včetně české diakritiky) a mezery
    e.target.value = e.target.value.replace(/[^a-zA-ZáčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ\s]/g, "");
});

surnameInput.addEventListener("input", function(e) {
    // Povolí pouze písmena (včetně české diakritiky) a mezery
    e.target.value = e.target.value.replace(/[^a-zA-ZáčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ\s]/g, "");
});


function getVocative(name) {
    if (!name) return "";
    
    let trimmed = name.trim();
    let lower = trimmed.toLowerCase();
    let lastChar = lower.slice(-1);
    let lastTwo = lower.slice(-2);
    
    // 1. Ženská nebo domácká jména končící na -a (Martina -> Martino, Anna -> Anno, Franta -> Franto)
    if (lastChar === 'a') {
        return trimmed.slice(0, -1) + 'o';
    }
    
    // 2. Mužská jména končící na -ek (Zdeněk -> Zdeňku, Hynek -> Hynku)
    if (lastTwo === 'ek') {
        return trimmed.slice(0, -2) + 'ku';
    }
    
    // 3. Jména končící na měkkou/obojetnou souhlásku (Tomáš -> Tomáši, Aleš -> Aleši)
    if (['ž', 'š', 'č', 'ř', 'c', 'j'].includes(lastChar)) {
        if (lower === 'jiří') return 'Jiří'; // Výjimka
        return trimmed + 'i';
    }
    
    // 4. Jména končící na h, ch, g (Ondřej - ne, ale např. Bohuš... h/ch/g -> u)
    if (['h', 'ch', 'g'].includes(lastChar)) {
        return trimmed + 'u';
    }
    
    // 5. Ostatní souhlásky (Filip -> Filipe, Petr -> Petře, Martin -> Martine, Pavel -> Pavle)
    const consonants = ['b', 'd', 'f', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'z'];
    if (consonants.includes(lastChar)) {
        return trimmed + 'e';
    }
    
    // Výchozí fallback, pokud by jméno nespadalo do žádné pravidla
    return trimmed;
}