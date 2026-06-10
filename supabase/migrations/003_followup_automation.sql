-- ============================================================
-- 003 — רובוט פולואפ אוטומטי לוואטסאפ
-- מוסיף שדות מעקב לרצף הפולואפ + מתקן באג סטטוס בטבלת leads
-- ============================================================

-- ── שדות מעקב פולואפ — leads ──────────────────────────────────
alter table leads add column if not exists followup_stage     int         not null default 0;
alter table leads add column if not exists followup_next_at    timestamptz;
alter table leads add column if not exists followup_stopped    boolean     not null default false;
alter table leads add column if not exists followup_opted_out  boolean     not null default false;
alter table leads add column if not exists last_followup_at    timestamptz;

-- ── שדות מעקב פולואפ — leads_talush ──────────────────────────
alter table leads_talush add column if not exists followup_stage     int         not null default 0;
alter table leads_talush add column if not exists followup_next_at    timestamptz;
alter table leads_talush add column if not exists followup_stopped    boolean     not null default false;
alter table leads_talush add column if not exists followup_opted_out  boolean     not null default false;
alter table leads_talush add column if not exists last_followup_at    timestamptz;

-- ── תיקון באג: leads.status קיבל 'טופל' אבל ה-CRM שולח 'בטיפול' ──
-- ממיר רשומות קיימות ומעדכן את ה-CHECK constraint כך שיתאים ל-CRM ול-leads_talush
update leads set status = 'בטיפול' where status = 'טופל';

alter table leads drop constraint if exists leads_status_check;
alter table leads add constraint leads_status_check
  check (status in ('חדש', 'בטיפול', 'הפך ללקוח', 'לא רלוונטי'));

-- ── אינדקס לשליפת לידים שמגיע להם פולואפ ──────────────────────
create index if not exists idx_leads_followup_due
  on leads (followup_next_at)
  where followup_stopped = false and followup_opted_out = false;

create index if not exists idx_leads_talush_followup_due
  on leads_talush (followup_next_at)
  where followup_stopped = false and followup_opted_out = false;
