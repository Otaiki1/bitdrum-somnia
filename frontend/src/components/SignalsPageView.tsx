'use client';

import { BrainCircuit, Radar, Waves } from 'lucide-react';
import { usePom } from '../hooks/usePom';
import { useSignal } from '../hooks/useSignal';
import { MarketFeed } from './SocialFeed';
import { Eyebrow, Panel, StatPill } from './ObsidianPrimitives';

export function SignalsPageView() {
  const { data: signalData, isLoading } = useSignal(null, 'UP', '1');
  const { data: pomData } = usePom(null, 'UP', '1');
  const signal = signalData?.signal;
  const pom = pomData?.pom;

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Panel tone="core" className="surface-lift p-5 sm:p-6">
        <Eyebrow accent="core">The Core</Eyebrow>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-heading text-[2rem] font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
            Central intelligence module
          </h2>
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(34,211,238,0.18)] bg-[rgba(34,211,238,0.08)] px-3 py-1.5 text-[0.66rem] uppercase tracking-[0.26em] text-[var(--accent-cyan)]">
            <Waves className="h-3.5 w-3.5" />
            {isLoading ? 'Syncing' : 'Live'}
          </div>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="flex justify-center">
            <div className="core-ring h-[15rem] w-[15rem]">
              <div className="core-ring__inner">
                <span className="text-[0.72rem] uppercase tracking-[0.32em] text-[var(--accent-cyan)]">
                  {signal?.direction || 'NEUTRAL'}
                </span>
                <strong className="mt-3 font-mono text-5xl font-semibold text-[var(--text-primary)]">
                  {signal?.confidence ?? 0}%
                </strong>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <Panel className="p-5">
              <div className="flex items-center gap-2 text-[0.68rem] uppercase tracking-[0.3em] text-[var(--accent-cyan)]">
                <BrainCircuit className="h-4 w-4" />
                Rationale
              </div>
              <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
                {signal?.rationale || 'Signal preview is calibrating from live market structure and trader alignment.'}
              </p>
            </Panel>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatPill label="Direction" value={signal?.direction || 'NEUTRAL'} accent="core" />
              <StatPill label="Confidence" value={`${signal?.confidence ?? 0}%`} accent="core" />
              <StatPill label="POM" value={`+${((pom?.pom_profit_bps ?? 0) / 100).toFixed(0)}%`} accent="gold" />
            </div>
          </div>
        </div>
      </Panel>

      <Panel className="surface-lift p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <Radar className="h-5 w-5 text-[var(--accent-core)]" />
          <div>
            <Eyebrow accent="core">Signal Inputs</Eyebrow>
            <h3 className="mt-2 font-heading text-[1.5rem] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
              Live oracle lane
            </h3>
          </div>
        </div>
        <div className="mt-5">
          <MarketFeed />
        </div>
      </Panel>
    </div>
  );
}
