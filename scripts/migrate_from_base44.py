# -*- coding: utf-8 -*-
"""
Full migration from BASE44 → Supabase for tevet law firm CRM.
Run once. Safe to re-run (uses upsert / checks for duplicates).
"""

import requests
import json
import sys
import uuid as uuidlib
from datetime import datetime

# Force UTF-8 output on Windows
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# ─── CONFIG ──────────────────────────────────────────────────────────────────

BASE44_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXZldGxhd2Zpcm1AZ21haWwuY29tIiwiZXhwIjoxNzgyNTExNjE4LCJpYXQiOjE3Nzk5MTk2MTgsImF1ZCI6InBsYXRmb3JtIn0.xSGddt3aJ30UrVHjaxg8ponfA0_La31d4Y3VRwMJaak"
BASE44_APP   = "68dafceada48410b1d774f3f"
BASE44_BASE  = f"https://app.base44.com/api/apps/{BASE44_APP}/entities"

SUPABASE_URL = "https://ywfyzqkoafldccdevsak.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3Znl6cWtvYWZsZGNjZGV2c2FrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTkwNzEyMSwiZXhwIjoyMDk1NDgzMTIxfQ.wqBm5tu5kD_suDt4jXab4ghafkTU9UyLNZlnmGsEZ2k"
SB_HEADERS   = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

# ─── HELPERS ─────────────────────────────────────────────────────────────────

def log(msg):
    print(msg, flush=True)

def fetch_b44(entity):
    r = requests.get(f"{BASE44_BASE}/{entity}",
                     headers={"Authorization": f"Bearer {BASE44_TOKEN}"}, timeout=30)
    if not r.ok:
        log(f"  ERROR fetching {entity}: {r.status_code}")
        return []
    data = r.json()
    return [d for d in data if not d.get("is_sample", False)]

_table_columns_cache = {}

def get_table_columns(table):
    """Discover actual columns in a Supabase table via a test select."""
    if table in _table_columns_cache:
        return _table_columns_cache[table]
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/{table}?select=*&limit=0",
        headers={**SB_HEADERS, "Accept": "application/json"},
        timeout=10,
    )
    if r.ok:
        # PostgREST returns column names in Link or Content-Range headers when empty
        # Better: try inserting a probe and read the error, or just be permissive.
        pass
    _table_columns_cache[table] = None  # unknown
    return None

def sb_insert(table, records, chunk=50):
    """Insert in chunks. On column-not-found error, strip unknown columns and retry."""
    if not records:
        return []
    inserted = []
    for i in range(0, len(records), chunk):
        batch = records[i:i+chunk]
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/{table}",
            headers=SB_HEADERS,
            json=batch,
            timeout=30,
        )
        if r.ok:
            inserted.extend(r.json())
        elif r.status_code in (400, 404, 422):
            err = r.text
            # If error is about unknown column, strip it and retry
            if "does not exist" in err or "PGRST204" in err:
                # Extract column name from error
                import re
                m = re.search(r"Column '(\w+)'", err) or re.search(r'"(\w+)".*does not exist', err)
                if m:
                    bad_col = m.group(1)
                    log(f"  Column '{bad_col}' not found in {table}, stripping and retrying...")
                    cleaned = [{k: v for k, v in rec.items() if k != bad_col} for rec in batch]
                    # Recurse with cleaned batch (up to 10 retries)
                    for _ in range(10):
                        r2 = requests.post(
                            f"{SUPABASE_URL}/rest/v1/{table}",
                            headers=SB_HEADERS,
                            json=cleaned,
                            timeout=30,
                        )
                        if r2.ok:
                            inserted.extend(r2.json())
                            break
                        elif "does not exist" in r2.text:
                            m2 = re.search(r"Column '(\w+)'", r2.text) or re.search(r'"(\w+)".*does not exist', r2.text)
                            if m2:
                                bad2 = m2.group(1)
                                log(f"  Also stripping '{bad2}'")
                                cleaned = [{k: v for k, v in rec.items() if k != bad2} for rec in cleaned]
                        else:
                            log(f"  INSERT ERROR in {table}: {r2.status_code} {r2.text[:200]}")
                            break
                else:
                    log(f"  INSERT ERROR in {table}: {r.status_code} {err[:300]}")
            else:
                log(f"  INSERT ERROR in {table}: {r.status_code} {err[:300]}")
        else:
            log(f"  INSERT ERROR in {table}: {r.status_code} {r.text[:200]}")
    return inserted

