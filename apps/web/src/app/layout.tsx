import type { Metadata } from "next";
import { color, radius, spacing } from "@vobby/ui-tokens";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vobby",
  description: "사진만 있으면 여행 타임라인과 숏폼이 자동으로 만들어져요",
};

// ui-tokens를 CSS 변수로 주입 — 웹 스타일은 이 변수만 참조한다 (design §0-3)
const tokenCss = `:root{
  --color-text-primary:${color.textPrimary};
  --color-text-secondary:${color.textSecondary};
  --color-text-inverse:${color.textInverse};
  --color-bg-base:${color.bgBase};
  --color-bg-subtle:${color.bgSubtle};
  --color-border:${color.border};
  --color-primary:${color.primary};
  --color-danger:${color.danger};
  --radius-md:${radius.md}px;
  --radius-lg:${radius.lg}px;
  --spacing-md:${spacing.md}px;
  --spacing-lg:${spacing.lg}px;
  --spacing-xl:${spacing.xl}px;
}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <style dangerouslySetInnerHTML={{ __html: tokenCss }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
