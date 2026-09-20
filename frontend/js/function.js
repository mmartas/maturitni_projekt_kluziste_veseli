// otevření modalu
function openModal(start, end) {
    modal.style.display = "flex";
    document.body.classList.add("no-scroll");

    document.querySelector(".rezervation_formular").style.display = "flex";
    document.querySelector(".submit_message").style.display = "none";
    document.getElementById("error_message").style.display = "none";
    document.getElementById("rezervationForm").reset();

    const s = new Date(start);
    const e = new Date(end);

    const startTime =
        s.getHours().toString().padStart(2, "0") + ":" +
        s.getMinutes().toString().padStart(2, "0");

    const endTime =
        e.getHours().toString().padStart(2, "0") + ":" +
        e.getMinutes().toString().padStart(2, "0");

    const dateText =
        s.getDate() + "." +
        (s.getMonth() + 1) + "." +
        s.getFullYear();

    document.getElementById("selectedDate").textContent =
        dateText + " " + startTime + " - " + endTime;
    document.getElementById("selectedDateInput").value = start;
}

// zavření modalu
function closeModal() {
    modal.style.display = "none";
    document.body.classList.remove("no-scroll");
    modalWindow.classList.remove("active");
}

// uložení rezervace
function sendReservation(data) {
    return fetch("../assets/save-rezervation.php", {
        method: "POST",
        body: data
    })

    .then(res => res.json());
}

// načtení vyplněných hodnot z formuláře
function getFormData() {
    return {
        name: document.getElementById("clientName").value,
        surname: document.getElementById("clientSurname").value,
        email: document.getElementById("clientEmail").value,
        date: document.getElementById("selectedDate").textContent
    };
}

// plynulé srollování nahoru
function smoothScrollToTop(duration) {
    const startPosition = window.scrollY;
    const startTime = performance.now();

    function animation(currentTime) {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);

        const ease = 1 - Math.pow(1 - progress, 3);

        window.scrollTo(0, startPosition * (1 - ease));

        if (progress < 1) {
            requestAnimationFrame(animation);
        }
    }

    requestAnimationFrame(animation);
}