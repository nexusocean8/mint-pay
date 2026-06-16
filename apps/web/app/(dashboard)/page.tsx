'use client';

import { useQuery } from '@tanstack/react-query';
import { api, type HealthReady, type HealthSynced } from '@/lib/api';
import { useChain } from '@/lib/chain-context';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface HealthResponse {
  live: { status: string };
  ready: HealthReady;
  synced: HealthSynced;
}

interface Stats {
  confirmedVolumeAtomic: string;
  balance?: number;
}

async function fetchHealth(chain: string): Promise<HealthResponse> {
  const { data } = await api.get('/health', { params: { chain } });
  return data;
}

async function fetchStats(chain: string): Promise<Stats> {
  const { data } = await api.get('/stats', { params: { chain } });
  return data;
}

export default function OverviewPage() {
  const { chain } = useChain();
  const { data, isLoading } = useQuery({
    queryKey: ['health', chain],
    queryFn: () => fetchHealth(chain),
    refetchInterval: 10_000,
  });

  const { data: stats } = useQuery({
    queryKey: ['stats', chain],
    queryFn: () => fetchStats(chain),
    refetchInterval: 15_000,
  });

  const live = data?.live;
  const ready = data?.ready;
  const synced = data?.synced;

  return (
    <div className="space-y-8">
      <h1 className="text-lg font-semibold text-zinc-100">Overview</h1>

      <div className="grid grid-cols-3 gap-4">
        <StatusCard label="Live" status={live?.status} loading={isLoading} />
        <StatusCard label="Ready" status={ready?.status} loading={isLoading} />
        <StatusCard
          label="Syncing"
          status={synced?.status}
          loading={isLoading}
        />
      </div>

      {ready && (
        <Section title="Readiness Checks">
          <div className="space-y-2">
            {Object.entries(ready.checks).map(([key, check]) => (
              <CheckRow
                key={key}
                label={key.charAt(0).toUpperCase() + key.slice(1)}
                ok={check.ok}
              />
            ))}
          </div>
        </Section>
      )}

      {synced && chain === 'xmr' && (
        <Section title="Sync Status">
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-4">
              <Stat
                label="Block height"
                value={synced.daemonHeight.toLocaleString()}
              />
              <Stat
                label="Wallet height"
                value={synced.walletHeight.toLocaleString()}
              />
              <Stat
                label="Total volume"
                value={
                  stats
                    ? `${(Number(stats.confirmedVolumeAtomic) / 1e12).toFixed(3)} XMR`
                    : '—'
                }
              />
            </div>
            <SyncBar
              walletHeight={synced.walletHeight}
              daemonHeight={synced.daemonHeight}
            />
          </div>
        </Section>
      )}

      {stats?.balance && chain === 'firo' && (
        <Section title="Node Status">
          <div className="grid grid-cols-3 gap-4">
            <Stat
              label="Block height"
              value={synced ? synced.daemonHeight.toLocaleString() : '—'}
            />
            <Stat
              label="Current balance"
              value={`${stats.balance.toFixed(3)} FIRO`}
            />
            <Stat
              label="Total volume"
              value={`${(Number(stats.confirmedVolumeAtomic) / 1e8).toFixed(3)} FIRO`}
            />
          </div>
        </Section>
      )}
    </div>
  );
}

function StatusCard({
  label,
  status,
  loading,
}: {
  label: string;
  status?: string;
  loading: boolean;
}) {
  const ok = status === 'ok';
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-5 py-4 flex items-center justify-between">
      <span className="text-sm text-zinc-400">{label}</span>
      {loading ? (
        <span className="text-xs text-zinc-500">—</span>
      ) : ok ? (
        <span className="flex items-center gap-1.5 text-xs text-emerald-400">
          <CheckCircle size={14} /> ok
        </span>
      ) : (
        <span className="flex items-center gap-1.5 text-xs text-red-400">
          <XCircle size={14} /> no
        </span>
      )}
    </div>
  );
}

function CheckRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-zinc-800 last:border-0">
      <span className="text-sm text-zinc-300">{label}</span>
      <div className="flex items-center gap-2">
        {ok ? (
          <span className="flex items-center gap-1 text-xs text-emerald-400">
            <CheckCircle size={13} /> ok
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-red-400">
            <AlertCircle size={13} /> no
          </span>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-800/50 rounded-md px-4 py-3">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className="text-sm font-mono text-zinc-100">{value}</p>
    </div>
  );
}

function SyncBar({
  walletHeight,
  daemonHeight,
}: {
  walletHeight: number;
  daemonHeight: number;
}) {
  const pct =
    daemonHeight > 0 ? Math.min((walletHeight / daemonHeight) * 100, 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs text-zinc-500 mb-1">
        <span>Sync progress</span>
        <span>{pct.toFixed(2)}%</span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-4">
      <h2 className="text-sm font-medium text-zinc-400">{title}</h2>
      {children}
    </div>
  );
}
