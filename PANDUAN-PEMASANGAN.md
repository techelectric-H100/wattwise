# WattWise — Panduan instalasi (Firebase + GitHub Pages)

**Stack:** HTML, CSS, JavaScript ES Modules, Firebase Authentication, Cloud Firestore, dan GitHub Pages. **Tidak butuh Node.js, npm, PHP, MySQL, atau VPS untuk menjalankan aplikasinya.** Node.js hanya opsional untuk menjalankan tes rumus.

> ⚠️ Tanpa mengisi `firebase-config.js`, aplikasi tetap dapat dicoba melalui tombol **Coba Mode Demo**, tetapi mode ini **bukan akun Firebase**: data demo hanya tersimpan di browser yang dipakai (`localStorage`).

## A. Coba tampilan lebih dulu (opsional)

1. Ekstrak ZIP ke sebuah folder; pastikan `index.html` ada di folder **WattWise**.
2. Buka folder WattWise di **Visual Studio Code**.
3. Jalankan ekstensi **Live Server** (klik kanan `index.html` → **Open with Live Server**), atau jalankan `python -m http.server 5500` lalu kunjungi `http://localhost:5500`.
4. Klik **Coba Mode Demo**. Kamu bisa tambah/edit/hapus perangkat, melihat grafik, simulasi hemat, serta mengubah tarif dan anggaran. Perubahan data demo disimpan di browser.
5. Jangan menguji lewat `file://` dengan klik ganda `index.html`: import modul ES bisa diblokir browser. Pakai Live Server, HTTP localhost, atau GitHub Pages.

## B. Membuat proyek Firebase

1. Buka **https://console.firebase.google.com/**, masuk dengan akun Google.
2. Klik **Create a project** / **Add project**. Nama contoh: `wattwise-kuliah`.
3. Untuk tugas ini, Google Analytics boleh dimatikan. Selesaikan pembuatan proyek.
4. Di halaman project overview klik ikon **Web (`</>`)** untuk menambahkan aplikasi web. Beri nama `WattWise Web`.
5. Tidak perlu mencentang Firebase Hosting karena website akan di-hosting melalui GitHub Pages.
6. Setelah registrasi web app, akan muncul `const firebaseConfig = { ... };`. Salin tiap nilai (`apiKey`, `authDomain`, `projectId`, `appId`, dst.).
7. Buka `firebase-config.js` di VS Code dan ganti seluruh teks `GANTI_...` sesuai config proyek Firebase milikmu. **Jangan mengubah nama properti**. Simpan.
8. Firebase Web API key di file konfigurasi adalah identifier aplikasi yang memang dikirim ke browser, **bukan password privat**. Tapi seluruh akses database wajib dilindungi Security Rules. **Jangan pernah mengunggah service-account JSON atau private key ke GitHub.**

## C. Aktifkan login email dan password

1. Firebase Console → **Build → Authentication** → **Get started**.
2. Buka tab **Sign-in method** → pilih **Email/Password**.
3. Aktifkan opsi **Email/Password** (tidak perlu passwordless email-link) → **Save**.
4. Buka Authentication → **Settings → Authorized domains**. Untuk pengujian lokal, pastikan `localhost` terdaftar (jika belum, klik **Add domain**).
5. Nanti setelah punya GitHub Pages, tambahkan domain `USERNAME.github.io` (ganti USERNAME dengan nama akun GitHub; **tanpa `https://` dan tanpa `/wattwise/`**). Jangan menambahkan domain `github.com`, karena situsmu menggunakan `github.io`.

## D. Buat database Cloud Firestore dan aturan keamanan

1. Firebase Console → **Build → Firestore Database** → **Create database**.
2. Pilih lokasi server yang tersedia dan sesuai kebutuhan (misalnya lokasi di Asia), lalu lanjutkan. **Lokasi database tidak mudah diubah**, pilih dengan pertimbangan.
3. Jika diminta mode, pilih **Production mode** (awal diblokir sampai Rules dipasang).
4. Setelah Firestore siap, pilih tab **Rules**.
5. Buka file `firestore.rules` yang ada di ZIP ini, **copy seluruh isinya**, tempel menggantikan aturan default di Firebase Console.
6. Klik **Publish**. Rules ini hanya memberi akun yang login akses ke dokumen `users/{uid}` dan `users/{uid}/devices/{deviceId}` milik akun itu sendiri. Rules juga memvalidasi data yang ditulis.
7. **Jangan** memasang `allow read, write: if true;` karena membiarkan semua orang membaca/mengubah data.

## E. Jalankan login Firebase dan tes perangkat

1. Jalankan lagi WattWise lewat Live Server / `http://localhost:5500`.
2. Klik **Daftar sekarang**; isi nama, email, dan password minimal 6 karakter.
3. Jika sukses, dashboard akan terbuka. Berbeda dari Mode Demo, akun baru mulai dengan **0 perangkat**.
4. Tekan **Tambah perangkat** → contoh AC Kamar: daya **500 Watt**, **8 jam/hari**, **30 hari/bulan**, **1 unit**.
5. Hasil seharusnya **120 kWh/bulan** dan, menggunakan tarif awal **Rp1.500/kWh**, biaya **Rp180.000/bulan**.
6. Tambah perangkat kedua, edit, hapus, cari di daftar, ekspor CSV, dan coba **Simulasi hemat**. AC 8 → 5 jam/hari berarti biaya AC turun **Rp67.500/bulan**.
7. Di **Pengaturan**, kamu bisa ubah nama, tarif per kWh, dan anggaran.
8. Tekan **Keluar**, lalu login ulang. Perangkat dan pengaturan akan muncul lagi dari Firestore.
9. Buka Firebase Console → Firestore Database → Data. Struktur data akan seperti ini:

   ```text
   users/
     UID_USER_1/
       {displayName, tariff, budget, createdAt, updatedAt}
       devices/
         AUTO_ID_1/
           {name, category, watt, hoursPerDay, daysPerMonth, quantity, createdAt, updatedAt}
   ```

