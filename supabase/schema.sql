-- ============================================================
-- Legal Flow CRM — Supabase Schema
-- Project: tevet law firm
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- CLIENTS — לקוחות
-- ============================================================
create table if not exists clients (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  id_number text,
  phone text,
  email text,
  address text,
  status text default 'פעיל' check (status in ('פעיל', 'לא פעיל', 'ממתין')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- CASES — תיקים
-- ============================================================
create table if not exists cases (
  id uuid primary key default uuid_generate_v4(),
  case_number text not null unique,
  case_name text not null,
  client_id uuid references clients(id) on delete set null,
  case_type text check (case_type in (
    'דיני עבודה - תביעה',
    'דיני עבודה - עובדים זרים',
    'דיני עבודה - פיטורים',
    'דיני עבודה - שכר',
    'תביעה כספית',
    'חדלות פירעון',
    'אזרחי - אחר'
  )),
  status text default 'תיק נכנס' check (status in (
    'תיק נכנס',
    'עריכת כתב תביעה',
    'מעקב מספר הליך בנט',
    'מסירה אישית/דואר ישראל',
    'הודעה על המצאה',
    'תצהיר גילוי מסמכים',
    'תצהיר עדות ראשית',
    'הוכחות',
    'סיכומים',
    'פסק דין',
    'ארכיון'
  )),
  parties text,
  case_description text,
  defendant_name text,
  defendant_id text,
  defendant_phone text,
  value numeric,
  potential_fee numeric,
  open_date date,
  target_close_date date,
  last_status_change_date date,
  assigned_to text,
  net_hamishpat_number text,
  fee_status text default 'לא שולמה' check (fee_status in ('לא שולמה', 'שולמה', 'הוחזרה')),
  fee_amount numeric default 500,
  fee_paid_date date,
  google_drive_folder_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- HEARINGS — דיונים
-- ============================================================
create table if not exists hearings (
  id uuid primary key default uuid_generate_v4(),
  case_id uuid references cases(id) on delete cascade,
  date date not null,
  time text,
  location text,
  description text,
  proceeding_number text,
  created_at timestamptz default now()
);

-- ============================================================
-- TASKS — משימות
-- ============================================================
create table if not exists tasks (
  id uuid primary key default uuid_generate_v4(),
  description text not null,
  case_id uuid references cases(id) on delete set null,
  client_id uuid references clients(id) on delete set null,
  assigned_to text,
  status text default 'לביצוע' check (status in ('לביצוע', 'בטיפול', 'הושלמה')),
  priority text default 'רגיל' check (priority in ('דחוף', 'גבוה', 'רגיל')),
  due_date date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- LEADS — לידים כלליים (שיווק / פייסבוק)
-- ============================================================
create table if not exists leads (
  id uuid primary key default uuid_generate_v4(),
  full_name text,
  phone text,
  email text,
  source text default 'פייסבוק',
  status text default 'חדש' check (status in ('חדש', 'טופל', 'הפך ללקוח', 'לא רלוונטי')),
  notes text,
  is_viewed boolean default false,
  campaign_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- LEADS_TALUSH — לידים תלושי שכר
-- ============================================================
create table if not exists leads_talush (
  id uuid primary key default uuid_generate_v4(),
  full_name text,
  phone text,
  email text,
  employer_name text,
  issue_description text,
  status text default 'חדש' check (status in ('חדש', 'בטיפול', 'הפך ללקוח', 'לא רלוונטי')),
  notes text,
  is_viewed boolean default false,
  source text default 'דף נחיתה',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- INCOME — הכנסות
-- ============================================================
create table if not exists income (
  id uuid primary key default uuid_generate_v4(),
  case_id uuid references cases(id) on delete set null,
  client_id uuid references clients(id) on delete set null,
  amount numeric not null,
  date date not null,
  description text,
  status text default 'ממתין' check (status in ('שולם', 'ממתין', 'בוטל')),
  invoice_number text,
  payment_method text,
  created_at timestamptz default now()
);

-- ============================================================
-- EXPENSES — הוצאות
-- ============================================================
create table if not exists expenses (
  id uuid primary key default uuid_generate_v4(),
  amount numeric not null,
  date date not null,
  description text not null,
  category text,
  receipt_url text,
  created_at timestamptz default now()
);

-- ============================================================
-- ATTENDANCE — נוכחות
-- ============================================================
create table if not exists attendance (
  id uuid primary key default uuid_generate_v4(),
  user_email text not null,
  date date not null,
  check_in time,
  check_out time,
  total_hours numeric,
  notes text,
  created_at timestamptz default now()
);

-- ============================================================
-- CASE_TIMELINE — ציר זמן תיק
-- ============================================================
create table if not exists case_timeline (
  id uuid primary key default uuid_generate_v4(),
  case_id uuid references cases(id) on delete cascade,
  event_type text,
  description text,
  created_by text,
  created_at timestamptz default now()
);

-- ============================================================
-- CASE_DOCUMENTS — מסמכי תיק
-- ============================================================
create table if not exists case_documents (
  id uuid primary key default uuid_generate_v4(),
  case_id uuid references cases(id) on delete cascade,
  name text not null,
  url text,
  drive_id text,
  drive_view_link text,
  category text,
  uploaded_by text,
  created_at timestamptz default now()
);

-- ============================================================
-- USER_PERMISSIONS — הרשאות משתמשים
-- ============================================================
create table if not exists user_permissions (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  role text default 'user' check (role in ('admin', 'user')),
  allowed_pages text[],
  specific_permissions text[],
  created_at timestamptz default now()
);

-- ============================================================
-- RLS — Row Level Security (כולם מוגנים, רק auth users)
-- ============================================================
alter table clients enable row level security;
alter table cases enable row level security;
alter table hearings enable row level security;
alter table tasks enable row level security;
alter table leads enable row level security;
alter table leads_talush enable row level security;
alter table income enable row level security;
alter table expenses enable row level security;
alter table attendance enable row level security;
alter table case_timeline enable row level security;
alter table case_documents enable row level security;
alter table user_permissions enable row level security;

-- Policy: authenticated users can read/write everything (admin app)
create policy "Authenticated users have full access" on clients for all to authenticated using (true) with check (true);
create policy "Authenticated users have full access" on cases for all to authenticated using (true) with check (true);
create policy "Authenticated users have full access" on hearings for all to authenticated using (true) with check (true);
create policy "Authenticated users have full access" on tasks for all to authenticated using (true) with check (true);
create policy "Authenticated users have full access" on leads for all to authenticated using (true) with check (true);
create policy "Authenticated users have full access" on leads_talush for all to authenticated using (true) with check (true);
create policy "Authenticated users have full access" on income for all to authenticated using (true) with check (true);
create policy "Authenticated users have full access" on expenses for all to authenticated using (true) with check (true);
create policy "Authenticated users have full access" on attendance for all to authenticated using (true) with check (true);
create policy "Authenticated users have full access" on case_timeline for all to authenticated using (true) with check (true);
create policy "Authenticated users have full access" on case_documents for all to authenticated using (true) with check (true);
create policy "Authenticated users have full access" on user_permissions for all to authenticated using (true) with check (true);

-- Public insert for leads (from landing page forms — no auth needed)
create policy "Public can insert leads" on leads for insert to anon with check (true);
create policy "Public can insert leads_talush" on leads_talush for insert to anon with check (true);

-- ============================================================
-- UPDATED_AT trigger
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger clients_updated_at before update on clients for each row execute function update_updated_at();
create trigger cases_updated_at before update on cases for each row execute function update_updated_at();
create trigger tasks_updated_at before update on tasks for each row execute function update_updated_at();
create trigger leads_updated_at before update on leads for each row execute function update_updated_at();
create trigger leads_talush_updated_at before update on leads_talush for each row execute function update_updated_at();
