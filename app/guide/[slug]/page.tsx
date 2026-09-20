import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import GuideView, { type Guide } from "./GuideView";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * דף המדריך.
 *
 * זה מה שמי שהגיב בתגובות מקבל בהודעה פרטית, ולכן זה הרגע שבו
 * עוקב הופך לליד. התוכן נקרא ממסד הנתונים כדי שאוהד יוכל לערוך
 * אותו במערכת בלי דיפלוי, והעיצוב קבוע בקוד כדי שהוא לא יישבר
 * בעריכה.
 *
 * ?draft=1 מציג גם מדריך שעוד לא פורסם. זה מה שמאפשר תצוגה
 * מקדימה אמיתית במערכת: אוהד רואה בדיוק את הדף, לא הדמיה שלו.
 */

async function loadGuide(slug: string, allowDraft: boolean): Promise<Guide | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("system_settings")
    .select("setting_value")
    .eq("setting_key", "content_guides")
    .maybeSingle();

  const raw = data?.setting_value;
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  const guides: Guide[] = Array.isArray(parsed?.guides) ? parsed.guides : [];

  const guide = guides.find((g) => g.slug === slug);
  if (!guide) return null;
  if (guide.status !== "live" && !allowDraft) return null;
  return guide;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ draft?: string }>;
}) {
  const { slug } = await params;
  const { draft } = await searchParams;
  const guide = await loadGuide(slug, draft === "1");
  if (!guide) return { title: "המדריך לא נמצא" };

  return {
    title: `${guide.title} | אוהד טבת עו"ד`,
    description: guide.subtitle,
    /** מדריך בטיוטה לא נסרק, כדי שלא ידלוף לגוגל לפני אישור */
    robots: guide.status === "live" ? undefined : { index: false, follow: false },
  };
}

export default async function GuidePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ draft?: string }>;
}) {
  const { slug } = await params;
  const { draft } = await searchParams;
  const guide = await loadGuide(slug, draft === "1");

  if (!guide) notFound();
  return <GuideView guide={guide} isDraft={guide.status !== "live"} />;
}
