# WattWise ⚡

Website interaktif untuk memperkirakan penggunaan dan biaya listrik bulanan berdasarkan perangkat yang dicatat pengguna.

**Tech stack:** HTML + CSS + JavaScript, Firebase Authentication, Cloud Firestore, GitHub Pages.

## Fitur

- Login, register, logout dan lupa password via Firebase Auth.
- Database perangkat dengan CRUD serta real-time sync Firestore per pengguna.
- Dashboard estimasi energi/biaya, diagram kategori, anggaran.
- Simulasi hemat dengan mengubah jam pemakaian sementara.
- Pengaturan tarif, anggaran dan nama pengguna.
- Pencarian perangkat, ekspor CSV, responsive layout.
- Mode Demo tanpa akun Firebase (data tersimpan di browser lokal).

**Buka [`PANDUAN-PEMASANGAN.md`](./PANDUAN-PEMASANGAN.md) untuk seluruh langkah setup sampai GitHub Pages.**

## Struktur file

```text
WattWise/
  index.html             # Halaman login, dashboard, modal, dan formulir
  styles.css             # Tampilan responsif
  app.js                 # Logika Firebase, CRUD, grafik, simulasi dan antarmuka
  calculations.mjs       # Rumus perhitungan yang dapat diuji secara terpisah
  firebase-config.js     # WAJIB diisi dengan konfigurasi Firebase milikmu
  firestore.rules        # WAJIB dipasang di tab Rules pada Firestore Console
  .nojekyll              # Nonaktifkan Jekyll pada GitHub Pages
  assets/favicon.svg     # Ikon aplikasi
  tests/calculations.test.mjs
  PANDUAN-PEMASANGAN.md
```

## Status implementasi

Sudah dibuat dan rumus sudah diuji otomatis. Koneksi ke akun Firebase milikmu **belum** diuji dari paket ini, karena informasi proyek Firebase hanya kamu yang punya. Setup wajib dilakukan sesuai panduan.

## Catatan

Perkiraan tidak setara dengan tagihan resmi PLN atau data smart meter. Nilai tarif awal Rp1.500/kWh adalah **contoh simulasi**, bukan klaim tarif resmi.
