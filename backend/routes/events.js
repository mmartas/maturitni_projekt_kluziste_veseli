const express = require('express');
const router = express.Router();

const pool = require('../config/db');
const transporter = require('../config/mailer');
const { updateRentCounts } = require('../utils/helpers');

// 1. API Endpoint pro FullCalendar (vrátí události z databáze do kalendáře)
router.get('/', async (req, res) => {
    try {
        const includeUnpublished = req.query.includeUnpublished === '1';
        const whereClause = includeUnpublished
            ? ''
            : 'WHERE e.is_published = 1 AND e.pending_delete = 0';

        const query = `
            SELECT e.id, e.title, e.start, e.end, e.type, e.is_published,
            IF(r.id IS NOT NULL, 1, 0) AS booked,
            r.name AS client_name,
            r.surname AS client_surname,
            r.phone AS client_phone,
            r.email AS client_email
            FROM events e
            LEFT JOIN reservations r ON e.id = r.event_id
            ${whereClause}
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
            "SELECT id FROM events WHERE id != ? AND start < ? AND end > ?",
            [eventId, end, start]
        );

        if (overlapping.length > 0) {
            return res.json({ success: false, error: "Zvolený termín se překrývá s jinou událostí!" });
        }

        await pool.query(
            "UPDATE events SET title = ?, start = ?, end = ?, type = ?, is_published = 1 WHERE id = ?",
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
router.delete('/:id', async (req, res) => {
    try {
        const eventId = req.params.id;
        await pool.query(
            "UPDATE events SET pending_delete = 1 WHERE id = ?",
            [eventId]
        );
        await updateRentCounts();
        res.json({ success: true, message: "Událost byla smazána" });
    } catch (err) {
        console.error("Chyba při mazání události:", err);
        res.status(500).json({ error: "Chyba serveru" });
    }
});

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
            "UPDATE events SET is_published = 0 WHERE pending_delete = 0 AND DATE(start) <= ?",
            [limitDate]
        );

        await updateRentCounts();

        res.json({ success: true, limitDate });
    } catch (err) {
        console.error("Chyba při zveřejňování rozpisu:", err);
        res.status(500).json({ error: "Chyba serveru" });
    }
});

module.exports = router;