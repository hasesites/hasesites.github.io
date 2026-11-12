# Демо-сайты для детейлинга (США)

Одна общая основа (`_engine/`), у каждого клиента свой файл с контентом (`clients/<slug>.json`).
Скрипт собирает из них отдельные страницы:

| Клиент | Ссылка |
|---|---|
| Шаблон (вымышленный бренд) | https://hasesites.github.io/us/demo/ |
| Lester Auto Detail, Tulsa OK | https://hasesites.github.io/us/lester-auto-detail/ |
| Iconic Detailing, Boise ID | https://hasesites.github.io/us/iconic-detailing/ |

## Как добавить нового клиента (≈10 минут)

1. **Проверь, что у компании нет нормального сайта.** Открой ссылку из Google/Yelp-карточки.
   Если сайта нет, он не открывается, домен продаётся или там пустая страница — подходит.
2. **Скопируй** `clients/lester-auto-detail.json` в `clients/<название-через-дефис>.json`.
   Это имя станет адресом: `hasesites.github.io/us/<название>/`.
3. **Заполни только то, что проверено:**
   - `name`, `short` (короткое имя для логотипа), `city`, `state`, `address`, `phone`, `hours`;
   - `theme.accent` — один акцентный цвет (точки, звёзды, номера шагов); `hero.image` и `hero.position` — главное фото и его кадрирование;
   - `hero.title` — две строки: первая обычным шрифтом, вторая курсивом;
   - `services`, если известны настоящие услуги клиента;
   - `reviews`, только с настоящими цитатами (пометь `"sample": false` и укажи источник в `note`).
     Без настоящих отзывов поле не трогай: останутся примеры с подписью «Sample».
   - Всё, чего нет в файле клиента, берётся из `_engine/defaults.json`.
4. **Собери:** `node us/_engine/build.mjs`. Команда запускается из папки `hase_github` и пересобирает всех клиентов.
5. **Опубликуй** через «Опубликовать сайты.command». Через ~10 минут ссылка заработает.

## Что где лежит

- `_engine/app.js` — анимации: GSAP + ScrollTrigger, плавный скролл Lenis, карусель работ, формы.
- `_engine/app.css` — дизайн. `_engine/img/` — фото с Unsplash в двух размерах (`-900` и `-1800`).
- Названия фото для `img`: studio-sedan, studio-bmw, showroom, g-wagon, hand-wash, mitt, pressure-wash,
  foam-wheel, wheel-foam, polisher, polisher-portrait, beading, droplets, blue-paint, red-paint,
  headlight-911, headlight-black, green-front, dash, leather, interior-window.
  Свои фото клиента клади в `us/<slug>/img/` и указывай путь `img/имя.webp`.

## Правила

- Страницы клиентов закрыты от поисковиков (`"preview": true` → noindex): это превью, а не их официальный сайт.
  Когда клиент купит сайт, поставь `"preview": false`: включится canonical и уберётся плашка «Concept preview».
- Цены в пакетах — примеры, под ними стоит пометка. Не вписывай клиенту достижения, гарантии и сертификаты, которых он сам не заявлял.
- Форма на превью ничего не отправляет и прямо пишет об этом. На боевом сайте её подключают к почте или телефону клиента.
- `_engine/scene.js`, `models/`, `vendor/jsm` и `three.module.min.js` больше не используются (3D убрано), их можно удалить.
