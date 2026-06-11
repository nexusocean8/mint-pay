'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  api,
  type Invoice,
  type InvoiceListResponse,
  type InvoiceStatus,
} from '@/lib/api';
import { useChain } from '@/lib/chain-context';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

const STATUSES: InvoiceStatus[] = [
  'pending',
  'seen',
  'confirmed',
  'underpaid',
  'expired',
  'cancelled',
];
const LIMIT = 20;

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  pending: 'bg-zinc-700 text-zinc-200',
  seen: 'bg-blue-900 text-blue-300',
  confirmed: 'bg-emerald-900 text-emerald-300',
  underpaid: 'bg-yellow-900 text-yellow-300',
  expired: 'bg-zinc-800 text-zinc-400',
  cancelled: 'bg-red-900 text-red-300',
};

async function fetchInvoices(
  chain: string,
  status: string | null,
  page: number,
): Promise<InvoiceListResponse> {
  const { data } = await api.get('/invoices', {
    params: { chain, ...(status ? { status } : {}), page, limit: LIMIT },
  });
  return data;
}

function formatAtomic(
  atomic: string,
  decimals: number,
  ticker: string,
): string {
  const divisor = Math.pow(10, decimals);
  const val = (Number(atomic) / divisor)
    .toFixed(decimals)
    .replace(/\.?0+$/, '');
  return `${val} ${ticker.toUpperCase()}`;
}

export default function InvoicesPage() {
  const { chain } = useChain();
  const [status, setStatus] = useState<InvoiceStatus | null>(null);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Invoice | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', chain, status, page],
    queryFn: () => fetchInvoices(chain, status, page),
  });

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1;

  function handleStatusFilter(s: InvoiceStatus) {
    setStatus((prev) => (prev === s ? null : s));
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-zinc-100">Invoices</h1>

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => handleStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              status === s
                ? STATUS_STYLES[s]
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-xs text-zinc-500">
              <th className="px-4 py-3 text-left font-medium">ID</th>
              <th className="px-4 py-3 text-left font-medium">Amount</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Created</th>
              <th className="px-4 py-3 text-left font-medium">Expires</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-zinc-800">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div
                        className="h-3 bg-zinc-800 rounded animate-pulse"
                        style={{ width: `${60 + (((i + j) * 7) % 30)}%` }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : data?.data.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-zinc-500 text-sm"
                >
                  No invoices found
                </td>
              </tr>
            ) : (
              data?.data.map((inv) => (
                <tr
                  key={inv.id}
                  onClick={() => setSelected(inv)}
                  className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800/50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                    {inv.id.slice(-8)}
                  </td>
                  <td className="px-4 py-3 text-zinc-200">
                    {formatAtomic(
                      inv.amountAtomic,
                      inv.assetDecimals,
                      inv.asset,
                    )}
                    <span className="ml-2 text-xs text-zinc-500">
                      {inv.amountFiat} {inv.fiatCurrency}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">
                    {fmt(inv.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">
                    {fmt(inv.expiresAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>{data ? `${data.total} total` : '—'}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-1 rounded hover:text-zinc-200 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-1 rounded hover:text-zinc-200 disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {selected && (
        <InvoiceDetail invoice={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}

function InvoiceDetail({
  invoice,
  onClose,
}: {
  invoice: Invoice;
  onClose: () => void;
}) {
  const ticker = invoice.asset.toUpperCase();
  const rows: [string, string][] = [
    ['ID', invoice.id],
    ['Chain', invoice.chain],
    ['Address', invoice.address],
    [
      'Amount',
      formatAtomic(invoice.amountAtomic, invoice.assetDecimals, ticker),
    ],
    [
      'Received',
      formatAtomic(invoice.receivedAtomic, invoice.assetDecimals, ticker),
    ],
    ['Amount (Fiat)', `${invoice.amountFiat} ${invoice.fiatCurrency}`],
    ['Rate', `${invoice.rate} ${ticker}/${invoice.fiatCurrency}`],
    ['Status', invoice.status],
    [
      'Confirmations',
      `${invoice.confirmations} / ${invoice.confirmationsRequired}`,
    ],
    ['Created', fmt(invoice.createdAt)],
    ['Expires', fmt(invoice.expiresAt)],
    ...(invoice.firstSeenAt
      ? [['First seen', fmt(invoice.firstSeenAt)] as [string, string]]
      : []),
    ...(invoice.paidAt
      ? [['Paid', fmt(invoice.paidAt)] as [string, string]]
      : []),
    ...(invoice.chainData?.txHash
      ? [['Tx Hash', String(invoice.chainData.txHash)] as [string, string]]
      : []),
  ];

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 w-full max-w-lg space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-200">Invoice Detail</h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="space-y-2">
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="flex gap-4 py-1.5 border-b border-zinc-800 last:border-0"
            >
              <span className="text-xs text-zinc-500 w-32 shrink-0">
                {label}
              </span>
              <span className="text-xs font-mono text-zinc-200 break-all">
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
