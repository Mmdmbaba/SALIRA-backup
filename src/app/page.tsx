"use client";

import { motion } from "framer-motion";
import { useLangDirSync, useLang } from "@/lib/lang-store";
import { useViewSync, useAppView } from "@/lib/view-store";
import { BackgroundFX, ScrollProgress } from "@/components/salira/background-fx";
import { NavRail, MobileDock } from "@/components/salira/nav-rail";
import { AppHeader, StatusBar, useStatusModalStore } from "@/components/salira/app-header";
import { HomeView, LabView, FaqView } from "@/components/salira/views";
import { AwgGenerator } from "@/components/salira/awg-generator";
import { IpScanner } from "@/components/salira/ip-scanner";
import { ProxyWizard } from "@/components/salira/proxy-wizard";
import { SectionHeading } from "@/components/salira/sections";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useLang as useLangStore } from "@/lib/lang-store";
import { t } from "@/lib/i18n";

const ease = [0.22, 1, 0.36, 1] as const;

/** Mount-only entrance (no exit animation — avoids stuck-invisible states). */
function ViewFade({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease }}
    >
      {children}
    </motion.div>
  );
}

function GeneratorPage() {
  const lang = useLangStore((s) => s.lang);
  const tr = t(lang);
  return (
    <div className="mx-auto max-w-6xl px-5 pb-10 pt-10 lg:px-8">
      <SectionHeading kicker={tr.gen_kicker} title={tr.gen_title} sub={tr.gen_sub} />
      <div className="mt-10">
        <AwgGenerator />
      </div>
    </div>
  );
}

function ScannerPage() {
  const lang = useLangStore((s) => s.lang);
  const tr = t(lang);
  return (
    <div className="mx-auto max-w-6xl px-5 pb-10 pt-10 lg:px-8">
      <SectionHeading kicker={tr.scan_kicker} title={tr.scan_title} sub={tr.scan_sub} />
      <div className="mt-10">
        <IpScanner />
      </div>
    </div>
  );
}

function ProxyPage() {
  const lang = useLangStore((s) => s.lang);
  const tr = t(lang);
  return (
    <div className="mx-auto max-w-6xl px-5 pb-10 pt-10 lg:px-8">
      <SectionHeading kicker={tr.px_kicker} title={tr.px_title} sub={tr.px_sub} />
      <div className="mt-10">
        <ProxyWizard />
      </div>
    </div>
  );
}

function ActiveView() {
  const view = useAppView((s) => s.view);
  switch (view) {
    case "generator":
      return <GeneratorPage />;
    case "scanner":
      return <ScannerPage />;
    case "proxy":
      return <ProxyPage />;
    case "lab":
      return <LabView />;
    case "faq":
      return <FaqView />;
    default:
      return <HomeView />;
  }
}

function TrustDialogs() {
  const lang = useLangStore((s) => s.lang);
  const tr = t(lang);
  const modal = useStatusModalStore((s) => s.kind);
  const close = useStatusModalStore((s) => s.close);

  return (
    <Dialog open={modal !== null} onOpenChange={(o) => !o && close()}>
      <DialogContent className="border-line bg-popover sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-[19px] tracking-wide text-goldsoft">
            {modal === "privacy" ? tr.privacy_title : tr.terms_title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {modal === "privacy" ? tr.privacy_title : tr.terms_title}
          </DialogDescription>
        </DialogHeader>
        <p className="max-h-[50vh] overflow-y-auto text-[13px] leading-8 text-ink/65">
          {modal === "privacy" ? tr.privacy_body : tr.terms_body}
        </p>
      </DialogContent>
    </Dialog>
  );
}

export default function Home() {
  useLangDirSync();
  const lang = useLangStore((s) => s.lang);
  useViewSync(lang);
  const view = useAppView((s) => s.view);

  return (
    <div className="relative flex min-h-screen flex-col">
      <BackgroundFX />
      <ScrollProgress />
      <NavRail />
      <AppHeader />

      <main className="flex-1 pb-2 md:ps-[104px]">
        <ViewFade key={view}>
          <ActiveView />
        </ViewFade>
      </main>

      <StatusBar />
      <MobileDock />
      <TrustDialogs />
    </div>
  );
}
