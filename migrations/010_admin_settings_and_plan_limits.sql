-- Админка: глобальные переключатели продаж + редактирование тарифов.
--
-- Таблица plans создавалась вручную (миграции на неё нет), поэтому здесь
-- всё защитно: create/add column if not exists. Существующие цены не трогаем.

-- ── Глобальные настройки бота (key/value) ────────────────────────────────
create table if not exists bot_settings (
    key        text primary key,
    value      text not null,
    updated_at timestamptz not null default now()
);

-- Продажи включены по умолчанию — поведение до этой миграции не меняется.
-- Прокси px6 выключены: нужен PX6_API_KEY, включается вручную из админки.
insert into bot_settings (key, value) values
    ('vpn_sales_enabled', 'true'),
    ('proxy_sales_enabled', 'true'),
    ('px6_sales_enabled', 'false')
on conflict (key) do nothing;

-- ── Тарифы: лимит трафика и срок редактируются из админки ────────────────
create table if not exists plans (
    id      text primary key,
    price   integer not null default 0,
    enabled boolean not null default true
);

alter table plans add column if not exists data_limit bigint;
alter table plans add column if not exists duration   integer;

-- ── RLS ──────────────────────────────────────────────────────────────────
-- Бот ходит под service_role и RLS обходит. Но plans читает ещё и сайт
-- (let-me-out.com); если он подключается публичным ключом, включённый RLS
-- без политики отдаст пустой список и цены на сайте просто исчезнут —
-- молча, без ошибки. Поэтому на чтение plans политика есть: цены и так
-- опубликованы. bot_settings остаётся закрытым.
alter table bot_settings enable row level security;
alter table plans        enable row level security;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = 'plans' and policyname = 'plans_public_read'
    ) then
        create policy plans_public_read on plans for select using (true);
    end if;
end $$;
