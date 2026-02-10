const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const db = require("./db");
const routes = require("./routes/routes");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const path = require("path");
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

app.use("/api", routes);

app.get("/", (req, res) => {
    res.json({
        message: "Selamat datang di API Peminjaman Alat",
        version: "1.0.0",
        endpoints: {
            users: "/api/users",
            kategori: "/api/kategori",
            alat: "/api/alat",
            peminjaman: "/api/peminjaman",
            pengembalian: "/api/pengembalian"
        }
    });
});

db.initDatabase();

app.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`Server berjalan di http://localhost:${PORT}`);
    console.log(`========================================\n`);
});
