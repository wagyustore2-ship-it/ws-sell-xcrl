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
  BONUS_DAFTAR: 100,       // Bonus saat teman daftar
  BONUS_JUAL: 200,         // Bonus saat teman jual nomor
  MIN_WD: 15000,           // Minimal penarikan
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
  referal: {},              // { id_pengundang: [id_teman] }
  sudah_dapat_bonus: {}    // Cegah bonus ganda
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
🎁 Bonus: Daftar Rp${PENGATURAN.BONUS_DAFTAR} | Jual Rp${PENGATURAN.BONUS_JUAL}
💳 Min WD: Rp${PENGATURAN.MIN_WD.toLocaleString('id-ID')}
  `;
  const kb = new InlineKeyboard()
    .text('📋 LIHAT SEMUA AKUN', 'lihat_semua_akun').row()
    .text('💰 UBAH HARGA & BONUS', 'ubah_pengaturan').row()
    .text('💳 ATUR PENARIKAN', 'atur_wd').row()
    .text('📜 RIWAYAT MASUK', 'riwayat');
  await ctx.reply(teks, { reply_markup: kb, parse_mode: 'Markdown' });
}

// ==================== FITUR REFERAL ====================
bot.command('start', async ctx => {
  const uid = ctx.from.id;
  const teks = ctx.message.text;

  // Cek apakah dibawa kode referal
  if (teks.includes('start ') && !data.saldo[uid]) {
    const pengundang = teks.split(' ')[1];
    if (pengundang && pengundang !== uid.toString() && data.saldo[pengundang] !== undefined) {
      if (!data.referal[pengundang]) data.referal[pengundang] = [];
      if (!data.referal[pengundang].includes(uid)) {
        data.referal[pengundang].push(uid);
        data.saldo[pengundang] = (data.saldo[pengundang] || 0) + PENGATURAN.BONUS_DAFTAR;
        data.transaksi.push(`[${new Date().toLocaleString('id-ID')}] Referal: +Rp${PENGATURAN.BONUS_DAFTAR} dari daftar`);
        data.sudah_dapat_bonus[`${pengundang}_${uid}`] = 'daftar';
        simpanData();
        bot.api.sendMessage(pengundang, `🎁 *BONUS MASUK!*\nTeman mendaftar lewat link kamu: +Rp${PENGATURAN.BONUS_DAFTAR}`);
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

  ctx.reply(`🤝 *REFERAL* 🎁

👥 Teman Diundang: *${jumlahUndang} orang*
💰 Bonus:
• Daftar: +Rp${PENGATURAN.BONUS_DAFTAR}
• Jual Nomor: +Rp${PENGATURAN.BONUS_JUAL}

🔗 *Link Undangan:*
\`${linkUndang}\`

👉 Salin & bagikan ke teman kamu!`, { parse_mode: 'Markdown' });
});

// ==================== PROSES UTAMA ====================
bot.callbackQuery('jual_akun', ctx => {
  ctx.answerCallbackQuery();
  ctx.reply('📤 *Kirim nomor lengkap dengan kode negara:*\nContoh: `+628123456789` / `+1234567890`', { parse_mode: 'Markdown' });
});

bot.callbackQuery('cara_kerja', ctx => {
  ctx.answerCallbackQuery();
  ctx.reply(`📖 *ALUR KERJA*

1️⃣ Kirim nomor WA kamu
2️⃣ Bot kirim *Kode Verifikasi WS*
3️⃣ Buka WA → Masukkan nomor → Pilih *Verifikasi lewat kode*
4️⃣ Masukkan kode, lalu **kirim kode itu kembali ke bot**
5️⃣ ✅ Selesai, saldo masuk`, { parse_mode: 'Markdown' });
});

