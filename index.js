// ==============================================
// 🤖 WS SELL XCRL • MADE IN WAGYU
// ==============================================

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Bot, InlineKeyboard } = require('grammy');
const { Boom } = require('@hapi/boom');
const express = require('express');
const fs = require('fs-extra');

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

fs.ensureDirSync('./auth');

const app = express();
app.get('/', (_, res) => res.send('✅ WS SELL XCRL • MADE IN WAGYU'));
app.listen(PORT, () => console.log(`✅ Server berjalan di port ${PORT}`));

const bot = new Bot(BOT_TOKEN);
const proses = new Map();
let data = { saldo: {}, transaksi: [], wd: {} };

if (fs.existsSync('./data.json')) {
  try { data = fs.readJSONSync('./data.json'); } catch { data = { saldo: {}, transaksi: [], wd: {} }; }
}
function simpan() {
  fs.writeJSONSync('./data.json', data, { spaces: 2 });
}

async function menuPengguna(ctx) {
  const saldo = data.saldo[ctx.from.id] || 0;
  const teks = `
🏪 *${PENGATURAN.STATUS_TOKO}*
💰 Harga: *Rp${PENGATURAN.REWARD.toLocaleString('id-ID')}*
💵 Saldo: *Rp${saldo.toLocaleString('id-ID')}*
💳 Minimal WD: *Rp${PENGATURAN.MIN_WD.toLocaleString('id-ID')}*
${PENGATURAN.INFO_WA}`;
  const kb = new InlineKeyboard()
    .text('📤 JUAL NOMOR', 'jual_nomor').row()
    .text('💰 CEK SALDO', 'cek_saldo').row()
    .text('💳 TARIK SALDO', 'menu_wd').row()
    .text('📖 CARA PAKAI', 'cara_pakai');
  await ctx.reply(`👋 *WS SELL XCRL • MADE IN WAGYU*\n${teks}`, { reply_markup: kb, parse_mode: 'Markdown' });
}

async function menuAdmin(ctx) {
  const kb = new InlineKeyboard()
    .text('💰 UBAH RATE', 'ubah_rate').row()
    .text('🏪 ATUR TOKO', 'atur_status').row()
    .text('📞 UBAH INFO', 'ubah_info').row()
    .text('💳 ATUR WD', 'atur_wd').row()
    .text('👤 DAFTAR USER', 'lihat_user').row()
    .text('📋 RIWAYAT', 'riwayat');
  await ctx.reply(`⚙️ *PANEL ADMIN • WS SELL XCRL*\n💰 Rate: Rp${PENGATURAN.REWARD}`, { reply_markup: kb, parse_mode: 'Markdown' });
}

