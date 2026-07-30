/**
 * מקור אמת יחיד לסטטוסים של תיק.
 *
 * הרשימה הייתה משוכפלת בשמונה קבצים, כך שהוספת סטטוס דרשה לזכור את כולם.
 * כל תצוגה חדשה צריכה לייבא מכאן ולא להגדיר רשימה משלה.
 * שינוי כאן חייב להיות מלווה במיגרציה שמעדכנת את ה-CHECK constraint בטבלת cases.
 */

/** כל הסטטוסים לפי סדר התקדמות התיק */
export const CASE_STATUSES = [
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
  'ארכיון',
] as const

export type CaseStatus = (typeof CASE_STATUSES)[number]

/**
 * סטטוסים שמסמנים שהתיק הגיע לסיומו.
 * משמשים גם להסתרה מרשימות "תיקים פעילים" וגם כטריגר לבקשת ביקורת בגוגל.
 */
export const CLOSED_STATUSES: readonly string[] = [
  'פסק דין',
  'הסכם פשרה',
  'תיק נסגר',
  'ארכיון',
]

export const isClosed = (status: string | null | undefined): boolean =>
  !!status && CLOSED_STATUSES.includes(status)

/** צבעי תגית לכל סטטוס — גרסת bg+text בלבד (טבלאות ורשימות) */
export const STATUS_BADGE: Record<string, string> = {
  'תיק נכנס': 'bg-slate-100 text-slate-600',
  'עריכת כתב תביעה': 'bg-yellow-100 text-yellow-700',
  'מעקב מספר הליך בנט': 'bg-blue-100 text-blue-700',
  'מסירה אישית/דואר ישראל': 'bg-orange-100 text-orange-700',
  'הודעה על המצאה': 'bg-purple-100 text-purple-700',
  'תצהיר גילוי מסמכים': 'bg-indigo-100 text-indigo-700',
  'תצהיר עדות ראשית': 'bg-pink-100 text-pink-700',
  'הוכחות': 'bg-red-100 text-red-700',
  'סיכומים': 'bg-amber-100 text-amber-700',
  'פסק דין': 'bg-green-100 text-green-700',
  'הסכם פשרה': 'bg-teal-100 text-teal-700',
  'תיק נסגר': 'bg-emerald-100 text-emerald-700',
  'ארכיון': 'bg-slate-100 text-slate-400',
}

/** צבעי תגית מורחבים עם נקודה — למסך התיק ולבורר הסטטוס */
export const STATUS_COLOR: Record<string, { bg: string; text: string; dot: string }> = {
  'תיק נכנס': { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  'עריכת כתב תביעה': { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  'מעקב מספר הליך בנט': { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  'מסירה אישית/דואר ישראל': { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  'הודעה על המצאה': { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
  'תצהיר גילוי מסמכים': { bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  'תצהיר עדות ראשית': { bg: 'bg-pink-100', text: 'text-pink-700', dot: 'bg-pink-500' },
  'הוכחות': { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  'סיכומים': { bg: 'bg-violet-100', text: 'text-violet-700', dot: 'bg-violet-500' },
  'פסק דין': { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  'הסכם פשרה': { bg: 'bg-teal-100', text: 'text-teal-700', dot: 'bg-teal-500' },
  'תיק נסגר': { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'ארכיון': { bg: 'bg-slate-100', text: 'text-slate-400', dot: 'bg-slate-300' },
}
