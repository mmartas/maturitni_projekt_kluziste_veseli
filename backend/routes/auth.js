const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

const pool = require('../config/db');

const { requireAuth } = require('../middleware/auth');

// 19. Přihlašovací endpoint
router.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const [rows] = await pool.query("SELECT * FROM admins WHERE email = ?", [email]);

        if (rows.length === 0) {
            return res.status(401).json({ success: false, error: 'Nesprávné uživatelské jméno nebo heslo.' });
        }

        const admin = rows[0];
        const match = await bcrypt.compare(password, admin.password);

        if (!match) {
            return res.status(401).json({ success: false, error: 'Nesprávné uživatelské jméno nebo heslo.' });
        }

        req.session.isAdmin = true;
        req.session.adminUser = admin.email;
        res.json({ success: true });
    } catch (err) {
        console.error("Chyba při zpracování přihlášení:", err);
        res.status(500).json({ success: false, error: 'Chyba serveru' });
    }
});

// 20. Routa pro odhlášení
router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Chyba při odhlašování');
        }
        res.clearCookie('connect.sid');
        res.redirect('/pages/login.html?logout=success');
    });
});

// 21. Zabezpečená routa pro změnu hesla
router.post('/api/change-password', requireAuth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const email = req.session.adminUser;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, error: 'Vyplňte všechna pole' });
    }

    try {
        const [rows] = await pool.query('SELECT * FROM admins WHERE email = ?', [email]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Administrátor nenalezen' });
        }

        const admin = rows[0];

        const isMatch = await bcrypt.compare(currentPassword, admin.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, error: 'Nesprávné současné heslo' });
        }

        const saltRounds = 10;
        const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

        await pool.query('UPDATE admins SET password = ? WHERE email = ?', [hashedNewPassword, email]);

        res.json({ success: true, message: 'Heslo bylo úspěšně změněno' });

    } catch (err) {
        console.error('Chyba při změně hesla:', err);
        res.status(500).json({ success: false, error: 'Chyba serveru při změně hesla' });
    }
});

module.exports = router;