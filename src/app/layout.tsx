import type { Metadata } from "next";
import "./globals.css";
import { getSessionUser } from "@/lib/auth";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "LesTrajecten",
  description: "Bouw complete lestrajecten op basis van kwalificatiedossiers, met AI-ondersteuning.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  return (
    <html lang="nl">
      <body>
        {user && <Navbar user={user} />}
        <main className={user ? "max-w-7xl mx-auto px-4 py-8" : ""}>{children}</main>
      </body>
    </html>
  );
}
