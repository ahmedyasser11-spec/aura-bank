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

const DB_PATH = './users.json';

// دالة التعامل مع البيانات
async function updateData(userId, callback) {
    if (!fs.existsSync(DB_PATH)) fs.writeJsonSync(DB_PATH, {});
    let data = fs.readJsonSync(DB_PATH);
    if (!data[userId]) data[userId] = { wallet: 0, bank: 0, lastDaily: null, lastWork: 0 };
    callback(data[userId]);
    fs.writeJsonSync(DB_PATH, data);
    return data[userId];
}

client.on('ready', () => console.log(`${client.user.tag} جاهز للعمل أونلاين!`));

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('!')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const userId = message.author.id;

    // --- نظام الرصيد ---
    if (command === 'balance') {
        const user = await updateData(userId, () => {});
        const embed = new EmbedBuilder()
            .setTitle(`محفظة ${message.author.username}`)
            .addFields(
                { name: '💰 كاش', value: `${user.wallet}`, inline: true },
                { name: '🏦 البنك', value: `${user.bank}`, inline: true }
            )
            .setColor('#00ff00');
        message.reply({ embeds: [embed] });
    }

    // --- نظام المهام (Work) ---
    if (command === 'work') {
        const now = Date.now();
        const cooldown = 600000; // 10 دقائق بين كل مهمة
        
        await updateData(userId, (user) => {
            if (now - user.lastWork < cooldown) {
                const remaining = Math.ceil((cooldown - (now - user.lastWork)) / 60000);
                return message.reply(`أنت متعب حالياً! ارجع بعد ${remaining} دقائق.`);
            }
            
            const jobs = ["طبيب", "مبرمج", "عامل دليفري", "مهندس"];
            const job = jobs[Math.floor(Math.random() * jobs.length)];
            const salary = Math.floor(Math.random() * 200) + 50;
            
            user.wallet += salary;
            user.lastWork = now;
            message.reply(`اشتغلت **${job}** وأخدت راتب **${salary}** 🪙`);
        });
    }

    // --- الإيداع والسحب ---
    if (command === 'dep') {
        const amount = parseInt(args[0]);
        await updateData(userId, (user) => {
            if (!amount || amount > user.wallet) return message.reply("المبلغ غير صحيح!");
            user.wallet -= amount;
            user.bank += amount;
            message.reply(`تم إيداع ${amount} في البنك!`);
        });
    }

    if (command === 'with') {
        const amount = parseInt(args[0]);
        await updateData(userId, (user) => {
            if (!amount || amount > user.bank) return message.reply("رصيدك في البنك لا يكفي!");
            user.bank -= amount;
            user.wallet += amount;
            message.reply(`تم سحب ${amount} من البنك!`);
        });
    }

    // --- الجائزة اليومية ---
    if (command === 'daily') {
        const today = new Date().toDateString();
        await updateData(userId, (user) => {
            if (user.lastDaily === today) return message.reply("أخذت جائزتك اليومية بالفعل!");
            const prize = 500;
            user.wallet += prize;
            user.lastDaily = today;
            message.reply(`مبروك! استلمت ${prize} 🪙 جائزة اليوم.`);
        });
    }
    
});

// استبدل بـ Token البوت الخاص بك
client.login('MTQ2MzI1MTgxMTYwNjU5MzU3Ng.GfgeSw.kzWvGl9PrhGPrnzvMJK95g8r_lVKxq8ErdS3wk');
