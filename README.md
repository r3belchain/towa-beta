
---

```markdown
# 🤖 TOWA Server Tracker Bot

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-v18+-green?style=for-the-badge&logo=nodedotjs" alt="Node.js" />
  <img src="https://img.shields.io/badge/Discord.js-v14-5865F2?style=for-the-badge&logo=discord" alt="Discord.js" />
  <img src="https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License" />
</p>

**TOWA Server Tracker Bot** adalah bot layanan latar belakang (*backend/tracker service*) yang bertugas mencatat dan mengeksekusi sinkronisasi data *realtime* dari server Discord **Towa** ke database **Supabase**. Data ini nantinya dikonsumsi oleh *landing page* TOWA untuk menampilkan aktivitas warga, jajaran *Staff*, *Donors/Boosters*, hingga daftar 10 Warga Terbaru secara dinamis.

---

## ⚡ Fitur Utama

- 🔄 **Smart Initial Sync:** Melakukan pemeriksaan dan sinkronisasi data menyeluruh saat bot pertama kali menyala tanpa menyebabkan *wipe database*.
- 🎭 **Role Group Surgical Sync:** Melacak perubahan *role* khusus (*Staff*, *Donors/Sultan*) secara presisi. Menyinkronkan warna role hex, urutan hierarki (`position_order`), serta menghapus record hanya jika role member dicabut.
- 💎 **Server Booster Tracker:** Mencatat otomatis anggota yang sedang melakukan *Boost* server beserta tanggal mulainya.
- 🎙️ **Voice Activity Realtime Monitor:** Mencatat warga yang sedang aktif nongkrong di *Voice Channel* secara *realtime* (masuk/keluar/pindah VC).
- 🆕 **Recent Members & DB Trimming:** Mencatat 10 warga terbaru yang baru bergabung dan langsung memangkas (*trim*) database secara efisien.
- 📊 **Server Stats Cron:** Memperbarui total member dan jumlah member *online* secara berkala setiap 2 menit.
- 🚀 **High Performance Cache & Anti-Crash:** Menggunakan batas *cache Discord.js* yang sangat ketat (bebas *memory leak*) serta sistem *anti-crash handler* bawaan.

---

## 🛠️ Skema Tabel Supabase

Bot ini berinteraksi langsung dengan beberapa tabel di Supabase:

| Nama Tabel | Deskripsi Data |
| :--- | :--- |
| `staff_members` | Jajaran pengurus/staff server berdasarkan prioritas role. |
| `donors` | Daftar donatur server TOWA. |
| `boosters` | Daftar anggota yang memberikan Server Boost. |
| `voice_activity` | Anggota yang sedang aktif berada di Voice Channel. |
| `recent_members` | 10 Warga terbaru yang baru bergabung di server. |
| `server_stats` | Statistik total member & member online (`id: 1`). |

---

## ⚙️ Prasyarat (Prerequisites)

- **Node.js**: versi 18.x atau lebih baru.
- **Supabase Project**: Proyek Supabase yang sudah memiliki tabel-tabel di atas.
- **Discord Bot Token**: Bot Discord dengan **Privileged Gateway Intents** aktif:
  - `Server Members Intent`
  - `Presence Intent` (opsional jika dibutuhkan)

---

## 🚀 Panduan Instalasi & Pengaturan

### 1. Clone Repositori
```bash
git clone https://github.com/r3belchain/towa-server-tracker.git
cd towa-server-tracker

```

### 2. Install Dependensi

```bash
npm install

```

### 3. Konfigurasi Environment (`.env`)

Buat file `.env` di direktori utama repositori dan masukkan variabel berikut:

```env
DISCORD_BOT_TOKEN=token_bot_discord_kamu
GUILD_ID=id_server_discord_towa
SUPABASE_URL=[https://xyzcompany.supabase.co](https://xyzcompany.supabase.co)
SUPABASE_SECRET_KEY=service_role_atau_secret_key_supabase

```

### 4. Menjalankan Bot

* **Mode Development / Production:**
```bash
node index.js

```


* **Menggunakan PM2 (Direkomendasikan untuk Server/VPS):**
```bash
pm2 start index.js --name "towa-tracker-bot"

```



---

## 🛡️ Anti-Crash & Utility Mechanics

* **Rate Limit Safe:** Dilengkapi penanganan `rateLimited` otomatis agar bot tidak terblokir oleh Discord API.
* **Memory Sweeper:** *Garbage collector* internal secara otomatis membersihkan cache member non-bot setiap 1 jam (`3600s`) untuk menjaga pemakaian RAM tetap di bawah 100MB.

---

---

**Made with Caramel Macchiato by warga asbun ☕**