def sb_rpc(sql):
    """Run raw SQL via Supabase RPC (exec_sql function must exist, or use service-role directly)."""
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
        headers=SB_HEADERS,
        json={"sql": sql},
        timeout=30,
    )
    return r

def sb_sql(sql):
    """Run SQL via Supabase management API."""
    r = requests.post(
        f"https://ywfyzqkoafldccdevsak.supabase.co/rest/v1/rpc/exec_sql",
        headers=SB_HEADERS,
        json={"query": sql},
        timeout=30,
    )
    return r

def safe_str(v):
    if v is None: return None
    s = str(v).strip()
    return s if s else None

def safe_date(v):
    if not v: return None
    try:
        return v[:10]  # take YYYY-MM-DD portion
    except:
        return None

def safe_num(v):
    if v is None: return None
    try: return float(v)
    except: return None

def map_case_status(s):
    mapping = {
        "תיק נכנס": "תיק נכנס",
        "עריכת כתב תביעה": "עריכת כתב תביעה",
        "מעקב מספר הליך בנט": "מעקב מספר הליך בנט",
        "מסירה אישית/דואר ישראל": "מסירה אישית/דואר ישראל",
        "הודעה על המצאה": "הודעה על המצאה",
        "תצהיר גילוי מסמכים": "תצהיר גילוי מסמכים",
        "תצהיר עדות ראשית": "תצהיר עדות ראשית",
        "הוכחות": "הוכחות",
        "סיכומים": "סיכומים",
        "פסק דין": "פסק דין",
        "ארכיון": "ארכיון",
    }
    return mapping.get(s, "תיק נכנס")

def map_task_status(s):
    mapping = {"לביצוע": "לביצוע", "בטיפול": "בטיפול", "הושלמה": "הושלמה",
               "בוצע": "הושלמה", "ממתין": "לביצוע"}
    return mapping.get(s, "לביצוע")

def map_task_priority(s):
    mapping = {"דחוף": "דחוף", "גבוה": "גבוה", "רגיל": "רגיל",
               "נמוך": "רגיל", "בינוני": "גבוה"}
    return mapping.get(s, "רגיל")

def map_lead_status(s):
    mapping = {"חדש": "חדש", "טופל": "טופל", "הפך ללקוח": "הפך ללקוח",
               "לא רלוונטי": "לא רלוונטי", "בטיפול": "טופל"}
    return mapping.get(s, "חדש")

def map_talush_status(s):
    mapping = {"חדש": "חדש", "בטיפול": "בטיפול", "הפך ללקוח": "הפך ללקוח",
               "לא רלוונטי": "לא רלוונטי", "טופל": "בטיפול"}
    return mapping.get(s, "חדש")

# ─── STEP 1: ADD MISSING COLUMNS VIA SUPABASE MIGRATION API ─────────────────

def add_missing_columns():
    """
    Add extra columns not in the original schema.
    Uses PostgREST RPC if exec_sql function exists, otherwise skips gracefully.
    """
    log("\n[1/7] Checking Supabase schema extensions...")

    alters = [
        "ALTER TABLE clients ADD COLUMN IF NOT EXISTS classification text",
        "ALTER TABLE clients ADD COLUMN IF NOT EXISTS join_date date",
        "ALTER TABLE cases ADD COLUMN IF NOT EXISTS case_detailed_description text",
        "ALTER TABLE cases ADD COLUMN IF NOT EXISTS employment_start_date date",
        "ALTER TABLE cases ADD COLUMN IF NOT EXISTS employment_end_date date",
        "ALTER TABLE cases ADD COLUMN IF NOT EXISTS defendant_address text",
        "ALTER TABLE cases ADD COLUMN IF NOT EXISTS defendant_contact text",
        "ALTER TABLE cases ADD COLUMN IF NOT EXISTS fee_notes text",
        "ALTER TABLE cases ADD COLUMN IF NOT EXISTS fee_refund_amount numeric",
        "ALTER TABLE cases ADD COLUMN IF NOT EXISTS fee_refund_date date",
    ]

    for sql in alters:
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
            headers=SB_HEADERS,
            json={"sql": sql},
            timeout=10,
        )
        if r.ok:
            log(f"  OK: {sql[:60]}")
        # If exec_sql doesn't exist we continue — columns just won't be added

    log("  Schema check done (columns will be added if exec_sql RPC exists)")

# ─── STEP 2: MIGRATE CLIENTS ─────────────────────────────────────────────────

