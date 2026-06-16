// ==============================================
// 🤖 WS SELL XCRL • MADE IN WAGYU
// ==============================================

const { 
  default: makeWASocket, 
  useMultiFileAuthState, 
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
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
  MIN_WD: 15000,
  STATUS_TOKO: "🟢 TOKO SEDANG BUKA",
  INFO_WA: "📞 Bantuan: Hubungi Admin"
};

let WD_METHODS = {
  dana: '08xxxx a.n Pemilik',
  ovo: '08xxxx a.n Pemilik',
  shopeepay: '08xxxx a.n Pemilik',
  bca: '12345678 a.n Pemilik'
};
// ---------------------------------------------------

fs.ensureDirSync('./sesi_akun');
fs.ensureDirSync('./data');

const app = express();
app.get('/', (_, res) => res.send('✅ WS SELL XCRL • MADE IN WAGYU'));
app.listen(PORT, () => console.log('✅ Server aktif'));

const bot = new Bot(BOT_TOKEN);
const prosesVerifikasi = new Map();
let data = {
  saldo: {},
  transaksi: [],
  daftar_akun_milik: [],
  referal: {},
  sudah_dapat_bonus: {}
};

if (fs.existsSync('./data/data.json')) {
  try { data = fs.readJSONSync('./data/data.json'); } catch {}
}
function simpanData() {
  fs.writeJSONSync('./data/data.json', data, { spaces: 2 });
}

// ==================== MENU ====================
async function menuPengguna(ctx) {
  const saldo = data.saldo[ctx.from.id] || 0;
  const teks = `
🏪 *${PENGATURAN.STATUS_TOKO}*
💰 Harga per akun: *Rp${PENGATURAN.REWARD.toLocaleString('id-ID')}*
🎁 Bonus Undang: +Rp${PENGATURAN.BONUS_DAFTAR} daftar + Rp${PENGATURAN.BONUS_JUAL} jual
💵 Saldo kamu: *Rp${saldo.toLocaleString('id-ID')}*
💳 Minimal WD: *Rp${PENGATURAN.MIN_WD.toLocaleString('id-ID')}*
✅ Terima Semua Negara
${PENGATURAN.INFO_WA}`;
  const kb = new InlineKeyboard()
    .text('📤 JUAL AKUN WA', 'jual_akun').row()
    .text('🤝 REFERAL', 'menu_referal').row()
    .text('💰 CEK SALDO', 'cek_saldo').row()
    .text('💳 TARIK SALDO', 'menu_wd').row()
    .text('📖 CARA KERJA', 'cara_kerja');
  await ctx.reply(`👋 *WS SELL XCRL • MADE IN WAGYU*\n${teks}`, { reply_markup: kb, parse_mode: 'Markdown' });
}

async function menuAdmin(ctx) {
  const total = data.daftar_akun_milik.length;
  const totalReferal = Object.values(data.referal).flat().length;
  const teks = `
⚙️ *PANEL ADMIN*
📱 Total Akun: *${total}*
👥 Total Referal: *${totalReferal}*
💰 Harga Beli: *Rp${PENGATURAN.REWARD.toLocaleString('id-ID')}*
💳 Min WD: Rp${PENGATURAN.MIN_WD.toLocaleString('id-ID')}
  `;
  const kb = new InlineKeyboard()
    .text('📋 LIHAT SEMUA AKUN', 'lihat_semua_akun').row()
    .text('⚙️ UBAH PENGATURAN', 'ubah_pengaturan').row()
    .text('💳 ATUR PENARIKAN', 'atur_wd').row()
    .text('📜 RIWAYAT MASUK', 'riwayat');
  await ctx.reply(teks, { reply_markup: kb, parse_mode: 'Markdown' });
}

// ==================== FITUR REFERAL ====================
bot.command('start', async ctx => {
  const uid = ctx.from.id;
  const teks = ctx.message.text;

  if (teks.includes('start ') && !data.saldo[uid]) {
    const pengundang = teks.split(' ')[1];
    if (pengundang && pengundang !== uid.toString()) {
      if (!data.referal[pengundang]) data.referal[pengundang] = [];
      if (!data.referal[pengundang].includes(uid)) {
        data.referal[pengundang].push(uid);
        data.saldo[pengundang] = (data.saldo[pengundang] || 0) + PENGATURAN.BONUS_DAFTAR;
        data.transaksi.push(`[${new Date().toLocaleString('id-ID')}] Referal Daftar: +Rp${PENGATURAN.BONUS_DAFTAR}`);
        data.sudah_dapat_bonus[`${pengundang}_${uid}`] = 'daftar';
        simpanData();
        bot.api.sendMessage(pengundang, `🎁 *BONUS MASUK!*\nTeman daftar: +Rp${PENGATURAN.BONUS_DAFTAR}`, { parse_mode: 'Markdown' });
      }
    }
  }
  return uid === ADMIN_ID ? menuAdmin(ctx) : menuPengguna(ctx);
});

