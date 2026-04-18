require("dotenv").config()

const express = require("express")
const session = require("express-session")
const path = require("path")
const bcrypt = require("bcrypt")
const cookieParser = require("cookie-parser")

const app = express()

// -------------------- STATIC FILES --------------------
app.use(express.static(path.join(__dirname, "public")))

// -------------------- MIDDLEWARE --------------------
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(cookieParser())

app.use(session({
  secret: process.env.SESSION_SECRET || "secret-key",
  resave: false,
  saveUninitialized: false,
  cookie: {secure: false} //change ro true only if using HTTPS
}))

// Make user available in all EJS
app.use((req, res, next) => {
  res.locals.user = req.session.user || null
  next()
})

app.set("view engine", "ejs")
app.set("views", path.join(__dirname, "views"))

// -------------------- DATABASE --------------------
const Database = require("better-sqlite3")
const db = new Database("luminos.db")
db.pragma("journal_mode = WAL")

// USERS TABLE
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    email TEXT UNIQUE,
    phone TEXT,
    password TEXT
  )
`).run()

// SALES TABLE
db.prepare(`
  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product TEXT,
    amount REAL,
    date TEXT,
    user_id INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`).run()

// -------------------- AUTH MIDDLEWARE --------------------
function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect("/login")
  next()
}

// -------------------- HOME --------------------
app.get("/", requireAuth, (req, res) => {

  const sales = db.prepare(`
    SELECT * FROM sales
    WHERE user_id = ?
    ORDER BY id DESC
  `).all(req.session.user.id)

  const total = db.prepare(`
    SELECT SUM(amount) AS total
    FROM sales
    WHERE user_id = ?
  `).get(req.session.user.id)

  res.render("home", {
    sales,
    total: total.total || 0
  })
})

// -------------------- ADD SALE --------------------
app.post("/add-sale", requireAuth, (req, res) => {
  const { product, amount } = req.body

  db.prepare(`
    INSERT INTO sales (product, amount, date, user_id)
    VALUES (?, ?, ?, ?)
  `).run(
    product,
    amount,
    new Date().toISOString(),
    req.session.user.id
  )

  res.redirect("/")
})

// -------------------- REGISTER --------------------
app.get("/register", (req, res) => {
  res.render("register", { errors: [] })
})

app.post("/register", async (req, res) => {
  const { username, phone, password } = req.body
  const email = req.body.email.toLowerCase().trim()
  const errors = []

  if (!username || !email || !phone || !password) {
    errors.push("All fields are required")
    return res.render("register", { errors })
  }

  try {
    const existingUser = db.prepare(`
      SELECT * FROM users WHERE email = ?
    `).get(email)

    if (existingUser) {
      errors.push("Email already exists")
      return res.render("register", { errors })
    }

    const hashed = await bcrypt.hash(password, 10)

    db.prepare(`
      INSERT INTO users (username, email, phone, password)
      VALUES (?, ?, ?, ?)
    `).run(username, email, phone, hashed)

    // AUTO LOGIN AFTER REGISTER
    const newUser = db.prepare(`
      SELECT * FROM users WHERE email = ?
    `).get(email)

    req.session.user = newUser

    res.redirect("/")

  } catch (err) {
    console.error(err)
    res.status(500).send("Internal Server Error")
  }
})

// -------------------- LOGIN --------------------
app.get("/login", (req, res) => {
  res.render("login", { errors: [] })
})

app.post("/login", async (req, res) => {
  const email = req.body.email.toLowerCase().trim()
  const { password } = req.body
  const errors = []

  try {
    const user = db.prepare(`
      SELECT * FROM users WHERE email = ?
    `).get(email)

    if (!user) {
      errors.push("Invalid email or password")
      return res.render("login", { errors })
    }

    const match = await bcrypt.compare(password, user.password)

    if (!match) {
      errors.push("Invalid email or password")
      return res.render("login", { errors })
    }

    req.session.user = user
    res.redirect("/")

  } catch (err) {
    console.error(err)
    res.status(500).send("Internal Server Error")
  }
})
// check if data exists
   app.get("/users", (req, res) => {
    const users = db.prepare("SELECT * FROM users").all()
    res.json(users)
})

// -------------------- LOGOUT --------------------
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login")
  })
})

// -------------------- START SERVER --------------------
const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})