// Terima nomor penjual
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

    await ctx.reply('⏳ Memproses, mohon tunggu...');

    try {
      const { version } = await fetchLatestBaileysVersion();
      const folderSesi = `./sesi_akun/${nomorBersih}`;
      const { state, saveCreds } = await useMultiFileAuthState(folderSesi);

      const sock = makeWASocket({
        auth: state,
        version: version,
        printQRInTerminal: false,
        browser: ['WhatsApp', 'Android', '2.25.4.10'],
        connectTimeoutMs: 60000
      });

      sock.ev.on('creds.update', saveCreds);
      sock.ev.on('connection.update', async ({ connection }) => {
        if (connection === 'open') {
          try {
            const kodeWS = await sock.requestPairingCode(nomorBersih);
            prosesVerifikasi.set(uid, { sock, nomor: nomorBersih });

            await ctx.reply(`✅ *NOMOR DITERIMA!* 📲

🔑 *KODE VERIFIKASI WS:*
\`${kodeWS}\`

📝 *Caranya:*
1. Buka WhatsApp
2. Masukkan nomor: *${nomorTampil}*
3. Pilih: *Verifikasi lewat nomor telepon*
4. Pilih: *Gunakan kode verifikasi*
5. Masukkan kode di atas
6. **Kirim kode ini kembali ke bot**
`, { parse_mode: 'Markdown' });

          } catch {
            await ctx.reply('❌ Gagal buat kode, coba kirim ulang.');
            sock.end();
          }
        }
      });

    } catch {
      return ctx.reply('❌ Nomor tidak valid.');
    }
    return;
  }

  // Verifikasi otomatis & berikan bonus jual ke pengundang
  if (prosesVerifikasi.has(uid)) {
    const { sock, nomor } = prosesVerifikasi.get(uid);
    const kodeDikirim = teks.replace(/[\s-]/g, '').toUpperCase();

    try {
      await sock.login(kodeDikirim);

      const sudahAda = data.daftar_akun_milik.find(a => a.nomor === nomor);
      if (!sudahAda) {
        data.daftar_akun_milik.push({
          nomor: nomor,
          nomor_tampil: `+${nomor}`,
          waktu_diterima: new Date().toLocaleString('id-ID')
        });
      }

      // Beri saldo ke penjual
      data.saldo[uid] = (data.saldo[uid] || 0) + PENGATURAN.REWARD;
      data.transaksi.push(`[${new Date().toLocaleString('id-ID')}] +${nomor} | Rp${PENGATURAN.REWARD}`);

      // 🎁 Beri bonus jual ke pengundang jika ada
      for (const [pengundang, daftarTeman] of Object.entries(data.referal)) {
        if (daftarTeman.includes(uid)) {
          const kunci = `${pengundang}_${uid}_jual`;
          if (!data.sudah_dapat_bonus[kunci]) {
            data.saldo[pengundang] = (data.saldo[pengundang] || 0) + PENGATURAN.BONUS_JUAL;
            data.transaksi.push(`[${new Date().toLocaleString('id-ID')}] Referal Jual: +Rp${PENGATURAN.BONUS_JUAL}`);
            data.sudah_dapat_bonus[kunci] = true;
            bot.api.sendMessage(pengundang, `🎁 *BONUS JUAL MASUK!*\nTeman berhasil jual nomor: +Rp${PENGATURAN.BONUS_JUAL}`);
          }
          break;
        }
      }

      simpanData();

      await ctx.reply(`🎉 *BERHASIL TERJUAL!* ✅

📞 Nomor: +${nomor}
💰 Pendapatan: *Rp${PENGATURAN.REWARD.toLocaleString('id-ID')}*
💵 Saldo Sekarang: *Rp${data.saldo[uid].toLocaleString('id-ID')}*`, { parse_mode: 'Markdown' });

      bot.api.sendMessage(ADMIN_ID, `📥 *AKUN BARU MASUK!* ✅
📱 Nomor: *+${nomor}*
⏰ Waktu: ${new Date().toLocaleString('id-ID')}`, { parse_mode: 'Markdown' });

    } catch {
      await ctx.reply('❌ Kode salah/kadaluarsa, ulangi lagi.');
      sock.end();
    }
    prosesVerifikasi.delete(uid);
    return;
  }

  // Admin minta kode ulang
  if (uid === ADMIN_ID && /^\+?\d{9,15}$/.test(teks)) {
    const nomorBersih = teks.replace('+', '');
    const akunTersimpan = data.daftar_akun_milik.find(a => a.nomor === nomorBersih);

    if (!akunTersimpan) return ctx.reply('❌ Nomor tidak ada di daftar.');

    await ctx.reply('🔄 Membuat kode baru...');
    try {
      const { version } = await fetchLatestBaileysVersion();
      const { state } = await useMultiFileAuthState(`./sesi_akun/${nomorBersih}`);
      const sock = makeWASocket({ auth: state, version });

      sock.ev.on('connection.update', async ({ connection }) => {
        if (connection === 'open') {
          const kodeBaru = await sock.requestPairingCode(nomorBersih);
          await ctx.reply(`✅ *KODE WS BARU* 🔑

📞 Nomor: *+${nomorBersih}*
🔑 Kode: \`${kodeBaru}\``, { parse_mode: 'Markdown' });
        }
      });

    } catch {
      ctx.reply('❌ Gagal membuat kode.');
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
  ctx.reply(`📋 *DAFTAR AKUN* 📱\n\n${daftar}`, { parse_mode: 'Markdown' });
});

