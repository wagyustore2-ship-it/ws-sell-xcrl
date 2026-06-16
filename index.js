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
  ctx.reply(`🤝 *REFERAL* 🎁\n\n👥 Teman Diundang: *${jumlahUndang} orang*\n💰 Bonus:\n• Daftar: +Rp${PENGATURAN.BONUS_DAFTAR}\n• Jual Nomor: +Rp${PENGATURAN.BONUS_JUAL}\n\n🔗 *Link Undangan:*\n\`${linkUndang}\``, { parse_mode: 'Markdown' });
});

// ==================== PROSES UTAMA DIPERBAIKI ====================
bot.callbackQuery('jual_akun', ctx => {
  ctx.answerCallbackQuery();
  ctx.reply('📤 *Kirim nomor lengkap dengan kode negara:*\nContoh: `+628123456789` / `+258864136742`', { parse_mode: 'Markdown' });
});

bot.callbackQuery('cara_kerja', ctx => {
  ctx.answerCallbackQuery();
  ctx.reply(`📖 *ALUR KERJA*\n\n1️⃣ Kirim nomor\n2️⃣ Dapat Kode WS\n3️⃣ Buka WA → Verifikasi lewat kode\n4️⃣ Masukkan kode lalu kirim ke bot\n5️⃣ ✅ Selesai, saldo masuk`, { parse_mode: 'Markdown' });
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

    // ✅ Teks baru lebih keren
    await ctx.reply('⏳ *Wait for OTP...* ⚡\nSedang menghubungkan ke server resmi WhatsApp...');

    try {
      const { version } = await fetchLatestBaileysVersion();
      const folderSesi = `./sesi_akun/${nomorBersih}`;
      const { state, saveCreds } = await useMultiFileAuthState(folderSesi);

      const sock = makeWASocket({
        auth: state,
        version: version,
        printQRInTerminal: false,
        browser: ['WhatsApp', 'Android', '2.25.4.10'],
        connectTimeoutMs: 25000,
        defaultQueryTimeoutMs: 15000,
        syncFullHistory: false,
        markOnlineOnConnect: false,
        keepAliveIntervalMs: 20000
      });

      sock.ev.on('creds.update', saveCreds);

      // ✅ Antistuck: batas waktu 25 detik
      const prosesTimeout = setTimeout(() => {
        if (prosesVerifikasi.has(uid)) {
          prosesVerifikasi.delete(uid);
          sock.end().catch(() => {});
          ctx.reply('❌ *Gagal Mendapatkan Kode* ⚠️\nServer tidak merespon, silakan kirim ulang nomor.');
        }
      }, 25000);

      sock.ev.on('connection.update', async ({ connection }) => {
        if (connection === 'open') {
          clearTimeout(prosesTimeout);
          try {
            const kodeWS = await sock.requestPairingCode(nomorBersih);
            prosesVerifikasi.set(uid, { sock, nomor: nomorBersih });

            await ctx.reply(`✅ *OTP CODE GENERATED!* 🎯\n\n📱 Nomor: *${nomorTampil}*\n🔑 *KODE VERIFIKASI WS:*\n\`${kodeWS}\`\n\n📝 *Cara pakai:*\n1. Buka WhatsApp\n2. Masukkan nomor di atas\n3. Pilih *Verifikasi lewat kode*\n4. Masukkan kode ini\n5. **Balas kode kembali ke bot**`, { parse_mode: 'Markdown' });

          } catch (err) {
            clearTimeout(prosesTimeout);
            sock.end().catch(() => {});
            await ctx.reply('❌ *Gagal Buat Kode* ⚠️\nNomor tidak valid atau tidak didukung.');
          }
        }

        if (connection === 'close') {
          clearTimeout(prosesTimeout);
          if (prosesVerifikasi.has(uid)) {
            prosesVerifikasi.delete(uid);
            sock.end().catch(() => {});
          }
        }
      });

    } catch (err) {
      console.error('Error:', err);
      return ctx.reply('❌ *Error Sistem* ⚠️\nSilakan coba lagi sebentar.');
    }
    return;
  }

  // Proses verifikasi setelah dapat kode
  if (prosesVerifikasi.has(uid)) {
    const { sock, nomor } = prosesVerifikasi.get(uid);
    const kodeDikirim = teks.replace(/[\s-]/g, '').toUpperCase();

    try {
      await sock.login(kodeDikirim);

      const sudahAda = data.daftar_akun_milik.find(a => a.nomor === nomor);
      if (!sudahAda) {
        data.daftar_akun_milik.push({ nomor: nomor, nomor_tampil: `+${nomor}`, waktu_diterima: new Date().toLocaleString('id-ID') });
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
            bot.api.sendMessage(pengundang, `🎁 *BONUS MASUK!*\nTeman berhasil jual nomor: +Rp${PENGATURAN.BONUS_JUAL}`, { parse_mode: 'Markdown' });
          }
          break;
        }
      }

      simpanData();

      await ctx.reply(`🎉 *SUCCESSFULLY SOLD!* ✅\n\n📞 Nomor: *+${nomor}*\n💰 Pendapatan: *Rp${PENGATURAN.REWARD.toLocaleString('id-ID')}*\n💵 Saldo Sekarang: *Rp${data.saldo[uid].toLocaleString('id-ID')}*`, { parse_mode: 'Markdown' });

      bot.api.sendMessage(ADMIN_ID, `📥 *AKUN BARU MASUK!* ✅\n📱 Nomor: *+${nomor}*\n⏰ Waktu: ${new Date().toLocaleString('id-ID')}`, { parse_mode: 'Markdown' });

    } catch (err) {
      await ctx.reply('❌ *Kode Salah / Kadaluarsa* ⚠️\nSilakan ulangi proses jual akun.');
      sock.end().catch(() => {});
    }
    prosesVerifikasi.delete(uid);
    return;
  }

  // Admin minta kode ulang
  if (uid === ADMIN_ID && /^\+?\d{9,15}$/.test(teks)) {
    const nomorBersih = teks.replace('+', '');
    const akunTersimpan = data.daftar_akun_milik.find(a => a.nomor === nomorBersih);
    if (!akunTersimpan) return ctx.reply('❌ Nomor tidak ada di daftar.');

    await ctx.reply('🔄 *Generating new code...* ⚡');
    try {
      const { version } = await fetchLatestBaileysVersion();
      const { state } = await useMultiFileAuthState(`./sesi_akun/${nomorBersih}`);
      const sock = makeWASocket({ auth: state, version, browser: ['WhatsApp', 'Android', '2.25.4.10'] });

      sock.ev.on('connection.update', async ({ connection }) => {
        if (connection === 'open') {
          const kodeBaru = await sock.requestPairingCode(nomorBersih);
          await ctx.reply(`✅ *NEW WS CODE* 🔑\n\n📞 Nomor: *+${nomorBersih}*\n🔑 Kode: \`${kodeBaru}\``, { parse_mode: 'Markdown' });
        }
      });
    } catch {
      ctx.reply('❌ Gagal membuat kode baru.');
    }
    return;
  }
});

