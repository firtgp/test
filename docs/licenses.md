# Лицензии и происхождение материалов

## Программные зависимости и ассеты

| Материал | Версия | Источник | Лицензия | Примечание |
|---|---|---|---|---|
| Astryx (`@astryxdesign/core`, `theme-neutral`, `cli`) | 0.7.15 | npm | MIT | UI-система |
| React, React DOM | 19.3.1 | npm | MIT | |
| React Router | 7.18.5 | npm | MIT | |
| TanStack Query | 5.107.1 | npm | MIT | |
| Zod | 4.6.7 | npm | MIT | |
| supabase-js | 2.119.0 | npm | MIT | |
| date-fns, date-fns-tz | 4.4.0, 3.2.0 | npm | MIT | |
| Phosphor Icons (`@phosphor-icons/react`) | 2.1.10 | npm | MIT | Иконки |
| Шрифт Manrope (`@fontsource/manrope`) | 5.3.0 | npm | SIL OFL 1.1 | Кириллица есть, файлы в сборке |
| Шрифт Unbounded (`@fontsource/unbounded`) | 5.3.0 | npm | SIL OFL 1.1 | Кириллица есть, файлы в сборке |

Лицензии указаны по метаданным пакетов. Шрифты, вынутые из игры, не используются.

## Медиа

| Материал | Происхождение | Статус |
|---|---|---|
| Изображение первого экрана | Нарисовано кодом в `src/components/HeroScene.tsx` | Заглушка, на странице подписана |
| Скриншоты серверов | Нет | Загружаются в админке; для каждого кадра указываются версия сборки, шейдеры, ресурспак и происхождение |

Официальные материалы Mojang, чужие серверы и чужие постройки не используются.

## Моды сборок (пример из seed)

Список условный. Версии, лицензии и разрешения **не проверялись**: сайты модов из среды разработки
недоступны. У всех модов статус «Не подтверждено», и это блокирует раздачу через лаунчер.
Заполните таблицу по реальным файлам сборки (`mods.toml`, `neoforge.mods.toml`, `fabric.mod.json`).

| Сборка | Мод | Версия | Источник | Лицензия | Разрешение на распространение | Ссылка |
|---|---|---|---|---|---|---|
| Индустрия | Create | — | Modrinth | не проверена | не подтверждено | https://modrinth.com/mod/create |
| Индустрия | Mekanism | — | Modrinth | не проверена | не подтверждено | https://modrinth.com/mod/mekanism |
| Индустрия | Applied Energistics 2 | — | Modrinth | не проверена | не подтверждено | https://modrinth.com/mod/ae2 |
| Индустрия | Just Enough Items | — | Modrinth | не проверена | не подтверждено | https://modrinth.com/mod/jei |
| Аркана | Ars Nouveau | — | Modrinth | не проверена | не подтверждено | https://modrinth.com/mod/ars-nouveau |
| Аркана | Botania | — | Modrinth | не проверена | не подтверждено | https://modrinth.com/mod/botania |
| Аркана | Iron's Spells 'n Spellbooks | — | Modrinth | не проверена | не подтверждено | https://modrinth.com/mod/irons-spells-n-spellbooks |
| Аркана | Just Enough Items | — | Modrinth | не проверена | не подтверждено | https://modrinth.com/mod/jei |
| Фронтир | Farmer's Delight Refabricated | — | Modrinth | не проверена | не подтверждено | https://modrinth.com/mod/farmers-delight-refabricated |
| Фронтир | Sodium | — | Modrinth | не проверена | не подтверждено | https://modrinth.com/mod/sodium |
| Фронтир | Lithium | — | Modrinth | не проверена | не подтверждено | https://modrinth.com/mod/lithium |

Ссылки записаны по памяти и не открывались. Совместимость перечисленных модов с указанными версией игры
и загрузчиком тоже не проверялась.

## Правила Mojang

На сайте стоит дисклеймер «NOT AN OFFICIAL MINECRAFT SERVICE…» с переводом рядом. Название проекта не
содержит «Minecraft». Магазина нет, поэтому правила о продажах не затронуты. Живой текст раздела
«Servers and hosting» в Minecraft Usage Guidelines **не сверялся**: minecraft.net из среды разработки
недоступен. Сверьте его перед публикацией.