bot.callbackQuery('ubah_pengaturan', ctx => {
  if (ctx.from.id !== ADMIN_ID) return;
  ctx.answerCallbackQuery();
  ctx.reply(`⚙️ *UBAH PENGATURAN*\n\nContoh perintah:\n• \`harga 5000\`\n• \`bonusdaftar 100\`\n• \`bonusjual 200\`\n• \`minwd 15000\``, { parse_mode: 'Markdown' });
});

bot.callbackQuery('cek_saldo', ctx => { ctx.answerCallbackQuery(); const s = data.saldo[ctx.from.id]||0; ctx.reply(`💵 Saldo: Rp${s.toLocaleString('id-ID')}`); });
bot.callbackQuery('menu_wd', ctx => { ctx.answerCallbackQuery(); const s = data.saldo[ctx.from.id]||0; if (s < PENGATURAN.MIN_WD) return ctx.reply(`❌ Minimal WD: Rp${PENGATURAN.MIN_WD.toLocaleString('id-ID')}`); ctx.reply(`💳 Format: /wd dana 25000`); });
bot.callbackQuery('atur_wd', ctx => { ctx.answerCallbackQuery(); ctx.reply('✏️ Contoh: wd dana 08xxxx a.n Nama'); });
bot.callbackQuery('riwayat', ctx => { ctx.answerCallbackQuery(); const log = data.transaksi.slice(-15).join('\n')||'Kosong'; ctx.reply(`📜 Riwayat:\n${log}`); });

bot.command('wd', async ctx => {
  const uid = ctx.from.id;
  const args = ctx.message.text.trim().split(' ');
  const metode = args[1]?.toLowerCase();
  const jumlah = parseInt(args[2]);
  if (!metode || !jumlah || jumlah < PENGATURAN.MIN_WD || !WD_METHODS[metode] || (data.saldo[uid]||0) < jumlah)
    return ctx.reply('❌ Format salah / saldo kurang / metode tidak ada');
  data.saldo[uid] -= jumlah; simpanData();
  ctx.reply(`✅ WD diterima: Rp${jumlah.toLocaleString('id-ID')} ke ${metode.toUpperCase()}`);
  bot.api.sendMessage(ADMIN_ID, `📤 WD: ${uid} | Rp${jumlah.toLocaleString('id-ID')}`);
});

bot.catch(err => console.error('❌ Error:', err));
bot.start({ polling: true });
console.log('🤖 WS SELL XCRL • MADE IN WAGYU');
                  
