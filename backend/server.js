const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
const PORT = 3000; // port na kterém běží backend server

const nodemailer = require('nodemailer');

// Middleware
app.use(cors()); // Povolí komunikaci mezi frontendem a backendem
app.use(express.json()); // Umožní serveru číst JSON data z formulářů

const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');

app.use(express.json()); // server rozumí JSON datům z fetch požadavků

app.use('/css', express.static(path.join(__dirname, '../frontend/css')));
app.use('/js', express.static(path.join(__dirname, '../frontend/js')));

app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/login.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});


// nastavení session
app.use(session({
    secret: 'tady-si-zvol-nejaky-silny-tajny-klic',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }
}));

// kontrola jestli je uživatel přihlášený
function requireAuth(req, res, next) {
    if (req.session && req.session.isAdmin) {
        return next();
    }
    res.redirect('/login.html');
}

// nikdo se nedostane na admin.html pokud není přihlášený
app.get('/admin.html', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/admin.html'));
});

app.get('/pages/admin.html', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/admin.html'));
});

app.use(express.static(path.join(__dirname, '../frontend')));

// Nastavení připojení k SQL databázi
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'kalendar',
    dateStrings: true
});

// Nastavení odesílání e-mailů pomocí Nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'kluzistevcentruveseli@gmail.com',
        pass: 'txtdgsvoiggopucj'
    }
});

// spuštění serveru - ověření v terminálu že běží
app.listen(PORT, () => {
    console.log(`Backend server úspěšně běží na adrese: http://localhost:${PORT}`);
});

// formátování datumu z ISO formátu na formát datum-čas
function formatEmailDate(dateString) {
    if (!dateString) return '';
    const d = new Date(dateString);
    
    const hours = d.getHours().toString().padStart(2, "0");
    const minutes = d.getMinutes().toString().padStart(2, "0");
    
    const dateText = 
        d.getDate() + "." + 
        (d.getMonth() + 1) + "." + 
        d.getFullYear();

    return `${dateText} ${hours}:${minutes}`;
}

// funkce pro přepočet a uložení všech statistik pronájmů
async function updateRentCounts() {
    try {
        const [allRows] = await pool.query("SELECT COUNT(*) AS total FROM events WHERE type = 'rent' AND start >= CURDATE()");
        const allCount = allRows[0].total;

        const [bookedRows] = await pool.query(`
            SELECT COUNT(*) AS total FROM events e
            JOIN reservations r ON e.id = r.event_id
            WHERE e.type = 'rent' AND e.start >= CURDATE()
        `);
        const bookedCount = bookedRows[0].total;
        const freeCount = allCount - bookedCount;

        await pool.query(
            "UPDATE setting SET count_free_rent = ?, count_booked_rent = ?, count_all_rent = ? WHERE id = 1",
            [freeCount, bookedCount, allCount]
        );
    } catch (err) {
        console.error("Chyba při aktualizaci statistik pronájmů:", err);
    }
}
updateRentCounts();

// 1. API Endpoint pro FullCalendar (vrátí události z databáze do kalendáře)
app.get('/api/events', async (req, res) => {
    try {
        const query = `
            SELECT e.id, e.title, e.start, e.end, e.type, 
            IF(r.id IS NOT NULL, 1, 0) AS booked,
            r.name AS client_name,
            r.surname AS client_surname,
            r.phone AS client_phone,
            r.email AS client_email
            FROM events e
            LEFT JOIN reservations r ON e.id = r.event_id
        `;
        const [rows] = await pool.query(query);
        
        const formattedRows = rows.map(row => ({
            id: row.id,
            title: row.booked ? `Obsazeno: ${row.client_surname}` : row.title,
            start: row.start,
            end: row.end,
            extendedProps: {
                type: row.type,
                booked: row.booked === 1,
                client_name: row.client_name,
                client_surname: row.client_surname,
                client_phone: row.client_phone,
                client_email: row.client_email
            }
        }));

        res.json(formattedRows);
    } catch (err) {
        console.error("Chyba při načítání událostí:", err);
        res.status(500).json({ error: "Chyba serveru" });
    }
});

