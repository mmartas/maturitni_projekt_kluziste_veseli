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
    database: 'kalendar'
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

// 1. API Endpoint pro FullCalendar (vrátí události z databáze)
app.get('/api/events', async (req, res) => {
    try {
        // zjišťování jestli je k eventu už rezervace
        const query = `
            SELECT e.id, e.title, e.start, e.end, e.type, 
            IF(r.id IS NOT NULL, 1, 0) AS booked,
            r.surname AS client_surname
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
                client_surname: row.client_surname
            }
        }));

        res.json(formattedRows);
    } catch (err) {
        console.error("Chyba při načítání událostí:", err);
        res.status(500).json({ error: "Chyba serveru" });
    }
});

app.post('/api/events', async (req, res) => {
    try {
        const { title, start, end, type } = req.body;

        await pool.query(
            "INSERT INTO events (title, start, end, type) VALUES (?, ?, ?, ?)",
            [title, start, end, type]
        );

        res.json({success: true, message: "Událost byla vložena!"});
    } catch (err) {
        console.error("Chyba při vkládání událostí: ", err);
        res.status(500).json({ error: "Chyba serveru při ukládání" });
    }
})

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