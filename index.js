// ==============================================
// 🤖 WS SELL XCRL • FINAL FIX
// ==============================================

const { 
  default: makeWASocket, 
  useMultiFileAuthState, 
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const { Bot, InlineKeyboard } = require('grammy');
const express = require('express');
const fs = require('fs-extra');

// ------------------- PENGATURAN -------------------
const BOT_TOKEN = '8611704774:AAGgwMWUJvimvfej5VCWoRlm87CyJocZbTQ';
const ADMIN_ID = 8783239765;
const PORT = process.env.PORT || 8080;

let PENGATURAN = {
  REWARD: 5000,
  BONUS_DAFTAR: 100,
  BONUS_JUAL: 200,
  MIN_WD: 15000
};

fs.ensureDirSync('./wa_virtual');
fs.ensureDirSync('./data');

const app = express();
app.get('/', (_, res) => res.send('✅ WS SELL XCRL Berjalan'));
app.listen(PORT, () => console.log('✅ Server Aktif'));

const bot = new Bot(BOT_TOKEN);
const proses = new Map();
let data = { saldo: {}, transaksi: [], daftar_akun: [], referal: {} };
if (fs.existsSync('./data/data.json')) try { data = fs.readJSONSync('./data/data.json'); } catch {}
const simpan = () => fs.writeJSONSync('./data/data.json', data, { spaces: 2 });

// ==================== MENU CEPAT ====================
async function menuPengguna(ctx) {
  const saldo = data.saldo[ctx.from.id] || 0;
  const teks = `🏪 *WS SELL XCRL*

💰 Harga: Rp${PENGATURAN.REWARD.toLocaleString('id-ID')}
🎁 Bonus: +${PENGATURAN.BONUS_DAFTAR} daftar | +${PENGATURAN.BONUS_JUAL} jual
💵 Saldo: Rp${saldo.toLocaleString('id-ID')}
💳 Minimal WD: Rp${PENGATURAN.MIN_WD.toLocaleString('id-ID')}`;

  const kb = new InlineKeyboard()
    .text('📤 JUAL NOMOR', 'jual').row()
    .text('🤝 AJAK TEMAN', 'ref').row()
    .text('💰 CEK SALDO', 'saldo').row()
    .text('💳 TARIK SALDO', 'wd');

  await ctx.reply(teks, { reply_markup: kb, parse_mode: 'Markdown' });
}

async function menuAdmin(ctx) {
  const total = data.daftar_akun.length;
  const teks = `⚙️ *PANEL ADMIN*

📱 Total Akun: ${total}
🔑 Kelola aman`;

  const kb = new InlineKeyboard()
    .text('📋 DAFTAR AKUN', 'list').row()
    .text('⚙️ PENGATURAN', 'set').row()
    .text('⬅️ KEMBALI', 'utama');

  await ctx.reply(teks, { reply_markup: kb, parse_mode: 'Markdown' });
}

// ==================== PERINTAH ====================
bot.command('start', async ctx => {
  proses.clear();
  if (ctx.from.id === ADMIN_ID) {
    return ctx.reply(`👋 *Selamat Datang Admin*`, { reply_markup: new InlineKeyboard().text('⚙️ BUKA PANEL', 'admin'), parse_mode: 'Markdown' });
  }
  return menuPengguna(ctx);
});

bot.callbackQuery('utama', async ctx => { await ctx.answerCallbackQuery(); await menuPengguna(ctx); });
bot.callbackQuery('admin', async ctx => { await ctx.answerCallbackQuery(); await menuAdmin(ctx); });
bot.callbackQuery('jual', async ctx => { await ctx.answerCallbackQuery(); await ctx.reply('📱 Kirim nomor: `+628xxxxxxx`', { parse_mode: 'Markdown' }); });
bot.callbackQuery('saldo', async ctx => { await ctx.answerCallbackQuery(); const s = data.saldo[ctx.from.id]||0; await ctx.reply(`💵 Saldo: Rp${s.toLocaleString()}`, { parse_mode: 'Markdown' }); });

// ==================== PROSES WS ====================
bot.on('message:text', async ctx => {
  const uid = ctx.from.id;
  const teks = ctx.message.text.trim();

  if (/^\+?\d{9,15}$/.test(teks)) {
    const nomor = teks.replace('+', '');
    if (proses.has(uid)) return ctx.reply('⏳ Masih diproses...');

    await ctx.reply(`⏳ Menghubungkan ke server...`);

    try {
      const { version } = await fetchLatestBaileysVersion();
      const { state, saveCreds } = await useMultiFileAuthState(`./wa_virtual/${nomor}`);

      const sock = makeWASocket({
        auth: state,
        version,
        browser: ['WhatsApp', 'Android', '2.25.14.75'],
        printQRInTerminal: false,
        connectTimeoutMs: 25000,
        syncFullHistory: false
      });

      sock.ev.on('creds.update', saveCreds);

      const tm = setTimeout(() => { proses.delete(uid); sock.end().catch(()=>{}); ctx.reply(`❌ Waktu habis. Ulangi lagi.`); }, 30000);

      sock.ev.on('connection.update', async ({ connection }) => {
        if (connection === 'open') {
          clearTimeout(tm);
          try {
            const kode = await sock.requestPairingCode(nomor);
            proses.set(uid, { sock, nomor });
            await ctx.reply(`✅ *Kode Siap!*\n\n📱 Nomor: +${nomor}\n🔑 Kode: \`${kode}\`\n\nMasukkan di WA lalu balas kode ini.`, { parse_mode: 'Markdown' });
          } catch {
            clearTimeout(tm); sock.end().catch(()=>{}); ctx.reply(`❌ Gagal dapat kode.`);
          }
        }
      });

    } catch { return ctx.reply(`❌ Gangguan sistem.`); }
    return;
  }

  if (proses.has(uid)) {
    const { sock, nomor } = proses.get(uid);
    try {
      await sock.login(teks.replace(/\s/g,''));
      if (!data.daftar_akun.find(a=>a.nomor===nomor)) data.daftar_akun.push({nomor, waktu: new Date().toLocaleString()});
      data.saldo[uid] = (data.saldo[uid]||0) + PENGATURAN.REWARD;
      simpan();
      await ctx.reply(`✅ Berhasil! Saldo masuk.`);
    } catch { await ctx.reply(`❌ Kode salah.`); }
    sock.end().catch(()=>{}); proses.delete(uid);
  }
});

bot.catch(err => console.error(err));
bot.start({ polling: true });
console.log('🤖 WS SELL XCRL AKTIF');
