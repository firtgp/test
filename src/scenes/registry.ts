// Реестр сцен: по идентификатору строит мир и кеширует его.
import type {World} from './build';
import {character, viewpoint} from './character';
import type {AvatarStyle, ItemIcon, WorldId} from './meta';
import {coin, cube, foliage, fox, item, ledge} from './props';
import {magic, panorama, survival, techno} from './worlds';

const cache = new Map<string, World>();

export function buildWorld(id: WorldId): World {
  let w = cache.get(id);
  if (w) return w;
  const [kind, a, b] = id.split(':');
  switch (kind) {
    case 'techno': w = techno(); break;
    case 'magic': w = magic(); break;
    case 'survival': w = survival(); break;
    case 'panorama': w = panorama(); break;
    case 'cube': w = cube(); break;
    case 'ledge': w = ledge(); break;
    case 'fox': w = fox(); break;
    case 'coin': w = coin(); break;
    case 'foliage': w = foliage(Number(a) || 0); break;
    case 'item': w = item(a as ItemIcon); break;
    case 'character': w = character(a as AvatarStyle, Number(b) || 0); break;
    case 'viewpoint': w = viewpoint(a as AvatarStyle); break;
    default: w = survival();
  }
  cache.set(id, w);
  return w;
}
