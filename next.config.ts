import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (pdfjs) טוען קובץ worker בזמן ריצה; אם Next אורז אותו לתוך
  // ה-bundle, ה-worker לא נמצא ("fake worker failed"). משאירים אותו חיצוני
  // ב-node_modules כדי שהנתיב היחסי ל-pdf.worker יתפענח.
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
