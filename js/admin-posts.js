/* Генератор постов для соцсетей */

const CONTACT_BLOCK = `❤️ ПОБЛАГОДАРИТЬ
💳 Карта Т-Банк: 
2200 3961 1672 3228

💸 ВТБ через СБП:
+7 978 455 06 16

🎁 DonationAlerts:
https://www.donationalerts.com/r/valentina_heart

Связь со мной:
🌏 Сайт Valentina Heart TAROT:
http://valentina-tarot.ru

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

    const tgText = `🔮 На канале новое видео!\n\nТема:\n"${title} 🌹"\n\n📺 YouTube:\n${yt}\n\n🎬 VkVideo:\n${vk}\n\n🌏 Сайт Valentina Heart TAROT:\nhttp://valentina-tarot.ru`;
    const vkText = `${title} 🌹\n\n${CONTACT_BLOCK}`;

    document.getElementById('tgPost').textContent = tgText;
    document.getElementById('vkPost').textContent = vkText;
    document.getElementById('resultsArea').style.display = 'block';
}

function copyToClipboard(id) {
    navigator.clipboard.writeText(document.getElementById(id).textContent)
        .then(() => alert('✅ Текст скопирован!'))
        .catch(err => { console.error(err); alert('❌ Не удалось скопировать'); });
}