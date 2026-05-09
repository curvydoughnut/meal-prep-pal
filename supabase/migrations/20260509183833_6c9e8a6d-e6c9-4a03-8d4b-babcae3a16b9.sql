create or replace function public.touch_thread() returns trigger language plpgsql security invoker set search_path = public as $$
begin
  update public.chat_threads set updated_at = now() where id = new.thread_id;
  return new;
end; $$;