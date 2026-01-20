const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fs = require('fs-extra');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const DB_PATH = path.join(__dirname, 'data', 'users.json');

// دالة للتأكد من وجود ملف البيانات وقراءته
async function getUserData(userId) {
    await fs.ensureFile(DB_PATH);
    let data = {};
    try {
        data = await fs.readJson(DB_PATH);
    } catch (e) { data = {}; }

    if (!data[userId]) {
        data[userId] = { wallet: 0, bank: 0, lastDaily: null };
        await fs.writeJson(DB_PATH, data);
    }
    return data;
}

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('!')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const userId = message.author.id;

    // --- أمر الرصيد ---
    if (command === 'balance' || command === 'فلوس') {
        const data = await getUserData(userId);
        const user = data[userId];
        const embed = new EmbedBuilder()
            .setTitle(`حساب ${message.author.username}`)
            .addFields(
                { name: '💰 المحفظة', value: `${user.wallet}`, inline: true },
                { name: '🏦 البنك', value: `${user.bank}`, inline: true }
            )
            .setColor('#FFD700');
        message.reply({ embeds: [embed] });
    }

    // --- أمر الإيداع ---
    if (command === 'dep') {
        const amount = parseInt(args[0]);
        let data = await getUserData(userId);
        if (!amount || amount <= 0) return message.reply('اكتب مبلغ صحيح للإيداع!');
        if (data[userId].wallet < amount) return message.reply('محفظتك فاضية يا برنس!');

        data[userId].wallet -= amount;
        data[userId].bank += amount;
        await fs.writeJson(DB_PATH, data);
        message.reply(`تم إيداع ${amount} في البنك بنجاح! 🏦`);
    }

    // --- أمر السحب ---
    if (command === 'with') {
        const amount = parseInt(args[0]);
        let data = await getUserData(userId);
        if (!amount || amount <= 0) return message.reply('اكتب مبلغ صحيح للسحب!');
        if (data[userId].bank < amount) return message.reply('رصيدك في البنك مايسمحش!');

        data[userId].bank -= amount;
        data[userId].wallet += amount;
        await fs.writeJson(DB_PATH, data);
        message.reply(`تم سحب ${amount} من البنك! 💸`);
    }

    // --- الجائزة اليومية ---
    if (command === 'daily') {
        let data = await getUserData(userId);
        const now = new Date().toDateString();

        if (data[userId].lastDaily === now) {
            return message.reply('إنت خدت جائزتك النهاردة، استنى لبكرة! ⏳');
        }

        const prize = Math.floor(Math.random() * 500) + 100;
        data[userId].wallet += prize;
        data[userId].lastDaily = now;
        await fs.writeJson(DB_PATH, data);
        message.reply(`مبروك! كسبت ${prize} كاش! 🎁`);
    }
});
