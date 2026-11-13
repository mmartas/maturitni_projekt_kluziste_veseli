const DOM = {
    // navigace v menu
    get menuArrow() {return document.getElementById("adminMenuArrow");},
    get menuArrowIn() {return document.querySelector("#adminMenuArrow i");},
    get menuWrapper() {return document.getElementById("adminMenuWrapper");},
    get menuSlideToggle() {return document.getElementById("menuSlideToggle");},

    // ikony v menu
    get dashboardIcon() {return document.getElementById("dashboardIcon");},
    get eventsIcon() {return document.getElementById("eventsIcon");},
    get reservationsIcon() {return document.getElementById("reservationsIcon");},
    get inboxIcon() {return document.getElementById("inboxIcon");},
    get customersIcon() {return document.getElementById("customersIcon");},
    get adminUserIcon() {return document.getElementById("adminUserIcon");},
    get editIcon() {return document.getElementById("editIcon");},

    // obsah jednotlivých sekcí
    get dashboardContent() { return document.getElementById("dashboard"); },
    get eventsContent() { return document.getElementById("events"); },
    get reservationsContent() { return document.getElementById("reservations"); },
    get inboxContent() { return document.getElementById("inbox"); },
    get customersContent() { return document.getElementById("customers"); },
    get adminUserContent() { return document.getElementById("admin"); },
    get allContents() { return document.querySelectorAll("#adminContent .content"); },
    get adminContent() { return document.getElementById("adminContent"); },

    // Formulář událostí a tlačítka
    get adminEventsForm() { return document.getElementById("insertEventsForm"); },
    get adminRefreshArrow() { return document.getElementById("adminRefreshArrow"); },
    get deleteBtn() { return document.getElementById("deleteBtn"); },
    get cancelBtn() { return document.getElementById("cancelBtn"); },
    get submitBtn() { return document.getElementById("submitBtn"); },

    // Inputy formuláře událostí
    get eventTitle() { return document.getElementById("eventTitle"); },
    get eventStart() { return document.getElementById("eventStart"); },
    get eventEnd() { return document.getElementById("eventEnd"); },
    get bookedClientName() { return document.getElementById("bookedClientName"); },
    get clientInfo() { return document.querySelectorAll(".clientInfo"); },
    get adminBookedClientName() { return document.getElementById("adminBookedClientName"); },
    get adminBookedClientSurname() { return document.getElementById("adminBookedClientSurname"); },
    get adminBookedClientTel() { return document.getElementById("adminBookedClientTel"); },
    get adminBookedClientEmail() { return document.getElementById("adminBookedClientEmail"); },

    // Dashboard a filtry
    get limitDateInput() { return document.getElementById("limitDate"); },
    get dashboardLimitDate() { return document.getElementById("endEventsDate"); },
    get chartStartDate() { return document.getElementById("chartStartDate"); },
    get chartEndDate() { return document.getElementById("chartEndDate"); },
    get filterSeason() { return document.getElementById("filterSeason"); },
    get filterMonth() { return document.getElementById("filterMonth"); },
    get filterChartsBtn() { return document.getElementById("filterChartsBtn"); },

    // Ostatní formuláře (heslo, obsah)
    get changePasswordForm() { return document.getElementById("changePasswordForm"); },
    get editContentForm() { return document.getElementById("editContentForm"); },
    get changePasswordFormSubmitContainer() { return document.getElementById("changePasswordFormSubmitContainer"); },
    get editContent() { return document.getElementById("edit"); },

    get passwordEyeIcon() { return document.querySelectorAll(".password-eye-icon")},
    get listContainer() { return document.getElementById("reservationsList")}
};

const today = new Date().toISOString().split('T')[0];
let savedLimitDate = null;
let calendar;
let calendarInitialized = false;
let currentEditingId = null;
let currentEventIsBooked = false;

const greenColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--green-color-lighter')
    .trim();

const redColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--red-color-lighter')
    .trim() || '#dc3545';

const blueColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--blue-color-lighter')
    .trim();

const yellowColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--yellow-color-lighter')
    .trim();

if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

