// ==============================================
// 🤖 WS SELL XCRL • MADE IN WAGYU
// ==============================================

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Bot, InlineKeyboard } = require('grammy');
const { Boom } = require('@hapi/boom');
const express = require('express');
const fs = require('fs-extra');
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

// Buat folder jika belum ada
fs.ensureDirSync('./auth');

// Penjaga nyala 24 jam
const app = express();
app.get('/', (req, res) => res.send('✅ WS SELL XCRL Aktif 24 Jam'));
app.listen(PORT, () => console.log(`🌐 Penjaga nyala berjalan di port ${PORT}`));

const bot = new Bot(BOT_TOKEN);
const proses = new Map();
let data = { saldo: {}, transaksi: [], wd: {} };

// Muat & Simpan Data
if (fs.existsSync('./data.json')) {
  try {
    const muat = fs.readJSONSync('./data.json');
    data = muat.data || data;
    PENGATURAN = muat.pengaturan || PENGATURAN;
    WD_METHODS = muat.wd || WD_METHODS;
  } catch (e) {
    console.log('Data baru dibuat');
  }
}
function simpanSemua() {
  fs.writeJSONSync('./data.json', { data, pengaturan: PENGATURAN, wd: WD_METHODS }, { spaces: 2 });
}

// ==================== MENU ====================
async function menuPengguna(ctx) {
  const saldo = data.saldo[ctx.from.id] || 0;
  const teks = `
🏪 *${PENGATURAN.STATUS_TOKO}*
💰 Harga per nomor: *Rp${PENGATURAN.REWARD.toLocaleString('id-ID')}*
💵 Saldo kamu: *Rp${saldo.toLocaleString('id-ID')}*
💳 Minimal WD: *Rp${PENGATURAN.MIN_WD.toLocaleString('id-ID')}*

${PENGATURAN.INFO_WA}
  `;
  const kb = new InlineKeyboard()
    .text('📤 JUAL NOMOR', 'jual_nomor').row()
    .text('💰 CEK SALDO', 'cek_saldo').row()
    .text('💳 TARIK SALDO', 'menu_wd').row()
    .text('📖 CARA PAKAI', 'cara_pakai');
  await ctx.reply(`👋 *WS SELL XCRL* 🚀\n${teks}`, { reply_markup: kb, parse_mode: 'Markdown' });
}

async function menuAdmin(ctx) {
  const kb = new InlineKeyboard()
    .text('💰 UBAH RATE', 'ubah_rate').row()
    .text('🏪 ATUR TOKO', 'atur_status').row()
    .text('📞 UBAH INFO', 'ubah_info').row()
    .text('💳 ATUR WD', 'atur_wd').row()
    .text('👤 DAFTAR USER', 'lihat_user').row()
    .text('📋 RIWAYAT', 'riwayat');
  await ctx.reply(`⚙️ *PANEL ADMIN*\n💰 Rate: Rp${PENGATURAN.REWARD}\n🏪 Status: ${PENGATURAN.STATUS_TOKO}`, { reply_markup: kb, parse_mode: 'Markdown' });
}

// ==================== PROSES UTAMA ====================
bot.on('message:text', async ctx => {
  const uid = ctx.from.id;
  const teks = ctx.message.text.trim();

  // Perintah Admin
  if (uid === ADMIN_ID) {
    if (teks.startsWith('rate ')) {
      const v = parseInt(teks.split(' ')[1]);
      if (v > 0) { PENGATURAN.REWARD = v; simpanSemua(); return ctx.reply(`✅ Rate diubah: Rp${v.toLocaleString('id-ID')}`); }
    }
    if (teks.startsWith('info ')) { PENGATURAN.INFO_WA = teks.slice(5); simpanSemua(); return ctx.reply(`✅ Info diperbarui`); }
    if (teks.startsWith('wd ')) {
      const [_, m, ...d] = teks.split(' ');
      if (m && d.length) { WD_METHODS[m] = d.join(' '); simpanSemua(); return ctx.reply(`✅ ${m.toUpperCase()} diperbarui`); }
    }
  }

  if (PENGATURAN.STATUS_TOKO.includes('🔴') && uid !== ADMIN_ID)
    return ctx.reply(PENGATURAN.PESAN_TUTUP);

  // 🟡 Terima nomor, kirim kode
  if (/^\+?\d{10,15}$/.test(teks)) {
    const nomor = teks.replace('+', '');
    await ctx.reply('⏳ Memproses nomor, mohon tunggu...');

    try {
      const { state, saveCreds } = await useMultiFileAuthState(`./auth/${uid}_${nomor}`);
      const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: ['Chrome', 'Windows', '10.0'],
        syncFullHistory: false
      });

      sock.ev.on('creds.update', saveCreds);
      sock.ev.on('connection.update', async ({ connection }) => {
        if (connection === 'open') {
          const kode = await sock.requestPairingCode(nomor);
          proses.set(uid, { sock, nomor });
          await ctx.reply(`✅ *NOMOR DITERIMA!* 📲

📝 CARA VERIFIKASI:
1. Buka aplikasi WhatsApp
2. Masukkan nomor: *+${nomor}*
3. Pilih opsi: *Verifikasi lewat nomor telepon*
4. Masukkan kode berikut:

🔑 *${kode}*

👉 *Kirim kode ini kembali ke bot*
✅ WA kamu tetap bisa dibuka & dipakai normal`, { parse_mode: 'Markdown' });
        }
      });

    } catch (err) {
      proses.delete(uid);
      return ctx.reply('❌ Gagal memproses, coba nomor lain.');
    }
    return;
  }

  // 🟢 Terima kode, otomatis login & masuk saldo
  if (proses.has(uid)) {
    const { sock, nomor } = proses.get(uid);
    const kodeBersih = teks.replace(/\s|-/g, '');

    try {
      await sock.login(kodeBersih);
      data.saldo[uid] = (data.saldo[uid] || 0) + PENGATURAN.REWARD;
      data.transaksi.push(`[${new Date().toLocaleString('id-ID')}] +${nomor} +Rp${PENGATURAN.REWARD}`);
      simpanSemua();

      await ctx.reply(`🎉 *BERHASIL TERHUBUNG!* ✅
📞 Nomor: +${nomor}
💰 Pendapatan: *Rp${PENGATURAN.REWARD.toLocaleString('id-ID')}*
💵 Saldo Baru: *Rp${data.saldo[uid].toLocaleString('id-ID')}*

✅ Proses selesai`, { parse_mode: 'Markdown' });

      bot.api.sendMessage(ADMIN_ID, `📥 *TRANSAKSI MASUK*
👤 User: ${uid}
📞 Nomor: +${nomor}
💵 Rp${PENGATURAN.REWARD}`);

    } catch (err) {
      await ctx.reply('❌ Kode salah/kadaluarsa, ulangi jual nomor.');
    }
    proses.delete(uid);
    return;
  }
});

