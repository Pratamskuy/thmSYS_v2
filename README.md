*Versi 2 menambahkan fitur batch borrow (multi-item) dengan kuantitas per item.*
# THM System v2

Sistem manajemen peminjaman alat (Tool & Hardware Management) berbasis full-stack JavaScript dengan fitur autentikasi, manajemen item, alur peminjaman-pengembalian, dan kontrol akses berbasis peran.

## Ringkasan Proyek

THM System v2 dirancang untuk mendukung proses operasional peminjaman alat secara terstruktur untuk tiga jenis pengguna utama:

- Admin: akses penuh (user, kategori, item, peminjaman, pengembalian, log).
- Petugas: mengelola alur peminjaman/pengembalian.
- Peminjam: mengajukan peminjaman dan pengembalian item.

Versi 2 menambahkan kemampuan batch borrow (mengajukan beberapa item sekaligus, kuantitas per item) melalui form halaman dan modal konfirmasi.

---

## Arsitektur

### 1) Backend

- Runtime: Node.js
- Framework: Express
- Database: MySQL
- Autentikasi: JWT
- Upload file: Multer

Backend berjalan default di port `3000` dan mengekspose semua endpoint pada prefix `/api`.

### 2) Frontend

- Framework: React
- Build tool: Vite
- Routing: react-router-dom
- State auth global: Context API

Frontend mengonsumsi API backend melalui service terpusat di `src/services/api.js`.

---

## Fitur Utama

## 1. Autentikasi dan Otorisasi

- Login/register pengguna.
- Penyimpanan token JWT di localStorage.
- Verifikasi token untuk route yang dilindungi.
- Role-based access control (Admin/Petugas/Peminjam).

## 2. Dashboard Dinamis per Role

- Statistik item total dan tersedia.
- Statistik peminjaman pending/aktif untuk admin/petugas.
- Statistik peminjaman pribadi untuk peminjam.
- Ringkasan transaksi terbaru.

## 3. Manajemen Item

- Lihat daftar item.
- CRUD item (admin).
- Tracking stok (total, available, dipinjam hanya setelah approve).
- Menampilkan jumlah request yang belum di-approve sebagai Dalam Antrian.
- Kondisi item (normal, ok, not good, broken).

## 4. Manajemen Kategori

- CRUD kategori (admin).
- Pengelompokan item agar lebih rapi.

## 5. Manajemen User

- Lihat daftar user (admin).
- Update data user dan role.
- Hapus user.

## 6. Peminjaman (Borrow)

- Peminjam membuat pengajuan peminjaman.
- Admin/petugas melakukan approve/reject.
- Filter data peminjaman (all/pending/active).
- Fitur batch borrow pada UI: user dapat memilih beberapa item, mengatur quantity per item, lalu konfirmasi batch dalam satu submit.
- Saat request dibuat, stok available langsung berkurang (reserve) untuk status pending. Jika stok tidak cukup, item masuk status queued.

## 7. Pengembalian (Return)

- Peminjam dapat request return.
- Admin/petugas konfirmasi pengembalian.
- Sistem mengembalikan stok item secara otomatis setelah return dikonfirmasi.
- Perhitungan keterlambatan/denda pada alur pengembalian.

## 8. Log Aktivitas

- Aktivitas penting dicatat untuk audit (khusus admin).

---

## Struktur Direktori

```bash
thmSYS_v2/
|- backend/
|  |- controllers/
|  |- middleware/
|  |- models/
|  |- routes/
|  |- db.js
|  |- index.js
|  `- package.json
|- frontend/
|  |- src/
|  |  |- components/
|  |  |- context/
|  |  |- pages/
|  |  |- services/
|  |  |- App.jsx
|  |  `- main.jsx
|  `- package.json
`- docs/
   |- PROJECT_SUMMARY.md
   `- SETUP_GUIDE.md
```

---

## Daftar Endpoint API (Ringkas)

### Auth
- `POST /api/login`
- `POST /api/register`
- `GET /api/profile`

### Users (Admin)
- `GET /api/users`
- `GET /api/users/:id`
- `PUT /api/users/:id`
- `DELETE /api/users/:id`

### Kategori
- `GET /api/kategori`
- `GET /api/kategori/:id`
- `POST /api/kategori`
- `PUT /api/kategori/:id`
- `DELETE /api/kategori/:id`

### Item
- `GET /api/alat/tersedia`
- `GET /api/alat`
- `GET /api/alat/:id`
- `POST /api/alat`
- `PUT /api/alat/:id`
- `DELETE /api/alat/:id`

### Peminjaman
- `GET /api/peminjaman/my`
- `GET /api/peminjaman/pending`
- `GET /api/peminjaman/active`
- `GET /api/peminjaman/return-requests`
- `GET /api/peminjaman`
- `GET /api/peminjaman/:id`
- `POST /api/peminjaman`
- `PUT /api/peminjaman/:id/approve`
- `PUT /api/peminjaman/:id/reject`
- `PUT /api/peminjaman/:id/return`
- `DELETE /api/peminjaman/:id`

### Pengembalian
- `GET /api/pengembalian`
- `GET /api/pengembalian/:id`
- `POST /api/pengembalian`
- `PUT /api/pengembalian/:id/confirm`
- `DELETE /api/pengembalian/:id`

### Log
- `GET /api/log-aktivitas`

---

## Alur Utama Proses Bisnis

1. User login ke sistem.
2. Peminjam memilih item dan membuat pengajuan peminjaman batch.
3. Admin/petugas meninjau pengajuan lalu approve/reject.
4. Saat request dibuat, stok available berkurang untuk pending (reserve). Jika stok tidak cukup, status menjadi queued.
5. Jika approve, status peminjaman berubah menjadi aktif (taken) dan tercatat sebagai Dipinjam di manajemen item.
6. Peminjam mengajukan return saat item selesai dipakai.
7. Admin/petugas mengonfirmasi return.
8. Status peminjaman selesai (available), stok item kembali bertambah.

---

## Cara Menjalankan Proyek

## Backend

```bash
cd backend
npm install
node index.js
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Default API frontend mengarah ke: `http://localhost:3000/api`

---

## Catatan

- Pastikan MySQL aktif sebelum menjalankan backend.
- Sistem memiliki inisialisasi database/tabel otomatis pada startup backend.
- CORS backend sudah disiapkan untuk environment localhost frontend.

---

## Rencana Pengembangan Lanjutan

- Penambahan test otomatis (unit/integration).
- Search/filter lanjutan di semua modul.
- Export laporan (PDF/Excel).
- Notifikasi email/WhatsApp untuk status transaksi.
- Peningkatan observability (structured log + monitoring).
