-- Run after importing supabase_weeks.csv into public.weeks.
-- This maps the JSON week number to the generated public.weeks.id.

insert into public.deadlines (week_id, title, deadline_date, sort_order)
select weeks.id, values.title, values.deadline_date, values.sort_order
from public.weeks
join (
  values
    (7, 'Form a project group', 'Oct 21', 0),
    (8, 'Present revised GDD', 'Oct 28', 0)
) as values(week_number, title, deadline_date, sort_order)
  on weeks.week_number = values.week_number
on conflict do nothing;
