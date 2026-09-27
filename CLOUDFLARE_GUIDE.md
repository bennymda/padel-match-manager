# 🚀 Panduan Deploy Padel Match Manager ke Cloudflare (100% Gratis)

Aplikasi ini sudah direkonstruksi secara penuh agar dapat di-deploy ke **Cloudflare Pages** dengan **Cloudflare D1 Database** (Serverless SQLite di edge).

### 🌟 Keunggulan Arsitektur Ini:
1. **100% Gratis Selamanya**:
   - **Cloudflare Pages**: Bebas biaya, bandwidth unlimited, global CDN ultra-cepat.
   - **Cloudflare D1 (SQLite Edge)**: 5 juta baris read per hari, 100.000 baris write per hari, dan 5 GB storage database gratis!
2. **Tanpa Setup Database Eksternal**:
   - Tidak perlu registrasi Supabase, Neon, atau database luar. Database SQLite berjalan langsung di infrastruktur Cloudflare.
3. **Dual Compatibility**:
   - Tetap bisa dijalankan offline/lokal dengan `node server/index.js` (memakai WebSockets).
   - Saat di Cloudflare Pages, otomatis beralih ke Cloudflare Pages Functions + D1 + Edge LiveSync Polling.

---

## 📋 Langkah-langkah Deploy

### Langkah 1: Push Kode ke GitHub
Pastikan seluruh perubahan terbaru sudah di-commit dan di-push ke repository GitHub Anda:
```bash
git add .
git commit -m "Support Cloudflare Pages Functions & D1 Database"
git push origin main
```

---

### Langkah 2: Buat Cloudflare D1 Database

Anda bisa memilih salah satu dari 2 cara di bawah ini (via Dashboard Web atau via CLI):

#### Cara A: Lewat Dashboard Cloudflare (Paling Mudah Tanpa Terminal)
1. Buka [dash.cloudflare.com](https://dash.cloudflare.com/) dan login.
2. Di menu sebelah kiri, klik **Storage & Databases** > **D1 SQL Database**.
3. Klik tombol **Create database**.
4. Beri nama: `padel_db` lalu klik **Create**.
5. Setelah database terbuat, klik tab **Console** di database tersebut.
6. Buka file `schema.sql` di proyek Anda, copy seluruh isinya, lalu paste ke dalam box query SQL di Console Cloudflare.
7. Klik **Execute**. Tabel `users`, `tournaments`, dan `tournament_history` sekarang sudah aktif!

#### Cara B: Lewat Terminal (Wrangler CLI)
Jika Anda login lewat CLI:
```bash
npx wrangler login
npx wrangler d1 create padel_db
```
Catat `database_id` yang muncul, lalu jalankan schema:
```bash
npx wrangler d1 execute padel_db --remote --file=./schema.sql
```
*(Opsional: Anda juga bisa mengisi `database_id` tersebut ke file `wrangler.toml`)*.

---

### Langkah 3: Hubungkan Repository ke Cloudflare Pages

1. Di Dashboard Cloudflare, klik menu **Workers & Pages** di bilah navigasi kiri.
2. Klik tombol **Create** > pilih tab **Pages** > klik **Connect to Git**.
3. Pilih akun GitHub Anda dan pilih repository `padel-match-manager`.
4. Klik **Begin setup** dan konfigurasikan form build berikut:
   - **Project name**: `padel-match-manager` (atau nama pilihan Anda)
   - **Production branch**: `main`
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: *(Biarkan kosong)*
5. Di bagian **Environment variables (advanced)**, tambahkan variabel:
   - `NODE_VERSION` = `18.15.0`
6. Klik **Save and Deploy**.

---

### Langkah 4: Sambungkan D1 Database ke Cloudflare Pages (PENTING!)

Agar API backend dapat membaca dan menulis ke database `padel_db`:
1. Masuk ke proyek Pages Anda di Cloudflare Dashboard.
2. Klik tab **Settings** di atas, lalu pilih **Functions** di bilah menu samping.
3. Gulir ke bawah ke bagian **D1 database bindings**.
4. Klik **Add binding**:
   - **Variable name**: Masukkan huruf kapital persis: `DB`
   - **D1 database**: Pilih `padel_db`
5. Klik **Save**.
6. Kembali ke tab **Deployments**, klik tombol **...** (titik tiga) pada deployment terakhir, lalu pilih **Retry deployment** (atau lakukan commit baru) agar Pages Functions mengaktifkan binding database tersebut.

---

## 🎉 Selesai!

Aplikasi Padel Match Manager Anda kini aktif di URL publik gratis Cloudflare (contoh: `https://padel-match-manager.pages.dev`).

### Fitur yang Langsung Berfungsi di Cloudflare:
- ✅ **Multi-Device Live Sync**: Host mengatur ronde/skor di laptop, pemain memantau ronde dan court secara live dari HP.
- ✅ **Database Riwayat Turnamen**: Semua turnamen yang diselesaikan otomatis tersimpan permanen di Cloudflare D1.
- ✅ **User Auth & MMR Career**: Registrasi akun pemain/host dengan password terenkripsi aman menggunakan Web Crypto standard (`crypto.subtle`).
- ✅ **Offline & Fallback Resilience**: Jika D1 belum dibinding saat pertama kali dicoba, sistem tetap berjalan aman di memory fallback.