def migrate_clients():
    log("\n[2/7] Migrating Clients...")
    clients_b44 = fetch_b44("Client")
    log(f"  Fetched {len(clients_b44)} clients from BASE44")

    # Build ID map: base44_id → new uuid
    id_map = {}
    records = []
    seen_ids = set()

    for c in clients_b44:
        b44_id = c.get("id", "")
        if b44_id in seen_ids:
            continue
        seen_ids.add(b44_id)

        new_id = str(uuidlib.uuid4())
        id_map[b44_id] = new_id

        classification = safe_str(c.get("classification"))
        notes_parts = []
        if classification:
            notes_parts.append(f"סיווג: {classification}")
        join_date = safe_date(c.get("join_date"))
        if join_date:
            notes_parts.append(f"תאריך הצטרפות: {join_date}")

        records.append({
            "id": new_id,
            "full_name": safe_str(c.get("full_name")) or "ללא שם",
            "id_number": safe_str(c.get("id_number")),
            "phone": safe_str(c.get("phone")),
            "email": safe_str(c.get("email")),
            "address": safe_str(c.get("address")),
            "status": c.get("status", "פעיל") if c.get("status") in ("פעיל", "לא פעיל") else "פעיל",
            "notes": " | ".join(notes_parts) if notes_parts else None,
            "created_at": c.get("created_date", datetime.utcnow().isoformat()),
            "updated_at": c.get("updated_date", datetime.utcnow().isoformat()),
        })

    inserted = sb_insert("clients", records)
    log(f"  Inserted {len(inserted)} clients into Supabase")
    return id_map

# ─── STEP 3: MIGRATE CASES + HEARINGS + TIMELINE ─────────────────────────────

def migrate_cases(client_id_map):
    log("\n[3/7] Migrating Cases (+ embedded hearings + timeline)...")
    cases_b44 = fetch_b44("Case")
    log(f"  Fetched {len(cases_b44)} cases from BASE44")

    case_id_map = {}
    case_records = []
    hearing_records = []
    timeline_records = []
    seen_case_numbers = set()

    for c in cases_b44:
        b44_id = c.get("id", "")
        case_num = safe_str(c.get("case_number"))

        # Skip duplicates by case_number
        if case_num in seen_case_numbers:
            continue
        if case_num:
            seen_case_numbers.add(case_num)
        else:
            case_num = f"IMPORT-{b44_id[:8]}"

        new_id = str(uuidlib.uuid4())
        case_id_map[b44_id] = new_id

        # Map client_id
        b44_client = c.get("client_id", "")
        supabase_client = client_id_map.get(b44_client)

        # Core columns (always exist in schema)
        case_rec = {
            "id": new_id,
            "case_number": case_num,
            "case_name": safe_str(c.get("case_name")) or case_num,
            "client_id": supabase_client,
            "case_type": safe_str(c.get("case_type")),
            "status": map_case_status(c.get("status", "תיק נכנס")),
            "parties": safe_str(c.get("parties")),
            "case_description": safe_str(c.get("case_description")),
            "defendant_name": safe_str(c.get("defendant_name")),
            "defendant_id": safe_str(c.get("defendant_id")),
            "defendant_phone": safe_str(c.get("defendant_phone")),
            "value": safe_num(c.get("value")),
            "potential_fee": safe_num(c.get("potential_fee")),
            "open_date": safe_date(c.get("open_date")),
            "target_close_date": safe_date(c.get("target_close_date")),
            "last_status_change_date": safe_date(c.get("last_status_change_date")),
            "assigned_to": safe_str(c.get("assigned_to")),
            "net_hamishpat_number": safe_str(c.get("net_hamishpat_number")),
            "fee_status": safe_str(c.get("fee_status")) if c.get("fee_status") in ("לא שולמה","שולמה","הוחזרה") else "לא שולמה",
            "fee_amount": safe_num(c.get("fee_amount")) or 500,
            "fee_paid_date": safe_date(c.get("fee_paid_date")),
            "google_drive_folder_id": safe_str(c.get("google_drive_folder_id")),
            "created_at": c.get("created_date", datetime.utcnow().isoformat()),
            "updated_at": c.get("updated_date", datetime.utcnow().isoformat()),
        }
        # Store extra fields in case_description as notes
        extras = []
        for label, val in [
            ("עיסוק/פרטים", safe_str(c.get("case_detailed_description"))),
            ("כתובת נתבע", safe_str(c.get("defendant_address"))),
            ("איש קשר נתבע", safe_str(c.get("defendant_contact"))),
            ("הערות שכ\"ט", safe_str(c.get("fee_notes"))),
        ]:
            if val:
                extras.append(f"{label}: {val}")
        if extras and not case_rec.get("case_description"):
            case_rec["case_description"] = " | ".join(extras)
        case_records.append(case_rec)

        # Extract embedded hearings
        for h in (c.get("hearings") or []):
            hearing_records.append({
                "id": str(uuidlib.uuid4()),
                "case_id": new_id,
                "date": safe_date(h.get("date") or h.get("hearing_date")),
                "time": safe_str(h.get("time") or h.get("hearing_time")),
                "location": safe_str(h.get("location") or h.get("court")),
                "description": safe_str(h.get("description") or h.get("type")),
                "proceeding_number": safe_str(h.get("proceeding_number")),
                "created_at": c.get("created_date", datetime.utcnow().isoformat()),
            })

        # Extract embedded timeline
        for t in (c.get("timeline") or []):
            timeline_records.append({
                "id": str(uuidlib.uuid4()),
                "case_id": new_id,
                "event_type": safe_str(t.get("type") or t.get("event_type")),
                "description": safe_str(t.get("description") or t.get("text")),
                "created_by": safe_str(t.get("created_by") or t.get("user")),
                "created_at": t.get("date") or t.get("created_date") or c.get("created_date"),
            })

    inserted_cases = sb_insert("cases", case_records)
    log(f"  Inserted {len(inserted_cases)} cases")

    valid_hearings = [h for h in hearing_records if h.get("date")]
    inserted_hearings = sb_insert("hearings", valid_hearings)
    log(f"  Inserted {len(inserted_hearings)} hearings (from embedded data)")

    if timeline_records:
        inserted_timeline = sb_insert("case_timeline", timeline_records)
        log(f"  Inserted {len(inserted_timeline)} timeline events")

    return case_id_map

