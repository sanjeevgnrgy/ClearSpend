'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MotionConfig } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { HeroSection } from '@/components/HeroSection';
import { CapabilitiesBento } from '@/components/CapabilitiesBento';
import { LiveSandbox } from '@/components/LiveSandbox';
import { ProofAndSecurity } from '@/components/ProofAndSecurity';
import { PricingAndTrial, PlanTier } from '@/components/PricingAndTrial';
import { Footer } from '@/components/Footer';
import { AppPage } from '@/types/clearspend';
import { useClearspend } from '@/context/ClearspendProvider';

export default function LandingPage() {
  const router = useRouter();
  const { setActiveWorkspacePage, setAgentChatOpen } = useClearspend();
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>('Pro & Teams');

  function openWorkspace(page: AppPage = 'overview') {
    setActiveWorkspacePage(page);
    router.push(`/workspace?tab=${page}`);
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[#FAFAFA] text-zinc-900 flex flex-col">
        <Navbar onOpenWorkspace={openWorkspace} />
        <main className="flex-1">
          <HeroSection onOpenWorkspace={openWorkspace} />
          <CapabilitiesBento onOpenWorkspace={openWorkspace} />
          <LiveSandbox onOpenWorkspace={openWorkspace} />
          <ProofAndSecurity />
          <PricingAndTrial
            selectedPlan={selectedPlan}
            onSelectPlan={setSelectedPlan}
          />
        </main>
        <Footer onOpenWorkspace={openWorkspace} />

        <button
          type="button"
          onClick={() => setAgentChatOpen(true)}
          aria-label="Open Clearspend Agent Chat"
          className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 px-4 py-3 text-sm font-medium text-white bg-zinc-900 hover:bg-emerald-800 rounded-full shadow-lg transition-colors cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-emerald-300" aria-hidden="true" />
          <span>Ask Agent</span>
        </button>
      </div>
    </MotionConfig>
  );
}
