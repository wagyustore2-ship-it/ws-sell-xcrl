// ==============================================
// 🤖 WS SELL XCRL
// ==============================================

const { 
  default: makeWASocket, 
  useMultiFileAuthState, 
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const { Bot, InlineKeyboard } = require('grammy');
const express = require('express');
const fs = require('fs-extra');
const { ProxyAgent } = require('undici');

// ------------------- PENGATURAN -------------------
const BOT_TOKEN = '8611704774:AAGgwMWUJvimvfej5VCWoRlm87CyJocZbTQ';
const ADMIN_ID = 8783239765;
const PORT = process.env.PORT || 8080;

// Jalur koneksi
const PROXY_URL = 'http://h71MREtVKe40_custom_zone_US_st_city_sid_12803328_time_5:3680136@change4.owlproxy.com:7778';

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

let data = { saldo: {}, transaksi: [], daftar_akun: [], referal: {}, bonus: {} };
if (fs.existsSync('./data/data.json')) try { data = fs.readJSONSync('./data/data.json'); } catch {}
const simpan = () => fs.writeJSONSync('./data/data.json', data, { spaces: 2 });

// ==================== MENU ====================
async function menuPengguna(ctx) {
  await ctx.answerCallbackQuery().catch(() => {});
  const saldo = data.saldo[ctx.from.id] || 0;
  const teks = `🏪 *WS SELL XCRL*

💰 Harga: Rp${PENGATURAN.REWARD.toLocaleString('id-ID')}
🎁 Bonus: +${PENGATURAN.BONUS_DAFTAR} daftar | +${PENGATURAN.BONUS_JUAL} jual
💵 Saldo: Rp${saldo.toLocaleString('id-ID')}
💳 Minimal WD: Rp${PENGATURAN.MIN_WD.toLocaleString('id-ID')}`;

  const kb = new InlineKeyboard()
    .text('📤 JUAL NOMOR', 'jual_nomor').row()
    .text('🤝 AJAK TEMAN', 'referal').row()
    .text('💰 CEK SALDO', 'cek_saldo').row()
    .text('💳 TARIK SALDO', 'tarik_saldo');

  await ctx.editMessageText(teks, { reply_markup: kb, parse_mode: 'Markdown' })
    .catch(() => ctx.reply(teks, { reply_markup: kb, parse_mode: 'Markdown' }));
}

async function menuAdmin(ctx) {
  await ctx.answerCallbackQuery().catch(() => {});
  const total = data.daftar_akun.length;
  const teks = `⚙️ *PANEL ADMIN*

📱 Total Akun Tersimpan: *${total}*
🔑 Kelola semua akun dengan aman`;

  const kb = new InlineKeyboard()
    .text('📋 DAFTAR AKUN', 'daftar_akun').row()
    .text('⚙️ PENGATURAN', 'pengaturan').row()
    .text('⬅️ KEMBALI', 'menu_utama');

  await ctx.editMessageText(teks, { reply_markup: kb, parse_mode: 'Markdown' })
    .catch(() => ctx.reply(teks, { reply_markup: kb, parse_mode: 'Markdown' }));
}

bot.command('start', async ctx => {
  proses.clear();
  return ctx.from.id === ADMIN_ID 
    ? ctx.reply(`👋 *Selamat Datang!*`, { reply_markup: new InlineKeyboard().text('⚙️ BUKA PANEL ADMIN', 'panel_admin') }) 
    : menuPengguna(ctx);
});

// ==================== PROSES UTAMA ====================
bot.on('message:text', async ctx => {
  const uid = ctx.from.id;
  const teks = ctx.message.text.trim();

  if (/^\+?\d{9,15}$/.test(teks)) {
    const nomorBersih = teks.replace('+', '');
    const nomorTampil = `+${nomorBersih}`;
    if (proses.has(uid)) return ctx.reply('⏳ Sedang diproses, harap tunggu sebentar...');

    await ctx.reply(`⏳ *Menghubungkan ke server...*\nMohon tunggu sebentar...`);

    try {
      const { version } = await fetchLatestBaileysVersion();
      const folder = `./wa_virtual/${nomorBersih}`;
      const { state, saveCreds } = await useMultiFileAuthState(folder);

      const agent = new ProxyAgent(PROXY_URL, { connectTimeout: 30000 });

      const sock = makeWASocket({
        auth: state,
        version,
        browser: ['WhatsApp', 'Android', '2.25.14.75'],
        printQRInTerminal: false,
        connectTimeoutMs: 30000,
        defaultQueryTimeoutMs: 20000,
        keepAliveIntervalMs: 20000,
        syncFullHistory: false,
        markOnlineOnConnect: false,
        retryRequestDelayMs: 800,
        agent: agent
      });

      sock.ev.on('creds.update', saveCreds);

      const waktuHabis = setTimeout(() => {
        if (proses.has(uid)) {
          proses.delete(uid);
          sock.end().catch(() => {});
          ctx.reply(`❌ Gagal terhubung. Silakan ulangi kembali.`);
        }
      }, 35000);

      sock.ev.on('connection.update', async ({ connection }) => {
        if (connection === 'open') {
          clearTimeout(waktuHabis);
          try {
            const kode = await sock.requestPairingCode(nomorBersih);
            proses.set(uid, { sock, nomor: nomorBersih });
            await ctx.reply(`✅ *Kode Verifikasi Berhasil Dibuat!* 🎯

📱 Nomor: *${nomorTampil}*
🔑 Kode: \`${kode}\`

📝 Masukkan ke WhatsApp lalu balas kode ini ke bot untuk menyelesaikan proses.`, { parse_mode: 'Markdown' });
          } catch {
            clearTimeout(waktuHabis);
            sock.end().catch(() => {});
            proses.delete(uid);
            ctx.reply(`❌ Tidak dapat membuat kode. Coba nomor lain atau ulangi.`);
          }
        }
        if (connection === 'close') {
          clearTimeout(waktuHabis);
          sock.end().catch(() => {});
          proses.delete(uid);
        }
      });

    } catch {
      proses.delete(uid);
      return ctx.reply(`❌ Kesalahan sistem. Silakan coba lagi.`);
    }
    return;
  }

  if (proses.has(uid)) {
    const { sock, nomor } = proses.get(uid);
    const kode = teks.replace(/[\s-]/g, '').toUpperCase();
    try {
      await sock.login(kode);
      const sudahAda = data.daftar_akun.find(a => a.nomor === nomor);
      if (!sudahAda) data.daftar_akun.push({ nomor, waktu: new Date().toLocaleString('id-ID') });
      data.saldo[uid] = (data.saldo[uid] || 0) + PENGATURAN.REWARD;
      simpan();
      await ctx.reply(`🎉 *Proses Berhasil!* ✅

📱 Nomor: +${nomor}
💰 Pendapatan: Rp${PENGATURAN.REWARD.toLocaleString()}
💵 Saldo Sekarang: Rp${data.saldo[uid].toLocaleString()}`, { parse_mode: 'Markdown' });
    } catch {
      await ctx.reply(`❌ Kode salah atau sudah kadaluarsa. Silakan ulangi proses.`);
    }
    sock.end().catch(() => {});
    proses.delete(uid);
    return;
  }
});

bot.callbackQuery('panel_admin', menuAdmin);
bot.callbackQuery('menu_utama', menuPengguna);
bot.callbackQuery('jual_nomor', ctx => ctx.answerCallbackQuery('✅ Siap') && ctx.reply('📱 Kirim nomor lengkap: `+62812xxxxxxx`', { parse_mode: 'Markdown' }));
bot.callbackQuery('cek_saldo', ctx => ctx.answerCallbackQuery('✅') && ctx.reply(`💵 Saldo kamu: Rp${(data.saldo[ctx.from.id]||0).toLocaleString()}`, { parse_mode: 'Markdown' }));
bot.callbackQuery('daftar_akun', async ctx => {
  if (ctx.from.id !== ADMIN_ID) return;
  const daftar = data.daftar_akun.map((a,i) => `${i+1}. +${a.nomor}`).join('\n') || 'Belum ada akun tersimpan';
  ctx.reply(`📋 *DAFTAR AKUN*

${daftar}`, { parse_mode: 'Markdown' });
});

bot.catch(err => console.error('❌ Kesalahan:', err));
bot.start({ polling: true });
console.log('🤖 WS SELL XCRL Berjalan Normal');
