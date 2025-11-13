-- Create materials storage bucket
insert into storage.buckets
  (id, name, public)
values
  ('materials', 'materials', false);

-- Create storage policies for materials bucket
create policy "Give users access to own materials folder - select"
on "storage"."objects"
as permissive
for select
to public
using (((bucket_id = 'materials'::text) AND auth.uid() IS NOT NULL AND (name ~ (('^'::text || (auth.uid())::text) || '/'::text))));

create policy "Give users access to own materials folder - insert"
on "storage"."objects"
as permissive
for insert
to public
with check (((bucket_id = 'materials'::text) AND auth.uid() IS NOT NULL AND (name ~ (('^'::text || (auth.uid())::text) || '/'::text))));

create policy "Give users access to own materials folder - update"
on "storage"."objects"
as permissive
for update
to public
using (((bucket_id = 'materials'::text) AND auth.uid() IS NOT NULL AND (name ~ (('^'::text || (auth.uid())::text) || '/'::text))));

create policy "Give users access to own materials folder - delete"
on "storage"."objects"
as permissive
for delete
to public
using (((bucket_id = 'materials'::text) AND auth.uid() IS NOT NULL AND (name ~ (('^'::text || (auth.uid())::text) || '/'::text))));