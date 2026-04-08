'use client';

import { ArrowRight, Bot, BrainCircuit, Crown, Radar, Trophy, Waves, Zap } from 'lucide-react';
import { AppLink, BrandMark, Panel, SectionTitle, StatPill } from './ObsidianPrimitives';

const topTraders = [
  { name: 'Oracle Zero', tier: 'ORACLE', score: '+18.4%', accent: 'gold' as const },
  { name: 'Signal Weaver', tier: 'PROPHET', score: '+11.2%', accent: 'core' as const },
  { name: 'Northbound', tier: 'TRADER', score: '+7.9%', accent: 'success' as const },
];

export function LandingPage() {
  return (
    <div className="relative overflow-hidden border-b border-[color:var(--border-subtle)]">
      <div className="landing-grid pointer-events-none absolute inset-0 opacity-60" />
      <div className="pointer-events-none absolute inset-x-0 top-[-10rem] h-[28rem] bg-[radial-gradient(circle_at_top,rgba(245,185,66,0.18),transparent_52%)]" />
      <div className="pointer-events-none absolute right-0 top-[18%] h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.12),transparent_62%)] blur-3xl" />

      <section className="mx-auto grid min-h-[100svh] max-w-[1400px] gap-12 px-6 pb-20 pt-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:pt-12">
        <div className="flex flex-col justify-center">
          <BrandMark className="mb-12" />
          <div className="max-w-3xl">
            <p className="mb-5 text-[0.72rem] uppercase tracking-[0.34em] text-[var(--accent-gold)]">
              Precision Bitcoin Prediction Protocol
            </p>
            <h1 className="font-heading text-[clamp(3.1rem,6vw,6.4rem)] font-semibold leading-[0.9] tracking-[-0.08em] text-[var(--text-primary)]">
              Make the Call.
              <br />
              Beat the Market.
            </h1>
            <p className="mt-7 max-w-2xl text-[1.08rem] leading-8 text-[var(--text-secondary)]">
              AI-powered Bitcoin predictions. Stake on direction. Win on conviction.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <AppLink href="#app">Enter App</AppLink>
              <AppLink href="#live-markets" variant="secondary">
                View Live Markets
              </AppLink>
            </div>
            <div className="mt-10 flex flex-wrap gap-3">
              <StatPill label="Settlement" value="Somnia" accent="gold" />
              <StatPill label="Signal Layer" value="The Core" accent="core" />
              <StatPill label="Rounds" value="30s / 1m / 5m" />
            </div>
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          <Panel tone="core" className="relative w-full max-w-[36rem] overflow-hidden p-8 lg:p-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_34%,rgba(59,130,246,0.18),transparent_38%),radial-gradient(circle_at_50%_80%,rgba(245,185,66,0.1),transparent_46%)]" />
            <div className="pointer-events-none absolute inset-x-8 top-9 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.16),transparent)]" />
            <div className="relative">
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <p className="text-[0.68rem] uppercase tracking-[0.34em] text-[var(--accent-core)]">Live Core Pulse</p>
                  <h3 className="mt-3 font-heading text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
                    The Core
                  </h3>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(34,211,238,0.18)] bg-[rgba(34,211,238,0.08)] px-3 py-1.5 text-[0.68rem] uppercase tracking-[0.26em] text-[var(--accent-cyan)]">
                  <Waves className="h-3.5 w-3.5" />
                  Streaming
                </div>
              </div>

              <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="flex items-center justify-center">
                  <div className="core-ring">
                    <div className="core-ring__inner">
                      <span className="text-[0.7rem] uppercase tracking-[0.32em] text-[var(--accent-cyan)]">Bullish</span>
                      <strong className="mt-3 font-mono text-5xl font-semibold text-[var(--text-primary)]">82%</strong>
                    </div>
                  </div>
                </div>
                <div className="space-y-5">
                  <div className="rounded-[1.8rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-[0.68rem] uppercase tracking-[0.3em] text-[var(--text-muted)]">Direction</span>
                      <span className="text-[0.74rem] uppercase tracking-[0.24em] text-[var(--state-up)]">UP Bias</span>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
                      The Core analyzes market signals in real-time, combining momentum, order flow,
                      and high-performing trader alignment into a single decisive call.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[1.4rem] border border-[color:var(--border-subtle)] bg-[rgba(255,255,255,0.02)] p-4">
                      <Bot className="h-4 w-4 text-[var(--accent-core)]" />
                      <p className="mt-3 text-[0.68rem] uppercase tracking-[0.3em] text-[var(--text-muted)]">Direction</p>
                      <p className="mt-2 font-mono text-lg text-[var(--text-primary)]">UP</p>
                    </div>
                    <div className="rounded-[1.4rem] border border-[color:var(--border-subtle)] bg-[rgba(255,255,255,0.02)] p-4">
                      <Radar className="h-4 w-4 text-[var(--accent-cyan)]" />
                      <p className="mt-3 text-[0.68rem] uppercase tracking-[0.3em] text-[var(--text-muted)]">Confidence</p>
                      <p className="mt-2 font-mono text-lg text-[var(--text-primary)]">82%</p>
                    </div>
                    <div className="rounded-[1.4rem] border border-[color:var(--border-subtle)] bg-[rgba(255,255,255,0.02)] p-4">
                      <Zap className="h-4 w-4 text-[var(--accent-gold)]" />
                      <p className="mt-3 text-[0.68rem] uppercase tracking-[0.3em] text-[var(--text-muted)]">Profit Edge</p>
                      <p className="mt-2 font-mono text-lg text-[var(--text-primary)]">+48%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-24 lg:px-10">
        <SectionTitle
          eyebrow="How It Works"
          title="Three fast decisions. One sharp outcome."
          description="BitDrum is built for traders who want speed, clarity, and conviction without noise."
        />

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {[
            { icon: BrainCircuit, title: 'Choose Direction', body: 'Read the Core. Decide whether BTC finishes higher or lower.' },
            { icon: Zap, title: 'Stake Your Position', body: 'Commit your STT stake and lock into the round with one action.' },
            { icon: Trophy, title: 'Settle With Finality', body: 'When the round closes, Somnia settles the market and your result is recorded instantly.' },
          ].map((item, index) => (
            <Panel key={item.title} className="relative overflow-hidden p-7">
              <div className="absolute right-6 top-5 text-[4rem] font-heading leading-none tracking-[-0.1em] text-white/5">
                0{index + 1}
              </div>
              <item.icon className="h-6 w-6 text-[var(--accent-gold)]" />
              <h3 className="mt-10 font-heading text-[1.45rem] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                {item.title}
              </h3>
              <p className="mt-4 max-w-sm text-sm leading-7 text-[var(--text-secondary)]">{item.body}</p>
            </Panel>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-24 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <Panel tone="core" className="p-8 lg:p-10">
            <SectionTitle
              eyebrow="The Core"
              accent="core"
              title="A market intelligence layer built to feel alive."
              description="Direction, confidence, momentum, and rationale are rendered as a live decision engine, not a passive badge."
            />
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.6rem] border border-[rgba(59,130,246,0.18)] bg-[rgba(59,130,246,0.09)] p-5">
                <p className="text-[0.68rem] uppercase tracking-[0.3em] text-[var(--accent-cyan)]">Current Call</p>
                <div className="mt-4 flex items-end gap-3">
                  <span className="font-heading text-4xl font-semibold tracking-[-0.06em] text-[var(--text-primary)]">UP</span>
                  <span className="font-mono text-lg text-[var(--accent-core)]">82%</span>
                </div>
              </div>
              <div className="rounded-[1.6rem] border border-[color:var(--border-subtle)] bg-[rgba(255,255,255,0.02)] p-5">
                <p className="text-[0.68rem] uppercase tracking-[0.3em] text-[var(--text-muted)]">Pulse State</p>
                <div className="mt-5 flex gap-2">
                  {Array.from({ length: 10 }).map((_, index) => (
                    <span
                      key={index}
                      className="pulse-bar"
                      style={{ animationDelay: `${index * 90}ms`, opacity: 0.35 + index * 0.06 }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </Panel>

          <Panel className="p-8">
            <SectionTitle
              eyebrow="Social Proof"
              title="Top traders set the tone for the week."
              description="Merit matters. Reputation compounds. The best traders rise visibly."
              accent="gold"
            />
            <div className="mt-8 flex flex-col gap-3">
              {topTraders.map((trader, index) => (
                <div
                  key={trader.name}
                  className="flex items-center justify-between rounded-[1.4rem] border border-[color:var(--border-subtle)] bg-[rgba(255,255,255,0.03)] px-4 py-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0d0d0d] font-mono text-sm text-[var(--text-secondary)]">
                      #{index + 1}
                    </div>
                    <div>
                      <p className="font-heading text-xl tracking-[-0.04em] text-[var(--text-primary)]">{trader.name}</p>
                      <p className="text-[0.68rem] uppercase tracking-[0.3em] text-[var(--text-muted)]">{trader.tier}</p>
                    </div>
                  </div>
                  <StatPill label="Weekly" value={trader.score} accent={trader.accent} />
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 pb-28 pt-10 lg:px-10">
        <Panel tone="gold" className="flex flex-col items-start justify-between gap-8 px-8 py-10 lg:flex-row lg:items-center">
          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.34em] text-[var(--accent-gold)]">Final Call</p>
            <h3 className="mt-4 font-heading text-[clamp(2.1rem,4vw,4rem)] font-semibold leading-[0.95] tracking-[-0.06em] text-[var(--text-primary)]">
              Ready to make your call?
            </h3>
          </div>
          <AppLink href="#app" className="group">
            Enter Trading Arena
            <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </AppLink>
        </Panel>
      </section>
    </div>
  );
}
