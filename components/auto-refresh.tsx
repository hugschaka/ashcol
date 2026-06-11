"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// polling כל 5 שניות על שיעורים פעילים (בעיבוד/בעריכה); רענון כשסטטוס משתנה
export function AutoRefresh({
  lessons,
}: {
  lessons: { id: string; status: string }[];
}) {
  const router = useRouter();

  useEffect(() => {
    if (lessons.length === 0) return;
    const timer = setInterval(async () => {
      for (const lesson of lessons) {
        try {
          const res = await fetch(`/api/lessons/${lesson.id}/status`);
          if (!res.ok) continue;
          const data = await res.json();
          if (data.status !== lesson.status) {
            router.refresh();
            return;
          }
        } catch {
          // שגיאת רשת רגעית — ננסה שוב בסבב הבא
        }
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [lessons, router]);

  return null;
}