document.addEventListener("DOMContentLoaded", () => {
    /*
        * Obecné
    */
    // Aktualizace počtu nepřečtených zpráv
    updateUnreadBadge();

    setupPhoneFormatters();
    setupNameFormatters();

    // vysunutí meníčka v levém admin panelu po kliknutí na šipku + (otočení šipky animací)
    DOM.menuArrow.addEventListener("click", (e) => {
        e.preventDefault();
        DOM.menuArrowIn.classList.toggle("active");
        DOM.menuWrapper.classList.toggle("active");
    })

    // logika animovaného otáčení refresh šipky v content části admin panelu
    let currentRotation = 0;
    DOM.adminRefreshArrow.addEventListener("click", (e) => {
        e.preventDefault();
        
        currentRotation -= 360;
        DOM.adminRefreshArrow.style.transform = `rotate(${currentRotation}deg)`;
        setTimeout(() => {
            window.location.reload();
        }, 200);
    })

    // Přepínání menu v levém admin panelu (schování/zobrazení)
    DOM.menuSlideToggle.addEventListener("click", () => {
        DOM.menuWrapper.classList.toggle("menu-collapsed");
    });

    // Načtení limitDate z backendu a nastavení do inputu a dashboardu
    fetch('http://localhost:3000/api/setting')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                if (data.limitDate) {
                    savedLimitDate = data.limitDate.split('T')[0];
                    DOM.limitDateInput.value = savedLimitDate;

                    const [year, month, day] = savedLimitDate.split('-');
                    const formattedDate = `${day}.${month}.${year}`;
                
                    DOM.dashboardLimitDate.innerHTML = formattedDate;
                }
            }
        })
    .catch(error => console.error('Chyba při načítání nastavení:', error));

    // když je v URL hashtag, zobrazí se odpovídající sekce
    const currentHash = window.location.hash.substring(1);
    if (currentHash) {
        const targetItem = navItems.find(item => item.content && item.content.id === currentHash);
        if (targetItem) {
            showSection(targetItem);
            return;
        }
    }

    // pokud v URL žádný hashtag není, otevře se dashboard nebo první položka
    const defaultItem = navItems.find(item => item.content && item.content.id === 'dashboard') || navItems[0];
    if (defaultItem) {
        showSection(defaultItem);
    }

    /**
     * Dashboard
    */
    // filtry pro grafy - inputy a selecty
    const startInput = DOM.chartStartDate;
    const endInput = DOM.chartEndDate;
    const seasonSelect = DOM.filterSeason;
    const monthSelect = DOM.filterMonth;

    // pokud admin změní sezónu nebo měsíc, vymažou se ruční datumy v inputech
    [seasonSelect, monthSelect].forEach(element => {
        if (element) {
            element.addEventListener('change', () => {
                if (startInput) startInput.value = '';
                if (endInput) endInput.value = '';
            });
        }
    });

    // pokud admin začne vybírat ruční datum vymaže se sezóna a měsíc
    [startInput, endInput].forEach(element => {
        if (element) {
            element.addEventListener('change', () => {
                if (seasonSelect) seasonSelect.value = '';
                if (monthSelect) monthSelect.value = '';
            });
        }
    });

    // filtrační tlačítko pro grafy - po kliknutí se načtou grafy s novými parametry
    DOM.filterChartsBtn.addEventListener('click', (e) => {
        e.preventDefault();

        const queryParams = getChartDateRangeParams();
        if (queryParams === null) {
            return;
        }
        initDashboard();
    });

    // pokud je dashboard aktivní, inicializuje se dashboard
    if(DOM.dashboardContent.classList.contains("active")) {
        initDashboard();
    }

    /*
    * Inbox
    */
   setInterval(() => {
        const hasExpandedMessage = document.querySelector('.one_message.expanded');
        if(!hasExpandedMessage) {
            loadMessages();
            updateUnreadBadge();
        }
    }, 5000);
});

/**
 * 
 * DASHBOARD
 **/
