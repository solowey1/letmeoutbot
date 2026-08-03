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
insert into bot_settings (key, value) values
    ('vpn_sales_enabled', 'true'),
    ('proxy_sales_enabled', 'true')
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
-- Сайт (let-me-out.com) читает plans под service_role, боту тоже хватает
-- service_role. Публичного доступа не открываем.
alter table bot_settings enable row level security;
alter table plans        enable row level security;