bot.callbackQuery('menu_referal', ctx => {
  ctx.answerCallbackQuery();
  const uid = ctx.from.id;
  const linkUndang = `https://t.me/${ctx.me.username}?start=${uid}`;
  const jumlahUndang = data.referal[uid] ? data.referal[uid].length : 0;
  ctx.reply(`🤝 *REFERAL PROGRAM* 🎁\n\n👥 Teman Diundang: *${jumlahUndang} orang*\n💰 Bonus:\n• Daftar: +Rp${PENGATURAN.BONUS_DAFTAR}\n• Jual Nomor: +Rp${PENGATURAN.BONUS_JUAL}\n\n🔗 *Link Undangan:*\n\`${linkUndang}\``, { parse_mode: 'Markdown' });
});

// ==================== PROSES UTAMA - SUPER FAST & NO HANG ====================
bot.callbackQuery('jual_akun', ctx => {
  ctx.answerCallbackQuery();
  ctx.reply('📤 *Kirim nomor lengkap dengan kode negara:*\nContoh: `+628123456789` / `+258864136742`', { parse_mode: 'Markdown' });
});

bot.callbackQuery('cara_kerja', ctx => {
  ctx.answerCallbackQuery();
  ctx.reply(`📖 *ALUR KERJA*\n\n1️⃣ Kirim nomor\n2️⃣ Dapat Kode WS\n3️⃣ Buka WA → Verifikasi lewat kode\n4️⃣ Masukkan kode lalu kirim kembali\n5️⃣ ✅ Selesai, saldo masuk otomatis`, { parse_mode: 'Markdown' });
});

