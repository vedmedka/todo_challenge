create table todos (
    id uuid primary key,
    title text not null,
    completed boolean not null default false,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    constraint todos_title_not_blank check (length(btrim(title)) > 0)
);
