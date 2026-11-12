-- Сцена первого экрана для сервера: какой «мир» из блоков показывать на его панели.
alter table public.servers
  add column scene text not null default 'survival'
  check (scene in ('techno', 'magic', 'survival'));