// Tombol & Perintah
bot.callbackQuery('jual_nomor', ctx => { ctx.answerCallbackQuery(); ctx.reply('📤 Kirim nomor: Contoh *+628123456789*', { parse_mode: 'Markdown' }); });
bot.callbackQuery('cek_saldo', ctx => { ctx.answerCallbackQuery(); const s = data.saldo[ctx.from.id]||0; ctx.reply(`💵 Saldo: Rp${s.toLocaleString('id-ID')}`); });
bot.callbackQuery('cara_pakai', ctx => { ctx.answerCallbackQuery(); ctx.reply(`📖 Cara Pakai:\n1. Kirim nomor\n2. Dapat kode\n3. Masukkan di WA\n4. Kirim kode ke bot\n✅ Selesai`); });
bot.callbackQuery('menu_wd', ctx => { ctx.answerCallbackQuery(); const s = data.saldo[ctx.from.id]||0; if (s < PENGATURAN.MIN_WD) return ctx.reply(`❌ Minimal WD: Rp${PENGATURAN.MIN_WD}`); const daftar = Object.entries(WD_METHODS).map(([m,r])=>`• ${m.toUpperCase()}: ${r}`).join('\n'); ctx.reply(`💳 Format: /wd dana 20000\n\n${daftar}`); });
bot.callbackQuery('ubah_rate', ctx => { ctx.answerCallbackQuery(); ctx.reply('✏️ Contoh: *rate 7500*'); });
bot.callbackQuery('atur_status', ctx => { ctx.answerCallbackQuery(); const kb = new InlineKeyboard().text('🟢 BUKA', 'set_buka').text('🔴 TUTUP', 'set_tutup'); ctx.reply('🏪 Pilih status:', { reply_markup: kb }); });
bot.callbackQuery('set_buka', ctx => { PENGATURAN.STATUS_TOKO = '🟢 TOKO SEDANG BUKA'; simpanSemua(); ctx.answerCallbackQuery(); ctx.reply('✅ Toko dibuka'); });
bot.callbackQuery('set_tutup', ctx => { PENGATURAN.STATUS_TOKO = '🔴 TOKO SEDANG TUTUP'; simpanSemua(); ctx.answerCallbackQuery(); ctx.reply('✅ Toko ditutup'); });
bot.callbackQuery('ubah_info', ctx => { ctx.answerCallbackQuery(); ctx.reply('✏️ Contoh: *info 📞 Buka 08.00-22.00 WIB*'); });
bot.callbackQuery('atur_wd', ctx => { ctx.answerCallbackQuery(); ctx.reply('✏️ Contoh: *wd dana 0812xxxx a.n Nama*'); });
bot.callbackQuery('lihat_user', ctx => { ctx.answerCallbackQuery(); const daftar = Object.entries(data.saldo).map(([id,s])=>`👤 ID: ${id} | Rp${s}`).join('\n')||'Belum ada'; ctx.reply(`📋 Daftar User:\n${daftar}`); });
bot.callbackQuery('riwayat', ctx => { ctx.answerCallbackQuery(); const log = data.transaksi.slice(-15).join('\n')||'Kosong'; ctx.reply(`📜 Riwayat:\n${log}`); });

bot.command('start', ctx => ctx.from.id === ADMIN_ID ? menuAdmin(ctx) : menuPengguna(ctx));
bot.command('wd', async ctx => {
  const uid = ctx.from.id;
  const args = ctx.message.text.trim().split(' ');
  const metode = args[1]?.toLowerCase();
  const jumlah = parseInt(args[2]);
  if (!metode || !jumlah || jumlah < PENGATURAN.MIN_WD || !WD_METHODS[metode] || (data.saldo[uid]||0) < jumlah)
    return ctx.reply('❌ Format salah / saldo kurang / metode tidak ada');
  data.saldo[uid] -= jumlah;
  simpanSemua();
  ctx.reply(`✅ WD diterima: Rp${jumlah.toLocaleString('id-ID')} ke ${metode.toUpperCase()}`);
  bot.api.sendMessage(ADMIN_ID, `📤 WD: User ${uid} | Rp${jumlah} ke ${metode}`);
});

// Tangani error & jalankan bot
bot.catch((err) => console.error('❌ Error bot:', err));
bot.start({ polling: true });
console.log('🤖 WS SELL XCRL • Berjalan 24 Jam');
                 
