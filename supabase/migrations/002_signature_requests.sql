-- ============================================================
-- Digital Signatures — חתימה דיגיטלית מרחוק
-- הרץ ב: Supabase Dashboard → SQL Editor
-- ============================================================

-- טבלת בקשות חתימה
create table if not exists signature_requests (
  id              uuid primary key default uuid_generate_v4(),
  case_id         uuid references cases(id) on delete cascade,
  client_id       uuid references clients(id) on delete set null,
  document_name   text not null,
  original_url    text not null,        -- PDF מקורי ב-Storage
  signed_url      text,                 -- PDF חתום (אחרי חתימה)
  token           text unique not null, -- טוקן ייחודי לקישור ללקוח
  status          text not null default 'pending'
                  check (status in ('pending','signed','expired')),
  signature_fields jsonb default '[]',  -- [{type,page,x,y,w,h} כ-%]
  signer_name     text,
  signer_ip       text,
  signer_device   text,
  signed_at       timestamptz,
  expires_at      timestamptz not null,
  created_at      timestamptz default now()
);

-- אינדקסים
create index if not exists sig_req_case_idx   on signature_requests(case_id);
create index if not exists sig_req_token_idx  on signature_requests(token);
create index if not exists sig_req_status_idx on signature_requests(status);

-- Storage bucket (signed-documents)
insert into storage.buckets (id, name, public)
values ('signed-documents', 'signed-documents', false)
on conflict (id) do nothing;

-- Storage policy: שירות בלבד (service role)
create policy "service role full access signed-documents"
on storage.objects for all
using (bucket_id = 'signed-documents')
with check (bucket_id = 'signed-documents');