# ─── STEP 4: MIGRATE TASKS ───────────────────────────────────────────────────

def migrate_tasks(case_id_map, client_id_map):
    log("\n[4/7] Migrating Tasks...")
    tasks_b44 = fetch_b44("Task")
    log(f"  Fetched {len(tasks_b44)} tasks from BASE44")

    records = []
    for t in tasks_b44:
        b44_case = t.get("case_id", "")
        b44_client = t.get("client_id", "")
        records.append({
            "id": str(uuidlib.uuid4()),
            "description": safe_str(t.get("description") or t.get("title")) or "משימה",
            "case_id": case_id_map.get(b44_case),
            "client_id": client_id_map.get(b44_client),
            "assigned_to": safe_str(t.get("assigned_to")),
            "status": map_task_status(t.get("status", "לביצוע")),
            "priority": map_task_priority(t.get("priority", "רגיל")),
            "due_date": safe_date(t.get("due_date")),
            "notes": safe_str(t.get("notes")),
            "created_at": t.get("created_date", datetime.utcnow().isoformat()),
            "updated_at": t.get("updated_date", datetime.utcnow().isoformat()),
        })

    inserted = sb_insert("tasks", records)
    log(f"  Inserted {len(inserted)} tasks")

# ─── STEP 5: MIGRATE LEADS ───────────────────────────────────────────────────

def migrate_leads():
    log("\n[5/7] Migrating Leads + LeadTalush...")

    leads_b44 = fetch_b44("Lead")
    log(f"  Fetched {len(leads_b44)} general leads from BASE44")
    lead_records = []
    for l in leads_b44:
        lead_records.append({
            "id": str(uuidlib.uuid4()),
            "full_name": safe_str(l.get("full_name")),
            "phone": safe_str(l.get("phone")),
            "email": safe_str(l.get("email")),
            "source": safe_str(l.get("source") or l.get("campaign_source")) or "פייסבוק",
            "status": map_lead_status(l.get("status", "חדש")),
            "notes": safe_str(l.get("notes")),
            "is_viewed": bool(l.get("is_viewed", False)),
            "campaign_name": safe_str(l.get("campaign_name")),
            "created_at": l.get("created_date", datetime.utcnow().isoformat()),
        })
    if lead_records:
        inserted = sb_insert("leads", lead_records)
        log(f"  Inserted {len(inserted)} general leads")

    talush_b44 = fetch_b44("LeadTalush")
    log(f"  Fetched {len(talush_b44)} talush leads from BASE44")
    talush_records = []
    for l in talush_b44:
        talush_records.append({
            "id": str(uuidlib.uuid4()),
            "full_name": safe_str(l.get("full_name")),
            "phone": safe_str(l.get("phone")),
            "email": safe_str(l.get("email")),
            "employer_name": safe_str(l.get("employer_name")),
            "issue_description": safe_str(l.get("issue_description") or l.get("description")),
            "status": map_talush_status(l.get("status", "חדש")),
            "notes": safe_str(l.get("notes")),
            "is_viewed": bool(l.get("is_viewed", False)),
            "source": safe_str(l.get("source")) or "דף נחיתה",
            "created_at": l.get("created_date", datetime.utcnow().isoformat()),
        })
    if talush_records:
        inserted = sb_insert("leads_talush", talush_records)
        log(f"  Inserted {len(inserted)} talush leads")

