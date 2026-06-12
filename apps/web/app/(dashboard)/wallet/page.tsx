'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  api,
  type WalletInfo,
  type XmrWalletInfo,
  type FiroWalletInfo,
} from '@/lib/api';
import { useChain } from '@/lib/chain-context';
import {
  Copy,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

async function fetchWallet(chain: string): Promise<WalletInfo> {
  const { data } = await api.get('/wallet', { params: { chain } });
  return data;
}

export default function WalletPage() {
  const { chain } = useChain();
  const { data, isLoading } = useQuery({
    queryKey: ['wallet', chain],
    queryFn: () => fetchWallet(chain),
    refetchInterval: 15_000,
  });

  if (isLoading) return <p className="text-sm text-zinc-500">Loading…</p>;
  if (!data)
    return <p className="text-sm text-red-400">Failed to load wallet info</p>;

  if (chain === 'firo') return <FiroWallet data={data as FiroWalletInfo} />;
  return <XmrWallet data={data as XmrWalletInfo} />;
}

function XmrWallet({ data }: { data: XmrWalletInfo }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-100">Wallet — XMR</h1>
        <Badge ok={data.synced}>{data.synced ? 'Synced' : 'Syncing'}</Badge>
      </div>
      <Section title="Keys & Identity">
        <Field
          label="Primary Address"
          value={data.primaryAddress}
          mono
          copyable
        />
        <Field label="View Key" value={data.viewKey} mono copyable masked />
        <Field
          label="Restore Height"
          value={data.restoreHeight.toLocaleString()}
          mono
        />
      </Section>
    </div>
  );
}

function FiroWallet({ data }: { data: FiroWalletInfo }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-100">Wallet — FIRO</h1>
      </div>
      <Section title="Node">
        <Field
          label="Block Height"
          value={data.blockHeight.toLocaleString()}
          mono
        />
        <Field label="Balance" value={`${data.balance} FIRO`} mono />
        <Field label="Keypool Size" value={data.keypoolSize.toString()} mono />
        {data.hdMasterKeyId && (
          <Field
            label="HD Master Key ID"
            value={data.hdMasterKeyId}
            mono
            copyable
          />
        )}
      </Section>
      <Section title="Backup">
        <div className="flex items-start gap-2 text-xs text-yellow-400">
          <AlertTriangle size={13} className="shrink-0 mt-0.5" />
          <span>
            To back up this wallet run{' '}
            <code className="font-mono bg-zinc-800 px-1 rounded">
              dumpwallet &lt;filename&gt;
            </code>{' '}
            directly on the node.
          </span>
        </div>
      </Section>
    </div>
  );
}

function Field({
  label,
  value,
  mono = false,
  copyable = false,
  masked = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  copyable?: boolean;
  masked?: boolean;
}) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const display = masked && !revealed ? '•'.repeat(16) : value;

  return (
    <div className="flex gap-4 py-2.5 border-b border-zinc-800 last:border-0 items-start">
      <span className="text-xs text-zinc-500 w-36 shrink-0 pt-0.5">
        {label}
      </span>
      <span
        className={`text-xs ${mono ? 'font-mono' : ''} text-zinc-200 break-all flex-1`}
      >
        {display}
      </span>
      <div className="flex items-center gap-2 shrink-0">
        {masked && (
          <button
            onClick={() => setRevealed((r) => !r)}
            className="text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            {revealed ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        )}
        {copyable && (
          <button
            onClick={copy}
            className="text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            {copied ? (
              <CheckCircle size={13} className="text-emerald-400" />
            ) : (
              <Copy size={13} />
            )}
          </button>
        )}
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
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-1">
      <h2 className="text-sm font-medium text-zinc-400 mb-3">{title}</h2>
      {children}
    </div>
  );
}

function Badge({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${
        ok
          ? 'bg-emerald-900/50 text-emerald-400'
          : 'bg-yellow-900/50 text-yellow-400'
      }`}
    >
      {ok ? <CheckCircle size={12} /> : <XCircle size={12} />}
      {children}
    </span>
  );
}
