const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const mongoose = require('mongoose');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const PREFIX = '!';

// --- ربط قاعدة البيانات (MongoDB) ---
// هجيبلك الرابط ده في الخطوة الجاية
const MONGO_URI = 'رابط_مونجو_دي_بي_هنا'; 

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ متصل بخزنة البيانات السحابية (MongoDB)'))
    .catch(err => console.error('❌ فشل الاتصال بمونجو:', err));

// --- تصميم شكل البيانات (User Schema) ---
const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    wallet: { type: Number, default: 0 },
    bank: { type: Number, default: 0 },
    lastDaily: { type: String, default: null },
    lastWork: { type: Number, default: 0 },
    lastRob: { type: Number, default: 0 }
});

const User = mongoose.model('User', userSchema);

// --- وظيفة إدارة البيانات الجديدة ---
async function getUser(id) {
    let user = await User.findOne({ userId: id });
    if (!user) {
        user = await User.create({ userId: id });
    }
    return user;
}

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const userId = message.author.id;

    // مثال لأمر الرصيد باستخدام MongoDB
    if (command === 'balance' || command === 'فلوس') {
        const user = await getUser(userId);
        const embed = new EmbedBuilder()
            .setTitle(`حساب ${message.author.username}`)
            .addFields(
                { name: '💰 كاش', value: `${user.wallet} 🪙`, inline: true },
                { name: '🏦 بنك', value: `${user.bank} 🪙`, inline: true }
            )
            .setColor('#F1C40F');
        return message.reply({ embeds: [embed] });
    }

    // أمر العمل (Work) بتحديث MongoDB
    if (command === 'work' || command === 'عمل') {
        const user = await getUser(userId);
        const cooldown = 300000;
        if (Date.now() - user.lastWork < cooldown) return message.reply("ارتاح شوية! ⏳");

        const p = Math.floor(Math.random() * 500) + 100;
        user.wallet += p;
        user.lastWork = Date.now();
        await user.save(); // حفظ في الخزنة
        return message.reply(`👷 اشتغلت وكسبت **${p}** 🪙`);
    }

    // (باقي الأوامر زي السحب والإيداع هتستخدم نفس الطريقة: await user.save())
});

client.login('TOKEN_HERE');