## F. Upload dan hosting ke GitHub Pages (tanpa terminal)

1. Buka **https://github.com/new** → buat repository bernama `wattwise`, pilih **Public**, lalu **Create repository**.
2. Masuk ke repository → **Add file → Upload files**.
3. Upload **semua isi folder WattWise**, **bukan file ZIP** dan jangan sampai folder `WattWise/` menjadi direktori pembungkus. **`index.html` harus berada langsung di root repo** bersama `app.js`, `styles.css`, `firebase-config.js`, dan `calculations.mjs`. Folder `assets/` harus ikut ter-upload.
4. Klik **Commit changes**. File `PANDUAN-PEMASANGAN.md`, `README.md`, `firestore.rules`, dan `tests/` boleh ikut di-upload; file rules tersebut bukan otomatis mengubah Firestore, kamu tetap harus Publish Rules di Firebase Console.
5. Repository → **Settings → Pages** → pada *Build and deployment*, pilih **Source = Deploy from a branch**.
6. Pilih **Branch = main** dan **Folder = /(root)** → **Save**.
7. GitHub Pages akan memberikan link seperti `https://USERNAME.github.io/wattwise/`. Ikuti tombol **Visit site** setelah proses deployment selesai.
8. **Penting:** Kembali ke Firebase Console → Authentication → Settings → Authorized domains → **Add domain** → masukkan `USERNAME.github.io`, bukan URL lengkap.
9. Buka situs GitHub Pages dan tes **daftar, login, tambah perangkat, keluar, lalu login ulang**.

## G. Jika ada error

| Gejala | Penyebab yang perlu diperiksa |
|---|---|
| `Firebase belum siap` | `firebase-config.js` belum diganti / koneksi internet atau akses CDN Firebase bermasalah |
| `auth/operation-not-allowed` | Email/Password belum diaktifkan pada Authentication → Sign-in method |
| `auth/unauthorized-domain` | Domain GitHub Pages belum masuk Authentication → Settings → Authorized domains |
| `permission-denied` atau `Missing or insufficient permissions` | Rules belum di-Publish atau akun tidak punya izin sesuai UID |
| Website 404 di GitHub Pages | `index.html` tidak berada di root / Pages belum diset `main` + `/(root)` / alamat repository salah |
| Setelah login, data kosong | Akun baru memang mulai kosong; pastikan Firestore aktif dan rules terpasang. Mode demo punya data contoh terpisah |
| Tampilan kosong saat buka langsung `index.html` | Buka melalui HTTP localhost atau GitHub Pages, bukan file `file://` |
| Firebase Firestore meminta index | WattWise hanya query koleksi perangkat pengguna dan mengurutkan di browser; seharusnya tidak membutuhkan composite index |

## H. Untuk presentasi mata kuliah

- **Masalah:** pengguna tidak tahu dampak pemakaian peralatan listrik terhadap biaya bulanan.
- **Solusi:** web berbasis akun, CRUD peralatan, visualisasi konsumsi, simulasi kebiasaan, pengaturan tarif.
- **CRUD:** Create (tambah), Read (tabel/grafik), Update (edit), Delete (hapus) ke koleksi Firestore milik pengguna.
- **Autentikasi:** Firebase Authentication email/password.
- **Otorisasi:** Security Rules membatasi akses berdasarkan UID pengguna.
- **Rumus:** `kWh = Watt × jam per hari × hari per bulan × jumlah unit / 1000`; `biaya = kWh × tarif per kWh`.
- **Batasan:** aplikasi ini estimasi, **tidak** membaca kWh meter listrik secara langsung, tidak memperhitungkan secara akurat tarif bertingkat/pajak/biaya administrasi/faktor daya dan beban yang dinamis.
- **Demo pembanding:** buat dua akun untuk membuktikan data akun A tidak tercampur dengan akun B.

## I. Pengujian rumus otomatis (opsional)

Jika Node.js telah terpasang, jalankan `node --test tests/calculations.test.mjs` dari folder WattWise. Pengujian mencakup konversi Watt-jam ke kWh, estimasi biaya, akumulasi perangkat, dan simulasi penghematan.

## Keamanan singkat

- Email dan password dikelola oleh Firebase Auth; aplikasi tidak menyimpan password di Firestore maupun localStorage.
- Jangan menganggap Firebase Web API key sebagai password; keamanan datang dari Authentication + Firestore Security Rules.
- Mode demo hanyalah contoh lokal, **bukan** penyimpanan aman lintas perangkat.
- GitHub Pages menerbitkan konten web secara publik; jangan menaruh password, token rahasia, private key, atau data sensitif di repository.
