const menuArrow = document.querySelector("#adminMenuArrow");
const menuArrowIn = document.querySelector("#adminMenuArrow i")
const menuWrapper = document.getElementById("adminMenuWrapper");

const dashboardIcon = document.getElementById("dashboardIcon");
const eventsIcon = document.getElementById("eventsIcon");
const reservationsIcon = document.getElementById("reservationsIcon");
const inboxIcon = document.getElementById("inboxIcon");
const customersIcon = document.getElementById("customersIcon");

const dashboardContent = document.getElementById("dashboard");
const eventsContent = document.getElementById("events");
const reservationsContent = document.getElementById("reservations");
const inboxContent = document.getElementById("inbox");
const customersContent = document.getElementById("customers");
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

let changeEventTitle = document.getElementById("eventTitle");

let savedLimitDate = null; // Globální proměnná pro uložení limitu

let calendar;
let calendarInitialized = false;

let currentEditingId = null;
let currentEventIsBooked = false;

// vysunutí meníčka v levém admin panelu po kliknutí na šipku + (otočení šipky animací)
menuArrow.addEventListener("click", (e) => {
    e.preventDefault();
    menuArrowIn.classList.toggle("active");
    menuWrapper.classList.toggle("active");
})

// logika animovaného otáčení refresh šipky v content části admin panelu
let currentRotation = 0;
adminRefreshArrow.addEventListener("click", (e) => {
    e.preventDefault();
    
    currentRotation -= 360;
    adminRefreshArrow.style.transform = `rotate(${currentRotation}deg)`;
    setTimeout(() => {
        window.location.reload();
    }, 200);
})

function addOneDay(dateStr) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
}

