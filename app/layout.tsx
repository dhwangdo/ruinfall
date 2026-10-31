import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_DESCRIPTION = "Ruinfall은 덱빌딩 탐험 게임입니다. 적을 쓰러뜨리고, 카드를 수집하세요. 발견한 덱에서 카드를 추출하고, 자신만의 덱을 만드세요. 여러 개의 덱을 준비하고 더 깊은 곳으로 내려가, 세계의 비밀을 밝혀내세요. 그 끝에서, 당신은 별에 닿을 수 있을까요?";

export const metadata: Metadata = {
  title: "Ruinfall",
  description: SITE_DESCRIPTION,
  openGraph: {
    title: "Ruinfall",
    description: SITE_DESCRIPTION,
    url: "https://dhwangdo.github.io/ruinfall/",
    siteName: "Ruinfall",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Ruinfall",
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(()=>{try{
              const root=document.documentElement;
              const syncViewport=()=>root.style.setProperty("--mobile-visual-viewport-height",(window.visualViewport?.height??window.innerHeight)+"px");
              syncViewport();
              window.addEventListener("resize",syncViewport,{passive:true});
              window.addEventListener("orientationchange",syncViewport,{passive:true});
              window.visualViewport?.addEventListener("resize",syncViewport,{passive:true});
              window.visualViewport?.addEventListener("scroll",syncViewport,{passive:true});
              const forced=new URLSearchParams(location.search).get("device");
              const ua=navigator.userAgent||"";
              const mobile=navigator.userAgentData?.mobile??/(Android.*Mobile|iPhone|iPad|iPod|IEMobile|Windows Phone|Opera Mini)/i.test(ua);
              root.dataset.deviceMode=forced==="mobile"||forced!=="desktop"&&mobile?"mobile":"desktop"
            }catch{document.documentElement.dataset.deviceMode="desktop"}})();`,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
        <div className="mobile-landscape-notice" role="status">
          <div>
            <strong>가로 화면으로 플레이하세요</strong>
            <span>휴대폰을 가로로 돌려 주세요.</span>
          </div>
        </div>
      </body>
    </html>
  );
}
