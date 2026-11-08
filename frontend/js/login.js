const togglePasswordIcons = document.querySelectorAll('.password-eye-icon');

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById('signInForm');
    const signInContainer = document.querySelector(".signincontainer");
    const signInErrorMessage = document.createElement("div");
    const signInButton = document.getElementById("signInButton");
    const logoutContainer = document.querySelector('.logout-info-container');
    const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.get('logout') === 'success') {

        if (signInContainer && logoutContainer) {
            signInContainer.style.display = 'none';
            logoutContainer.style.display = 'flex';
        }
    }

    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        signInButton.textContent = "Přihlašuji..."
        signInButton.disabled = true;

        const email = document.getElementById('adminUsername').value.trim();
        const password = document.getElementById('adminPassword').value;

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
                signInButton.textContent = "Přihlásit"
                signInButton.disabled = false;
                signInContainer.classList.add("error-shake");
                signInButton.classList.remove("box_glass_effect_blue");
                signInButton.classList.add("box_glass_effect_red");

                setTimeout(() => {
                    signInContainer.classList.remove("error-shake");
                    signInButton.classList.add("box_glass_effect_blue");
                    signInButton.classList.remove("box_glass_effect_red");
                }, 1500);
            }
        } catch (err) {
            console.error("Chyba při přihlašování:", err);
            loginForm.appendChild(signInErrorMessage);
            signInErrorMessage.style.color = "var(--red-color)";
            signInErrorMessage.textContent =  'Chyba serveru. Zkuste to prosím později.';

            setTimeout(() => {
                loginForm.removeChild(signInErrorMessage);
            }, 2000);
        }
    });
});

togglePasswordIcons.forEach(icon => {
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