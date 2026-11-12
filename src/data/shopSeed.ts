import {SRV_MAGIC, SRV_SURV, SRV_TECH} from './seed';
import type {Product} from './types';

/**
 * Каталог-ПРИМЕР для магазина и привилегий. Названия, цены и бонусы условные: замените их
 * в админке. Перед подключением оплаты сверьте каждый товар с правилами Mojang для серверов —
 * у товаров, дающих игровое преимущество, стоит отметка «Игровой предмет».
 * Иконки — модели из блоков, а не текстуры из модов.
 */
const item = (n: number, slug: string, title: string, description: string, price: number, server_id: string | null, mod_name: string, icon: Product['icon'], compliance: Product['compliance']): Product => ({
  id: `60000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  slug, kind: 'item', title, description, price, server_id, mod_name, icon,
  tier: 0, duration_days: null, perks: [], compliance, sort: n, published: true,
});

const privilege = (n: number, slug: string, title: string, description: string, price: number, tier: number, perks: string[]): Product => ({
  id: `61000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  slug, kind: 'privilege', title, description, price, server_id: null, mod_name: '', icon: 'sparkles',
  tier, duration_days: 30, perks, compliance: 'unchecked', sort: n, published: true,
});

export const seedProducts: Product[] = [
  item(1, 'tech-mechanic-kit', 'Набор механика', 'Валы, шестерни и водяное колесо — запустить первую линию.', 120, SRV_TECH, 'Create', 'gear', 'gameplay'),
  item(2, 'tech-industrial-drill', 'Промышленный бур', 'Копает за вас, пока вы строите завод.', 900, SRV_TECH, 'Mekanism', 'drill', 'gameplay'),
  item(3, 'tech-storage-cell', 'Накопитель данных', 'Ёмкая ячейка для сети хранения.', 450, SRV_TECH, 'Applied Energistics 2', 'disk', 'gameplay'),
  item(4, 'magic-apprentice-book', 'Книга ученика', 'Первые глифы и пустые страницы для своих заклинаний.', 150, SRV_MAGIC, 'Ars Nouveau', 'book', 'gameplay'),
  item(5, 'magic-mana-seedlings', 'Саженцы маны', 'Набор мистических цветов для первого сада.', 90, SRV_MAGIC, 'Botania', 'flower', 'gameplay'),
  item(6, 'magic-spell-scroll', 'Свиток заклинания', 'Редкое заклинание, которое не найти в начале игры.', 300, SRV_MAGIC, "Iron's Spells 'n Spellbooks", 'scroll', 'gameplay'),
  item(7, 'survival-farmer-basket', 'Корзина фермера', 'Семена, рассада и немного готовой еды в дорогу.', 60, SRV_SURV, "Farmer's Delight", 'basket', 'gameplay'),
  item(8, 'starter-tools', 'Набор новичка', 'Простые инструменты, чтобы не начинать с пустыми руками.', 50, null, '', 'pickaxe', 'gameplay'),
  item(9, 'cosmetic-spark-trail', 'След искр', 'За вами тянется шлейф золотых искр. На игру не влияет.', 200, null, '', 'sparkles', 'cosmetic'),
  item(10, 'cosmetic-decor-chest', 'Сундук украшений', 'Декоративные блоки и флаги для построек. На игру не влияет.', 140, null, '', 'chest', 'cosmetic'),
  privilege(1, 'rank-seeker', 'Искатель', 'Первый ранг: заметный ник и немного удобства.', 300, 1, [
    'Цветной ник и значок в чате',
    'Бирюзовая подсветка пьедестала персонажа на сайте',
    'Две дополнительные точки дома',
  ]),
  privilege(2, 'rank-master', 'Мастер', 'Для тех, кто играет каждый день.', 700, 2, [
    'Всё из ранга «Искатель»',
    'Аура и кристаллы вокруг персонажа на сайте',
    'Пять точек дома и личный варп',
    'Косметические частицы в игре',
  ]),
  privilege(3, 'rank-legend', 'Легенда', 'Высший ранг проекта.', 1500, 3, [
    'Всё из ранга «Мастер»',
    'Золотой пьедестал и вихрь искр у персонажа на сайте',
    'Золотой ник и эффект входа на сервер',
    'Косметика сезона',
  ]),
];
