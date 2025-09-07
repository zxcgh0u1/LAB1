const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const session = require("express-session");

const app = express();
const PORT = 3000;

// ====== Middleware ======
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// ====== Сессии ======
app.use(session({
    secret: "super-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 }
}));

// ====== Подключение к MongoDB ======
const username = "Egor";
const password = "12345";
const cluster = "cluster0.rvykywl";
const dbname = "Cluster0";

const encodedPassword = encodeURIComponent(password);
const MONGODB_URI = `mongodb+srv://${username}:${encodedPassword}@${cluster}.mongodb.net/${dbname}?retryWrites=true&w=majority`;

async function connectToMongoDB() {
    try {
        console.log("🔗 Подключаемся к MongoDB...");
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });
        console.log("✅ УСПЕШНО подключено к MongoDB!");
    } catch (error) {
        console.error("❌ ОШИБКА подключения:", error.message);
    }
}
connectToMongoDB();

// ====== Модель пользователя ======
const userSchema = new mongoose.Schema({
    login: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const User = mongoose.model("User", userSchema);

// ====== Регистрация ======
app.post("/register", async (req, res) => {
    const { login, password } = req.body;
    try {
        const existingUser = await User.findOne({ login });
        if (existingUser) {
            return res.send(`<h2>❌ Пользователь ${login} уже существует!</h2><a href="/">Назад</a>`);
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ login, password: hashedPassword });
        await newUser.save();
        res.send(`<h2>✅ Регистрация успешна!</h2><a href="/">Войти</a>`);
    } catch (err) {
        console.error(err);
        res.status(500).send("Ошибка сервера");
    }
});

// ====== Авторизация ======
app.post("/login", async (req, res) => {
    const { login, password } = req.body;
    try {
        const user = await User.findOne({ login });
        if (!user) {
            return res.send(`<h2>❌ Пользователь не найден</h2><a href="/">Назад</a>`);
        }
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.send(`<h2>❌ Неверный пароль</h2><a href="/">Назад</a>`);
        }
        req.session.user = { login: user.login };
        res.redirect("/profile");
    } catch (err) {
        console.error(err);
        res.status(500).send("Ошибка сервера");
    }
});

// ====== Личный кабинет ======
app.get("/profile", (req, res) => {
    if (!req.session.user) {
        return res.send(`<h2>⚠ Сначала авторизуйтесь</h2><a href="/">Войти</a>`);
    }
    res.send(`
        <h2>👋 Привет, ${req.session.user.login}!</h2>
        <p>Это твой личный кабинет.</p>
        <a href="/logout">Выйти</a>
    `);
});

// ====== Выход ======
app.get("/logout", (req, res) => {
    req.session.destroy(() => res.redirect("/"));
});

// ====== Обратная связь (контакты) ======
app.post("/contact", (req, res) => {
    const { name, email, subject, message } = req.body;
    let data = [];
    if (fs.existsSync("messages.json")) {
        data = JSON.parse(fs.readFileSync("messages.json", "utf8"));
    }
    data.push({ name, email, subject, message, date: new Date().toLocaleString() });
    fs.writeFileSync("messages.json", JSON.stringify(data, null, 2), "utf8");
    res.send(`
        <h2>Спасибо, ${name}!</h2>
        <p>Мы получили ваше сообщение:</p>
        <blockquote>${message}</blockquote>
        <a href="/contacts.html">Вернуться назад</a>
    `);
});

// ====== Гостевая книга ======

// Добавление отзыва
app.post("/guestbook", (req, res) => {
    const review = req.body;
    let reviews = [];
    if (fs.existsSync("guestbook.json")) {
        reviews = JSON.parse(fs.readFileSync("guestbook.json", "utf8"));
    }
    reviews.push({ ...review, date: new Date().toLocaleString() });
    fs.writeFileSync("guestbook.json", JSON.stringify(reviews, null, 2), "utf8");
    res.redirect("/guestbook.html");
});

// Получение отзывов (JSON для JS на фронтенде)
app.get("/guestbook-data", (req, res) => {
    let reviews = [];
    if (fs.existsSync("guestbook.json")) {
        reviews = JSON.parse(fs.readFileSync("guestbook.json", "utf8"));
    }
    res.json(reviews);
});

// ====== Запуск сервера ======
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен: http://localhost:${PORT}`);
});
// ====== Список товаров (многомерный массив) ======
const products = {
    "Классика Люкс": {
        материал: "Итальянский лен с шелковой нитью",
        размеры: "Индивидуальный пошив",
        цена: "7500 руб.",
        описание: "Роскошные шторы премиум-класса."
    },
    "Классика": {
        материал: "Хлопок, полиэстер",
        размеры: "250x140 см",
        цена: "4500 руб.",
        описание: "Классические шторы из плотной ткани."
    },
    "Римские": {
        материал: "Лен, полиэстер",
        размеры: "по заказу",
        цена: "5500 руб.",
        описание: "Современные римские шторы."
    },
    "Японские панели": {
        материал: "Плотный текстиль",
        размеры: "по заказу",
        цена: "6800 руб.",
        описание: "Идеальны для минималистичных интерьеров."
    }
};
// ====== Поиск товаров ======
app.get("/search", (req, res) => {
    const query = (req.query.q || "").trim().toLowerCase();

    if (!query) {
        return res.send("<h2>Введите поисковый запрос</h2><a href='/catalog.html'>Назад</a>");
    }

    let results = [];
    for (const [name, details] of Object.entries(products)) {
        if (name.toLowerCase().startsWith(query)) {
            results.push({ name, details });
        }
    }

    if (results.length === 0) {
        return res.send(`<h2>Товаров не найдено по запросу: "${query}"</h2><a href='/catalog.html'>Назад</a>`);
    }

    let html = "<h2>Результаты поиска</h2>";
    results.forEach(r => {
        html += `<div style="border:1px solid #ccc; padding:10px; margin:10px 0;">
                    <h3>${r.name}</h3>
                    <ul>
                        <li><b>Материал:</b> ${r.details.материал}</li>
                        <li><b>Размеры:</b> ${r.details.размеры}</li>
                        <li><b>Цена:</b> ${r.details.цена}</li>
                        <li><b>Описание:</b> ${r.details.описание}</li>
                    </ul>
                </div>`;
    });

    html += "<a href='/catalog.html'>← Вернуться в каталог</a>";
    res.send(html);
});
