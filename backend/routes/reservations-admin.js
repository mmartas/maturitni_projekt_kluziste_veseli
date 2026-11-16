const express = require('express');
const router = express.Router();

const pool = require('../config/db');
const transporter = require('../config/mailer');
const { updateRentCounts, formatEmailDate } = require('../utils/helpers');

// 5. API Endpoint pro FullCalendar (ukládá nové rezervace do databáze a odesílá e-maily)
router.post('/', async (req, res) => {
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
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM reservations WHERE deletedMessage = 0 ORDER BY date DESC");
        res.json(rows);
    } catch (err) {
        console.error("Chyba při načítání rezervací:", err);
        res.status(500).json({ error: "Chyba serveru při načítání" });
    }
});

// 7. Endpoint pro skrytí zprávy z inboxu (rezervace v DB zůstane)
router.patch('/:id/hide', async (req, res) => {
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
router.patch('/:id/read', async (req, res) => {
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
router.get('/unread-count', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT COUNT(*) AS count FROM reservations WHERE is_read = 0 AND deletedMessage = 0");
        res.json({ unreadCount: rows[0].count });
    } catch (err) {
        console.error("Chyba při zjišťování počtu nepřečtených zpráv:", err);
        res.status(500).json({ error: "Chyba serveru" });
    }
});

// 10. zrušení rezervace
router.delete('/by-event/:eventId', async (req, res) => {
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



module.exports = router;