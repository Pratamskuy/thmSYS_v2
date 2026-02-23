const db = require("../db");

//mesin get all
const getAll = (callback) => {
    const query = `
        SELECT 
            borrow_data.*,
            user_data.full_name as full_name,
            user_data.email as email,
            items.item_name,
            officer.full_name as officer_name,
            return_data.return_date,
            return_data.late,
            return_data.fine AS denda
        FROM borrow_data
        LEFT JOIN user_data ON borrow_data.id_user = user_data.id
        LEFT JOIN items ON borrow_data.id_items = items.id
        LEFT JOIN user_data as officer ON borrow_data.id_officer_approval = officer.id
        LEFT JOIN return_data ON return_data.borrow_id = borrow_data.id
        ORDER BY borrow_data.id DESC
    `;
    db.query(query, callback);
};

//mesin get by id
const getById = (id, callback) => {
    const query = `
        SELECT 
            borrow_data.*,
            user_data.full_name as full_name,
            user_data.email as email,
            items.item_name,
             officer.full_name as officer_name,
            return_data.return_date,
            return_data.late,
            return_data.fine AS denda
        FROM borrow_data
        LEFT JOIN user_data ON borrow_data.id_user = user_data.id
        LEFT JOIN items ON borrow_data.id_items = items.id
        LEFT JOIN user_data as officer ON borrow_data.id_officer_approval = officer.id
         LEFT JOIN return_data ON return_data.borrow_id = borrow_data.id
        WHERE borrow_data.id = ?
    `;
    db.query(query, [id], callback);
};

//mesin get by user
const getByUser = (id_user, callback) => {
    const query = `
        SELECT 
            b.id,
            b.id_user,
            u.name AS user_name,
            b.id_items,
            i.item_name,
            b.item_count,
            b.borrow_date,
            b.return_date_expected,
            b.status,
            b.notes,
            b.approval_date,
            r.return_date,
            r.late,
            r.fine AS denda
        FROM borrow_data b
        LEFT JOIN items i ON b.id_items = i.id
        LEFT JOIN user_data u ON b.id_user = u.id
        LEFT JOIN return_data r ON r.borrow_id = b.id
        WHERE b.id_user = ?
        ORDER BY b.created_at DESC
    `;

    db.query(query, [id_user], (err, results) => {
        if (err) return callback(err, null);
        callback(null, results);
    });
};


//mesin status pending
const getPending = (callback) => {
    const query = `
        SELECT 
            borrow_data.*,
            user_data.full_name as full_name,
            user_data.email as email,
            items.item_name,
            return_data.return_date,
            return_data.late,
            return_data.fine AS denda
        FROM borrow_data
        LEFT JOIN user_data ON borrow_data.id_user = user_data.id
        LEFT JOIN items ON borrow_data.id_items = items.id
        LEFT JOIN return_data ON return_data.borrow_id = borrow_data.id
        WHERE borrow_data.status = 'pending'
        ORDER BY borrow_data.borrow_date ASC
    `;
    db.query(query, callback);
};

//get data sing barange urung dibalekne jir
const getActive = (callback) => {
    const query = `
        SELECT 
            borrow_data.*,
            user_data.full_name as full_name,
            user_data.email as email,
             items.item_name,
            return_data.return_date,
            return_data.late,
            return_data.fine,
            return_data.fine AS denda
        FROM borrow_data
        LEFT JOIN user_data ON borrow_data.id_user = user_data.id
        LEFT JOIN items ON borrow_data.id_items = items.id
        WHERE borrow_data.status = 'taken'
        ORDER BY borrow_data.return_date_expected ASC
    `;
    db.query(query, callback);
};

//mesin pembuat borrow_data baru otomatis keren jir yay
const create = (data, callback) => {
    const { id_user, id_items, item_count = 1, return_date_expected, notes } = data;

    if (!id_user || !id_items || !return_date_expected) {
        return callback(new Error("Data borrow tidak lengkap"));
    }

    const checkStock = `
        SELECT available FROM items WHERE id = ?
    `;

    db.query(checkStock, [id_items], (err, result) => {
        if (err) return callback(err);
        if (result.length === 0) return callback(new Error("Item tidak ditemukan"));

        if (result[0].available < item_count) {
            return callback(new Error("Stok barang tidak mencukupi"));
        }

        const query = `
            INSERT INTO borrow_data 
            (id_user, id_items, item_count, return_date_expected, notes, status)
            VALUES (?, ?, ?, ?, ?, 'pending')
        `;

        db.query(
            query,
            [id_user, id_items, item_count, return_date_expected, notes],
            callback
        );
    });
};
//mesin approve
const approve = (id, officer_id, callback) => {
    db.getConnection((err, connection) => {
        if (err) return callback(err, null);

        connection.beginTransaction((err) => {
            if (err) {
                connection.release();
                return callback(err, null);
            }

            // First, lock and check the item availability
            const checkQuery = `
                SELECT i.available, b.item_count
                FROM borrow_data b
                JOIN items i ON b.id_items = i.id
                WHERE b.id = ? AND b.status = 'pending'
                FOR UPDATE
            `;
            connection.query(checkQuery, [id], (err, results) => {
                if (err) {
                    return connection.rollback(() => {
                        connection.release();
                        callback(err, null);
                    });
                }

                if (results.length === 0) {
                    return connection.rollback(() => {
                        connection.release();
                        callback(new Error('Borrow request not found or not pending'), null);
                    });
                }

                const { available, item_count } = results[0];
                if (available < item_count) {
                    return connection.rollback(() => {
                        connection.release();
                        callback(new Error('Insufficient stock'), null);
                    });
                }

                // Now update
                const updateQuery = `
                    UPDATE borrow_data b
                    JOIN items i ON b.id_items = i.id
                    SET 
                        b.status = 'taken',
                        b.id_officer_approval = ?,
                        b.approval_date = NOW(),
                        i.available = i.available - b.item_count
                    WHERE b.id = ?
                `;
                connection.query(updateQuery, [officer_id, id], (err, results) => {
                    if (err) {
                        return connection.rollback(() => {
                            connection.release();
                            callback(err, null);
                        });
                    }

                    connection.commit((err) => {
                        if (err) {
                            return connection.rollback(() => {
                                connection.release();
                                callback(err, null);
                            });
                        }
                        connection.release();
                        callback(null, results);
                    });
                });
            });
        });
    });
};
//mesin reject
const reject = (id, officer_id, notes, callback) => {
    const query = `
        UPDATE borrow_data 
        SET status = 'rejected', id_officer_approval = ?, approval_date = NOW(), notes = ?
        WHERE id = ? AND status = 'pending'
    `;
    db.query(query, [officer_id, notes, id], callback);
};

//mesin cancel (for users to cancel their pending requests)
const cancel = (id, user_id, callback) => {
    const query = `
        UPDATE borrow_data 
        SET status = 'cancelled', notes = 'Cancelled by user'
        WHERE id = ? AND id_user = ? AND status = 'pending'
    `;
    db.query(query, [id, user_id], callback);
};

//mesin update status
const updateStatus = (id, status, callback) => {
    const query = "UPDATE borrow_data SET status = ? WHERE id = ?";
    db.query(query, [status, id], callback);
};

//mesin delete data
const deleteById = (id, callback) => {
    const query = "DELETE FROM borrow_data WHERE id = ?";
    db.query(query, [id], callback);
};

module.exports = {
    getAll,
    getById,
    getByUser,
    getPending,
    getActive,
    create,
    approve,
    reject,
    cancel,
    updateStatus,
    deleteById
};