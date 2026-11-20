const express = require('express');
const router = express.Router();

const pool = require('../config/db');
const transporter = require('../config/mailer');
const { updateRentCounts } = require('../utils/helpers');

// 1. API Endpoint pro FullCalendar (vrátí události z databáze do kalendáře)
router.get('/', async (req, res) => {
    try {
        const includeUnpublished = req.query.includeUnpublished === '1';

        const query = includeUnpublished
            ? `
                SELECT e.id,
                    COALESCE(e.draft_title, e.title) AS title,
                    COALESCE(e.draft_start, e.start) AS start,
                    COALESCE(e.draft_end, e.end) AS end,
                    COALESCE(e.draft_type, e.type) AS type,
                    e.is_published,
                    IF(r.id IS NOT NULL, 1, 0) AS booked,
                    r.name AS client_name,
                    r.surname AS client_surname,
                    r.phone AS client_phone,
                    r.email AS client_email
                FROM events e
                LEFT JOIN reservations r ON e.id = r.event_id
                WHERE e.pending_delete = 0
            `
            : `
                SELECT e.id, e.title, e.start, e.end, e.type, e.is_published,
                    IF(r.id IS NOT NULL, 1, 0) AS booked,
                    r.name AS client_name,
                    r.surname AS client_surname,
                    r.phone AS client_phone,
                    r.email AS client_email
                FROM events e
                LEFT JOIN reservations r ON e.id = r.event_id
                WHERE e.is_published = 1
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
                client_email: row.client_email,
                is_published: row.is_published === 1
            }
        }));

        res.json(formattedRows);
    } catch (err) {
        console.error("Chyba při načítání událostí:", err);
        res.status(500).json({ error: "Chyba serveru" });
    }
});

// 2. Vytvoření nové události a rezervace
router.post('/', async (req, res) => {
    try {
        const { title, start, end, type, name, surname, phone, email, date } = req.body;

        const [overlapping] = await pool.query(
            "SELECT id FROM events WHERE start < ? AND end > ?",
            [end, start]
        );

        if (overlapping.length > 0) {
            return res.json({ success: false, error: "Zvolený termín se překrývá s jinou událostí!" });
        }

        const [result] = await pool.query(
            "INSERT INTO events (title, start, end, type, is_published) VALUES (?, ?, ?, ?, 0)",
            [title, start, end, type]
        );

        const eventId = result.insertId;

        if (surname && surname.trim() !== '') {
            await pool.query(
                "INSERT INTO reservations (event_id, name, surname, email, phone, date) VALUES (?, ?, ?, ?, ?, ?)",
                [eventId, name || '', surname, email || '', phone || '', date || start]
            );

            // Odeslání e-mailu klientovi, pokud vyplnil e-mailovou adresu
            if (email && email.trim() !== '') {
                const mailOptions = {
                    from: '"Kluziště Veselí" <kluzistevcentruveseli@gmail.com>',
                    to: email,
                    subject: 'Potvrzení rezervace kluziště',
                    text: `Dobrý den, ${name || ''} ${surname},\n\nbyla Vám vytvořena rezervace na termín od ${start} do ${end}.\n\nTěšíme se na vás!`
                };

                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.error("Chyba při odesílání e-mailu klientovi z adminu:", error);
                    } else {
                        console.log("E-mail klientovi úspěšně odeslán:", info.response);
                    }
                });
            }
        }
        await updateRentCounts();

        res.json({ success: true, message: "Událost a rezervace byla úspěšně vložena!" });
    } catch (err) {
        console.error("Chyba při vkládání událostí: ", err);
        res.status(500).json({ error: "Chyba serveru při ukládání" });
    }
});

// 3. Úprava existující události
router.put('/:id', async (req, res) => {
    try {
        const eventId = req.params.id;
        const { title, start, end, type, name, surname, phone, email, date } = req.body;

        const [overlapping] = await pool.query(
            `SELECT id FROM events
             WHERE id != ?
               AND pending_delete = 0
               AND COALESCE(draft_start, start) < ?
               AND COALESCE(draft_end, end) > ?`,
            [eventId, end, start]
        );

        if (overlapping.length > 0) {
            return res.json({ success: false, error: "Zvolený termín se překrývá s jinou událostí!" });
        }

        const [currentRows] = await pool.query(
            "SELECT is_published FROM events WHERE id = ?",
            [eventId]
        );

        if (currentRows.length === 0) {
            return res.status(404).json({ success: false, error: "Událost nenalezena" });
        }

        if (currentRows[0].is_published === 1) {
            // Už je zveřejněná -> uživatel dál vidí starou verzi, nová se uloží jako draft pro admina
            await pool.query(
                "UPDATE events SET draft_title = ?, draft_start = ?, draft_end = ?, draft_type = ? WHERE id = ?",
                [title, start, end, type, eventId]
            );
        } else {
            // Ještě nebyla zveřejněná -> přepíšeme rovnou hlavní sloupce (is_published zůstává 0)
            await pool.query(
                "UPDATE events SET title = ?, start = ?, end = ?, type = ? WHERE id = ?",
                [title, start, end, type, eventId]
            );
        }

        const [existingRes] = await pool.query("SELECT id FROM reservations WHERE event_id = ?", [eventId]);

        if (existingRes.length > 0) {
            await pool.query(
                "UPDATE reservations SET name = ?, surname = ?, email = ?, phone = ?, date = ? WHERE event_id = ?",
                [name || '', surname || '', email || '', phone || '', date || start, eventId]
            );
        } else if (type === 'booked' || (surname && surname.trim() !== '')) {
            await pool.query(
                "INSERT INTO reservations (event_id, name, surname, email, phone, date) VALUES (?, ?, ?, ?, ?, ?)",
                [eventId, name || '', surname || '', email || '', phone || '', date || start]
            );
        }

        await updateRentCounts();

        res.json({ success: true, message: "Událost a rezervace byla aktualizována" });
    } catch (err) {
        console.error("Chyba při aktualizaci události:", err);
        res.status(500).json({ error: "Chyba serveru" });
    }
});

// 4. Smazání eventu
router.delete('/:id', async (req, res) => {
    try {
        const eventId = req.params.id;
        await pool.query(
            "UPDATE events SET pending_delete = 1 WHERE id = ?",
            [eventId]
        );
        await updateRentCounts();
        res.json({ success: true, message: "Událost byla označna ke smazání" });
    } catch (err) {
        console.error("Chyba při mazání události:", err);
        res.status(500).json({ error: "Chyba serveru" });
    }
});

// akce po tlačítko update 
router.post('/publish-schedule', async (req, res) => {
    try {
        const { limitDate } = req.body;

        if (!limitDate) {
            return res.status(400).json({ success: false, error: "Chybí limitDate" });
        }

        await pool.query(
            "UPDATE setting SET calendar_end_time = ? WHERE id = 1",
            [limitDate]
        );

        await pool.query(
            "DELETE FROM events WHERE pending_delete = 1"
        );

        await pool.query(
            `UPDATE events
             SET
                 title = COALESCE(draft_title, title),
                 start = COALESCE(draft_start, start),
                 end = COALESCE(draft_end, end),
                 type = COALESCE(draft_type, type),
                 draft_title = NULL,
                 draft_start = NULL,
                 draft_end = NULL,
                 draft_type = NULL,
                 is_published = 1
             WHERE pending_delete = 0
               AND DATE(COALESCE(draft_start, start)) <= ?`,
            [limitDate]
        );

        await updateRentCounts();

        res.json({ success: true, limitDate });
    } catch (err) {
        console.error("Chyba při zveřejňování rozpisu:", err);
        res.status(500).json({ error: "Chyba serveru" });
    }
});

router.get('/pending-status', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT COUNT(*) AS pendingCount
            FROM events
            WHERE is_published = 0
               OR pending_delete = 1
               OR draft_title IS NOT NULL
               OR draft_start IS NOT NULL
               OR draft_end IS NOT NULL
               OR draft_type IS NOT NULL
        `);

        res.json({
            success: true,
            hasPendingChanges: rows[0].pendingCount > 0
        });
    } catch (err) {
        console.error("Chyba při kontrole nepublikovaných změn:", err);
        res.status(500).json({ success: false, error: "Chyba serveru" });
    }
});

module.exports = router;