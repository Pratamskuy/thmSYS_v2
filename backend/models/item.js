const db = require("../db");
//tampilkan data kabeh ae wiss 
const getAll = (callback) => {
    const query = `
        SELECT 
            items.*,
            categories.categories
        FROM items
        LEFT JOIN categories ON items.categories_id = categories.id
        ORDER BY items.id DESC
    `;
    db.query(query, callback);
};

//tampilkan data berdasarkan ID
const getById = (id, callback) => {
    const query = `
        SELECT 
            items.*,
            categories.categories
        FROM items
        LEFT JOIN categories ON items.categories_id = categories.id
        WHERE items.id = ?
    `;
    db.query(query, [id], callback);
};

//data yang iso disilih tok
const getAvailable = (callback) => {
    const query = `
        SELECT 
            items.*,
            categories.categories
        FROM items
        LEFT JOIN categories 
            ON items.categories_id = categories.id
        WHERE items.available > 0
        ORDER BY items.item_name ASC
    `;
    db.query(query, callback);
};

//nggae data
const create = (data, callback) => {
    const { item_name, description, total, categories_id, item_condition } = data;

    if (!item_name || !total || !categories_id) {
        return callback(new Error("isi semua kolom yang wajib diisi"));
    }

    const query = `
        INSERT INTO items (item_name, description, total, available, categories_id, item_condition)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    // getAvailable maune podo mbek totale bos 
    db.query(query, [item_name, description || null, total, total, categories_id, item_condition || 'normal'], callback);
};

//update data fwgygsfwgygguekgeuAHAHUGFWEFGAUFGWEUOFGEWOAFGU ngoding muemet pak tulung
const update = (id, data, callback) => {
    const {
        item_name,
        description,
        total,
        available,
        categories_id,
        item_condition
    } = data;

    const query = `
        UPDATE items 
        SET 
            item_name = ?,
            description = ?,
            total = ?,
            available = ?,
            categories_id = ?,
            item_condition = ?
        WHERE id = ?
    `;

    const params = [
        item_name,
        description,
        total,
        available,
        categories_id,
        item_condition,
        id
    ];

    db.query(query, params, callback);
};

//hapus items
const deleteById = (id, callback) => {
    const query = "DELETE FROM items WHERE id = ?";
    db.query(query, [id], callback);
};

// Mengurangi/menambah item_count tersedia saat peminjaman/pengembalian
const updateJumlahTersedia = (id, item_count, operation, callback) => {
    // operation: 'kurang' untuk peminjaman, 'tambah' untuk pengembalian
    let query;
    if (operation === 'kurang') {
        query = "UPDATE items SET available = available - ? WHERE id = ? AND available >= ?";
        db.query(query, [item_count, id, item_count], callback);
    } else {
        query = "UPDATE items SET available = available + ? WHERE id = ?";
        db.query(query, [item_count, id], callback);
    }
};

module.exports = {
    getAll,
    getById,
    getAvailable,
    create,
    update,
    deleteById,
    updateJumlahTersedia
};