function initCalendar() {
    if (calendarInitialized) {
        if (calendar) {
            setTimeout(() => {
                calendar.render();
                calendar.updateSize();
            }, 50);
        }
        return;
    }

    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;

    calendar = new FullCalendar.Calendar(calendarEl, {
        locale: 'cs',
        initialView: 'timeGridWeek',
        height: '100%',

        validRange: {
            end: savedLimitDate ? addOneDay(savedLimitDate) : undefined
        },

        dayHeaderDidMount: function(info) {
            if (info.view.type === "dayGridMonth") return;
            info.el.style.cursor = "pointer";
            info.el.addEventListener("click", () => {
                calendar.changeView('timeGridDay', info.date);
            });
        },

        dayMaxEvents: 3,

        // 1. Definice vlastního tlačítka
        customButtons: {
            printButton: {
            text: "",
            click: function() {
                window.print(); // Spustí tiskový dialog prohlížeče
            }
            }
        },

        headerToolbar: {
            left: 'prev,next today printButton',
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
            
            const props = info.event.extendedProps;
            currentEventIsBooked = (props.booked === true || props.booked === 1);

            const eventType = props.type;

            document.getElementById("eventTitle").value = eventType;

            const clientNameInput = adminBookedClientName;
            const clientSurnameInput = document.getElementById("adminBookedClientSurname");
            const clientTelInput = document.getElementById("adminBookedClientTel");
            const clientEmailInput = document.getElementById("adminBookedClientEmail");

            if (currentEventIsBooked) {
                clientInfo.forEach(element => element.classList.add("active"));
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

            document.getElementById("submitBtn").title = "Potvrdit změny";
            
            if (currentEventIsBooked) {
                deleteBtn.title = "Zrušit rezervaci";
            } else {
                deleteBtn.title = "Odstranit událost";
            }

            deleteBtn.style.display = "inline-block";
            document.getElementById("cancelBtn").style.display = "inline-block";
        },

        eventClassNames: function(arg) {
            const type = arg.event.extendedProps.type;
            const booked = arg.event.extendedProps.booked;

            if(type === 'rent') {
                if(!booked) return ['event-rent'];
                else return ['event-rent-booked'];
            } else if (type === 'public') return ['event-public'];
            else if (type === 'booked') return ['event-booked'];
            else if (type === 'maintenance') return ['event-maintenance'];
            else if (type === 'school') return ['event-school'];
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

        dayHeaderContent: function(arg) {
            const date = arg.date;
            const day = date.toLocaleDateString('cs-CZ', { weekday: 'short' });
            const fullDate = date.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' });
            const dayDate = date.toLocaleDateString('cs-CZ', { day: 'numeric' });

            if (arg.view.type === "dayGridMonth") {
                return { html: `<span class="day-name">${day}</span>` };
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
        }
    });

    calendar.render();
    calendarInitialized = true;
}

// 1. Načtení CSS proměnné z :root (document.documentElement)
const greenColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--green-color-lighter')
    .trim();

// Příklad s případnou další proměnnou (např. pro červenou)
const redColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--red-color-lighter')
    .trim() || '#dc3545';

const blueColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--blue-color-lighter')
    .trim();

const yellowColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--yellow-color-lighter')
    .trim();

// 1. Event listenery, které zajistí, že se prvky navzájem čistí při změně
document.addEventListener("DOMContentLoaded", () => {
    const startInput = document.getElementById('chartStartDate');
    const endInput = document.getElementById('chartEndDate');
    const seasonSelect = document.getElementById('filterSeason');
    const monthSelect = document.getElementById('filterMonth');

    // Když uživatel změní sezónu nebo měsíc, vymažeme ruční datumy v inputech
    [seasonSelect, monthSelect].forEach(element => {
        if (element) {
            element.addEventListener('change', () => {
                if (startInput) startInput.value = '';
                if (endInput) endInput.value = '';
            });
        }
    });

    // Když uživatel začne vybírat ruční datum, vymažeme sezónu i měsíc
    [startInput, endInput].forEach(element => {
        if (element) {
            element.addEventListener('change', () => {
                if (seasonSelect) seasonSelect.value = '';
                if (monthSelect) monthSelect.value = '';
            });
        }
    });
});

function getChartDateRangeParams() {
    const startInput = document.getElementById('filterStartDate');
    const endInput = document.getElementById('filterEndDate');
    const seasonSelect = document.getElementById('filterSeason');
    const monthSelect = document.getElementById('filterMonth');

    const hasDates = startInput?.value && startInput.value !== '' && endInput?.value && endInput.value !== '';
    const hasSeason = seasonSelect?.value && seasonSelect.value !== '';
    const hasMonth = monthSelect?.value && monthSelect.value !== '';

    // KONTROLA: Měsíc vybraný bez sezóny
    if (hasMonth && !hasSeason) {
        alert('Prosím vyberte nejdříve sezónu, ke které chcete měsíc filtrovat.');
        return null; // Vracíme null místo prázdného řetězce, abychom dali vědět, že nastala chyba
    }

    let startDate = '';
    let endDate = '';

    // SCÉNÁŘ A: Sezóna / Měsíc
    if (hasSeason) {
        if (startInput) startInput.value = '';
        if (endInput) endInput.value = '';

        const [startYearStr, endYearStr] = seasonSelect.value.split('/');
        const startYear = parseInt(startYearStr);
        const endYear = parseInt(endYearStr);

        if (hasMonth) {
            const mNum = parseInt(monthSelect.value);
            const year = (mNum >= 10 && mNum <= 12) ? startYear : endYear;
            const mStr = monthSelect.value.padStart(2, '0');
            const lastDay = new Date(year, mNum, 0).getDate();
            
            startDate = `${year}-${mStr}-01`;
            endDate = `${year}-${mStr}-${lastDay}`;
        } else {
            startDate = `${startYear}-10-01`;
            endDate = `${endYear}-04-30`;
        }
    }
    // SCÉNÁŘ B: Ruční datum
    else if (hasDates) {
        startDate = startInput.value;
        endDate = endInput.value;

        if (seasonSelect) seasonSelect.value = '';
        if (monthSelect) monthSelect.value = '';
    }

    // Sestavení URL parametrů
    let params = '';
    if (startDate && endDate) {
        params = `?startDate=${startDate}&endDate=${endDate}`;
    }
    return params;
}

// 1. První graf (bloky)
function loadBlocksChart() {
    const queryParams = getChartDateRangeParams();

    fetch(`http://localhost:3000/api/admin-blocks-stats${queryParams}`)
        .then(response => response.json())
        .then(res => {
            if (!res.success) return;

            // Nastavení výchozích hodnot do inputů, pokud jsou prázdné
            const startInput = document.getElementById('chartStartDate');
            const endInput = document.getElementById('chartEndDate');
            
            if (startInput && !startInput.value) startInput.value = res.defaultStart;
            if (endInput && !endInput.value) endInput.value = res.defaultEnd; // Tady se teď správně doplní limitDate!

            const totalBlocks = res.allCount;
            const freeBlocks = res.freeCount;
            const occupiedBlocks = res.bookedCount;

            const freePercent = totalBlocks > 0 ? ((freeBlocks / totalBlocks) * 100).toFixed(1) : 0;
            const occupiedPercent = totalBlocks > 0 ? ((occupiedBlocks / totalBlocks) * 100).toFixed(1) : 0;

            const ctx = document.getElementById('blocksDoughnutChart').getContext('2d');

            if (window.blocksChartInstance) {
                window.blocksChartInstance.destroy();
            }

            window.blocksChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: [
                        `Volné ${freeBlocks}/${totalBlocks} ${freePercent} %`, 
                        `Obsazené ${occupiedBlocks}/${totalBlocks} ${occupiedPercent} %`
                    ],
                    datasets: [{
                        data: [freeBlocks, occupiedBlocks],
                        backgroundColor: [greenColor, redColor],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: '#ffffff', font: { size: 13 }, boxWidth: 12, boxHeight: 12 }
                        },
                        tooltip: {
                            callbacks: {
                                title: function() { return ''; },
                                label: function(context) {
                                    return ` ${context.label.split('(')[0].trim()}`;
                                }
                            }
                        }
                    }
                },
                plugins: [{
                    id: 'centerText',
                    beforeDraw: function(chart) {
                        const width = chart.width;
                        const height = chart.height;
                        const ctx = chart.ctx;
                        ctx.restore();

                        const fontSize = (height / 114).toFixed(2);
                        ctx.font = `bold ${fontSize}em sans-serif`;
                        ctx.textBaseline = 'middle';
                        ctx.fillStyle = '#ffffff';

                        const text = `${totalBlocks}`;
                        const textX = Math.round((width - ctx.measureText(text).width) / 2);
                        const textY = height / 2 - 15;
                        ctx.fillText(text, textX, textY);
                        ctx.save();
                    }
                }]
            });

            if (res.limitDate) {
                savedLimitDate = res.limitDate.split('T')[0];
                if (limitDateInput) limitDateInput.value = savedLimitDate;

                const [year, month, day] = savedLimitDate.split('-');
                const formattedDate = `${day}.${month}.${year}`;
                
                if (dashboardLimitDate) {
                    dashboardLimitDate.innerHTML = formattedDate;
                }
            }
        })
        .catch(err => console.error("Chyba při načítání prvního grafu:", err));
}

