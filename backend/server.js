require("dotenv").config()

const express = require("express")
const session = require("express-session")
const path = require("path")
const bcrypt = require("bcrypt")
const cookieParser = require("cookie-parser")
const mongoose = require("mongoose")

const app = express()

// -------------------- DATABASE --------------------
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err))
 console.log(process.env.MONGO_URI)
// -------------------- MODELS --------------------
const userSchema = new mongoose.Schema({
  username: String,
  email: { type: String, unique: true },
  phone: String,
  password: String
})

const saleSchema = new mongoose.Schema({
  product: String,
  amount: Number,
  date: Date,
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
})

const businessSchema = new mongoose.Schema({
  name: String,
  description: String,
  contact: String,
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
})

const User = mongoose.model("User", userSchema)
const Sale = mongoose.model("Sale", saleSchema)
const Business = mongoose.model("Business", businessSchema)

const testSchema = new mongoose.Schema({
  name: String,
  value: Number
})
const testModel = mongoose.model("Test", testSchema)
// test route to check if models work
app.get("/add", async (req, res) => {
  try{
  await User.create({ 
    username: "testuser",
    email: "testuser@example.com",
    phone: "1234567890", 
    password: "password" 
  })
  res.send("User created successfully")
} catch (err) {
  console.error(err)
  res.status(500).send("Internal Server Error")
}
})


// -------------------- MIDDLEWARE --------------------
app.use(express.static(path.join(__dirname, "/public")))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(cookieParser())

app.use(session({
  secret: process.env.SESSION_SECRET || "secret-key",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // set true only in production (HTTPS)
}))

// Make user available in all EJS
app.use((req, res, next) => {
  res.locals.user = req.session.user || null
  next()
})

app.set("view engine", "ejs")
app.set("views", path.join(__dirname, "views"))

// -------------------- AUTH MIDDLEWARE --------------------
function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect("/login")
  next()
}

// -------------------- HOME --------------------
app.get("/", requireAuth, async (req, res) => {
  try {
    const sales = await Sale.find({ user_id: req.session.user._id })
      .sort({ _id: -1 })

    const totalData = await Sale.aggregate([
      { $match: { user_id: req.session.user._id } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ])

    const total = totalData[0]?.total || 0

    res.render("home", { sales, total })
  } catch (err) {
    console.error(err)
    res.status(500).send("Internal Server Error")
  }
})
app.get("/generate", (req, res) => {
   res.render("generate")
})

// -------------------- ADD SALE --------------------
app.post("/add-sale", requireAuth, async (req, res) => {
  const { product, amount } = req.body

  try {
    await Sale.create({
      product,
      amount,
      date: new Date(),
      user_id: req.session.user._id
    })

    res.redirect("/")
  } catch (err) {
    console.error(err)
    res.status(500).send("Internal Server Error")
  }
})

// -------------------- REGISTER --------------------
app.get("/register", (req, res) => {
  res.render("register", { errors: [] })
})

app.post("/register", async (req, res) => {
  const { username, email, phone, password } = req.body
  const errors = []

  if (!username || !email || !phone || !password) {
    errors.push("All fields are required")
    return res.render("register", { errors })
  }

  try {
    const existingUser = await User.findOne({ email })

    if (existingUser) {
      errors.push("Email already exists")
      return res.render("register", { errors })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const newUser = await User.create({
      username,
      email,
      phone,
      password: hashedPassword
    })

    // AUTO LOGIN
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
    const user = await User.findOne({ email })

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

// -------------------- CHECK USERS --------------------
app.get("/users", async (req, res) => {
  const users = await User.find()
  res.json(users)
})

// -------------------- LOGOUT --------------------
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login")
  })
})

// -------------------- SERVER --------------------
const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})