# 🤖 TOWA Intern / Beta

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-v18+-green?style=for-the-badge&logo=nodedotjs" alt="Node.js" />
  <img src="https://img.shields.io/badge/Discord.js-v14-5865F2?style=for-the-badge&logo=discord" alt="Discord.js" />
  <img src="https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License" />
</p>

**TOWA Intern / Beta** adalah bot layanan latar belakang (*backend/tracker service*) yang bertugas mencatat dan mengeksekusi sinkronisasi data *realtime* dari server Discord **Towa** ke database **Supabase**. Data ini nantinya dikonsumsi oleh *landing page* TOWA untuk menampilkan aktivitas warga, jajaran *Staff*, *Donors/Boosters*, hingga daftar 10 Warga Terbaru secara dinamis.

**NOTES:**

Bot masih dalam tahap pengembangan dan pembuatan fitur / module tambahan.

---

## 🛡️ Anti-Crash & Utility Mechanics

* **Rate Limit Safe:** Dilengkapi penanganan `rateLimited` otomatis agar bot tidak terblokir oleh Discord API.
* **Memory Sweeper:** *Garbage collector* internal secara otomatis membersihkan cache member non-bot setiap 1 jam (`3600s`) untuk menjaga pemakaian RAM tetap di bawah 100MB.

---


**Made with Caramel Macchiato by warga asbun ☕**
