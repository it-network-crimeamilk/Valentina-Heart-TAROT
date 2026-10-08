const CONTACT_BLOCK = `❤️ ПОБЛАГОДАРИТЬ
💳 Карта Т-Банк: 
2200 3961 1672 3228

💸 ВТБ через СБП:
+7 978 455 06 16

🎁 DonationAlerts:
https://www.donationalerts.com/r/valentina_heart

Связь со мной:
🌏 Сайт Valentina Heart TAROT:
https://valentina-tarot.ru

✈️ Telegram:
https://t.me/Valintina_moon_89

📺 YouTube:
https://www.youtube.com/@ВалентинаСердцеТАРО

📣 Telegram-канал:
https://t.me/ValentinaSerdceTarot

📱 Mobile/Max:
+7 978 455 06 16

🟦 ВКонтакте:
https://vk.ru/id851128139

🎬 VK Video:
https://vkvideo.ru/@club240360498`;

function generatePosts() {
    const title = document.getElementById('postTitle').value.trim() || 'Новое видео';
    const yt = document.getElementById('ytUrl').value.trim() || 'Ссылка на YouTube';
    const vk = document.getElementById('vkUrl').value.trim() || 'Ссылка на VkVideo';

    const tgText = `🔮 На канале новое видео!\n\nТема: "${title} 🌹"\n\n📺 YouTube:\n${yt}\n\n🎬 VkVideo:\n${vk}\n\n🌏 Сайт Valentina Heart TAROT:\nhttps://valentina-tarot.ru`;
    const vkText = `Тема ролика: ${title} 🌹\n\n${CONTACT_BLOCK}`;

    document.getElementById('tgPost').textContent = tgText;
    document.getElementById('vkPost').textContent = vkText;
    document.getElementById('resultsArea').style.display = 'block';
}

function copyToClipboard(id) {
    const el = document.getElementById(id);
    if (!el) return;

    const text = el.textContent;
    const done = () => alert('✅ Текст скопирован!');
    const fail = err => { console.error(err); alert('❌ Не удалось скопировать'); };

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(fail);
    } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); done(); }
        catch (e) { fail(e); }
        document.body.removeChild(ta);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const genBtn = document.getElementById('generatePostsBtn');
    if (genBtn) genBtn.addEventListener('click', generatePosts);

    document.querySelectorAll('[data-copy-target]').forEach(btn => {
        btn.addEventListener('click', () => copyToClipboard(btn.dataset.copyTarget));
    });
});