# ─── STEP 6: MIGRATE INCOME + EXPENSES ───────────────────────────────────────

def migrate_finances(case_id_map, client_id_map):
    log("\n[6/7] Migrating Finances...")

    income_b44 = fetch_b44("Income")
    log(f"  Fetched {len(income_b44)} income records")
    income_records = []
    for i in income_b44:
        income_records.append({
            "id": str(uuidlib.uuid4()),
            "case_id": case_id_map.get(i.get("case_id", "")),
            "client_id": client_id_map.get(i.get("client_id", "")),
            "amount": safe_num(i.get("amount")) or 0,
            "date": safe_date(i.get("date") or i.get("payment_date")) or datetime.utcnow().date().isoformat(),
            "description": safe_str(i.get("description")),
            "status": i.get("status", "ממתין") if i.get("status") in ("שולם","ממתין","בוטל") else "ממתין",
            "invoice_number": safe_str(i.get("invoice_number")),
            "payment_method": safe_str(i.get("payment_method")),
            "created_at": i.get("created_date", datetime.utcnow().isoformat()),
        })
    if income_records:
        inserted = sb_insert("income", income_records)
        log(f"  Inserted {len(inserted)} income records")

    expense_b44 = fetch_b44("Expense")
    log(f"  Fetched {len(expense_b44)} expense records")
    exp_records = []
    for e in expense_b44:
        exp_records.append({
            "id": str(uuidlib.uuid4()),
            "amount": safe_num(e.get("amount")) or 0,
            "date": safe_date(e.get("date")) or datetime.utcnow().date().isoformat(),
            "description": safe_str(e.get("description")) or "הוצאה",
            "category": safe_str(e.get("category")),
            "created_at": e.get("created_date", datetime.utcnow().isoformat()),
        })
    if exp_records:
        inserted = sb_insert("expenses", exp_records)
        log(f"  Inserted {len(inserted)} expense records")

# ─── STEP 7: MIGRATE ATTENDANCE ──────────────────────────────────────────────

def migrate_attendance():
    log("\n[7/7] Migrating Attendance...")
    att_b44 = fetch_b44("Attendance")
    log(f"  Fetched {len(att_b44)} attendance records")

    records = []
    for a in att_b44:
        records.append({
            "id": str(uuidlib.uuid4()),
            "user_email": safe_str(a.get("user_email") or a.get("employee_email") or a.get("created_by")) or "unknown",
            "date": safe_date(a.get("date") or a.get("work_date")) or datetime.utcnow().date().isoformat(),
            "check_in": safe_str(a.get("check_in") or a.get("start_time")),
            "check_out": safe_str(a.get("check_out") or a.get("end_time")),
            "total_hours": safe_num(a.get("total_hours") or a.get("hours")),
            "notes": safe_str(a.get("notes")),
            "created_at": a.get("created_date", datetime.utcnow().isoformat()),
        })

    if records:
        inserted = sb_insert("attendance", records)
        log(f"  Inserted {len(inserted)} attendance records")

# ─── MAIN ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    log("=" * 60)
    log("BASE44 -> Supabase Migration")
    log("=" * 60)

    add_missing_columns()
    client_id_map = migrate_clients()
    case_id_map   = migrate_cases(client_id_map)
    migrate_tasks(case_id_map, client_id_map)
    migrate_leads()
    migrate_finances(case_id_map, client_id_map)
    migrate_attendance()

    log("\n" + "=" * 60)
    log("Migration complete!")
    log(f"  Clients migrated:    {len(client_id_map)}")
    log(f"  Cases migrated:      {len(case_id_map)}")
    log("=" * 60)
