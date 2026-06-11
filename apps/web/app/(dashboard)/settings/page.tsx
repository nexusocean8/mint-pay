'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type Settings } from '@/lib/api';
import { useChain } from '@/lib/chain-context';
import axios from 'axios';

const FIELDS: {
  key: keyof Settings;
  label: string;
  labelEvm?: string;
  unit: string;
}[] = [
  { key: 'confirmationDepth', label: 'Confirmation depth', unit: 'blocks' },
  {
    key: 'invoiceDefaultExpirySec',
    label: 'Invoice default expiry',
    unit: 'seconds',
  },
  { key: 'invoiceMaxExpirySec', label: 'Invoice max expiry', unit: 'seconds' },
  { key: 'scannerLockTtlMs', label: 'Scanner lock TTL', unit: 'ms' },
  {
    key: 'syncedThresholdBlocks',
    label: 'Sync threshold',
    unit: 'blocks',
  },
  { key: 'rateCacheTtlMs', label: 'Rate cache TTL', unit: 'ms' },
  { key: 'webhookMaxAttempts', label: 'Webhook max attempts', unit: 'retries' },
  { key: 'webhookTimeoutMs', label: 'Webhook timeout', unit: 'ms' },
];

function fetchSettings(chain: string): Promise<Settings> {
  return api.get('/settings', { params: { chain } }).then((r) => r.data);
}

export default function SettingsPage() {
  const { chain } = useChain();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['settings', chain],
    queryFn: () => fetchSettings(chain),
  });
  const [draft, setDraft] = useState<Settings | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(data ?? null);
  }, [data]);

  const mutation = useMutation({
    mutationFn: (values: Settings) =>
      api.put('/settings', values, { params: { chain } }).then((r) => r.data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['settings', chain], updated);
      setSaved(true);
      setSaveError(null);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (err) => {
      setSaveError(
        axios.isAxiosError(err)
          ? (err.response?.data?.message ?? 'Failed to save')
          : 'Failed to save',
      );
    },
  });

  function handleChange(key: keyof Settings, raw: string) {
    const value = parseInt(raw, 10);
    if (isNaN(value)) return;
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  if (isLoading || !draft)
    return <p className="text-sm text-zinc-500">Loading…</p>;

  const dirty = JSON.stringify(draft) !== JSON.stringify(data);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-100">Settings</h1>
        <div className="flex items-center gap-3">
          {saveError && <p className="text-xs text-red-400">{saveError}</p>}
          {saved && <p className="text-xs text-emerald-400">Saved</p>}
          <button
            onClick={() => mutation.mutate(draft)}
            disabled={!dirty || mutation.isPending}
            className="px-4 py-1.5 text-sm bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-md transition-colors"
          >
            {mutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg divide-y divide-zinc-800">
        {FIELDS.map(({ key, label, unit }) => {
          const fieldLabel =
            key === 'syncedThresholdBlocks' && chain === 'evm'
              ? 'Sync threshold'
              : label;
          return (
            <div key={key} className="flex items-center gap-4 px-5 py-3">
              <label className="text-sm text-zinc-300 w-52 shrink-0">
                {fieldLabel}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={draft[key]}
                  onChange={(e) => handleChange(key, e.target.value)}
                  className="w-36 bg-zinc-800 border border-zinc-700 rounded-md px-3 py-1.5 text-sm font-mono text-zinc-100 focus:outline-none focus:border-orange-400 transition-colors"
                />
                <span className="text-xs text-zinc-500">{unit}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
