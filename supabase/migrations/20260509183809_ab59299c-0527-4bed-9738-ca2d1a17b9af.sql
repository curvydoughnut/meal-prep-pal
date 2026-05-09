
create table public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New chat',
  mode text not null default 'plan',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.chat_threads enable row level security;
create policy "own threads select" on public.chat_threads for select to authenticated using (auth.uid() = user_id);
create policy "own threads insert" on public.chat_threads for insert to authenticated with check (auth.uid() = user_id);
create policy "own threads update" on public.chat_threads for update to authenticated using (auth.uid() = user_id);
create policy "own threads delete" on public.chat_threads for delete to authenticated using (auth.uid() = user_id);
create index on public.chat_threads(user_id, updated_at desc);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  parts jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.chat_messages enable row level security;
create policy "own msgs select" on public.chat_messages for select to authenticated using (auth.uid() = user_id);
create policy "own msgs insert" on public.chat_messages for insert to authenticated with check (auth.uid() = user_id);
create policy "own msgs delete" on public.chat_messages for delete to authenticated using (auth.uid() = user_id);
create index on public.chat_messages(thread_id, created_at);

create or replace function public.touch_thread() returns trigger language plpgsql as $$
begin
  update public.chat_threads set updated_at = now() where id = new.thread_id;
  return new;
end; $$;
create trigger chat_messages_touch after insert on public.chat_messages for each row execute function public.touch_thread();
