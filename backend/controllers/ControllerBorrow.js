const borrow = require('../models/pinjam');
const activityLog = require('../models/activityLog');
const item = require('../models/item');
const returnModel = require('../models/returnModel')

const getAll = (req, res) => {
    borrow.getAll((err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: "Gagal mengambil data peminjaman",
                error: err.message
            });
        }
        res.status(200).json({
            success: true,
            message: "Berhasil mengambil data peminjaman",
            data: results
        });
    });
};

// ===== GET PEMINJAMAN BY ID =====
// Endpoint: GET /api/peminjaman/:id
const getById = (req, res) => {
    const { id } = req.params;

    borrow.getById(id, (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: "Gagal mengambil data peminjaman",
                error: err.message
            });
        }
        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "borrow tidak ditemukan"
            });
        }
        res.status(200).json({
            success: true,
            data: results[0]
        });
    });
};

// ===== GET MY PEMINJAMAN =====
// Endpoint: GET /api/peminjaman/my
// Untuk peminjam melihat riwayat peminjamannya
const getMyborrow = (req, res) => {
    const id_user = req.user.id; 

    if (!id_user) {
        return res.status(401).json({
            success: false,
            message: "User tidak terautentikasi"
        });
    }

    borrow.getByUser(id_user, (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: "Gagal mengambil data peminjaman",
                error: err.message
            });
        }

        res.status(200).json({
            success: true,
            total: results.length,
            data: results
        });
    });
};


// ===== GET PENDING PEMINJAMAN =====
// Endpoint: GET /api/peminjaman/pending
// Untuk petugas melihat peminjaman yang perlu diapprove
const getPending = (req, res) => {
    borrow.getPending((err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: "Gagal mengambil data peminjaman pending",
                error: err.message
            });
        }
        res.status(200).json({
            success: true,
            data: results
        });
    });
};

// ===== GET ACTIVE PEMINJAMAN =====
// Endpoint: GET /api/peminjaman/active
// Untuk melihat peminjaman yang sedang berjalan
const getActive = (req, res) => {
    borrow.getActive((err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: "Gagal mengambil data peminjaman aktif",
                error: err.message
            });
        }
        res.status(200).json({
            success: true,
            data: results
        });
    });
};

// ===== CREATE PEMINJAMAN (AJUKAN PEMINJAMAN) =====
// Endpoint: POST /api/peminjaman
const create = (req, res) => {
    const {
        id_items,
        item_count,
        return_date_expected,
        notes
    } = req.body;

    const data = {
        id_items: id_items,
        item_count: item_count || 1,
        return_date_expected: return_date_expected,
        notes: notes || null,
        id_user: req.user.id
    };

    // Validasi input
    if (!data.id_items || !data.return_date_expected) {
        return res.status(400).json({
            success: false,
            message: "ID item dan tanggal kembali wajib diisi"
        });
    }

    // Cek ketersediaan item
    item.getById(data.id_items, (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Item tidak ditemukan"
            });
        }

        const itemData = results[0];

        if (itemData.jumlah_tersedia < data.item_count) {
            return res.status(400).json({
                success: false,
                message: `Stok tidak cukup. Tersedia: ${itemData.jumlah_tersedia}`
            });
        }

        borrow.create(data, (err, results) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: "Gagal mengajukan peminjaman",
                    error: err.message
                });
            }

            activityLog.create({
                id_user: req.user.id,
                aksi: 'CREATE',
                tabel_terkait: 'peminjaman',
                id_data: results.insertId,
                keterangan: `Pengajuan peminjaman item: ${itemData.nama_item}`
            }, () => { });

            res.status(201).json({
                success: true,
                message: "Berhasil mengajukan peminjaman. Menunggu persetujuan petugas.",
                data: { id: results.insertId }
            });
        });
    });
};

// ===== APPROVE PEMINJAMAN =====
// Endpoint: PUT /api/peminjaman/:id/approve
const approve = (req, res) => {
    const { id } = req.params;
    const officer_id = req.user.id;

    // Ambil data peminjaman dulu
    borrow.getById(id, (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "borrow tidak ditemukan"
            });
        }

        const peminjaman = results[0];

        if (peminjaman.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: "borrow ini sudah diproses sebelumnya"
            });
        }

          // Approve peminjaman (termasuk pengurangan stok di model)
          borrow.approve(id, officer_id, (err, results) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: "Gagal menyetujui peminjaman",
                    error: err.message
                });
            }

            if (results.affectedRows === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Gagal memperbarui stok item"
                });
            }
            // Catat log aktivitas
            activityLog.create({
                id_user: officer_id,
                aksi: 'APPROVE',
                tabel_terkait: 'peminjaman',
                id_data: id,
                keterangan: `borrow disetujui: ID ${id}`
            }, () => { });

            res.status(200).json({
                success: true,
                message: "borrow berhasil disetujui"
            });
        });
    });
};

