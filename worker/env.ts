// חייב להיות ה-import הראשון ב-index.ts — imports מורמים, אז טעינת env
// בקובץ side-effect נפרד מבטיחה שהיא רצה לפני יצירת ה-Prisma client
import { config } from "dotenv";

config({ path: [".env.local", ".env"] });
