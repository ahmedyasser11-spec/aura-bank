cconst { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fs = require('fs-extra');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const DB_PATH = './users.json';
const PREFIX = '!';

// --- إدارة البيانات ---
async function updateData(userId, callback) {
    if (!fs.existsSync(DB_PATH)) fs.writeJsonSync(DB_PATH, {});
    let data = fs.readJsonSync(DB_PATH);
    if (!data[userId]) data[userId] = { wallet: 0, bank: 0, lastDaily: null, lastWork: 0, lastRob: 0 };
    const result = await callback(data[userId]);
    fs.writeJsonSync(DB_PATH, data);
    return result;
}

// --- إعدادات المتجر ---
const shopItems = [
    { id: 1, name: "عضو مميز", price: 5000, roleId: "ضع_هنا_ID_الرتبة" },
    { id: 2, name: "الملياردير", price: 50000, roleId: "ضع_هنا_ID_الرتبة" }
];

client.on('ready', () => {
    console.log(`✅ البنك المركزي جاهز! سجل دخول بـ ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const userId = message.author.id;

    // --- 1. نظام التحويل (Transfer) ---
    if (command === 'pay' || command === 'تحويل') {
        const target = message.mentions.users.first();
        const amount = parseInt(args[1]);

        if (!target) return message.reply("لازم تمنشن الشخص اللي عايز تحوله فلوس! مثال: `!pay @user 100` 💸");
        if (target.id === userId) return message.reply("ماينفعش تحول فلوس لنفسك! 😂");
        if (!amount || amount <= 0) return message.reply("اكتب مبلغ صحيح للتحويل!");

        const response = await updateData(userId, async (user) => {
            if (user.wallet < amount) return `محفظتك مافيهاش المبلغ ده! محتاج **${amount}** 🪙 كاش.`;

            // خصم من الراسل
            user.wallet -= amount;

            // إضافة للمستلم
            await updateData(target.id, (tData) => {
                tData.wallet += amount;
            });

            return `✅ تم تحويل **${amount}** 🪙 بنجاح إلى <@${target.id}>.`;
        });
        return message.reply(response);
    }

    // --- 2. نظام الرصيد والبنوك ---
    if (command === 'balance' || command === 'فلوس') {
        const user = await updateData(userId, () => {});
        const embed = new EmbedBuilder()
            .setAuthor({ name: `رصيد: ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
            .addFields(
                { name: '💰 كاش', value: `\`${user.wallet}\` 🪙`, inline: true },
                { name: '🏦 بنك', value: `\`${user.bank}\` 🪙`, inline: true }
            )
            .setColor('#f1c40f');
        return message.reply({ embeds: [embed] });
    }

    if (command === 'dep' || command === 'ايداع') {
        let amt = args[0] === 'all' ? 'all' : parseInt(args[0]);
        const r = await updateData(userId, (u) => {
            if (amt === 'all') amt = u.wallet;
            if (!amt || amt <= 0 || amt > u.wallet) return "مبلغ غير صحيح!";
            u.wallet -= amt; u.bank += amt; return `🏦 أودعت **${amt}** في البنك.`;
        });
        return message.reply(r);
    }

    if (command === 'with' || command === 'سحب') {
        let amt = args[0] === 'all' ? 'all' : parseInt(args[0]);
        const r = await updateData(userId, (u) => {
            if (amt === 'all') amt = u.bank;
            if (!amt || amt <= 0 || amt > u.bank) return "رصيدك لا يكفي!";
            u.bank -= amt; u.wallet += amt; return `💸 سحبت **${amt}** من البنك.`;
        });
        return message.reply(r);
    }

    // --- 3. الألعاب والمهام ---
    if (command === 'work' || command === 'عمل') {
        const res = await updateData(userId, (u) => {
            if (Date.now() - u.lastWork < 300000) return "انتظر 5 دقائق بين كل عمل! ⏳";
            const p = Math.floor(Math.random() * 400) + 100;
            u.wallet += p; u.lastWork = Date.now();
            return `👷 اشتغلت وكسبت **${p}** 🪙`;
        });
        return message.reply(res);
    }

    if (command === 'daily' || command === 'يومية') {
        const res = await updateData(userId, (u) => {
            const today = new Date().toDateString();
            if (u.lastDaily === today) return "أخذت مكافأتك اليوم! 🎁";
            u.wallet += 1000; u.lastDaily = today;
            return "🎁 مبروك! استلمت **1000** 🪙";
        });
        return message.reply(res);
    }

    if (command === 'rps' || command === 'لعب') {
        const choice = args[0];
        const amount = parseInt(args[1]);
        const choices = ['حجرة', 'ورقة', 'مقص'];
        if (!choice || !choices.includes(choice) || isNaN(amount)) return message.reply("مثال: `!rps حجرة 100` 🎮");

        const res = await updateData(userId, (u) => {
            if (amount > u.wallet) return "فلوسك ما تكفيش!";
            const b = choices[Math.floor(Math.random() * 3)];
            if (choice === b) return `تعادل! البوت اختار ${b}`;
            if ((choice === 'حجرة' && b === 'مقص') || (choice === 'ورقة' && b === 'حجرة') || (choice === 'مقص' && b === 'ورقة')) {
                u.wallet += amount; return `فوز! 🎉 البوت اختار ${b}. كسبت ${amount}.`;
            } else {
                u.wallet -= amount; return `خسارة! 💀 البوت اختار ${b}. خسرت ${amount}.`;
            }
        });
        return message.reply(res);
    }

    // --- 4. المتجر ---
    if (command === 'shop' || command === 'متجر') {
        const embed = new EmbedBuilder().setTitle('🛒 المتجر').setColor('#3498db');
        shopItems.forEach(i => embed.addFields({ name: `${i.id}. ${i.name}`, value: `السعر: ${i.price}` }));
        return message.reply({ embeds: [embed] });
    }

    if (command === 'buy' || command === 'شراء') {
        const id = parseInt(args[0]);
        const item = shopItems.find(i => i.id === id);
        if (!item) return message.reply("رقم الصنف خطأ!");
        const res = await updateData(userId, (u) => {
            if (u.wallet < item.price) return "كاشك مش كفاية!";
            u.wallet -= item.price;
            return `🎉 اشتريت **${item.name}**! (تأكد من إعداد رتبة البوت)`;
        });
        return message.reply(res);
    }
});


