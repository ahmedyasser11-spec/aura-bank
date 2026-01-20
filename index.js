const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fs = require('fs-extra');
const http = require('http');

// سيرفر صغير عشان البوت ما ينامش (Keep Alive)
http.createServer((req, res) => {
  res.write("البوت شغال أونلاين!");
  res.end();
}).listen(8080);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const DB_PATH = './users.json';
const PREFIX = '!';

// إدارة البيانات بملف JSON (سهلة للأونلاين)
async function updateData(userId, callback) {
    if (!fs.existsSync(DB_PATH)) fs.writeJsonSync(DB_PATH, {});
    let data = fs.readJsonSync(DB_PATH);
    if (!data[userId]) data[userId] = { wallet: 0, bank: 0, lastDaily: null, lastWork: 0, lastRob: 0 };
    const result = await callback(data[userId]);
    fs.writeJsonSync(DB_PATH, data);
    return result;
}

client.on('ready', () => console.log(`✅ ${client.user.tag} جاهز!`));

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const userId = message.author.id;

    // --- أمر المساعدة ---
    if (command === 'help' || command === 'اوامر') {
        const embed = new EmbedBuilder()
            .setTitle('📖 قائمة الأوامر')
            .addFields(
                { name: '💰 اقتصاد', value: '`balance`, `dep`, `with`, `pay`, `top`' },
                { name: '⚒️ كسب', value: '`work`, `daily`, `rob`' },
                { name: '🎮 ألعاب', value: '`rps`, `slots`' }
            )
            .setColor('#00ff00');
        return message.reply({ embeds: [embed] });
    }

    // --- الرصيد ---
    if (command === 'balance' || command === 'فلوس') {
        const user = await updateData(userId, () => {});
        return message.reply(`💰 كاش: **${user.wallet}** | 🏦 بنك: **${user.bank}**`);
    }

    // --- العمل ---
    if (command === 'work' || command === 'عمل') {
        const res = await updateData(userId, (u) => {
            if (Date.now() - u.lastWork < 300000) return "ارتاح 5 دقائق! ⏳";
            const p = Math.floor(Math.random() * 300) + 100;
            u.wallet += p; u.lastWork = Date.now();
            return `👷 اشتغلت وكسبت **${p}** 🪙`;
        });
        return message.reply(res);
    }

    // --- اليومية ---
    if (command === 'daily' || command === 'يومية') {
        const res = await updateData(userId, (u) => {
            const today = new Date().toDateString();
            if (u.lastDaily === today) return "أخذتها خلاص! 🎁";
            u.wallet += 1000; u.lastDaily = today;
            return "🎁 استلمت **1000** 🪙";
        });
        return message.reply(res);
    }

    // --- الإيداع والسحب ---
    if (command === 'dep' || command === 'ايداع') {
        let amt = args[0] === 'all' ? 'all' : parseInt(args[0]);
        const r = await updateData(userId, (u) => {
            if (amt === 'all') amt = u.wallet;
            if (!amt || amt <= 0 || amt > u.wallet) return "مبلغ خطأ!";
            u.wallet -= amt; u.bank += amt; return `🏦 أودعت ${amt} في البنك.`;
        });
        return message.reply(r);
    }

    if (command === 'with' || command === 'سحب') {
        let amt = args[0] === 'all' ? 'all' : parseInt(args[0]);
        const r = await updateData(userId, (u) => {
            if (amt === 'all') amt = u.bank;
            if (!amt || amt <= 0 || amt > u.bank) return "رصيدك لا يكفي!";
            u.bank -= amt; u.wallet += amt; return `💸 سحبت ${amt} من البنك.`;
        });
        return message.reply(r);
    }

    // --- التحويل ---
    if (command === 'pay' || command === 'تحويل') {
        const target = message.mentions.users.first();
        const amount = parseInt(args[1]);
        if (!target || isNaN(amount) || amount <= 0) return message.reply("مثال: `!pay @user 100` 💸");
        const res = await updateData(userId, async (u) => {
            if (u.wallet < amount) return "كاشك لا يكفي! ❌";
            u.wallet -= amount;
            await updateData(target.id, (t) => { t.wallet += amount; });
            return `✅ تم تحويل **${amount}** 🪙 إلى <@${target.id}>.`;
        });
        return message.reply(res);
    }
});

client.login(process.env.TOKEN);
