const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
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

// --- نظام إدارة البيانات ---
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
    { id: 1, name: "🌟 عضو مميز", price: 10000, roleId: "ضع_هنا_ID_الرتبة" },
    { id: 2, name: "👑 ملك السيرفر", price: 100000, roleId: "ضع_هنا_ID_الرتبة" }
];

client.on('ready', () => {
    console.log(`✅ ${client.user.tag} متصل وجاهز للعمل بكافة الأوامر!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const userId = message.author.id;

    // --- 1. أمر المساعدة الشامل (Help) ---
    if (command === 'help' || command === 'اوامر' || command === 'مساعدة') {
        const helpEmbed = new EmbedBuilder()
            .setTitle('📖 قائمة أوامر البوت الشاملة')
            .setDescription(`أهلاً بك! البريفكس الحالي هو: \`${PREFIX}\``)
            .setColor('#2ECC71')
            .addFields(
                { name: '💰 المالية', value: `\`balance\`, \`dep\`, \`with\`, \`pay\``, inline: true },
                { name: '⚒️ الكسب', value: `\`work\`, \`daily\`, \`rob\``, inline: true },
                { name: '🎮 الألعاب', value: `\`rps\`, \`slots\``, inline: true },
                { name: '🛒 المتجر', value: `\`shop\`, \`buy\`, \`top\``, inline: true }
            )
            .setFooter({ text: 'اكتب الأمر مسبوقاً بـ !' });
        return message.reply({ embeds: [helpEmbed] });
    }

    // --- 2. نظام الرصيد والتحويل والبنك ---
    if (command === 'balance' || command === 'فلوس') {
        const user = await updateData(userId, () => {});
        const embed = new EmbedBuilder()
            .setAuthor({ name: `رصيد ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
            .addFields(
                { name: '💰 كاش', value: `\`${user.wallet}\` 🪙`, inline: true },
                { name: '🏦 البنك', value: `\`${user.bank}\` 🪙`, inline: true }
            )
            .setColor('#F1C40F');
        return message.reply({ embeds: [embed] });
    }

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

    if (command === 'dep' || command === 'ايداع') {
        let amt = args[0] === 'all' ? 'all' : parseInt(args[0]);
        const r = await updateData(userId, (u) => {
            if (amt === 'all') amt = u.wallet;
            if (!amt || amt <= 0 || amt > u.wallet) return "مبلغ غير متاح!";
            u.wallet -= amt; u.bank += amt; return `🏦 تم إيداع **${amt}** بنجاح.`;
        });
        return message.reply(r);
    }

    if (command === 'with' || command === 'سحب') {
        let amt = args[0] === 'all' ? 'all' : parseInt(args[0]);
        const r = await updateData(userId, (u) => {
            if (amt === 'all') amt = u.bank;
            if (!amt || amt <= 0 || amt > u.bank) return "رصيدك في البنك لا يكفي!";
            u.bank -= amt; u.wallet += amt; return `💸 سحبت **${amt}** من البنك.`;
        });
        return message.reply(r);
    }

    // --- 3. الكسب (عمل، يومية، سرقة) ---
    if (command === 'work' || command === 'عمل') {
        const res = await updateData(userId, (u) => {
            if (Date.now() - u.lastWork < 300000) return "ارتاح 5 دقائق! ⏳";
            const p = Math.floor(Math.random() * 400) + 100;
            u.wallet += p; u.lastWork = Date.now();
            return `👷 اشتغلت وكسبت **${p}** 🪙`;
        });
        return message.reply(res);
    }

    if (command === 'daily' || command === 'يومية') {
        const res = await updateData(userId, (u) => {
            const today = new Date().toDateString();
            if (u.lastDaily === today) return "أخذت جائزتك اليوم! 🎁";
            u.wallet += 1000; u.lastDaily = today;
            return "🎁 استلمت **1000** 🪙 جائزة اليوم.";
        });
        return message.reply(res);
    }

    if (command === 'rob' || command === 'سرقة') {
        const target = message.mentions.users.first();
        if (!target || target.id === userId) return message.reply("منشن ضحية! 🥷");
        const res = await updateData(userId, async (u) => {
            if (Date.now() - u.lastRob < 600000) return "الشرطة تراقبك! 🚓";
            u.lastRob = Date.now();
            return updateData(target.id, (t) => {
                if (t.wallet < 200) return "الضحية مفلسة! 😂";
                if (Math.random() > 0.5) {
                    const s = Math.floor(t.wallet * 0.3);
                    t.wallet -= s; u.wallet += s; return `🥷 سرقت **${s}** من <@${target.id}>!`;
                } else {
                    u.wallet -= 200; return "🚓 اتمسكت ودفعوك 200 غرامة!";
                }
            });
        });
        return message.reply(await res);
    }

    // --- 4. الألعاب (RPS & Slots) ---
    if (command === 'rps' || command === 'لعب') {
        const choice = args[0];
        const amount = parseInt(args[1]);
        const choices = ['حجرة', 'ورقة', 'مقص'];
        if (!choices.includes(choice) || isNaN(amount)) return message.reply("مثال: `!rps حجرة 100` 🎮");
        const res = await updateData(userId, (u) => {
            if (amount > u.wallet) return "كاشك لا يكفي! ❌";
            const bot = choices[Math.floor(Math.random() * 3)];
            if (choice === bot) return `🤝 تعادل! البوت اختار ${bot}`;
            if ((choice === 'حجرة' && bot === 'مقص') || (choice === 'ورقة' && bot === 'حجرة') || (choice === 'مقص' && bot === 'ورقة')) {
                u.wallet += amount; return `🎉 فوز! البوت اختار ${bot}. كسبت ${amount} 🪙`;
            } else {
                u.wallet -= amount; return `💀 خسارة! البوت اختار ${bot}. خسرت ${amount} 🪙`;
            }
        });
        return message.reply(res);
    }

    if (command === 'slots' || command === 'مقلا') {
        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount <= 0) return message.reply("مثال: `!slots 100` 🎰");
        const res = await updateData(userId, (u) => {
            if (amount > u.wallet) return "كاشك لا يكفي! ❌";
            const items = ['🍎', '💎', '🔔', '7️⃣'];
            const r1 = items[Math.floor(Math.random() * items.length)], r2 = items[Math.floor(Math.random() * items.length)], r3 = items[Math.floor(Math.random() * items.length)];
            if (r1 === r2 && r2 === r3) { u.wallet += amount * 5; return `🎰 | ${r1} | ${r2} | ${r3} |\n**فوز! كسبت ${amount * 5} 🪙**`; }
            else { u.wallet -= amount; return `🎰 | ${r1} | ${r2} | ${r3} |\n**خسرت! 💀**`; }
        });
        return message.reply(res);
    }

    // --- 5. المتجر ولوحة الصدارة ---
    if (command === 'top' || command === 'اغنى') {
        const data = fs.readJsonSync(DB_PATH);
        const sorted = Object.entries(data).map(([id, val]) => ({ id, total: val.wallet + val.bank })).sort((a, b) => b.total - a.total).slice(0, 10);
        let desc = "";
        for (let i = 0; i < sorted.length; i++) {
            const u = await client.users.fetch(sorted[i].id).catch(() => ({ username: "Unknown" }));
            desc += `**#${i+1}** ${u.username}: \`${sorted[i].total}\` 🪙\n`;
        }
        return message.reply({ embeds: [new EmbedBuilder().setTitle('🏆 أغنى 10 أعضاء').setDescription(desc).setColor('#E74C3C')] });
    }

    if (command === 'shop' || command === 'متجر') {
        const embed = new EmbedBuilder().setTitle('🛒 المتجر').setColor('#3498DB');
        shopItems.forEach(i => embed.addFields({ name: i.name, value: `السعر: ${i.price} | الشراء: \`!buy ${i.id}\`` }));
        return message.reply({ embeds: [embed] });
    }

    if (command === 'buy' || command === 'شراء') {
        const id = parseInt(args[0]);
        const item = shopItems.find(i => i.id === id);
        if (!item) return message.reply("رقم المنتج خطأ! ❌");
        const res = await updateData(userId, (u) => {
            if (u.wallet < item.price) return "كاشك لا يكفي! ❌";
            u.wallet -= item.price; return `🎉 مبروك شراء **${item.name}**!`;
        });
        return message.reply(res);
    }
});

client.login('TOKEN_HERE');
