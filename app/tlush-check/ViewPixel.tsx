"use client";

import { useEffect } from "react";

/**
 * אירוע צפייה בדף המכירה.
 *
 * בלי זה השלב האמצעי במשפך אינו נמדד בכלל: רואים מי לחץ על
 * המודעה ומי הגיע לקופה, ולא רואים כמה מהם בכלל פתחו את דף
 * המכירה. זו החוליה שמגלה אם הבעיה במודעה או בדף.
 *
 * משמש גם כקהל לריטרגטינג: מי שקרא את הדף ולא קנה הוא הקהל
 * החם ביותר שיש.
 */
export default function ViewPixel() {
  useEffect(() => {
    const w = window as unknown as {
      fbq?: (...a: unknown[]) => void;
      ttq?: { track: (...a: unknown[]) => void };
    };
    try {
      w.fbq?.("track", "ViewContent", {
        content_name: "תחשיב חוסרים, דף מכירה",
        content_category: "tahshiv",
      });
      w.ttq?.track("ViewContent", { content_name: "tahshiv-sales" });
    } catch {
      // מדידה לעולם לא חוסמת את הדף
    }
  }, []);

  return null;
}
