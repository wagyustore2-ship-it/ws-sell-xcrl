// ==============================================
// 🤖 WS SELL XCRL • MADE IN WAGYU
// ==============================================

const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { Bot, InlineKeyboard } = require('grammy');
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

// Penjaga nyala
const app = express();
app.get('/', (_, res) => res.send('✅ WS SELL XCRL • MADE IN WAGYU'));
app.listen(PORT, () => console.log('✅ Server aktif'));

const bot = new Bot(BOT_TOKEN);
const proses = new Map();
let data = { saldo: {}, transaksi: [], wd: {} };

if (fs.existsSync('./data.json')) {
  try { data = fs.readJSONSync('./data.json'); } catch { data = { saldo: {}, transaksi: [], wd: {} }; }
}
function simpan() {
  fs.writeJSONSync('./data.json', data, { spaces: 2 });
}

// Menu
async function menuPengguna(ctx) {
  const saldo = data.saldo[ctx.from.id] || 0;
  const teks = `
🏪 *${PENGATURAN.STATUS_TOKO}*
💰 Harga per nomor: *Rp${PENGATURAN.REWARD.toLocaleString('id-ID')}*
💵 Saldo kamu: *Rp${saldo.toLocaleString('id-ID')}*
💳 Minimal WD: *Rp${PENGATURAN.MIN_WD.toLocaleString('id-ID')}*
${PENGATURAN.INFO_WA}`;
  const kb = new InlineKeyboard()
    .text('📤 JUAL NOMOR', 'jual_nomor').row()
    .text('💰 CEK SALDO', 'cek_saldo').row()
    .text('💳 TARIK SALDO', 'menu_wd').row()
    .text('📖 CARA PAKAI', 'cara_pakai');
  await ctx.reply(`👋 *WS SELL XCRL • MADE IN WAGYU*\n${teks}`, { reply_markup: kb, parse_mode: 'Markdown' });
}

bot.command('start', ctx => ctx.from.id === ADMIN_ID ? menuAdmin(ctx) : menuPengguna(ctx));

bot.callbackQuery('jual_nomor', ctx => {
  ctx.answerCallbackQuery();
  ctx.reply('📤 Silakan kirim nomor WhatsApp kamu:\nContoh: *+628123456789*', { parse_mode: 'Markdown' });
});

// PROSES UTAMA
bot.on('message:text', async ctx => {
  const uid = ctx.from.id;
  const teks = ctx.message.text.trim();

  // Cek format nomor
  if (/^\+?62\d{8,12}$/.test(teks)) {
    const nomor = teks.replace('+', '');
    await ctx.reply('⏳ Sedang memproses, mohon tunggu sebentar...');

    try {
      const { state, saveCreds } = await useMultiFileAuthState(`./auth/${uid}_${nomor}`);
      const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: ['Chrome', 'Android', '2.3000.10.0']
      });

      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('connection.update', async ({ connection }) => {
        if (connection === 'open') {
          try {
            const kode = await sock.requestPairingCode(nomor);
            proses.set(uid, { sock, nomor });
            await ctx.reply(`✅ *NOMOR DITERIMA!* 📲

📝 CARA VERIFIKASI:
1. Buka aplikasi WhatsApp
2. Masukkan nomor: *+${nomor}*
3. Pilih opsi: *Verifikasi lewat nomor telepon*
4. Pilih: *Gunakan kode verifikasi*
5. Masukkan kode berikut:

🔑 *${kode}*

👉 *Kirim kode ini kembali ke bot*
✅ WA kamu tetap bisa dibuka & dipakai normal`, { parse_mode: 'Markdown' });
          } catch (err) {
            await ctx.reply('❌ Gagal membuat kode, coba kirim ulang nomor.');
            sock.end();
          }
        }
      });

    } catch (err) {
      return ctx.reply('❌ Nomor tidak valid atau gagal terhubung.');
    }
    return;
  }

  // Proses kode balasan
  if (proses.has(uid)) {
    const { sock, nomor } = proses.get(uid);
    const kodeBersih = teks.replace(/[- ]/g, '').toUpperCase();

    try {
      await sock.login(kodeBersih);
      data.saldo[uid] = (data.saldo[uid] || 0) + PENGATURAN.REWARD;
      data.transaksi.push(`[${new Date().toLocaleString('id-ID')}] +${nomor} +Rp${PENGATURAN.REWARD}`);
      simpan();

      await ctx.reply(`🎉 *BERHASIL TERHUBUNG!* ✅
📞 Nomor: +${nomor}
💰 Dapat: *Rp${PENGATURAN.REWARD.toLocaleString('id-ID')}*
💵 Saldo Baru: *Rp${data.saldo[uid].toLocaleString('id-ID')}*

✅ Selesai, WA tetap aman dipakai`, { parse_mode: 'Markdown' });

      bot.api.sendMessage(ADMIN_ID, `📥 Masuk: +${nomor} | Rp${PENGATURAN.REWARD}`);
    } catch (err) {
      await ctx.reply('❌ Kode salah / kadaluarsa. Ulangi jual nomor lagi.');
    }
    proses.delete(uid);
    return;
  }
});

// Tombol lainnya
bot.callbackQuery('cek_saldo', ctx => { ctx.answerCallbackQuery(); const s = data.saldo[ctx.from.id]||0; ctx.reply(`💵 Saldo: Rp${s.toLocaleString('id-ID')}`); });
bot.callbackQuery('cara_pakai', ctx => { ctx.answerCallbackQuery(); ctx.reply(`📖 Cara:\n1. Kirim nomor\n2. Dapat kode\n3. Masukkan di WA\n4. Kirim kode ke bot\n✅ Selesai`); });

bot.catch(err => console.error('❌ Error:', err));
bot.start({ polling: true });
console.log('🤖 WS SELL XCRL Aktif');
