-- ============================================================
-- Knowledge Base — RAG ספריית ידע
-- הרץ את הקובץ הזה ב: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. pgvector extension
create extension if not exists vector;

-- 2. טבלת מסמכים
create table if not exists document_library (
  id          uuid primary key default uuid_generate_v4(),
  filename    text not null,
  file_type   text not null check (file_type in ('pdf','docx','xlsx','image','txt')),
  file_size   integer,
  tags        text[] default '{}',
  status      text not null default 'processing'
              check (status in ('processing','ready','error')),
  error_msg   text,
  chunk_count integer default 0,
  created_at  timestamptz default now()
);

-- 3. טבלת קטעים + וקטורים
create table if not exists document_chunks (
  id          uuid primary key default uuid_generate_v4(),
  document_id uuid not null references document_library(id) on delete cascade,
  content     text not null,
  embedding   vector(1536),       -- OpenAI text-embedding-3-small
  chunk_index integer not null,
  created_at  timestamptz default now()
);

-- 4. אינדקס לחיפוש מהיר (cosine similarity)
create index if not exists document_chunks_embedding_idx
  on document_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- 5. פונקציית חיפוש סמנטי
create or replace function search_documents(
  query_embedding vector(1536),
  match_count     int default 8,
  min_similarity  float default 0.3
)
returns table (
  chunk_id    uuid,
  document_id uuid,
  filename    text,
  content     text,
  similarity  float
)
language sql stable
as $$
  select
    dc.id          as chunk_id,
    dc.document_id,
    dl.filename,
    dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity
  from document_chunks dc
  join document_library dl on dl.id = dc.document_id
  where dl.status = 'ready'
    and 1 - (dc.embedding <=> query_embedding) > min_similarity
  order by dc.embedding <=> query_embedding
  limit match_count;
$$;