// 2. Vytvoření nové události a rezervace
app.post('/api/events', async (req, res) => {
    try {
        const { title, start, end, type, name, surname, phone, email, date } = req.body;

        const [result] = await pool.query(
            "INSERT INTO events (title, start, end, type) VALUES (?, ?, ?, ?)",
            [title, start, end, type]
        );
        const eventId = result.insertId;

        if (surname && surname.trim() !== '') {
            await pool.query(
                "INSERT INTO reservations (event_id, name, surname, email, phone, date) VALUES (?, ?, ?, ?, ?, ?)",
                [eventId, name || '', surname, email || '', phone || '', date || start]
            );
        }
        await updateRentCounts();

        res.json({ success: true, message: "Událost a rezervace byla úspěšně vložena!" });
    } catch (err) {
        console.error("Chyba při vkládání událostí: ", err);
        res.status(500).json({ error: "Chyba serveru při ukládání" });
    }
});

// 3. Úprava existující události
app.put('/api/events/:id', async (req, res) => {
    try {
        const eventId = req.params.id;
        const { title, start, end, type, name, surname, phone, email, date } = req.body;

        await pool.query(
            "UPDATE events SET title = ?, start = ?, end = ?, type = ? WHERE id = ?",
            [title, start, end, type, eventId]
        );

        const [existingRes] = await pool.query("SELECT id FROM reservations WHERE event_id = ?", [eventId]);

        if (existingRes.length > 0) {
            await pool.query(
                "UPDATE reservations SET name = ?, surname = ?, email = ?, phone = ?, date = ? WHERE event_id = ?",
                [name || '', surname || '', email || '', phone || '', date || start, eventId]
            );
        } else {
            if (type === 'booked' || (surname && surname.trim() !== '')) {
                await pool.query(
                    "INSERT INTO reservations (event_id, name, surname, email, phone, date) VALUES (?, ?, ?, ?, ?, ?)",
                    [eventId, name || '', surname || '', email || '', phone || '', date || start]
                );
            }
        }
        await updateRentCounts();

        res.json({ success: true, message: "Událost a rezervace byla aktualizována" });
    } catch (err) {
        console.error("Chyba při aktualizaci události:", err);
        res.status(500).json({ error: "Chyba serveru" });
    }
});

// 4. Smazání eventu
app.delete('/api/events/:id', async (req, res) => {
    try {
        const eventId = req.params.id;
        await pool.query("DELETE FROM events WHERE id = ?", [eventId]);
        await updateRentCounts();
        res.json({ success: true, message: "Událost byla smazána" });
    } catch (err) {
        console.error("Chyba při mazání události:", err);
        res.status(500).json({ error: "Chyba serveru" });
    }
});

// 5. API Endpoint pro FullCalendar (ukládá nové rezervace do databáze a odesílá e-maily)
app.post('/api/reservations', async (req, res) => {
    try {
        const { event_id, name, surname, email, phone, note, date } = req.body;

        await pool.query(
            "INSERT INTO reservations (event_id, name, surname, email, phone, note, date) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [event_id, name, surname, email, phone, note, date]
        );
        const formattedDate = formatEmailDate(date);

        // email pro klienta
        const clientMailOptions = {
            from: '"Kluziště Veselí" <kluzistevcentruveseli@gmail.com>',
            to: email,
            subject: 'Potvrzení rezervace kluziště',
            text: `Dobrý den, ${name} ${surname},\n\nvaše rezervace na kluziště byla úspěšně vytvořena.\nTermín: ${formattedDate}\n\nTěšíme se na Vás!`
        };

        // email pro administrátora
        const adminMailOptions = {
            from: '"Systém Kluziště" <kluzistevcentruveseli@gmail.com>',
            to: 'kluzistevcentruveseli@gmail.com',
            subject: 'Nová rezervace na kluzišti!',
            text: `Byla vytvořena nová rezervace:\n\nJméno: ${name} ${surname}\nE-mail: ${email}\nTelefon: ${phone}\nTermín: ${formattedDate}\nPoznámka: ${note || 'žádná'}`
        };
        await transporter.sendMail(clientMailOptions);
        await transporter.sendMail(adminMailOptions);

        res.json({ success: true, message: "Rezervace byla úspěšně vytvořena!" });
    } catch (err) {
        console.error("Chyba při ukládání rezervace:", err);
        res.status(500).json({ error: "Chyba serveru při ukládání" });
    }
});

