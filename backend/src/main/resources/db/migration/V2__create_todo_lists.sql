truncate table todos;

create table todo_lists (
    id uuid primary key,
    title text not null,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    constraint todo_lists_title_not_blank check (length(btrim(title)) > 0)
);

insert into todo_lists (id, title)
values ('00000000-0000-0000-0000-000000000001', 'Inbox');

alter table todos
    add column todo_list_id uuid not null references todo_lists(id) on delete cascade;

create index todos_todo_list_id_idx on todos(todo_list_id);
