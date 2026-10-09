# Absensi Siswa Online

Aplikasi web absensi sekolah digital berbasis sesi mata pelajaran yang sudah berfungsi penuh, dibangun dengan Google Apps Script, Google Sheets, dan JavaScript.

> Status: **aplikasi berfungsi penuh** — pengembangan dan pengujian lanjutan berjalan. Bukan klaim sistem production berskala besar. Rencana pengembangan backend berikutnya: Go + PostgreSQL.

## Masalah yang Diselesaikan

Pencatatan absensi per sesi mata pelajaran di sekolah membutuhkan autentikasi guru, validasi kehadiran, manajemen sesi, dan jejak audit — tanpa infrastruktur server berbayar.

## Fitur Utama

- Autentikasi berbasis token dan otorisasi berbasis peran (Admin / Guru)
- Dua mode operasional sekolah: **Terstruktur** (sesi dibuat admin melalui generate) dan **Fleksibel** (guru membuat sesi sendiri dari jadwal yang diampunya)
- Manajemen sesi lengkap: buat/generate, mulai sesi (di Fleksibel bisa 30 menit lebih awal), tutup manual, tutup otomatis oleh scheduler, dan penanganan sesi terlewat
- Absensi siswa via pemindaian QR dan input manual, dengan validasi di sisi server (bukan hanya di antarmuka) dan finalisasi kelengkapan
- Alur pengajuan dan persetujuan berjenjang: koreksi absensi, pindah jadwal, dan buka kembali sesi
- Laporan rekap sesi dan rekap kehadiran per kelas/mapel/periode, dengan export Excel mengikuti template resmi (kop sekolah, ringkasan, legenda warna)
- Audit log untuk setiap mutasi data yang berhasil
- Fitur administrasi: kelola kelas, siswa, guru, mata pelajaran, jadwal, hari libur, dan pengaturan sekolah

## Alur Singkat

1. Guru melihat sesi berikutnya di dashboard (status Terjadwal, lengkap dengan hitung mundur).
2. Guru memulai sesi; sesi berstatus Aktif.
3. Kehadiran siswa dicatat via scan QR atau manual; yang belum tercatat terlihat jelas.
4. Sesi ditutup manual oleh guru atau otomatis oleh scheduler; ketidaklengkapan ditangani lewat koreksi.
5. Admin/guru melihat rekap kehadiran dan mengekspornya ke Excel.

## Stack

- Google Apps Script (backend & web app)
- Google Sheets (basis data prototipe, 13 tab)
- JavaScript, HTML, CSS (frontend web app)

## Peran Saya

Saya bertindak sebagai perancang aturan bisnis dan kebutuhan sistem, pengambil keputusan teknis, serta penguji utama. Penulisan kode menggunakan alur kerja berbantuan AI; seluruh hasil saya review, uji bertahap, dan verifikasi ke versi live sebelum dinyatakan selesai. Proyek ini juga menjadi latihan disiplin rilis: satu paket perubahan = satu deployment.

## Pengujian

Pengujian dilakukan bertahap dan terdokumentasi: fungsi backend terlebih dahulu, lalu alur web app, lalu perilaku otomatis (scheduler) — dengan hasil berbasis bukti (lolos/gagal per bagian), bukan sekadar keberhasilan deploy.

## Keamanan (Versi Portofolio)

Repo ini adalah versi portofolio yang telah dibersihkan: kredensial seed, ID spreadsheet live, dan data siswa **tidak disertakan**. File contoh memakai placeholder. Dokumentasi arsitektur/keamanan ada di `docs/`.

## Contoh Kode

Lihat folder `examples/` untuk contoh backend representatif: manajemen kelas, manajemen siswa, dan API absensi.

## Arah Pengembangan

Migrasi backend ke Go + PostgreSQL, serta eksplorasi AI business automation (n8n, LLM, integrasi API).

## Lisensi

MIT — lihat file `LICENSE`.
