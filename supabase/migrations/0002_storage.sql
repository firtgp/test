-- Хранилище медиа. Чтение публичное, запись — владелец и администратор.
-- Каждое изображение галереи лежит под собственным ключом gallery/<id записи>/<файл>,
-- поэтому замена одного снимка не затрагивает остальные.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 8388608, array['image/png', 'image/jpeg', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

create policy media_read on storage.objects for select
  using (bucket_id = 'media');

create policy media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.is_content_admin());

create policy media_update on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.is_content_admin())
  with check (bucket_id = 'media' and public.is_content_admin());

create policy media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.is_content_admin());
