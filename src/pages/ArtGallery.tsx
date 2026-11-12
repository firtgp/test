import {WorldPoster} from '../components/VoxelScene';
import type {WorldId} from '../scenes/meta';
import type {Shot} from '../scenes/engine';

// Рабочая галерея сцен (только в режиме разработки): все миры и предметы на одном листе.
const ROWS: {title: string; size: number; items: {id: WorldId; shot?: Shot; w?: number; h?: number}[]}[] = [
  {
    title: 'Блоки главной',
    size: 420,
    items: [
      {id: 'cube', shot: {angle: 0.62, lift: 0.26, fit: 1.02}},
      {id: 'ledge', shot: {angle: 0.35, lift: 0.2, fit: 1.0}, w: 900, h: 520},
      {id: 'fox', shot: {angle: 0.45, lift: 0.2, fit: 1.05}},
      {id: 'viewpoint:wanderer', shot: {angle: 3.5, lift: 0.14, fit: 1.05}},
    ],
  },
  {
    title: 'Персонажи',
    size: 330,
    items: [
      {id: 'character:wanderer:0', shot: {angle: 0.5, lift: 0.1, fit: 1.02}},
      {id: 'character:engineer:1', shot: {angle: 0.5, lift: 0.1, fit: 1.02}},
      {id: 'character:mage:2', shot: {angle: 0.5, lift: 0.1, fit: 1.02}},
      {id: 'character:farmer:3', shot: {angle: 0.5, lift: 0.1, fit: 1.02}},
      {id: 'character:wanderer:0', shot: {angle: 3.6, lift: 0.1, fit: 1.02}},
    ],
  },
  {
    title: 'Предметы',
    size: 200,
    items: (['gear', 'drill', 'disk', 'book', 'flower', 'scroll', 'basket', 'pickaxe', 'sparkles', 'chest'] as const)
      .map(i => ({id: `item:${i}` as WorldId, shot: {angle: 0.6, lift: 0.22, fit: 1.05}}))
      .concat([{id: 'coin', shot: {angle: 0.5, lift: 0.15, fit: 1.05}}, {id: 'foliage:0', shot: {angle: 0.4, lift: 0.1, fit: 1.0}}, {id: 'foliage:2', shot: {angle: 0.4, lift: 0.1, fit: 1.0}}]),
  },
  {
    title: 'Миры',
    size: 420,
    items: [
      {id: 'techno', shot: {angle: 0.55, lift: 0.2, fit: 1.05}},
      {id: 'magic', shot: {angle: 0.55, lift: 0.2, fit: 1.05}},
      {id: 'survival', shot: {angle: 0.55, lift: 0.2, fit: 1.05}},
    ],
  },
];

export default function ArtGallery() {
  return (
    <main style={{padding: 24, display: 'grid', gap: 24, background: '#11141b'}}>
      {ROWS.map(row => (
        <section key={row.title} data-row={row.title}>
          <h2 style={{color: '#fff', font: '600 16px sans-serif', margin: '0 0 8px'}}>{row.title}</h2>
          <span style={{display: 'flex', flexWrap: 'wrap', gap: 12}}>
            {row.items.map((it, i) => (
              <span key={i} style={{width: it.w ? row.size * (it.w / (it.h ?? it.w)) : row.size, height: row.size, background: 'linear-gradient(180deg,#1a2030,#2a3350)', borderRadius: 12, overflow: 'hidden', display: 'block'}}>
                <WorldPoster world={it.id} width={it.w ?? 800} height={it.h ?? 800} shot={it.shot} className="art-cell" />
              </span>
            ))}
          </span>
        </section>
      ))}
      <style>{'.art-cell{width:100%;height:100%}'}</style>
    </main>
  );
}
