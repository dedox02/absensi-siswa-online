# Arsitektur dan Keamanan

## Arsitektur Singkat
- WebApp.gs: router halaman (whitelist parameter page)
- *Api.gs: endpoint backend per domain (kelas, siswa, absensi, sesi, dll.)
- *.html: halaman web app per fitur
- Google Sheets: basis data aplikasi (tab USERS, CLASSES, STUDENTS, SESSIONS, ATTENDANCE, AUDIT_LOG, dll.)

## Prinsip Keamanan yang Diterapkan
- Validasi selalu di sisi server
- Kontrol akses berbasis peran pada setiap fungsi backend
- Audit log hanya untuk mutasi yang benar-benar mengubah data
- Kesalahan autentikasi dan otorisasi dibedakan penanganannya di frontend

## Yang Sengaja Tidak Diterbitkan
- Kredensial/seed akun dan ID spreadsheet live tidak dimasukkan ke repo portofolio.
- Contoh kode di `examples/` dipilih yang tidak memuat rahasia.
