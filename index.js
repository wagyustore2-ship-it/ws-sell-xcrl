// ==============================================
// 🤖 WS SELL XCRL • MADE IN WAGYU
// ✅ WA VIRTUAL AUTO LOGIN • NO MANUAL
// ==============================================

const { 
  default: makeWASocket, 
  useMultiFileAuthState, 
  fetchLatestBaileysVersion,
  DisconnectReason
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const { Bot, InlineKeyboard } = require('grammy');
const express = require('express');
const fs = require('fs-extra');

// ------------------- KONFIGURASI -------------------
const BOT_TOKEN = '8611704774:AAGgwMWUJvimvfej5VCWoRlm87CyJocZbTQ';
const ADMIN_ID = 8783239765;
const PORT = process.env.PORT || 8080;

let PENGATURAN = {
  REWARD: 5000,
  BONUS_DAFTAR: 100,
  BONUS_JUAL: 200,
  MIN_WD: 15000
};

// Folder simpan semua akun (ini "Database WA Virtual" kita)
fs.ensureDirSync('./wa_virtual');
fs.ensureDirSync('./data');

const app = express();
app.get('/', (_, res) => res.send('✅ WA VIRTUAL • WS SELL XCRL AKTIF'));
app.listen(PORT, () => console.log('🌐 Server Berjalan'));

const bot = new Bot(BOT_TOKEN);
const antrianProses = new Map(); // Simpan proses yang sedang berjalan
let data = { saldo: {}, transaksi: {}, daftar_akun: [], referal: {}, bonus: {} };

if (fs.existsSync('./data/data.json')) try { data = fs.readJSONSync('./data/data.json'); } catch {}
const simpan = () => fs.writeJSONSync('./data/data.json', data, { spaces: 2 });

// ==================== MENU ====================
async function menuPengguna(ctx) {
  const saldo = data.saldo[ctx.from.id] || 0;
  await ctx.reply(`👋 *WS SELL XCRL • MADE IN WAGYU*

💰 Harga Jual: Rp${PENGATURAN.REWARD.toLocaleString()}
🎁 Bonus Undang: +Rp${PENGATURAN.BONUS_DAFTAR} daftar | +Rp${PENGATURAN.BONUS_JUAL} jual
💵 Saldo: Rp${saldo.toLocaleString()}
💳 Min WD: Rp${PENGATURAN.MIN_WD.toLocaleString()}

✅ Otomatis Verifikasi • 100% Aman`, {
    reply_markup: new InlineKeyboard()
      .text('📤 JUAL NOMOR', 'jual').row()
      .text('🤝 REFERAL', 'ref').row()
      .text('💰 SALDO', 'cek').row()
      .text('💳 WD', 'wd'),
    parse_mode: 'Markdown'
  });
}

async function menuAdmin(ctx) {
  await ctx.reply(`⚙️ *PANEL ADMIN • WA VIRTUAL*
📱 Total Akun Aktif: ${data.daftar_akun.length}
🔑 Semua bisa dipanggil ulang kodenya`, {
    reply_markup: new InlineKeyboard()
      .text('📋 DAFTAR AKUN', 'list').row()
      .text('⚙️ PENGATURAN', 'set'),
    parse_mode: 'Markdown'
  });
}

bot.command('start', async ctx => {
  const uid = ctx.from.id;
  const ref = ctx.match?.split(' ')[1];
  if (ref && ref !== uid.toString() && !data.saldo[uid]) {
    data.referal[ref] = [...(data.referal[ref] || []), uid];
    data.saldo[ref] = (data.saldo[ref] || 0) + PENGATURAN.BONUS_DAFTAR;
    simpan();
    bot.api.sendMessage(ref, `🎁 +Rp${PENGATURAN.BONUS_DAFTAR} | Teman daftar`);
  }
  return uid == ADMIN_ID ? menuAdmin(ctx) : menuPengguna(ctx);
});

// ==================== INTI: WA VIRTUAL OTOMATIS ====================
bot.callbackQuery('jual', ctx => ctx.reply('📤 Kirim nomor: `+628xxxxxxx`', { parse_mode: 'Markdown' }));

bot.on('message:text', async ctx => {
  const uid = ctx.from.id;
  const teks = ctx.message.text.trim();

  // 1. Terima nomor dari penjual
  if (/^\+?\d{9,15}$/.test(teks)) {
    const nomor = teks.replace('+', '');
    await ctx.reply(`⏳ *Wait for OTP...* ⚡\nMenghubungkan ke Server WhatsApp...`);

    try {
      const { version } = await fetchLatestBaileysVersion();
      const folder = `./wa_virtual/${nomor}`;
      const { state, saveCreds } = await useMultiFileAuthState(folder);

      // 🧠 INI "KLON WA" kita: Identitas persis HP Android asli
      const sock = makeWASocket({
        auth: state,
        version,
        browser: ['WhatsApp', 'Android', '2.25.14.75'], // Versi stabil terbaru
        printQRInTerminal: false,
        connectTimeoutMs: 22000,
        defaultQueryTimeoutMs: 15000,
        keepAliveIntervalMs: 20000,
        syncFullHistory: false,
        markOnlineOnConnect: false,
        retryRequestDelayMs: 700
      });

      sock.ev.on('creds.update', saveCreds);

      const batasWaktu = setTimeout(() => {
        if (antrianProses.has(uid)) {
          antrianProses.delete(uid);
          sock.end().catch(() => {});
          ctx.reply(`❌ Timeout. Coba ulangi dalam 2 menit.`);
        }
      }, 25000);

      sock.ev.on('connection.update', async ({ connection }) => {
        if (connection === 'open') {
          clearTimeout(batasWaktu);
          try {
            // ✅ Minta kode WS ke server WA
            const kode = await sock.requestPairingCode(nomor);
            antrianProses.set(uid, { sock, nomor });

            await ctx.reply(`✅ *OTP CODE GENERATED!* 📩

📱 Nomor: +${nomor}
🔑 Kode Verifikasi: \`${kode}\`

📝 Cara:
1. Buka WA HP
2. Masukkan nomor
3. Pilih: *Verifikasi lewat kode*
4. Masukkan kode di atas
5. **Balas kode yang sama ke bot**`, { parse_mode: 'Markdown' });

          } catch (err) {
            clearTimeout(batasWaktu);
            sock.end();
            ctx.reply(`❌ Gagal dapat kode. Nomor dibatasi.`);
          }
        }
        if (connection === 'close') {
          clearTimeout(batasWaktu);
          sock.end();
          antrianProses.delete(uid);
        }
      });

    } catch { return ctx.reply(`❌ Sistem sibuk.`); }
    return;
  }

  // 2. Terima kode OTP/WS dari penjual → OTOMATIS daftarkan ke "WA Virtual" kita
  if (antrianProses.has(uid)) {
    const { sock, nomor } = antrianProses.get(uid);
    const kode = teks.replace(/[\s-]/g, '').toUpperCase();

    try {
      // ✅ INI LANGKAH OTOMATISNYA: Bot masukkan kode & verifikasi sendiri
      await sock.login(kode);

      // ✅ Berhasil: Masukkan ke daftar akun milik kita
      if (!data.daftar_akun.find(a => a.nomor === nomor)) {
        data.daftar_akun.push({ nomor, waktu: new Date().toLocaleString('id-ID') });
      }

      // Kasih saldo ke penjual
      data.saldo[uid] = (data.saldo[uid] || 0) + PENGATURAN.REWARD;

      // Bonus Referal
      for (const [ref, list] of Object.entries(data.referal)) {
        if (list.includes(uid)) {
          const kunci = `${ref}_${nomor}`;
          if (!data.bonus[kunci]) {
            data.saldo[ref] = (data.saldo[ref] || 0) + PENGATURAN.BONUS_JUAL;
            data.bonus[kunci] = true;
            bot.api.sendMessage(ref, `🎁 +Rp${PENGATURAN.BONUS_JUAL} | Teman jual nomor`);
          }
          break;
        }
      }

      simpan();

      // Balasan sukses
      await ctx.reply(`🎉 *VERIFIKASI SELESAI OTOMATIS!* ✅

📱 Nomor: +${nomor}
💵 Pendapatan: Rp${PENGATURAN.REWARD.toLocaleString()}
✅ Status: Terdaftar penuh di WA Virtual
💳 Saldo: Rp${data.saldo[uid].toLocaleString()}`, { parse_mode: 'Markdown' });

      // Lapor ke Admin
      bot.api.sendMessage(ADMIN_ID, `📥 *AKUN BARU MASUK OTOMATIS!*
+${nomor} | ✅ Aktif & Tersimpan`, { parse_mode: 'Markdown' });

    } catch (err) {
      await ctx.reply(`❌ Kode salah / kadaluarsa. Ulangi lagi.`);
      sock.end();
    }
    antrianProses.delete(uid);
    return;
  }

  // 3. FITUR ADMIN: Panggil ulang kode kapan saja dari WA Virtual
  if (uid === ADMIN_ID && /^\+?\d{9,15}$/.test(teks)) {
    const nomor = teks.replace('+', '');
    if (!data.daftar_akun.find(a => a.nomor === nomor)) return ctx.reply(`❌ Tidak ada di daftar.`);

    await ctx.reply(`🔄 *Membuka WA Virtual...* ⚡`);
    try {
      const { version } = await fetchLatestBaileysVersion();
      const { state } = await useMultiFileAuthState(`./wa_virtual/${nomor}`);
      const sock = makeWASocket({ auth: state, version, browser: ['WhatsApp', 'Android', '2.25.14.75'] });

      sock.ev.on('connection.update', async ({ connection }) => {
        if (connection === 'open') {
          const kodeBaru = await sock.requestPairingCode(nomor);
          await ctx.reply(`✅ *KODE BARU DARI WA VIRTUAL* 🔑

📱 +${nomor}
🔑 \`${kodeBaru}\`

👉 Bisa dipakai login ulang kapan saja`, { parse_mode: 'Markdown' });
        }
      });
    } catch { ctx.reply(`❌ Gagal buka sesi.`); }
    return;
  }
});

// Menu Tambahan
bot.callbackQuery('list', ctx => {
  if (ctx.from.id !== ADMIN_ID) return;
  const daftar = data.daftar_akun.map((a,i) => `${i+1}. +${a.nomor}`).join('\n') || 'Kosong';
  ctx.reply(`📋 *DAFTAR AKUN DI WA VIRTUAL*\n\n${daftar}\n\n👉 Ketik nomor untuk dapat kode baru!`, { parse_mode: 'Markdown' });
});

bot.callbackQuery('cek', ctx => ctx.reply(`💵 Saldo: Rp${(data.saldo[ctx.from.id]||0).toLocaleString()}`));
bot.callbackQuery('wd', ctx => ctx.reply(`💳 /wd dana/nama 15000`));
bot.command('wd', ctx => {
  const [cmd, metode, jumlah] = ctx.message.text.split(' ');
  const jml = parseInt(jumlah);
  if (!metode || !jml || jml < PENGATURAN.MIN_WD || (data.saldo[ctx.from.id]||0) < jml)
    return ctx.reply(`❌ Tidak cukup / salah format`);
  data.saldo[ctx.from.id] -= jml; simpan();
  ctx.reply(`✅ WD: Rp${jml.toLocaleString()} ke ${metode.toUpperCase()}`);
});

bot.catch(err => console.error('❌', err));
bot.start({ polling: true });
console.log('🤖 WS SELL XCRL • WA VIRTUAL RUNNING');
