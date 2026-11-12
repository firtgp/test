// Лёгкие описания сцен: типы, подписи и цвета неба. Сами миры строятся в отдельном,
// лениво загружаемом коде (см. registry.ts и engine.ts).

export type ScenePreset = 'techno' | 'magic' | 'survival';
export const SCENE_PRESETS: ScenePreset[] = ['techno', 'magic', 'survival'];
export const SCENE_LABEL: Record<ScenePreset, string> = {
  techno: 'Завод (техника)',
  magic: 'Кристаллы (магия)',
  survival: 'Холмы (выживание)',
};

/** Небо рисуется CSS-градиентом под прозрачным холстом и доступно без WebGL. */
export const SKY: Record<ScenePreset, [string, string, string]> = {
  techno: ['#06121f', '#0f3a52', '#3fb6c8'],
  magic: ['#12062b', '#6a1b74', '#ff7a5c'],
  survival: ['#0a2036', '#2b6c7d', '#f3b45a'],
};
/** Небо финального блока (панорама трёх миров). */
export const PANORAMA_SKY: [string, string, string] = ['#0b1020', '#3a1f5c', '#f08a4b'];

/** Образ персонажа на сайте. Игровой скин он не меняет. */
export type AvatarStyle = 'wanderer' | 'engineer' | 'mage' | 'farmer';
export const AVATAR_STYLES: {id: AvatarStyle; label: string; hint: string}[] = [
  {id: 'wanderer', label: 'Странник', hint: 'Шарф, рюкзак и значок проекта'},
  {id: 'engineer', label: 'Инженер', hint: 'Очки-гогглы и рабочий жилет'},
  {id: 'mage', label: 'Маг', hint: 'Капюшон, мантия и посох'},
  {id: 'farmer', label: 'Фермер', hint: 'Соломенная шляпа и комбинезон'},
];

/** Цвета пьедестала и ауры персонажа по рангу привилегии (0 — без привилегии). */
export const TIER_ACCENT = ['#8fa0b8', '#4fd1e0', '#a78bfa', '#f2b544'];

/** Иконки товаров магазина: маленькие модели из блоков. */
export type ItemIcon = 'gear' | 'drill' | 'disk' | 'book' | 'flower' | 'scroll' | 'basket' | 'pickaxe' | 'sparkles' | 'chest';
export const ITEM_ICON_LABEL: Record<ItemIcon, string> = {
  gear: 'Шестерня',
  drill: 'Бур',
  disk: 'Накопитель',
  book: 'Книга',
  flower: 'Цветок',
  scroll: 'Свиток',
  basket: 'Корзина',
  pickaxe: 'Кирка',
  sparkles: 'Искры',
  chest: 'Сундук',
};

export type WorldId =
  | ScenePreset
  | 'panorama'
  | 'cube'
  | 'ledge'
  | 'fox'
  | 'coin'
  | `foliage:${number}`
  | `item:${ItemIcon}`
  | `character:${AvatarStyle}:${number}`
  | `viewpoint:${AvatarStyle}`;
