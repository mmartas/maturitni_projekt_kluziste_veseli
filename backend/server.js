const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
const PORT = 3000; // Server poběží na portu 3000

// Middleware
app.use(cors()); // Povolí komunikaci mezi frontendem a backendem
app.use(express.json()); // Umožní serveru číst JSON data z formulářů

// Nastavení připojení k tvé SQL databázi (uprav si uživatele/heslo/názvy podle sebe)
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'kalendar' // Zde si doplň přesný název své databáze
});

const nodemailer = require('nodemailer');

// Nastavení e-mailového odesílatele
const transporter = nodemailer.createTransport({
    service: 'gmail', // Nebo např. 'seznam' (smtp.seznam.cz), případně vlastní SMTP
    auth: {
        user: 'kluzistevcentruveseli@gmail.com',         // E-mail, ze kterého se zprávy budou posílat
        pass: 'txtdgsvoiggopucj'     // Heslo nebo vygenerované "App Password"
    }
});

// 1. API Endpoint pro FullCalendar (vrátí události z databáze)
app.get('/api/events', async (req, res) => {
    try {
        // Pomocí LEFT JOIN zjistíme, jestli už k eventu existuje rezervace
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
            title: row.booked ? `Obsazeno: ${row.client_surname}` : row.title, // Pokud je obsazeno, změníme text na "Obsazeno"
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


app.post('/api/reservations', async (req, res) => {
    console.log("Přijatá data z frontendu:", req.body); // Přidáno pro debugování
    try {
        const { event_id, name, surname, email, phone, note, date } = req.body;

        // Vložíme novou rezervaci do databáze
        await pool.query(
            "INSERT INTO reservations (event_id, name, surname, email, phone, note, date) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [event_id, name, surname, email, phone, note, date]
        );

        // 2. Příprava e-mailu pro KLIENTA
        const clientMailOptions = {
            from: '"Kluziště Veselí" <kluzistevcentruveseli@gmail.com>',
            to: email, // E-mail zadaný ve formuláři
            subject: 'Potvrzení rezervace kluziště',
            text: `Dobrý den, ${name} ${surname},\n\nvaše rezervace na kluziště byla úspěšně vytvořena.\nTermín: ${date}\n\nTěšíme se na Vás!`
        };

        // 3. Příprava e-mailu pro SPRÁVCE KLUZIŠTĚ
        const adminMailOptions = {
            from: '"Systém Kluziště" <kluzistevcentruveseli@gmail.com>',
            to: 'kluzistevcentruveseli@gmail.com', // E-mail, kam chodí upozornění tobě/správci
            subject: 'Nová rezervace na kluzišti!',
            text: `Byla vytvořena nová rezervace:\n\nJméno: ${name} ${surname}\nE-mail: ${email}\nTelefon: ${phone}\nTermín: ${date}\nPoznámka: ${note || 'žádná'}`
        };

        // 4. Odeslání obou e-mailů
        await transporter.sendMail(clientMailOptions);
        await transporter.sendMail(adminMailOptions);

        res.json({ success: true, message: "Rezervace byla úspěšně vytvořena!" });
    } catch (err) {
        console.error("Chyba při ukládání rezervace:", err);
        res.status(500).json({ error: "Chyba serveru při ukládání" });
    }
});

// Spuštění serveru
app.listen(PORT, () => {
    console.log(`Backend server úspěšně běží na adrese: http://localhost:${PORT}`);
});