bot.on('message:text', async ctx => {
  const uid = ctx.from.id;
  const teks = ctx.message.text.trim();

  if (uid === ADMIN_ID) {
    if (teks.startsWith('harga ')) {
      const v = parseInt(teks.split(' ')[1]);
      if (v > 0) { PENGATURAN.REWARD = v; simpanData(); return ctx.reply(`✅ Harga diubah: Rp${v.toLocaleString('id-ID')}`); }
    }
    if (teks.startsWith('bonusdaftar ')) {
      const v = parseInt(teks.split(' ')[1]);
      if (v >= 0) { PENGATURAN.BONUS_DAFTAR = v; simpanData(); return ctx.reply(`✅ Bonus daftar: Rp${v}`); }
    }
    if (teks.startsWith('bonusjual ')) {
      const v = parseInt(teks.split(' ')[1]);
      if (v >= 0) { PENGATURAN.BONUS_JUAL = v; simpanData(); return ctx.reply(`✅ Bonus jual: Rp${v}`); }
    }
    if (teks.startsWith('minwd ')) {
      const v = parseInt(teks.split(' ')[1]);
      if (v >= 0) { PENGATURAN.MIN_WD = v; simpanData(); return ctx.reply(`✅ Minimal WD: Rp${v.toLocaleString('id-ID')}`); }
    }
  }

  if (/^\+?\d{9,15}$/.test(teks)) {
    const nomorBersih = teks.replace('+', '');
    const nomorTampil = `+${nomorBersih}`;

    // Tampilan sesuai gaya
    await ctx.reply(`⏳ *Wait for OTP...* ⚡\nOTP will be sent within 10-30 seconds. Please wait...`);

    try {
      const { version } = await fetchLatestBaileysVersion();
      const folderSesi = `./sesi_akun/${nomorBersih}`;
      const { state, saveCreds } = await useMultiFileAuthState(folderSesi);

      // ⚡ DIOPTIMALKAN AGAR CEPAT TERDETEKSI WA
      const sock = makeWASocket({
        auth: state,
        version: version,
        printQRInTerminal: false,
        browser: ['WhatsApp', 'Chrome', '2.2412.54'],
        connectTimeoutMs: 18000,
        defaultQueryTimeoutMs: 12000,
        keepAliveIntervalMs: 10000,
        syncFullHistory: false,
        markOnlineOnConnect: false,
        retryRequestDelayMs: 800,
        linkPreviewImageThumbnailWidth: 0
      });

      sock.ev.on('creds.update', saveCreds);

      // ⏱️ ANTI HANG: Kalau lebih 25 detik otomatis berhenti & minta ulang
      const timeout = setTimeout(() => {
        if (prosesVerifikasi.has(uid)) {
          prosesVerifikasi.delete(uid);
          sock.end().catch(() => {});
          ctx.reply(`❌ *No Response* ⚠️\nServer timeout. Please send the number again after 2 minutes.`);
        }
      }, 25000);

      sock.ev.on('connection.update', async ({ connection, qr }) => {
        if (connection === 'open') {
          clearTimeout(timeout);
          try {
            const pairingCode = await sock.requestPairingCode(nomorBersih);
            prosesVerifikasi.set(uid, { sock, nomor: nomorBersih });

            await ctx.reply(`✅ *OTP CODE GENERATED!* 📩\n\n📱 *Number:* ${nomorTampil}\n🔑 *Verification Code:*\n\`${pairingCode}\`\n\n📝 *How to use:*\n1. Open WhatsApp\n2. Enter this number\n3. Choose *Verify with code*\n4. Enter the code above\n5. **Send this code back to finish**`, { parse_mode: 'Markdown' });

          } catch (err) {
            clearTimeout(timeout);
            sock.end().catch(() => {});
            ctx.reply(`❌ *Failed* ⚠️\nNumber invalid or not supported. Try another.`);
          }
        }

        if (connection === 'close') {
          clearTimeout(timeout);
          if (prosesVerifikasi.has(uid)) {
            prosesVerifikasi.delete(uid);
            sock.end().catch(() => {});
          }
        }
      });

    } catch (err) {
      console.error('Error:', err);
      return ctx.reply(`❌ *System busy* ⚠️\nTry again in a moment.`);
    }
    return;
  }

  // Proses verifikasi kode
  if (prosesVerifikasi.has(uid)) {
    const { sock, nomor } = prosesVerifikasi.get(uid);
    const kode = teks.replace(/[\s-]/g, '').toUpperCase();

    try {
      await sock.login(kode);

      const sudahAda = data.daftar_akun_milik.find(a => a.nomor === nomor);
      if (!sudahAda) {
        data.daftar_akun_milik.push({ nomor, nomor_tampil: `+${nomor}`, waktu: new Date().toLocaleString('id-ID') });
      }

      data.saldo[uid] = (data.saldo[uid] || 0) + PENGATURAN.REWARD;
      data.transaksi.push(`[${new Date().toLocaleString('id-ID')}] +${nomor} | Rp${PENGATURAN.REWARD}`);

      // Bonus referral
      for (const [pengundang, daftarTeman] of Object.entries(data.referal)) {
        if (daftarTeman.includes(uid)) {
          const kunci = `${pengundang}_${uid}_jual`;
          if (!data.sudah_dapat_bonus[kunci]) {
            data.saldo[pengundang] = (data.saldo[pengundang] || 0) + PENGATURAN.BONUS_JUAL;
            data.transaksi.push(`[${new Date().toLocaleString('id-ID')}] Bonus Jual: +Rp${PENGATURAN.BONUS_JUAL}`);
            data.sudah_dapat_bonus[kunci] = true;
            bot.api.sendMessage(pengundang, `🎁 *BONUS RECEIVED!*\nReferral sold: +Rp${PENGATURAN.BONUS_JUAL}`, { parse_mode: 'Markdown' });
          }
          break;
        }
      }

      simpanData();

      await ctx.reply(`🎉 *SUCCESSFULLY SOLD!* ✅\n\n📞 *Number:* +${nomor}\n💰 *Earned:* Rp${PENGATURAN.REWARD.toLocaleString('id-ID')}\n💵 *New Balance:* Rp${data.saldo[uid].toLocaleString('id-ID')}`, { parse_mode: 'Markdown' });

      bot.api.sendMessage(ADMIN_ID, `📥 *NEW ACCOUNT* ✅\n📱 *Number:* +${nomor}\n⏰ *Time:* ${new Date().toLocaleString('id-ID')}`, { parse_mode: 'Markdown' });

    } catch (err) {
      await ctx.reply(`❌ *Invalid / Expired Code* ⚠️\nPlease start over.`);
      sock.end().catch(() => {});
    }
    prosesVerifikasi.delete(uid);
    return;
  }

  // Admin minta kode ulang
  if (uid === ADMIN_ID && /^\+?\d{9,15}$/.test(teks)) {
    const nomorBersih = teks.replace('+', '');
    const akun = data.daftar_akun_milik.find(a => a.nomor === nomorBersih);
    if (!akun) return ctx.reply(`❌ *Number not found*`);

    await ctx.reply(`🔄 *Generating new code...* ⚡`);
    try {
      const { version } = await fetchLatestBaileysVersion();
      const { state } = await useMultiFileAuthState(`./sesi_akun/${nomorBersih}`);
      const sock = makeWASocket({ auth: state, version, browser: ['WhatsApp', 'Chrome', '2.2412.54'] });

      sock.ev.on('connection.update', async ({ connection }) => {
        if (connection === 'open') {
          const kode = await sock.requestPairingCode(nomorBersih);
          await ctx.reply(`✅ *NEW WS CODE* 🔑\n\n📱 *Number:* +${nomorBersih}\n🔑 *Code:* \`${kode}\``, { parse_mode: 'Markdown' });
        }
      });
    } catch {
      ctx.reply(`❌ *Failed to generate code*`);
    }
    return;
  }
});