// 2. Druhý graf (typy událostí)
function loadEventTypesChart() {
    const queryParams = getChartDateRangeParams();

    fetch(`http://localhost:3000/api/admin-event-types-stats${queryParams}`)
        .then(response => response.json())
        .then(res => {
            if (!res.success || !res.stats) return;

            // Pojistka pro vyplnění inputů i z tohoto grafu, pokud by první doběhl později
            const startInput = document.getElementById('chartStartDate');
            const endInput = document.getElementById('chartEndDate');
            
            if (startInput && !startInput.value && res.defaultStart) startInput.value = res.defaultStart;
            if (endInput && !endInput.value && res.defaultEnd) endInput.value = res.defaultEnd;

            const statsMap = {};
            res.stats.forEach(item => {
                statsMap[item.type] = item.count;
            });

            const rentCount = statsMap['rent'] || 0;
            const schoolCount = statsMap['school'] || 0;
            const publicCount = statsMap['public'] || 0;

            const ctx = document.getElementById('eventTypesChart').getContext('2d');
            
            if (window.eventTypesChartInstance) {
                window.eventTypesChartInstance.destroy();
            }

            window.eventTypesChartInstance = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: ['Pronájmy', 'Školní akce', 'Veřejné bruslení'],
                    datasets: [{
                        data: [rentCount, schoolCount, publicCount],
                        backgroundColor: [greenColor, blueColor, yellowColor],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: '#ffffff', font: { size: 12 }, boxHeight: 12, boxWidth: 12 }
                        }
                    }
                }
            });
        })
        .catch(err => console.error("Chyba při načítání statistik typů událostí:", err));
}

// 3. Třetí graf (Top 5 zákazníků)
function loadTopCustomersChart() {
    fetch('http://localhost:3000/api/admin-top-customers')
        .then(response => response.json())
        .then(res => {
            console.log("Data pro top zákazníky:", res); // Pro kontrolu v konzoli (F12)

            if (!res.success || !res.customers) {
                console.warn("Server nevrátil data pro top zákazníky.");
                return;
            }

            const canvas = document.getElementById('topCustomersChart');
            if (!canvas) {
                console.error("Element #topCustomersChart nebyl v HTML nalezen!");
                return;
            }

            // Extrahujeme jména a počty pro graf
            const labels = res.customers.map(c => c.customer_name);
            const data = res.customers.map(c => c.order_count);

            const ctx = canvas.getContext('2d');
            
            if (window.topCustomersChartInstance) {
                window.topCustomersChartInstance.destroy();
            }

            window.topCustomersChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Počet rezervací',
                        data: data,
                        backgroundColor: blueColor,
                        borderWidth: 0,
                        borderRadius: 4
                    }]
                },
                options: {
                    indexAxis: 'y', // Horizontální sloupcový graf
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        x: {
                            beginAtZero: true,
                            ticks: {
                                color: '#ffffff',
                                stepSize: 1
                            },
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            }
                        },
                        y: {
                            ticks: {
                                color: '#ffffff',
                                font: { size: 12 }
                            },
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            });
        })
        .catch(err => console.error("Chyba při načítání top zákazníků pro graf:", err));
}