// 6. endpoint pro stažení rezervací do admin panelu do inboxu
app.get('/api/reservations', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM reservations WHERE deletedMessage = 0 ORDER BY date DESC");
        res.json(rows);
    } catch (err) {
        console.error("Chyba při načítání rezervací:", err);
        res.status(500).json({ error: "Chyba serveru při načítání" });
    }
});

// 7. Endpoint pro skrytí zprávy z inboxu (rezervace v DB zůstane)
app.patch('/api/reservations/:id/hide', async (req, res) => {
    try {
        const reservationId = req.params.id;
        await pool.query("UPDATE reservations SET deletedMessage = 1, is_read = 1 WHERE id = ?", [reservationId]);
        res.json({ success: true, message: "Zpráva byla skryta z inboxu." });
    } catch (err) {
        console.error("Chyba při skrývání zprávy:", err);
        res.status(500).json({ error: "Chyba serveru" });
    }
});

// 8. endpoint pro získání informace o tom, jestli admin již přečetl danou zprávu v inboxu
app.patch('/api/reservations/:id/read', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("UPDATE reservations SET is_read = 1 WHERE id = ?", [id]);
        res.json({ success: true });
    } catch (err) {
        console.error("Chyba při aktualizaci stavu zprávy:", err);
        res.status(500).json({ error: "Chyba serveru" });
    }
});

// 9. endpoint pro získání počtu nepřečtených rezervací v inboxu
app.get('/api/reservations/unread-count', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT COUNT(*) AS count FROM reservations WHERE is_read = 0 AND deletedMessage = 0");
        res.json({ unreadCount: rows[0].count });
    } catch (err) {
        console.error("Chyba při zjišťování počtu nepřečtených zpráv:", err);
        res.status(500).json({ error: "Chyba serveru" });
    }
});

// 10. zrušení rezervace
app.delete('/api/reservations/by-event/:eventId', async (req, res) => {
    try {
        const eventId = req.params.eventId;
        
        await pool.query("DELETE FROM reservations WHERE event_id = ?", [eventId]);
        await updateRentCounts();
        res.json({ success: true, message: "Rezervace byla zrušena, blok je opět volný." });
    } catch (err) {
        console.error("Chyba při rušení rezervace:", err);
        res.status(500).json({ error: "Chyba serveru" });
    }
});

// 11. získání datumu z databáze do kdy je vyplněný rozpis
app.get('/api/setting', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT calendar_end_time, count_free_rent, count_booked_rent, count_all_rent FROM setting LIMIT 1");
        
        res.json({ 
            success: true, 
            limitDate: rows[0] && rows[0].calendar_end_time ? rows[0].calendar_end_time : null,
            freeCount: rows[0] ? rows[0].count_free_rent : 0,
            bookedCount: rows[0] ? rows[0].count_booked_rent : 0,
            allCount: rows[0] ? rows[0].count_all_rent : 0
        });
    } catch (err) {
        console.error("Chyba při načítání nastavení:", err);
        res.status(500).json({ error: "Chyba serveru" });
    }
});

// 12. Uložení / aktualizace data do kd je vyplněný rozpis
app.post('/api/setting', async (req, res) => {
    try {
        const { limitDate } = req.body;

        await pool.query(
            "INSERT INTO setting (id, calendar_end_time) VALUES (1, ?) ON DUPLICATE KEY UPDATE calendar_end_time = ?",
            [limitDate, limitDate]
        );

        res.json({ success: true, message: "Nastavení uloženo do databáze!" });
    } catch (err) {
        console.error("Chyba při ukládání nastavení:", err);
        res.status(500).json({ error: "Chyba serveru" });
    }
});