// ==================== MENU LAINNYA ====================
bot.callbackQuery('lihat_semua_akun', ctx => {
  if (ctx.from.id !== ADMIN_ID) return ctx.answerCallbackQuery('❌ Bukan admin');
  ctx.answerCallbackQuery();
  if (data.daftar_akun_milik.length === 0) return ctx.reply(`📋 *No accounts saved yet.*`);
  const daftar = data.daftar_akun_milik.map((a,i) => `${i+1}. ${a.nomor_tampil}`).join('\n');
  ctx.reply(`📋 *LIST OF ACCOUNTS*\n\n${daftar}`, { parse_mode: 'Markdown' });
});

bot.callbackQuery('ubah_pengaturan', ctx => {
  if (ctx.from.id !== ADMIN_ID) return;
  ctx.answerCallbackQuery();
  ctx.reply(`⚙️ *SETTINGS*\n• \`harga 5000\`\n• \`bonusdaftar 100\`\n• \`bonusjual 200\`\n• \`minwd 15000\``, { parse_mode: 'Markdown' });
});

bot.callbackQuery('cek_saldo', ctx => { ctx.answerCallbackQuery(); const s = data.saldo[ctx.from.id]||0; ctx.reply(`💵 *Balance:* Rp${s.toLocaleString('id-ID')}`); });
bot.callbackQuery('menu_wd', ctx => { ctx.answerCallbackQuery(); const s = data.saldo[ctx.from.id]||0; if (s < PENGATURAN.MIN_WD) return ctx.reply(`❌ *Min WD:* Rp${PENGATURAN.MIN_WD.toLocaleString('id-ID')}`); ctx.reply(`💳 *Format:* /wd dana 25000`); });
bot.callbackQuery('atur_wd', ctx => { ctx.answerCallbackQuery(); ctx.reply(`✏️ Set payment method in code.`); });
bot.callbackQuery('riwayat', ctx => { ctx.answerCallbackQuery(); const log = data.transaksi.slice(-15).join('\n')||'Empty'; ctx.reply(`📜 *History:*\n${log}`, { parse_mode: 'Markdown' }); });

bot.command('wd', async ctx => {
  const uid = ctx.from.id;
  const args = ctx.message.text.trim().split(' ');
  const metode = args[1]?.toLowerCase();
  const jumlah = parseInt(args[2]);
  if (!metode || !jumlah || jumlah < PENGATURAN.MIN_WD || (data.saldo[uid]||0) < jumlah)
    return ctx.reply(`❌ *Invalid / Insufficient*`);
  data.saldo[uid] -= jumlah; simpanData();
  ctx.reply(`✅ *Withdrawal Sent!* ✅\nAmount: Rp${jumlah.toLocaleString('id-ID')}\nTo: ${metode.toUpperCase()}`);
  bot.api.sendMessage(ADMIN_ID, `📤 *WD REQUEST* 📥\nUser: ${uid}\nAmount: Rp${jumlah.toLocaleString('id-ID')}\nMethod: ${metode.toUpperCase()}`);
});

bot.catch(err => console.error('❌ Bot Error:', err));
bot.start({ polling: true });
console.log('🤖 WS SELL XCRL • MADE IN WAGYU');
            