function getChartDateRangeParams() {
    const startInput = DOM.chartStartDate;
    const endInput = DOM.chartEndDate;
    const seasonSelect = DOM.filterSeason;
    const monthSelect = DOM.filterMonth;

    const startVal = startInput?.value;
    const endVal = endInput?.value;
    const seasonVal = seasonSelect?.value;
    const monthVal = monthSelect?.value;

    let startDate = '';
    let endDate = '';

    // 1. PRIORITA: Pokud uživatel vyplnil ruční datum (Od – Do)
    if (startVal && endVal) {
        startDate = startVal;
        endDate = endVal;

        // Pokud platí ruční datum, vymažeme selecty sezóny/měsíce, ať se to netluče
        if (seasonSelect) seasonSelect.value = '';
        if (monthSelect) monthSelect.value = '';
    }
    // 2. PRIORITA: Pokud je vybraná sezóna nebo měsíc
    else if (seasonVal || monthVal) {
        
        // Kontrola: Měsíc vybraný bez sezóny
        if (monthVal && !seasonVal) {
            alert('Prosím vyberte nejdříve sezónu, ke které chcete měsíc filtrovat.');
            return null; // Zastaví filtr
        }

        const [startYearStr, endYearStr] = seasonVal.split('/');
        const startYear = parseInt(startYearStr);
        const endYear = parseInt(endYearStr);

        if (monthVal) {
            const mNum = parseInt(monthVal);
            // Podzimní měsíce (např. 9, 10, 11, 12) patří do startovního roku, 
            // zimní/jarní (1, 2) do koncového roku sezóny.
            const year = (mNum >= 9 && mNum <= 12) ? startYear : endYear;
            const mStr = monthVal.padStart(2, '0');
            const lastDay = new Date(year, mNum, 0).getDate();
            
            startDate = `${year}-${mStr}-01`;
            endDate = `${year}-${mStr}-${lastDay}`;
        } else {
            startDate = `${startYear}-09-01`; // Případně od září, pokud začíná v září
            endDate = `${endYear}-04-30`;
        }

        // Pokud platí sezóna/měsíc, vymažeme vizuálně datumové inputy
        if (startInput) startInput.value = '';
        if (endInput) endInput.value = '';
    }

    // Sestavení URL parametrů pro API
    if (startDate && endDate) {
        return `?startDate=${startDate}&endDate=${endDate}`;
    }
    return '';
}