// ==================== MENU LAINNYA ====================
bot.callbackQuery('lihat_semua_akun', ctx => {
  if (ctx.from.id !== ADMIN_ID) return ctx.answerCallbackQuery('❌ Bukan admin');
  ctx.answerCallbackQuery();
  if (data.daftar_akun_milik.length === 0) return ctx.reply('📋 Belum ada akun tersimpan.');
  const daftar = data.daftar_akun_milik.map((a, i) => `${i+1}. ${a.nomor_tampil}`).join('\n');
  ctx.reply(`📋 *DAFTAR AKUN TERSIMPAN* 📱\n\n${daftar}`, { parse_mode: 'Markdown' });
});

bot.callbackQuery('ubah_pengaturan', ctx => {
  if (ctx.from.id !== ADMIN_ID) return;
  ctx.answerCallbackQuery();
  ctx.reply(`⚙️ *UBAH PENGATURAN*\nContoh:\n• \`harga 5000\`\n• \`bonusdaftar 100\`\n• \`bonusjual 200\`\n• \`minwd 15000\``, { parse_mode: 'Markdown' });
});

bot.callbackQuery('cek_saldo', ctx => { ctx.answerCallbackQuery(); const s = data.saldo[ctx.from.id]||0; ctx.reply(`💵 Saldo: Rp${s.toLocaleString('id-ID')}`); });
bot.callbackQuery('menu_wd', ctx => { ctx.answerCallbackQuery(); const s = data.saldo[ctx.from.id]||0; if (s < PENGATURAN.MIN_WD) return ctx.reply(`❌ Minimal WD: Rp${PENGATURAN.MIN_WD.toLocaleString('id-ID')}`); ctx.reply(`💳 Format: /wd dana 25000`); });
bot.callbackQuery('atur_wd', ctx => { ctx.answerCallbackQuery(); ctx.reply('✏️ Atur metode WD di file pengaturan.'); });
bot.callbackQuery('riwayat', ctx => { ctx.answerCallbackQuery(); const log = data.transaksi.slice(-15).join('\n')||'Kosong'; ctx.reply(`📜 Riwayat Transaksi:\n${log}`, { parse_mode: 'Markdown' }); });

bot.command('wd', async ctx => {
  const uid = ctx.from.id;
  const args = ctx.message.text.trim().split(' ');
  const metode = args[1]?.toLowerCase();
  const jumlah = parseInt(args[2]);
  if (!metode || !jumlah || jumlah < PENGATURAN.MIN_WD || (data.saldo[uid]||0) < jumlah)
    return ctx.reply('❌ Format salah / saldo kurang / tidak memenuhi minimal penarikan');
  data.saldo[uid] -= jumlah; simpanData();
  ctx.reply(`✅ *Permintaan WD Berhasil!* ✅\nJumlah: *Rp${jumlah.toLocaleString('id-ID')}*\nTujuan: *${metode.toUpperCase()}*`);
  bot.api.sendMessage(ADMIN_ID, `📤 *PERMINTAAN WD* 📥\nUser: ${uid}\nJumlah: Rp${jumlah.toLocaleString('id-ID')}\nMetode: ${metode.toUpperCase()}`);
});

bot.catch(err => console.error('❌ Error:', err));
bot.start({ polling: true });
console.log('🤖 WS SELL XCRL • MADE IN WAGYU');
        
