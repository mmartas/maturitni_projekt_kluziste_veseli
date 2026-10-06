const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
const PORT = 3000; // port na kterém běží backend server

const nodemailer = require('nodemailer');

// Middleware
app.use(cors()); // Povolí komunikaci mezi frontendem a backendem
app.use(express.json()); // Umožní serveru číst JSON data z formulářů

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

// formátování termínu z ISO formátu na formát datum-čas
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

// Pomocná funkce pro přepočet a uložení všech statistik pronájmů
async function updateRentCounts() {
    try {
        // 1. Celkový počet pronájmů (všechny eventy s type = 'rent')
        const [allRows] = await pool.query("SELECT COUNT(*) AS total FROM events WHERE type = 'rent'");
        const allCount = allRows[0].total;

        // 2. Obsazené pronájmy (type = 'rent' a zároveň k nim existuje rezervace)
        const [bookedRows] = await pool.query(`
            SELECT COUNT(*) AS total FROM events e
            JOIN reservations r ON e.id = r.event_id
            WHERE e.type = 'rent'
        `);
        const bookedCount = bookedRows[0].total;

        // 3. Volné pronájmy = Celkem mínus Obsazené
        const freeCount = allCount - bookedCount;

        // 4. Uložíme všechny tři hodnoty do tabulky setting
        await pool.query(
            "UPDATE setting SET count_free_rent = ?, count_booked_rent = ?, count_all_rent = ? WHERE id = 1",
            [freeCount, bookedCount, allCount]
        );
        
        console.log(`Statistiky pronájmů -> Volné: ${freeCount}, Obsazené: ${bookedCount}, Celkem: ${allCount}`);
    } catch (err) {
        console.error("Chyba při aktualizaci statistik pronájmů:", err);
    }
}

// 1. API Endpoint pro FullCalendar (vrátí události z databáze)
app.get('/api/events', async (req, res) => {
    try {
        // zjišťování jestli je k eventu už rezervace
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
        
        // FullCalendar očekává pole objektů, kde booked pošleme v extendedProps
        const formattedRows = rows.map(row => ({
            id: row.id,
            title: row.booked ? `Obsazeno: ${row.client_surname}` : row.title,
            start: row.start,
            end: row.end,
            extendedProps: {
                type: row.type,
                booked: row.booked === 1, // True/False pro snadné rozhodování na frontendu
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

// 1. Vytvoření nové události a rezervace (POST)
app.post('/api/events', async (req, res) => {
    try {
        const { title, start, end, type, name, surname, phone, email, date } = req.body;

        // 1. Vložíme událost do tabulky events a získáme její ID
        const [result] = await pool.query(
            "INSERT INTO events (title, start, end, type) VALUES (?, ?, ?, ?)",
            [title, start, end, type]
        );
        const eventId = result.insertId;

        // 2. Pokud je vyplněné příjmení, automaticky založíme rezervaci v tabulce reservations!
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

// 2. API Endpoint pro FullCalendar (ukládá nové rezervace do databáze a odesílá e-maily)
app.post('/api/reservations', async (req, res) => {
    try {
        const { event_id, name, surname, email, phone, note, date } = req.body;

        // vloží novou rezervaci do databáze
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

// 3. endpoint GET pro stažení rezervací do admin panelu, kvůli inboxu
app.get('/api/reservations', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM reservations ORDER BY id DESC");
        res.json(rows);
    } catch (err) {
        console.error("Chyba při načítání rezervací:", err);
        res.status(500).json({ error: "Chyba serveru při načítání" });
    }
});

// 4. endpoint pro získání informace o tom, jestli admin již přečetl danou zprávu v inboxu
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

// 5. endpoint pro získání počtu nepřečtených rezervací v inboxu
app.get('/api/reservations/unread-count', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT COUNT(*) AS count FROM reservations WHERE is_read = 0");
        res.json({ unreadCount: rows[0].count });
    } catch (err) {
        console.error("Chyba při zjišťování počtu nepřečtených zpráv:", err);
        res.status(500).json({ error: "Chyba serveru" });
    }
});


// 1. Získání uloženého nastavení z databáze - konec aktuálního rozpisu
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

// 2. Uložení / aktualizace limitního data v databázi
app.post('/api/setting', async (req, res) => {
    try {
        const { limitDate } = req.body;

        // Uložíme do tabulky (pokud záznam s id=1 neexistuje, vytvoří se, jinak se aktualizuje)
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



// Úprava existující události (PUT)
app.put('/api/events/:id', async (req, res) => {
    try {
        const eventId = req.params.id;
        const { title, start, end, type, name, surname, phone, email, date } = req.body;

        // 1. Aktualizujeme základní událost v tabulce events
        await pool.query(
            "UPDATE events SET title = ?, start = ?, end = ?, type = ? WHERE id = ?",
            [title, start, end, type, eventId]
        );

        // 2. Zjistíme, jestli k tomuto eventu už existuje rezervace v tabulce reservations
        const [existingRes] = await pool.query("SELECT id FROM reservations WHERE event_id = ?", [eventId]);

        if (existingRes.length > 0) {
            // Pokud rezervace existuje, vždy aktualizujeme její klientské údaje (příjmení, jméno atd.)
            await pool.query(
                "UPDATE reservations SET name = ?, surname = ?, email = ?, phone = ?, date = ? WHERE event_id = ?",
                [name || '', surname || '', email || '', phone || '', date || start, eventId]
            );
        } else {
            // Pokud rezervace neexistuje, ale admin zadal příjmení nebo nastavil typ booked, vytvoříme ji
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

// 1. Smazání CELÉHO eventu (smaže event a díky cascade i jeho rezervaci)
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

// 2. Zrušení POUZE rezervace (event v events zůstane a uvolní se)
app.delete('/api/reservations/by-event/:eventId', async (req, res) => {
    try {
        const eventId = req.params.eventId;
        // Smažeme záznam pouze z reservations, tabulku events vůbec neřešíme!
        await pool.query("DELETE FROM reservations WHERE event_id = ?", [eventId]);
        await updateRentCounts();
        res.json({ success: true, message: "Rezervace byla zrušena, blok je opět volný." });
    } catch (err) {
        console.error("Chyba při rušení rezervace:", err);
        res.status(500).json({ error: "Chyba serveru" });
    }
});