// 1. První graf (bloky)
function loadBlocksChart() {
    const queryParams = getChartDateRangeParams();

    return fetch(`http://localhost:3000/api/admin-blocks-stats${queryParams}`)
        .then(response => response.json())
        .then(res => {
            if (!res.success) return;

            // Nastavení výchozích hodnot do inputů, pokud jsou prázdné
            const startInput = DOM.chartStartDate;
            const endInput = DOM.chartEndDate;

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
                if (DOM.limitDateInput) DOM.limitDateInput.value = savedLimitDate;

                const [year, month, day] = savedLimitDate.split('-');
                const formattedDate = `${day}.${month}.${year}`;
                
                DOM.dashboardLimitDate.innerHTML = formattedDate;
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
            const startInput = DOM.chartStartDate;
            const endInput = DOM.chartEndDate;
            
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
    const queryParams = getChartDateRangeParams();

    fetch(`http://localhost:3000/api/admin-top-customers${queryParams}`)
        .then(response => response.json())
        .then(res => {

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
                        backgroundColor: [
                            yellowColor,
                            greenColor,
                            blueColor,
                            redColor,
                            '#f59e0b'
                        ],
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

async function initDashboard() {
    await loadBlocksChart();
    loadEventTypesChart();
    loadTopCustomersChart();
}

/**
 * 
 * EVENTS
 **/
// vykreslení kalendáře
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
        nowIndicator: true,

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

        customButtons: {
            printButton: {
            text: "",
            click: function() {
                window.print();
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

            DOM.eventTitle.value = eventType;

            const clientNameInput = DOM.adminBookedClientName;
            const clientSurnameInput = DOM.adminBookedClientSurname;
            const clientTelInput = DOM.adminBookedClientTel;
            const clientEmailInput = DOM.adminBookedClientEmail;

            if (currentEventIsBooked) {
                DOM.clientInfo.forEach(element => element.classList.add("active"));
                clientNameInput.value = props.client_name || "";
                clientSurnameInput.value = props.client_surname || "";
                clientTelInput.value = props.client_phone || "";
                clientEmailInput.value = props.client_email || "";
                DOM.eventTitle.value = "booked";
            } else {
                DOM.clientInfo.forEach(element => element.classList.remove("active"));
                clientNameInput.value = "";
                clientSurnameInput.value = "";
                clientTelInput.value = "";
                clientEmailInput.value = "";
                DOM.eventTitle.value = eventType;
            }

            DOM.eventStart.value = info.event.startStr.slice(0, 16);
            DOM.eventEnd.value = info.event.endStr ? info.event.endStr.slice(0, 16) : "";

            DOM.submitBtn.title = "Potvrdit změny";
            
            if (currentEventIsBooked) {
                DOM.deleteBtn.title = "Zrušit rezervaci";
            } else {
                DOM.deleteBtn.title = "Odstranit událost";
            }

            DOM.deleteBtn.style.display = "inline-block";
            DOM.cancelBtn.style.display = "inline-block";
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

// zobrazení inputů pro vyplnění údajů, po kliku na rezervovaný termín
DOM.eventTitle.addEventListener("change", function(e) {
    if(this.value === "booked") {
        DOM.clientInfo.forEach(element => {
            element.classList.add("active");
        })
    } else {
        DOM.clientInfo.forEach(element => {
            element.classList.remove("active");
        })
    }
})

// nastavení rozsahu zobrazení rozpisu - kalendáře
DOM.limitDateInput.addEventListener("change", function() {
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

DOM.cancelBtn.addEventListener("click", function() {
    resetFormMode();
});

DOM.adminEventsForm.addEventListener("submit", function(e) {
    e.preventDefault();

    const isEditing = Boolean(currentEditingId);

    const selectedType = DOM.eventTitle.value;
    const clientNameVal = DOM.adminBookedClientName.value;
    const clientSurnameVal = DOM.adminBookedClientSurname.value;
    const clientTelVal = DOM.adminBookedClientTel.value;
    const clientEmailVal = DOM.adminBookedClientEmail.value;
    
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

    const startVal = DOM.eventStart.value;
    const endVal = DOM.eventEnd.value;

    if (!endVal || endVal <= startVal) {
        showFormMessage(DOM.adminEventsForm, "Neplatně zadané datumy!", false);
        return;
    }

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

            const successText = isEditing 
                ? "Změny byly úspěšně uloženy" 
                : "Nová událost byla úspěšně vytvořena";

            showFormMessage(DOM.adminEventsForm, successText, true)
        } else {
            showFormMessage(DOM.adminEventsForm, "Akce se nezdařila.", false)
        }
    })
    .catch(error => console.error('Chyba:', error));
    showFormMessage(DOM.adminEventsForm, "Chyba připojení k serveru", false);
});

// tlačítko pro smazání rezervace ve formuláři
DOM.deleteBtn.addEventListener("click", function() {
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

/*
* ADMIN
*/
DOM.passwordEyeIcon.forEach(icon => {
    icon.addEventListener('click', () => {
        
        const targetId = icon.getAttribute('data-target');
        const passwordInput = document.getElementById(targetId);

        if (passwordInput) {
            
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);

            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        }
    });
});

DOM.changePasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;

    try {
        const response = await fetch('/api/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });

        const data = await response.json();

        if (data.success) {
            DOM.changePasswordForm.reset();
            showFormMessage(DOM.changePasswordFormSubmitContainer, "Heslo bylo úspěšně změněno", true);
        } else {
            console.log(data.error);
            showFormMessage(DOM.changePasswordFormSubmitContainer, "Heslo se nepodařilo změnit", false);
        }
    } catch (err) {
        console.error('Chyba při komunikaci se serverem:', err);
        showFormMessage(DOM.changePasswordFormSubmitContainer, "Chyba na straně serveru", false);
    }
});

/**
 * OBECNÉ
 */
// pole, které propojuje ikonu, textový odkaz a obsah v celém admin panelu
const navItems = [
    { icon: DOM.dashboardIcon, content: DOM.dashboardContent },
    { icon: DOM.eventsIcon, content: DOM.eventsContent },
    { icon: DOM.reservationsIcon, content: DOM.reservationsContent },
    { icon: DOM.inboxIcon, content: DOM.inboxContent },
    { icon: DOM.customersIcon, content: DOM.customersContent },
    { icon: DOM.adminUserIcon, content: DOM.adminUserContent},
    { icon: DOM.editIcon, content: DOM.editContent}
];

// Pomocná funkce pro přepnutí sekce a uložení do URL
function showSection(item) {
    DOM.allContents.forEach(content => content.classList.remove("active"));

    navItems.forEach(nav => {
        if(nav.icon) {
            nav.icon.classList.remove("active");
        }
        
        const textLink = nav.icon ? nav.icon.nextElementSibling : null;
        if(textLink) {
            textLink.classList.remove("active");
        }
        
    });

    item.content.classList.add("active");
    item.icon.classList.add("active");

    const activeTextLink = item.icon ? item.icon.nextElementSibling : null;
    activeTextLink.classList.add("active");

    if (item.content.id) {
        history.replaceState(null, null, '#' + item.content.id);
    }

    setTimeout(() => {
        if (DOM.adminContent) {
            DOM.adminContent.scrollTop = 0;
        }
        window.scrollTo(0, 0);
    }, 50);

    if (item.content === DOM.dashboardContent) {
        initDashboard();
    }

    if (item.content === DOM.eventsContent) {
        setTimeout(() => {
            initCalendar();
        }, 50);
    }

    if (item.content === DOM.reservationsContent) {
        loadAdminReservations();
    }

    if (item.content === DOM.customersContent) {
        loadCustomers();
    }

    if(item.content == DOM.inboxContent) {
        loadMessages();
    }

    if(item.content === DOM.editContent) {
        loadAdminContent();
    }
}

navItems.forEach(item => {
    if (item.icon && item.content) {
        item.icon.addEventListener("click", (e) => {
            e.preventDefault();

            showSection(item);
        });

        const textLink = item.icon.nextElementSibling;
        textLink.addEventListener("click", (e) => {
            e.preventDefault();
            showSection(item);
        });
    }
});

/**
 * 
 * RESERVATIONS
 */
function loadAdminReservations() {
    if (!DOM.listContainer) return;

    fetch('http://localhost:3000/api/admin-reservations')
        .then(response => response.json())
        .then(res => {
            if (!res.success || !res.events) return;

            const events = res.events;
            DOM.listContainer.innerHTML = ""; // Vyčistíme starý obsah

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
                                <span>${ev.name} ${ev.surname}</span>
                                <span><i class="fa-solid fa-phone"></i> ${ev.phone}</span>
                                <span><i class="fa-solid fa-envelope"></i> ${ev.email}</span>
                                <span><i class="fa-solid fa-sticky-note"></i> ${ev.note || "- - - - -"}</span>
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
                DOM.listContainer.appendChild(dayWrapper);
            }
        })
        .catch(err => console.error("Chyba při načítání rezervací:", err));
}

/*
* CUSTOMERS
*/
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
                    <td>${c.total_orders || c.order_count}</td>
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

/**
 * EDIT
 */
// Seznam všech našich klíčů z HTML formuláře
const contentKeys = [
    'hp-public-skate',
    'hp-rent-ice',
    'hp-school',
    'hp-sharping',
    'hp-rental-skate',
    'hp-food',
    'hp-changing-room',

    'price-public-skate',
    'price-rent-ice',
    'price-school',
    'price-sharping',
    'price-rental-skate',
    'price-food',

    'schedule-working-days',
    'schedule-weekends',
    'schedule-sharping',
    'schedule-food',
    'schedule-rental-skate'
];

// načtení dat do formuláře, kde se mění obsah textů na webu
let originalContentValues = {};

async function loadAdminContent() {
    try {
        const res = await fetch('/api/content');
        const data = await res.json();
        
        if (data.success && data.content) {
            
            contentKeys.forEach(key => {
                const textarea = document.getElementById(key);
                if (textarea && data.content[key] !== undefined) {
                    textarea.value = data.content[key];
                    originalContentValues[key] = data.content[key];
                }
            });
        }
    } catch (err) {
        console.error('Chyba při načítání obsahu pro admin:', err);
    }
}

// uložení všech změn po odeslání formuláře
DOM.editContentForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    let hasChanges = false;
    for (const key of contentKeys) {
        const textarea = document.getElementById(key);
        if (textarea && textarea.value !== originalContentValues[key]) {
            hasChanges = true;
            break;
        }
    }

    if (!hasChanges) {
        showFormMessage(DOM.editContent, "Nebyla provedena žádná změna", false);
        return;
    }

    try {
        let allSuccess = true;
        
        for (const key of contentKeys) {
            const textValue = document.getElementById(key).value;

            const response = await fetch('/api/content/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    section_key: key, 
                    content: textValue 
                })
            });

            const data = await response.json();
            if(!data.success) {
                allSuccess = false;
                break;
            }
        }

        if (allSuccess) {
            showFormMessage(DOM.editContent, "Změny byly úspěšně uloženy", true);
        } else {
            showFormMessage(DOM.editContent, "Některé změny se nepodařilo uložit", false);
        }

    } catch (err) {
        console.error('Chyba při ukládání:', err);
        showFormMessage(DOM.editContent, "Chyba připojení k serveru", false);
    }
});