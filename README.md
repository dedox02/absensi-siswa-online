# Absensi Siswa Online

Aplikasi web absensi sekolah digital berbasis sesi mata pelajaran yang sudah berfungsi penuh, dibangun dengan Google Apps Script, Google Sheets, dan JavaScript.

> Status: **aplikasi berfungsi penuh** — pengembangan dan pengujian lanjutan berjalan. Bukan klaim sistem production berskala besar. Rencana pengembangan backend berikutnya: Go + PostgreSQL.

## Masalah yang Diselesaikan

Pencatatan absensi per sesi mata pelajaran di sekolah membutuhkan autentikasi guru, validasi kehadiran, manajemen sesi, dan jejak audit — tanpa infrastruktur server berbayar.

## Fitur Utama

- Autentikasi dan otorisasi berbasis peran (Admin / Guru)
- Validasi absensi di sisi server (bukan hanya di antarmuka)
- Manajemen sesi mata pelajaran: generate, mulai, tutup, koreksi
- Audit log untuk setiap mutasi data yang berhasil
- Fitur administrasi: kelola kelas, siswa, guru, mata pelajaran, jadwal
- Absensi via QR dan manual

## Stack

- Google Apps Script (backend & web app)
- Google Sheets (basis data aplikasi, 13 tab)
- JavaScript (frontend web app)

## Pengujian

Pengujian dilakukan bertahap: fungsi backend terlebih dahulu, lalu alur web app, dengan hasil berbasis bukti (lolos/gagal), bukan sekadar keberhasilan deploy.

## Keamanan (Versi Portofolio)

Repo ini adalah versi portofolio yang telah dibersihkan: kredensial seed, ID spreadsheet live, dan data siswa **tidak disertakan**. File contoh memakai placeholder. Dokumentasi arsitektur/keamanan ada di `docs/`.

## Contoh Kode

Lihat folder `examples/` untuk contoh backend representatif: manajemen kelas, manajemen siswa, dan API absensi.

## Arah Pengembangan

Migrasi backend ke Go + PostgreSQL, serta eksplorasi AI business automation (n8n, LLM, integrasi API).