bot.on('message:text', async ctx => {
  const uid = ctx.from.id;
  const teks = ctx.message.text.trim();

  if (uid === ADMIN_ID) {
    if (teks.startsWith('rate ')) {
      const v = parseInt(teks.split(' ')[1]);
      if (v > 0) { PENGATURAN.REWARD = v; simpan(); return ctx.reply(`✅ Rate berhasil diubah: Rp${v}`); }
    }
    if (teks.startsWith('info ')) { PENGATURAN.INFO_WA = teks.slice(5); simpan(); return ctx.reply(`✅ Info diperbarui`); }
    if (teks.startsWith('wd ')) {
      const [_, m, ...d] = teks.split(' ');
      if (m) { WD_METHODS[m] = d.join(' '); simpan(); return ctx.reply(`✅ ${m.toUpperCase()} berhasil disimpan`); }
    }
  }

  if (PENGATURAN.STATUS_TOKO.includes('🔴') && uid !== ADMIN_ID)
    return ctx.reply(PENGATURAN.PESAN_TUTUP);

  if (/^\+?\d{10,15}$/.test(teks)) {
    const nomor = teks.replace('+', '');
    await ctx.reply('⏳ Memproses nomor, mohon tunggu...');
    try {
      const { state, saveCreds } = await useMultiFileAuthState(`./auth/${uid}_${nomor}`);
      const sock = makeWASocket({ auth: state, printQRInTerminal: false });
      sock.ev.on('creds.update', saveCreds);
      sock.ev.on('connection.update', async ({ connection }) => {
        if (connection === 'open') {
          const kode = await sock.requestPairingCode(nomor);
          proses.set(uid, { sock, nomor });
          await ctx.reply(`✅ *NOMOR DITERIMA!* 📲

📝 CARA VERIFIKASI:
1. Buka aplikasi WhatsApp
2. Masukkan nomor: *+${nomor}*
3. Pilih: *Verifikasi lewat nomor telepon*
4. Masukkan kode berikut:

🔑 *${kode}*

👉 *Kirim kode ini kembali ke bot*
✅ WA tetap bisa dibuka & dipakai normal`, { parse_mode: 'Markdown' });
        }
      });
    } catch {
      proses.delete(uid);
      return ctx.reply('❌ Gagal memproses, coba nomor lain.');
    }
    return;
  }

  if (proses.has(uid)) {
    const { sock, nomor } = proses.get(uid);
    const kode = teks.replace(/\s|-/g, '');
    try {
      await sock.login(kode);
      data.saldo[uid] = (data.saldo[uid] || 0) + PENGATURAN.REWARD;
      data.transaksi.push(`[${new Date().toLocaleString('id-ID')}] +${nomor} +Rp${PENGATURAN.REWARD}`);
      simpan();
      await ctx.reply(`🎉 *BERHASIL TERHUBUNG!* ✅
📞 Nomor: +${nomor}
💰 Pendapatan: *Rp${PENGATURAN.REWARD.toLocaleString('id-ID')}*
💵 Saldo Baru: *Rp${data.saldo[uid].toLocaleString('id-ID')}*

✅ Proses selesai`, { parse_mode: 'Markdown' });
    } catch {
      await ctx.reply('❌ Kode salah/kadaluarsa, silakan ulangi jual nomor.');
    }
    proses.delete(uid);
    return;
  }
});