// ===== REJECT PEMINJAMAN =====
// Endpoint: PUT /api/peminjaman/:id/reject
const reject = (req, res) => {
    const { id } = req.params;
    const { catatan } = req.body;
    const officer_id = req.user.id;

    borrow.reject(id, officer_id, catatan, (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: "Gagal menolak peminjaman",
                error: err.message
            });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "borrow tidak ditemukan atau sudah diproses"
            });
        }

        // Catat log aktivitas
        activityLog.create({
            id_user: officer_id,
            aksi: 'REJECT',
            tabel_terkait: 'peminjaman',
            id_data: id,
            keterangan: `borrow ditolak: ID ${id}`
        }, () => { });

        res.status(200).json({
            success: true,
            message: "borrow berhasil ditolak"
        });
    });
};

// ===== GET RETURN REQUESTS =====
// Endpoint: GET /api/peminjaman/return-requests
// Untuk petugas melihat pengajuan pengembalian
const getReturnRequests = (req, res) => {
    borrow.getAll((err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: "Gagal mengambil data pengajuan pengembalian",
                error: err.message
            });
        }

        // Filter manual karena borrow.getAll ambil semua
        // Alternatif: buat model function khusus biar lebih efisien
        const returnRequests = results.filter(item => item.status === 'waiting for return   ');

        res.status(200).json({
            success: true,
            data: returnRequests
        });
    });
};

// Modifikasi deleteborrow agar tidak bisa hapus yang aktif
const deleteborrow = (req, res) => {
    const { id } = req.params;

    borrow.deleteById(id, (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: "Gagal menghapus peminjaman",
                error: err.message
            });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "borrow tidak ditemukan"
            });
        }

        // Catat log aktivitas
        activityLog.create({
            id_user: req.user.id,
            aksi: 'DELETE',
            tabel_terkait: 'peminjaman',
            id_data: id,
            keterangan: `borrow dihapus: ID ${id}`
        }, () => { });

        res.status(200).json({
            success: true,
            message: "Berhasil menghapus peminjaman"
        });
    });
};

// ===== REQUEST RETURN (AJUKAN PENGEMBALIAN) =====
// PUT /api/peminjaman/:id/request-return
const requestReturn = (req, res) => {
    const borrow_id = req.params.id;
    const id_user = req.user.id;
  
    // 1. Ambil data peminjaman
    borrow.getById(borrow_id, (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({
          success: false,
          message: 'Server error'
        });
      }
  
      if (results.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Peminjaman tidak ditemukan'
        });
      }
  
      const peminjaman = results[0];
  
      // 2. Validasi pemilik
      if (peminjaman.id_user !== id_user) {
        return res.status(403).json({
          success: false,
          message: 'Bukan pemilik peminjaman'
        });
      }
  
      // 3. Validasi status
      if (peminjaman.status !== 'taken') {
        return res.status(400).json({
          success: false,
          message: 'Status peminjaman tidak valid untuk request return'
        });
      }
  
      // 4. Cek apakah sudah pernah request return
      returnModel.findByBorrowId(borrow_id, (err, existingReturn) => {
        if (err) {
          console.error(err);
          return res.status(500).json({
            success: false,
            message: 'Server error'
          });
        }
  
        if (existingReturn.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Request pengembalian sudah diajukan'
          });
        }
  
        // 5. Insert ke return_data
        returnModel.create(
          {
            borrow_id
          },
          (err) => {
            if (err) {
              console.error(err);
              return res.status(500).json({
                success: false,
                message: 'Gagal membuat request pengembalian'
              });
            }
  
            // 6. Update status peminjaman
            borrow.updateStatus(
              borrow_id,
              'waiting for return', // pastikan status ini valid
              (err) => {
                if (err) {
                  console.error(err);
                  return res.status(500).json({
                    success: false,
                    message: 'Gagal update status peminjaman'
                  });
                }
  
                return res.status(200).json({
                  success: true,
                  message: 'Request pengembalian berhasil diajukan'
                });
              }
            );
          }
        );
      });
    });
  };
  
module.exports = {
    getAll,
    getById,
    getMyborrow,
    getPending,
    getActive,
    create,
    approve,
    reject,
    deleteborrow,
    requestReturn,
    getReturnRequests
};