// 13. Endpoint který spustí přepočet statistik pronájmů
app.post('/api/update-counts', async (req, res) => {
    try {
        await updateRentCounts();
        const [rows] = await pool.query("SELECT * FROM setting WHERE id = 1");
        
        if (rows.length > 0) {
            res.json({ 
                success: true, 
                allCount: rows[0].count_all_rent, 
                freeCount: rows[0].count_free_rent, 
                bookedCount: rows[0].count_booked_rent,
                limitDate: rows[0].calendar_end_time
            });
        } else {
            res.json({ success: true });
        }
    } catch (err) {
        console.error("Chyba při aktualizaci statistik:", err);
        res.status(500).json({ error: "Chyba serveru" });
    }
});

// 14. Endpoint pro získání všech rezervací a jejich detailů pro administraci
app.get('/api/admin-reservations', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT e.id AS event_id, e.title, e.start, e.end, e.type,
                   r.id AS reservation_id, r.name, r.surname, r.phone, r.email, r.note
            FROM events e
            LEFT JOIN reservations r ON e.id = r.event_id
            WHERE e.type = 'rent' AND e.start >= CURDATE()
            ORDER BY e.start ASC
        `);
        res.json({ success: true, events: rows });
    } catch (err) {
        console.error("Chyba při načítání administrace rezervací:", err);
        res.status(500).json({ error: "Chyba serveru" });
    }
});

// 15. Endpoint pro získání všech zákazníků a jejich statistik
app.get('/api/admin-customers', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                TRIM(r.name) AS name,
                TRIM(r.surname) AS surname,
                MAX(r.email) AS email,
                MAX(r.phone) AS phone,
                SUM(CASE WHEN COALESCE(e.start, r.date) < NOW() THEN 1 ELSE 0 END) AS total_orders,
                MAX(CASE WHEN COALESCE(e.start, r.date) < NOW() THEN COALESCE(e.start, r.date) END) AS last_completed_date
            FROM reservations r
            LEFT JOIN events e ON r.event_id = e.id
            WHERE r.name IS NOT NULL AND TRIM(r.name) != ''
              AND r.surname IS NOT NULL AND TRIM(r.surname) != ''
            GROUP BY TRIM(r.name), TRIM(surname)
            HAVING total_orders > 0
            ORDER BY total_orders DESC, last_completed_date DESC
        `);
        res.json({ success: true, customers: rows });
    } catch (err) {
        console.error("Chyba při načítání zákazníků:", err);
        res.status(500).json({ error: "Chyba serveru" });
    }
});

// 16. Endpoint pro bloky (volné / obsazené)
app.get('/api/admin-blocks-stats', async (req, res) => {
    try {
        let { startDate, endDate } = req.query;
        const [settingRows] = await pool.query("SELECT * FROM setting WHERE id = 1");
        let limitDate = null;
        let rawLimit = null;

        if (settingRows.length > 0 && settingRows[0].calendar_end_time) {
            rawLimit = settingRows[0].calendar_end_time;
            limitDate = new Date(rawLimit).toISOString().split('T')[0];
        }

        const todayStr = new Date().toISOString().split('T')[0];
        const defaultEnd = limitDate || todayStr;
        const effectiveStart = startDate || todayStr;
        const effectiveEnd = endDate || defaultEnd;

        let baseWhere = "type = 'rent' AND start >= ? AND start <= ?";
        const params = [effectiveStart, effectiveEnd + ' 23:59:59'];

        const [allRows] = await pool.query(`SELECT COUNT(*) AS total FROM events WHERE ${baseWhere}`, params);
        const allCount = allRows[0].total;

        const [bookedRows] = await pool.query(`
            SELECT COUNT(*) AS total FROM events e
            JOIN reservations r ON e.id = r.event_id
            WHERE e.${baseWhere}
        `, params);

        const bookedCount = bookedRows[0].total;
        const freeCount = allCount - bookedCount;

        res.json({ 
            success: true, 
            allCount, 
            freeCount, 
            bookedCount, 
            limitDate: rawLimit,
            defaultStart: effectiveStart,
            defaultEnd: effectiveEnd
        });
    } catch (err) {
        console.error("Chyba při načítání bloků:", err);
        res.status(500).json({ error: "Chyba serveru" });
    }
});

