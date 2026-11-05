import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Frameforge — Make your next video",
  description: "Turn a written idea into a video. Plan, generate, and keep your video work in one calm, creative workspace.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