bot.callbackQuery('jual_nomor', ctx => { ctx.answerCallbackQuery(); ctx.reply('📤 Kirim nomor dengan format:\nContoh: *+628123456789*', { parse_mode: 'Markdown' }); });
bot.callbackQuery('cek_saldo', ctx => { ctx.answerCallbackQuery(); const s = data.saldo[ctx.from.id]||0; ctx.reply(`💵 Saldo Kamu: *Rp${s.toLocaleString('id-ID')}*`, { parse_mode: 'Markdown' }); });
bot.callbackQuery('cara_pakai', ctx => { ctx.answerCallbackQuery(); ctx.reply(`📖 *Cara Menggunakan*\n\n1. Pilih menu 📤 JUAL NOMOR\n2. Kirim nomor WhatsApp kamu\n3. Masukkan kode yang diberikan di aplikasi WA\n4. Kirim kode tersebut kembali ke bot\n✅ Selesai, saldo otomatis masuk`, { parse_mode: 'Markdown' }); });
bot.callbackQuery('menu_wd', ctx => { ctx.answerCallbackQuery(); const s = data.saldo[ctx.from.id]||0; if (s < PENGATURAN.MIN_WD) return ctx.reply(`❌ Saldo kurang! Minimal WD: *Rp${PENGATURAN.MIN_WD.toLocaleString('id-ID')}*`, { parse_mode: 'Markdown' }); const daftar = Object.entries(WD_METHODS).map(([m,r])=>`• ${m.toUpperCase()}: ${r}`).join('\n'); ctx.reply(`💳 *Cara Tarik Saldo*\nGunakan format:\n*/wd <metode> <jumlah>*\n\nContoh:\n/wd dana 25000\n\nMetode tersedia:\n${daftar}`, { parse_mode: 'Markdown' }); });
bot.callbackQuery('ubah_rate', ctx => { ctx.answerCallbackQuery(); ctx.reply('✏️ Ubah harga per nomor:\nContoh: *rate 7500*', { parse_mode: 'Markdown' }); });
bot.callbackQuery('atur_status', ctx => { ctx.answerCallbackQuery(); const kb = new InlineKeyboard().text('🟢 BUKA TOKO', 'set_buka').row().text('🔴 TUTUP TOKO', 'set_tutup'); ctx.reply('🏪 Pilih status toko:', { reply_markup: kb }); });
bot.callbackQuery('set_buka', ctx => { PENGATURAN.STATUS_TOKO = '🟢 TOKO SEDANG BUKA'; simpan(); ctx.answerCallbackQuery(); ctx.reply('✅ Toko berhasil dibuka kembali'); });
bot.callbackQuery('set_tutup', ctx => { PENGATURAN.STATUS_TOKO = '🔴 TOKO SEDANG TUTUP'; simpan(); ctx.answerCallbackQuery(); ctx.reply('✅ Toko ditutup sementara'); });
bot.callbackQuery('ubah_info', ctx => { ctx.answerCallbackQuery(); ctx.reply('✏️ Ubah info kontak:\nContoh: *info 📞 Buka setiap hari 08.00 - 22.00 WIB*', { parse_mode: 'Markdown' }); });
bot.callbackQuery('atur_wd', ctx => { ctx.answerCallbackQuery(); ctx.reply('✏️ Atur rekening tujuan:\nContoh: *wd dana 08123456789 a.n Wagyu Store*', { parse_mode: 'Markdown' }); });
bot.callbackQuery('lihat_user', ctx => { ctx.answerCallbackQuery(); const daftar = Object.entries(data.saldo).map(([id,s])=>`👤 ID: ${id} | Rp${s.toLocaleString('id-ID')}`).join('\n')||'Belum ada pengguna'; ctx.reply(`📋 *Daftar Pengguna & Saldo*\n\n${daftar}`, { parse_mode: 'Markdown' }); });
bot.callbackQuery('riwayat', ctx => { ctx.answerCallbackQuery(); const log = data.transaksi.slice(-15).join('\n')||'Belum ada riwayat transaksi'; ctx.reply(`📜 *Riwayat Transaksi Terakhir*\n\n${log}`, { parse_mode: 'Markdown' }); });

bot.command('start', ctx => ctx.from.id === ADMIN_ID ? menuAdmin(ctx) : menuPengguna(ctx));
bot.command('wd', async ctx => {
  const uid = ctx.from.id;
  const args = ctx.message.text.trim().split(' ');
  const metode = args[1]?.toLowerCase();
  const jumlah = parseInt(args[2]);
  if (!metode || !jumlah || jumlah < PENGATURAN.MIN_WD || !WD_METHODS[metode] || (data.saldo[uid]||0) < jumlah)
    return ctx.reply('❌ Format salah, saldo tidak cukup, atau metode tidak tersedia', { parse_mode: 'Markdown' });
  data.saldo[uid] -= jumlah; simpan();
  ctx.reply(`✅ *Permintaan Penarikan Diterima!*\n💳 Metode: ${metode.toUpperCase()}\n💵 Jumlah: Rp${jumlah.toLocaleString('id-ID')}\n🏦 Tujuan: ${WD_METHODS[metode]}`, { parse_mode: 'Markdown' });
  bot.api.sendMessage(ADMIN_ID, `📤 *PERMINTAAN WD*\n👤 User: ${uid}\n💵 Jumlah: Rp${jumlah.toLocaleString('id-ID')}\n💳 Tujuan: ${metode.toUpperCase()}`);
});

bot.catch(err => console.error('❌ Error:', err));
bot.start({ polling: true });
console.log('🤖 WS SELL XCRL • MADE IN WAGYU • BERJALAN');
                                       