// 17. Endpoint pro typy událostí
app.get('/api/admin-event-types-stats', async (req, res) => {
    try {
        let { startDate, endDate } = req.query;
        
        const [settingRows] = await pool.query("SELECT * FROM setting WHERE id = 1");
        let limitDate = null;
        if (settingRows.length > 0 && settingRows[0].calendar_end_time) {
            limitDate = new Date(settingRows[0].calendar_end_time).toISOString().split('T')[0];
        }

        const todayStr = new Date().toISOString().split('T')[0];
        const defaultEnd = limitDate || todayStr;

        const effectiveStart = startDate || todayStr;
        const effectiveEnd = endDate || defaultEnd;

        const [rows] = await pool.query(`
            SELECT type, COUNT(*) AS count
            FROM events
            WHERE start >= ? AND start <= ?
            GROUP BY type
        `, [effectiveStart, effectiveEnd + ' 23:59:59']);

        res.json({ 
            success: true, 
            stats: rows,
            defaultStart: effectiveStart,
            defaultEnd: effectiveEnd
        });
    } catch (err) {
        console.error("Chyba při načítání typů událostí:", err);
        res.status(500).json({ error: "Chyba serveru" });
    }
});

// 18. Endpoint pro získání top zákazníků
app.get('/api/admin-top-customers', async (req, res) => {
    try {
        let { startDate, endDate } = req.query;

        const [settingRows] = await pool.query("SELECT * FROM setting WHERE id = 1");
        let limitDate = null;
        if (settingRows.length > 0 && settingRows[0].calendar_end_time) {
            limitDate = new Date(settingRows[0].calendar_end_time).toISOString().split('T')[0];
        }

        const todayStr = new Date().toISOString().split('T')[0];
        const defaultEnd = limitDate || todayStr;

        const effectiveStart = startDate || '2026-10-01';
        const effectiveEnd = endDate || defaultEnd;

        const [rows] = await pool.query(`
            SELECT CONCAT(TRIM(name), ' ', TRIM(surname)) AS customer_name, COUNT(*) AS order_count
            FROM reservations
            WHERE name IS NOT NULL AND TRIM(name) != ''
              AND surname IS NOT NULL AND TRIM(surname) != ''
              AND date >= ? 
              AND date <= ?
            GROUP BY TRIM(name), TRIM(surname)
            ORDER BY order_count DESC
            LIMIT 5
        `, [effectiveStart, effectiveEnd + ' 23:59:59']);

        res.json({ success: true, customers: rows });
    } catch (err) {
        console.error("Chyba při načítání top zákazníků:", err);
        res.status(500).json({ error: "Chyba serveru" });
    }
});

// 19. Přihlašovací endpoint
app.post('/api/login', async (req, res) => {
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
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Chyba při odhlašování');
        }
        res.clearCookie('connect.sid');
        res.redirect('/pages/login.html?logout=success');
    });
});

// 21. Zabezpečená routa pro změnu hesla
app.post('/api/change-password', requireAuth, async (req, res) => {
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

// 22. Veřejná routa pro získání veškerého obsahu webu
app.get('/api/content', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM site_content');
        const contentMap = {};
        rows.forEach(row => {
            contentMap[row.section_key] = row.content;
        });
        res.json({ success: true, content: contentMap });
    } catch (err) {
        console.error('Chyba při načítání obsahu:', err);
        res.status(500).json({ success: false, error: 'Chyba serveru' });
    }
});

// 23. Chráněná routa pro aktualizaci obsahu z adminu
app.post('/api/content/update', requireAuth, async (req, res) => {
    const { section_key, content } = req.body;

    if (!section_key || content === undefined) {
        return res.status(400).json({ success: false, error: 'Chybí data (section_key nebo content)' });
    }

    try {
        await pool.query(
            'INSERT INTO site_content (section_key, content) VALUES (?, ?) ON DUPLICATE KEY UPDATE content = ?',
            [section_key, content, content]
        );
        res.json({ success: true, message: 'Obsah byl úspěšně aktualizován' });
    } catch (err) {
        console.error('Chyba při ukládání obsahu:', err);
        res.status(500).json({ success: false, error: 'Chyba při ukládání do databáze' });
    }
});