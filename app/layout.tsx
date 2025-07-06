// app/layout.tsx
import { ReactNode } from "react";
import SupabaseProvider from "@/components/SupabaseProvider";
import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SupabaseProvider>
          {children}
        </SupabaseProvider>
      </body>
    </html>
  );
}
