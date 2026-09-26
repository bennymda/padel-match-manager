/**
 * PADEL MATCH MANAGER - BRANDING & CUSTOMIZATION CONFIG
 * 
 * Anda bisa mengubah nama aplikasi, subtitle, logo (gambar atau emoji), 
 * dan deskripsi aplikasi di file ini dengan sangat mudah.
 */

export const BRANDING = {
  // Nama Utama Aplikasi (misal: "PADELPRO", "SMASH PADEL", "JAKARTA PADEL CLUB")
  appName: "PADEL",
  appNameHighlight: "PRO", // Bagian teks yang diberi warna highlight neon

  // Subtitle / Slogan di bawah nama
  appSubtitle: "Match Manager",

  // Jenis Logo: 'emoji' atau 'image'
  logoType: 'emoji', // 'emoji' | 'image'

  // Jika logoType: 'emoji', masukkan emoji pilihan Anda
  logoEmoji: '🎾',

  // Jika logoType: 'image', letakkan file logo Anda di folder 'public/logo.png' 
  // lalu isi path-nya di bawah ini:
  logoImageUrl: '/logo.png',

  // Judul lengkap untuk tab browser
  browserTitle: "PadelPro - Americano & Mexicano Match Manager",

  // Teks deskripsi di halaman depan
  description: "Sistem manajemen turnamen Padel pintar: Americano, Mexicano, Single/Double, Shuffle fair, Live phone monitor, & MMR matchmaking."
};