// Posluchač pro tlačítko filtru grafů
document.addEventListener("DOMContentLoaded", () => {
    const filterBtn = document.getElementById('filterChartsBtn');
    if (filterBtn) {
        filterBtn.addEventListener('click', (e) => {
            e.preventDefault();

            const queryParams = getChartDateRangeParams();
            if (queryParams === null) {
                return; // Ukončíme funkci, nikam se data neodesílají, nic se nemění
            }
            
            loadBlocksChart();
            loadEventTypesChart();
            loadTopCustomersChart();
        });
    }
});


// pole, které propojuje ikonu, textový odkaz a obsah v celém admin panelu
const navItems = [
    { icon: dashboardIcon, content: dashboardContent },
    { icon: eventsIcon, content: eventsContent },
    { icon: reservationsIcon, content: reservationsContent },
    { icon: inboxIcon, content: inboxContent },
    { icon: customersIcon, content: customersContent }
];

// Pomocná funkce pro přepnutí sekce a uložení do URL
function showSection(item) {
    allContents.forEach(content => content.classList.remove("active"));
    navItems.forEach(nav => nav.icon.classList.remove("active"));

    item.content.classList.add("active");
    item.icon.classList.add("active");

    // Pokud má content své ID, uložíme ho do URL jako hash (např. admin.html#inbox)
    if (item.content.id) {
        window.location.hash = item.content.id;
    }

    if (item.content === dashboardContent) {
        loadBlocksChart();
        loadEventTypesChart();
        loadTopCustomersChart();
    }

    if (item.content === eventsContent) {
        setTimeout(() => {
            initCalendar();
        }, 50);
    }

    if (item.content === reservationsContent) {
        loadAdminReservations();
    }

    if (item.content === customersContent) {
        loadCustomers();
    }
}

