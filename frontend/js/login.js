document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById('signInForm');
    const errorMsg = document.getElementById('signInErrorMessage');

    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('adminUsername').value.trim();
        const password = document.getElementById('adminPassword').value;

        errorMsg.textContent = '';

        try {
            const response = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const result = await response.json();

            if (result.success) {
                // Přihlášení proběhlo úspěšně -> přesměrování do administrace
                window.location.href = 'admin.html';
            } else {
                errorMsg.textContent = result.error || 'Nesprávné uživatelské jméno nebo heslo.';
            }
        } catch (err) {
            console.error("Chyba při přihlašování:", err);
            errorMsg.textContent = 'Chyba serveru. Zkuste to prosím později.';
        }
    });
});


// Najde všechna oka pro přepínání hesla na stránce
const togglePasswordIcons = document.querySelectorAll('.toggle-password');

togglePasswordIcons.forEach(icon => {
    icon.addEventListener('click', () => {
        // Zjistíme, jaké ID má input, který patří k tomuto oku
        const targetId = icon.getAttribute('data-target');
        const passwordInput = document.getElementById(targetId);

        if (passwordInput) {
            // Přepneme typ inputu (password <-> text)
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);

            // Přepneme ikonu FontAwesome (oko / přeškrtnuté oko)
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        }
    });
});