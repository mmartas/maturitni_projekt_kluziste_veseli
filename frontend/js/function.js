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

    formSubmitButton.disabled = false;
    formSubmitButton.textContent = "Odeslat rezervaci";
}

// uložení rezervace
function sendReservation(data) {
    return fetch("../assets/save-rezervation.php", {
        method: "POST",
        body: data
    })

    .then(res => res.json());
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

// funkce pro získání jména v 5. pádě kvůli oslovení v potvrzovacím modalu a e-mailu
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