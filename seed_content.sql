-- ============================================================
-- One-time seed: loads the site's CURRENT content into the CMS tables
-- so you can see & edit it in the admin panel.
-- Safe to re-run: each block only inserts if that table is still empty.
-- Run AFTER cms_setup.sql.
-- ============================================================

-- Mission / Values cards
insert into public.home_cards (title_mn, body_mn, title_en, body_en, sort_order)
select * from (values
  ('Алсын хараа',
   'Бид гайхамшигт түүхийг бүтээгч, Азийн хамгийн шилдэг санхүүгийн тоглогч байна.',
   'Vision',
   'Together with all our stakeholders, we are the creators of wonderful history. We will be the most compelling financial firm in Asia.',
   0),
  ('Эрхэмсэг оршихуй',
   'Нийгэмд эерэг өөрчлөлтийг авчирч, урт хугацаанд тогтвортой хөгжих хамгийн том санхүүгийн удирдан чиглүүлэгч байна.',
   'Mission',
   'Our mission is to deliver economic betterment for both our investors and our investees.',
   1),
  ('Үнэт зүйлс',
   'Хүндлэл, Хамтын зүтгэл, Инноваци, Стюардшип, Төгөлдөршил, Ил тод байдал',
   'Our values',
   'Respect, Teamwork, Innovation, Stewardship, Excellence, Transparency',
   2)
) as v(title_mn, body_mn, title_en, body_en, sort_order)
where not exists (select 1 from public.home_cards);

-- Management team
insert into public.team_members (name_mn, role_mn, name_en, role_en, photo_path, sort_order)
select * from (values
  ('Лакшми Боожоо', 'ТУЗ-ийн дарга', 'Lakshmi Boojoo', 'Chair', '/assets/team/lakshmi.png', 0),
  ('Монсор Нямдаваа', 'Гүйцэтгэх захирал, ТУЗ-ийн гишүүн', 'Monsor Nyamdavaa', 'CEO, Director', '/assets/team/monsor.png', 1),
  ('Оймандах Жамъянсүрэн', 'ТУЗ-ийн гишүүн', 'Oimandakh Jamiyansuren', 'Director', '/assets/team/oimandah.jpg', 2),
  ('Уянга Алтан-Эрдэнэ', 'Хөрөнгө оруулалтын сангийн зөвлөх', 'Uyanga Altan-Erdene', 'Fund Manager', '/assets/team/uyanga.png', 3),
  ('Идэрбат Ариуна', 'Хөрөнгө оруулалтын сангийн зөвлөх', 'Iderbat Ariuna', 'Fund Manager', '/assets/team/iderbat.png', 4)
) as v(name_mn, role_mn, name_en, role_en, photo_path, sort_order)
where not exists (select 1 from public.team_members);

-- Timeline
insert into public.timeline_events (year, text_mn, text_en, sort_order)
select * from (values
  ('2011', 'Ассет Менежментийн үйл ажиллагааны чиглэлтэйгээр үүсгэн байгуулагдав.', 'Asset management company was established.', 0),
  ('2013', 'Хөрөнгө Оруулалтын Сангийн тухай хуулийн ажлын хэсэгт ажиллав.', 'Co-operated as part of working group of Law on Investment Funds.', 1),
  ('2015', 'Хөрөнгө Оруулалтын Менежментийн үйл ажиллагаа эрхлэх тусгай зөвшөөрлийг СЗХ-ноос авав.', 'Licensed by FRC as a fund management company.', 2),
  ('2016', 'Компанийн үйл ажиллагаанд ESG зарчмыг тусган нэвтрүүлж эхлэв.', 'Adopted ESG values as one of the core principles of the company.', 3),
  ('2016', 'Хувийн хөрөнгө оруулалтын сан: Үл Хөдлөх Хөрөнгө.', 'First real estate fund management.', 4),
  ('2018', 'Хувийн хөрөнгө оруулалтын сан: Хувьцаат компани.', 'Listed equity fund established.', 5)
) as v(year, text_mn, text_en, sort_order)
where not exists (select 1 from public.timeline_events);

-- Contact info
insert into public.site_settings (key, value)
values ('contact', jsonb_build_object(
  'company_mn', 'Улаанбаатар Ассет Менежмент ХХК',
  'company_en', 'Ulaanbaatar Asset Management LLC',
  'phone', '+976-7011-2606',
  'email', 'info@ubam.mn',
  'address_mn', 'Улаанбаатар хот, Сүхбаатар дүүрэг, 1-р хороо, Чингисийн өргөн чөлөө - 24, Парк Плэйс барилга, 4 давхар, 401 тоот',
  'address_en', 'Suite #401, Park Place office, 1st khoroo, Sukhbaatar district, Ulaanbaatar, Mongolia',
  'map_query', 'Park Place, Chinggis Ave, Ulaanbaatar'
))
on conflict (key) do nothing;
