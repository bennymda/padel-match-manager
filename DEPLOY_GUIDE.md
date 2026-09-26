# 🚀 PANDUAN DEPLOY & CUSTOMIZATION PADELPRO MATCH MANAGER

---

## 1. 🎨 CARA MENGUBAH NAMA APLIKASI & LOGO

Anda bisa mengubah nama aplikasi dan logo dalam **1 tempat saja** tanpa perlu mengedit banyak file:

### Buka file:
`src/config/branding.js`

```javascript
export const BRANDING = {
  // 1. Ubah Nama Utama & Highlight
  appName: "PADEL",            // Contoh: "SMASH", "JAKARTA", "BALI"
  appNameHighlight: "PRO",     // Bagian neon, contoh: "PADEL", "CLUB", "ARENA"

  // 2. Ubah Slogan / Subtitle
  appSubtitle: "Match Manager", // Contoh: "Tournament League", "Championship"

  // 3. Ubah Logo (Pilih 'emoji' atau 'image')
  logoType: 'emoji',           // Ganti ke 'image' jika ingin pakai gambar/logo sendiri
  logoEmoji: '🎾',             // Ganti emoji: 🏆, 🎾, ⚡, 🥇, dll.

  // 4. Jika menggunakan Gambar Logo sendiri:
  // - Taruh file logo Anda (PNG / SVG) di dalam folder: public/logo.png
  // - Lalu ubah logoType ke 'image'
  logoImageUrl: '/logo.svg',   // Atau '/logo.png'
};
```

Setiap perubahan di file tersebut akan **otomatis mengubah logo & nama di seluruh halaman** (Header, Halaman Depan Turnamen, Tab Browser, dll).

---

## 2. 🌐 CARA DEPLOY KE HOSTING GRATIS

Aplikasi ini menggunakan **Node.js + WebSockets (Socket.io) + Database Riwayat** agar skor antar HP pemain dan layar Host bisa tersinkronisasi secara real-time.

> [!IMPORTANT]
> **Mengapa RENDER.COM atau RAILWAY lebih direkomendasikan daripada VERCEL?**
> - **Vercel** bersifat *Serverless* (fungsi mati otomatis setelah beberapa detik). Akibatnya, koneksi **WebSocket (Socket.io) real-time** dan penyimpanan database file lokal sering terputus/ter-reset.
> - **Render.com** & **Railway.app** menyediakan **Web Service gratis** yang berjalan 24/7 dan mendukung penuh WebSockets real-time serta database file!

---

### OPSI 1: Deploy Gratis di Render.com (Sangat Mudah & Direkomendasikan) ⭐️⭐️⭐️⭐️⭐️

File konfigurasi `render.yaml` sudah kami siapkan di dalam proyek. Anda tinggal mengikuti langkah berikut:

#### Langkah 1: Push Proyek ke GitHub Anda
1. Buat repository baru di [github.com](https://github.com) (misal: `padel-match-manager`).
2. Jalankan perintah berikut di folder proyek Anda:
   ```bash
   git init
   git add .
   git commit -m "Initial Padel Match Manager"
   git branch -M main
   git remote add origin https://github.com/USERNAME_ANDA/padel-match-manager.git
   git push -u origin main
   ```

#### Langkah 2: Deploy di Render
1. Buka [render.com](https://render.com) dan daftar/login (bisa pakai akun GitHub).
2. Klik tombol **"New +"** lalu pilih **"Web Service"**.
3. Pilih repository GitHub yang baru saja Anda push.
4. Render akan otomatis mendeteksi pengaturan, atau isi formulir berikut:
   - **Name**: `padel-match-manager` (atau nama pilihan Anda)
   - **Region**: Singapore (terdekat dengan Indonesia untuk latensi terendah)
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan Type**: `Free`
5. Klik **"Create Web Service"**.
6. Tunggu sekitar 2-3 menit. Render akan memberikan domain HTTPS gratis, contohnya:
   👉 `https://padel-match-manager.onrender.com`

Aplikasi Anda kini bisa dibuka dari internet oleh pemain di mana saja tanpa harus satu jaringan Wi-Fi!

---

### OPSI 2: Deploy di Railway.app (Alternatif Gratis & Cepat)

1. Buka [railway.app](https://railway.app) dan login dengan GitHub.
2. Klik **"New Project"** -> **"Deploy from GitHub repo"**.
3. Pilih repository Anda.
4. Masuk ke tab **Settings** -> **Networking** -> Klik **"Generate Domain"**.
5. Selesai! Railway langsung mem-build dan memberikan link HTTPS aktif.

---

### OPSI 3: Jika Tetap Ingin Menggunakan Vercel
Jika Anda ingin frontend di-hosting di Vercel:
1. Frontend di-deploy ke Vercel via `vercel build`.
2. Backend (server Express & Socket.io) tetap harus di-deploy di Render.com / Railway agar koneksi real-time antar HP pemain tetap tersambung.