navItems.forEach(item => {
    if (item.icon && item.content) {
        item.icon.addEventListener("click", (e) => {
            e.preventDefault();

            showSection(item);
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

    // 2. Po načtení stránky zkontrolujeme, zda je v URL hash
    const currentHash = window.location.hash.substring(1); // získá např. "inbox" z "#inbox"

    if (currentHash) {
        // Najdeme správnou položku v poli navItems podle ID obsahu
        const targetItem = navItems.find(item => item.content && item.content.id === currentHash);
        if (targetItem) {
            showSection(targetItem);
            return; // Ukončíme, ať se nespouští výchozí dashboard
        }
    }

    // Výchozí fallback (pokud v URL žádný hash není, otevře se dashboard nebo první položka)
    const defaultItem = navItems.find(item => item.content && item.content.id === 'dashboard') || navItems[0];
    if (defaultItem) {
        showSection(defaultItem);
    }
});

// nastavení rozsahu zobrazení rozpisu - kalendáře
limitDateInput.addEventListener("change", function() {
    const selectedDate = this.value;
    //const today = new Date().toISOString().split('T')[0];
    const nextDay = addOneDay(selectedDate);

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
                end: nextDay
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


function loadAdminReservations() {
    const listContainer = document.getElementById("reservationsList");
    if (!listContainer) return;

    fetch('http://localhost:3000/api/admin-reservations')
        .then(response => response.json())
        .then(res => {
            if (!res.success || !res.events) return;

            const events = res.events;
            listContainer.innerHTML = ""; // Vyčistíme starý obsah

            // 1. Získání dnešního a zítřejšího data v lokálním čase bez UTC chyb
            const now = new Date();
            const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

            // 2. Seskupení událostí podle data
            const groupedByDate = {};
            events.forEach(ev => {
                // Bezpečné uříznutí prvních 10 znaků (vezme "YYYY-MM-DD" bez ohledu na mezeru nebo 'T')
                const dateKey = ev.start.substring(0, 10); 
                
                if (!groupedByDate[dateKey]) {
                    groupedByDate[dateKey] = [];
                }
                groupedByDate[dateKey].push(ev);
            });

            // 2. Procházení jednotlivých dnů a generování HTML
            for (const [dateStr, dayEvents] of Object.entries(groupedByDate)) {
                const totalCount = dayEvents.length;
                const bookedCount = dayEvents.filter(ev => ev.reservation_id).length;

                // Formátování data pro zobrazení
                const dateObj = new Date(dateStr);
                const dayOfWeek = dateObj.toLocaleDateString('cs-CZ', { weekday: 'long' });
                const formattedDate = dateObj.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' });

                // Vytvoření kontejneru pro daný den
                const dayWrapper = document.createElement("div");
                dayWrapper.className = "reservation-day-group";
                
                let dayLabel = "";
                if (dateStr === todayStr) {
                    dayLabel = `Dnes, ${formattedDate}, ${dayOfWeek}`;
                    dayWrapper.classList.add("today");
                } else if (dateStr === tomorrowStr) {
                    dayLabel = `Zítra, ${formattedDate}, ${dayOfWeek}`;
                    dayWrapper.classList.add("tomorrow");
                } else {
                    dayLabel = `${formattedDate}, ${dayOfWeek}`;
                    dayWrapper.classList.remove("today", "tomorrow");
                }

                

                // Hlavička dne (např. "Dnes, 10.10.2026, sobota (2/4)")
                dayWrapper.innerHTML = `
                    <div class="reservation-day-header title">
                        <h3>${dayLabel}</h3>
                        <span class="day-stats text">${bookedCount}/${totalCount}</span>
                        <hr>
                    </div>
                    <div class="reservation-cards-container text"></div>
                `;

                const cardsContainer = dayWrapper.querySelector(".reservation-cards-container");

                // 3. Vykreslení jednotlivých karet (bloků) v daném dni
                dayEvents.forEach(ev => {
                    const startTime = ev.start.substring(11, 16);
                    const endTime = ev.end ? ev.end.substring(11, 16) : "";
                    const timeRange = `${startTime} - ${endTime}`;

                    const card = document.createElement("div");

                    if (ev.reservation_id) {
                        // Větší políčko pro rezervovaný termín se všemi informacemi
                        card.className = "reservation-card booked";
                        card.innerHTML = `
                            <div class="card-time">${timeRange}</div>
                            <div class="card-client-info">
                                <strong>${ev.name || ""} ${ev.surname || ""}</strong>
                                <span><i class="fa-solid fa-phone"></i> ${ev.phone || "neuvedeno"}</span>
                                <span><i class="fa-solid fa-envelope"></i> ${ev.email || "neuvedeno"}</span>
                                <span><i class="fa-solid fa-sticky-note"></i> ${ev.note || "nevyplněno"}</span>
                            </div>
                        `;
                    } else {
                        // Menší, kompaktní políčko pro volný pronájem
                        card.className = "reservation-card free";
                        card.innerHTML = `
                            <div class="card-time">${timeRange}</div>
                            <div class="card-free-text">Možnost pronájmu (Volné)</div>
                        `;
                    }

                    cardsContainer.appendChild(card);
                });

                listContainer.appendChild(dayWrapper);
            }
        })
        .catch(err => console.error("Chyba při načítání rezervací:", err));
}


function loadCustomers() {
    const tbody = document.getElementById('customersTableBody');
    if (!tbody) return;

    fetch('http://localhost:3000/api/admin-customers')
        .then(response => response.json())
        .then(res => {
            if (!res.success || !res.customers) return;

            tbody.innerHTML = '';

            if (res.customers.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6">Zatím žádní zákazníci.</td></tr>';
                return;
            }

            res.customers.forEach(c => {
                const tr = document.createElement('tr');

                // Formátování data posledního pronájmu (opraveno na správný klíč z backendu)
                let formattedLastDate = 'Neuvedeno';
                if (c.last_completed_date) {
                    const dateObj = new Date(c.last_completed_date);
                    formattedLastDate = dateObj.toLocaleDateString('cs-CZ', { 
                        day: 'numeric', 
                        month: 'numeric', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                }

                tr.innerHTML = `
                    <td><strong>${c.total_orders || c.order_count}</strong></td>
                    <td>${c.name || ''}</td>
                    <td>${c.surname || ''}</td>
                    <td>${c.email || 'Neuvedeno'}</td>
                    <td>${c.phone || 'Neuvedeno'}</td>
                    <td>${formattedLastDate}</td>
                `;

                tbody.appendChild(tr);
            });
        })
        .catch(err => console.error("Chyba při načítání zákazníků:", err));
}