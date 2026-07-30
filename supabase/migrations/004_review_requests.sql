-- ============================================================
-- 004 — בקשות ביקורת בגוגל אחרי סגירת תיק
-- מוסיף שדות מעקב לטבלת cases כדי שכל לקוח יקבל בקשה אחת בלבד
-- ============================================================

-- ── סטטוסי סיום נוספים: הסכם פשרה ותיק נסגר ────────────────────
-- ה-CHECK הישן חסם כל ערך שלא היה ברשימה, כך שבלי זה שמירת הסטטוס נכשלת.
alter table cases drop constraint if exists cases_status_check;
alter table cases add constraint cases_status_check
  check (status in (
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
    'הסכם פשרה',
    'תיק נסגר',
    'ארכיון'
  ));

-- ── שדות מעקב בקשת ביקורת ─────────────────────────────────────
alter table cases add column if not exists review_requested_at timestamptz;
alter table cases add column if not exists review_opted_out    boolean not null default false;

-- ── אינדקס לשליפת תיקים שמגיע להם בקשת ביקורת ─────────────────
create index if not exists idx_cases_review_due
  on cases (updated_at desc)
  where review_requested_at is null and review_opted_out = false;
