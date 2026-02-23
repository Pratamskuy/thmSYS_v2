//FILE DATABASE UNTUK WEB PEMINJAMAN ALAT FOTOGRAFI DAN DOKUMENTASI

const mysql = require('mysql2')

//creating connection pool to database
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'db_peminjaman',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0, 
});

//initialization function to database and table
const initDatabase = () => {
    const tempConnection = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: ''
    });

    tempConnection.connect((err) => {
        if (err) {
            console.log('koneksi gagal:', err.message);
        return;
        }
         console.log('koneksi sukses');
         //membuat database jika belum ada
        tempConnection.query(`CREATE DATABASE IF NOT EXISTS db_peminjaman`, (err) => {
            if (err) {
                console.error('gagal membuat database', err.message);
            return;
            }
            console.log('sukses membuat database');
            
            //gunakan database
            tempConnection.query('USE db_peminjaman', (err) => {
            if (err) throw err;

            createAllTables(tempConnection)
            })
        })  
    })
}

//fungsi create all table
const createAllTables = (connection) =>{

    //Tabel user role, untuk mendefinisikan role user
    const createUserrRole = `CREATE TABLE IF NOT EXISTS user_role (
        id INT AUTO_INCREMENT PRIMARY KEY,
        role VARCHAR(50) NOT NULL UNIQUE
    )`;

    //Tabel user menyimpan data user
    const createUserData = `CREATE TABLE IF NOT EXISTS user_data(
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR (255) NOT NULL,
        email VARCHAR (100) UNIQUE NOT NULL,
        password VARCHAR (255) NOT NULL,
        full_name VARCHAR (255),
        address VARCHAR (255),
        role_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (role_id) REFERENCES user_role(id) ON DELETE SET NULL
    )`;

    //tabel kategori menyimpan data kategori(kamera, lensa, tripod, baterai, memori)
    const createCategoriesTable = `CREATE TABLE IF NOT EXISTS categories(
        id INT AUTO_INCREMENT PRIMARY key,
        categories VARCHAR (255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;

    //tabel items, menyimpan data item
    const createItemTable = `CREATE TABLE IF NOT EXISTS items(
        id INT AUTO_INCREMENT PRIMARY KEY,
        item_name VARCHAR (255) NOT NULL,
        description TEXT,
        total INT NOT NULL DEFAULT 0,
        available INT NOT NULL DEFAULT 0,
        categories_id INT,
        item_condition ENUM ('normal', 'ok', 'not good', 'broken'),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (categories_id) REFERENCES categories(id) ON DELETE SET NULL
    )`;

    //tabel data pinjam, ben ruh sopo nyileh opo, ben ra ilang
    const createBorrowTable = `CREATE TABLE IF NOT EXISTS borrow_data (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_user INT NOT NULL,
        id_items INT NOT NULL,
        item_count INT NOT NULL DEFAULT 1,
        borrow_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        return_date_expected DATETIME NOT NULL,
        status ENUM ('available', 'approved','rejected', 'waiting for return', 'pending', 'taken', 'cancelled') DEFAULT 'pending',
        id_officer_approval INT,
        approval_date DATETIME,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_user) REFERENCES user_data(id),
        FOREIGN KEY (id_items) REFERENCES items(id),
        FOREIGN KEY (id_officer_approval) REFERENCES user_data(id)

    )`;

    //tabel penngembalian anjay mabar mbuh tulisi opo pekhhh
    const createReturnTable = `CREATE TABLE IF NOT EXISTS return_data (
        id INT AUTO_INCREMENT PRIMARY KEY,
        borrow_id INT NOT NULL UNIQUE,
        officer_id INT,
        return_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        item_condition ENUM ('normal', 'ok', 'not good', 'broken'),
        late INT DEFAULT 0,
        fine DECIMAL(10, 2) DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (borrow_id) REFERENCES borrow_data(id),
        FOREIGN KEY (officer_id) REFERENCES user_data(id)
    )`;

    //alat penyimpan log aktivitas ajaib
    const createLogTable = `CREATE TABLE IF NOT EXISTS log(
        id INT AUTO_INCREMENT PRIMARY KEY,
            id_user INT,
            action VARCHAR(255) NOT NULL,
            table_affected VARCHAR(100),
            id_data INT,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (id_user) REFERENCES user_data(id) ON DELETE SET NULL
    )`;

    //test
    connection.query(createUserrRole, (err) => {
        if (err) {
            console.error('error creating table "user_roles"', err.message);
        } else {
            console.log('table user_roles oke');
        }
    })
    connection.query(createUserData, (err) => {
        if (err) {
            console.error('error creating table "user_data"', err.message);
        } else {
            console.log('table user_data oke');
        }
    })
    connection.query(createCategoriesTable, (err) => {
        if (err) {
            console.error('error creating table "categories"', err.message);
        } else {
            console.log('table categories oke');
        }
    })
    connection.query(createItemTable, (err) => {
        if (err) {
            console.error('error creating table "items"', err.message);
        } else {
            console.log('table items oke');
        }
    })
    connection.query(createBorrowTable, (err) => {
        if (err) {
            console.error('error creating table "borrow_data"', err.message);
        } else {
            console.log('table Borrow_data oke');
        }
    })
    connection.query(createReturnTable, (err) => {
        if (err) {
            console.error('error creating table "return_data"', err.message);
        } else {
            console.log('table return_data oke');
        }
    })
    connection.query(createLogTable, (err) => {
        if (err) {
            console.error('error creating table "log"', err.message);
        } else {
            console.log('table log oke');
        }
    })
}

//fungsi insert role default
const insertDefaultRoles = (connection) => {
    const checkRoles = `SELECT COUNT(*) as count FROM user_roles`
    connection.query(checkRoles, (err, results) => {
        if (err) {
            console.error('error checking roles', err.message);
            return;
    }})

    //roles default
    if (results[0].count === 0) {
        const insertRoles = `
            INSERT INTO user_role (id, role) VALUES 
            (1, 'admin'),
            (2, 'petugas'),
            (3, 'peminjam')
        `;
        connection.query(insertRoles, (err) => {
            if (err) console.error("Error insert roles:", err.message);
            else console.log("3. Default roles berhasil ditambahkan");

            connection.end(); // Tutup koneksi sedelo
        });
    } else {
        console.log("3. Roles sudah ada");
        connection.end();
};
}
module.exports = db;
module.exports.initDatabase = initDatabase;