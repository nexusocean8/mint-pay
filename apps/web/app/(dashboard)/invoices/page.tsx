'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Badge,
  Box,
  Group,
  Modal,
  Pagination,
  Paper,
  Skeleton,
  Stack,
  Table,
  Text,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import {
  api,
  type Invoice,
  type InvoiceListResponse,
  type InvoiceStatus,
} from '@/lib/api';
import { useChain } from '@/lib/chain-context';
import { CARD_BORDER, HEADING, MUTED, PRIMARY } from '@/lib/theme';

const STATUSES: InvoiceStatus[] = [
  'pending',
  'seen',
  'confirmed',
  'underpaid',
  'expired',
  'cancelled',
];

const LIMIT = 20;

const STATUS_COLORS: Record<
  InvoiceStatus,
  { color: string; bg: string; border: string }
> = {
  pending: {
    color: 'var(--mantine-color-dark-1)',
    bg: 'var(--mantine-color-dark-5)',
    border: 'var(--mantine-color-dark-4)',
  },
  seen: {
    color: '#93c5fd',
    bg: 'rgba(96,165,250,0.1)',
    border: 'rgba(96,165,250,0.25)',
  },
  confirmed: { color: PRIMARY, bg: `${PRIMARY}11`, border: `${PRIMARY}33` },
  underpaid: {
    color: '#fcd34d',
    bg: 'rgba(251,191,36,0.1)',
    border: 'rgba(251,191,36,0.25)',
  },
  expired: {
    color: 'var(--mantine-color-dark-2)',
    bg: 'var(--mantine-color-dark-6)',
    border: 'var(--mantine-color-dark-4)',
  },
  cancelled: {
    color: '#f87171',
    bg: 'rgba(248,113,113,0.1)',
    border: 'rgba(248,113,113,0.25)',
  },
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

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const s = STATUS_COLORS[status];
  return (
    <Text
      style={{
        display: 'inline-block',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: s.color,
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: 4,
        padding: '2px 8px',
        fontFamily: HEADING,
      }}
    >
      {status}
    </Text>
  );
}

export default function InvoicesPage() {
  const { chain } = useChain();
  const [status, setStatus] = useState<InvoiceStatus | null>(null);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [detailOpened, { open: openDetail, close: closeDetail }] =
    useDisclosure(false);

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', chain, status, page],
    queryFn: () => fetchInvoices(chain, status, page),
  });

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1;

  function handleStatusFilter(s: InvoiceStatus) {
    setStatus((prev) => (prev === s ? null : s));
    setPage(1);
  }

  function handleRowClick(inv: Invoice) {
    setSelected(inv);
    openDetail();
  }

  return (
    <Stack gap="xl">
      {/* Header */}
      <Title
        order={2}
        style={{ fontFamily: HEADING, letterSpacing: '-0.02em' }}
      >
        Invoices
      </Title>

      {/* Status filters */}
      <Group gap="xs">
        {STATUSES.map((s) => {
          const active = status === s;
          const sc = STATUS_COLORS[s];
          return (
            <UnstyledButton
              key={s}
              onClick={() => handleStatusFilter(s)}
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontFamily: HEADING,
                padding: '4px 12px',
                borderRadius: 99,
                border: `1px solid ${active ? sc.border : 'var(--mantine-color-dark-4)'}`,
                color: active ? sc.color : MUTED,
                background: active ? sc.bg : 'transparent',
                transition: 'all 150ms ease',
                cursor: 'pointer',
              }}
            >
              {s}
            </UnstyledButton>
          );
        })}
      </Group>

      {/* Table */}
      <Paper
        radius="sm"
        style={{
          background: 'var(--mantine-color-dark-7)',
          border: `1px solid var(--mantine-color-dark-5)`,
          overflow: 'hidden',
        }}
      >
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr
              style={{ borderBottom: `1px solid var(--mantine-color-dark-5)` }}
            >
              {['ID', 'Amount', 'Status', 'Created', 'Expires'].map((h) => (
                <Table.Th
                  key={h}
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: MUTED,
                    fontFamily: HEADING,
                    padding: '12px 16px',
                    borderBottom: 'none',
                  }}
                >
                  {h}
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Table.Tr key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Table.Td key={j} style={{ padding: '14px 16px' }}>
                      <Skeleton
                        height={12}
                        width={`${60 + (((i + j) * 7) % 30)}%`}
                        radius="sm"
                      />
                    </Table.Td>
                  ))}
                </Table.Tr>
              ))
            ) : data?.data.length === 0 ? (
              <Table.Tr>
                <Table.Td
                  colSpan={5}
                  style={{ padding: '40px 16px', textAlign: 'center' }}
                >
                  <Text size="sm" c="dimmed">
                    No invoices found
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              data?.data.map((inv) => (
                <Table.Tr
                  key={inv.id}
                  onClick={() => handleRowClick(inv)}
                  style={{ cursor: 'pointer' }}
                >
                  <Table.Td style={{ padding: '14px 16px' }}>
                    <Text
                      style={{
                        fontFamily: HEADING,
                        fontSize: 12,
                        color: MUTED,
                      }}
                    >
                      …{inv.id.slice(-8)}
                    </Text>
                  </Table.Td>
                  <Table.Td style={{ padding: '14px 16px' }}>
                    <Group gap={8}>
                      <Text size="sm" fw={600}>
                        {formatAtomic(
                          inv.amountAtomic,
                          inv.assetDecimals,
                          inv.asset,
                        )}
                      </Text>
                      <Text style={{ fontSize: 11, color: MUTED }}>
                        {inv.amountFiat.toFixed(2)} {inv.fiatCurrency}
                      </Text>
                    </Group>
                  </Table.Td>
                  <Table.Td style={{ padding: '14px 16px' }}>
                    <StatusBadge status={inv.status} />
                  </Table.Td>
                  <Table.Td style={{ padding: '14px 16px' }}>
                    <Text
                      style={{
                        fontSize: 12,
                        color: MUTED,
                        fontFamily: HEADING,
                      }}
                    >
                      {fmt(inv.createdAt)}
                    </Text>
                  </Table.Td>
                  <Table.Td style={{ padding: '14px 16px' }}>
                    <Text
                      style={{
                        fontSize: 12,
                        color: MUTED,
                        fontFamily: HEADING,
                      }}
                    >
                      {fmt(inv.expiresAt)}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Paper>

      {/* Pagination */}
      <Group justify="space-between">
        <Text style={{ fontSize: 12, color: MUTED, fontFamily: HEADING }}>
          {data ? `${data.total} total` : '—'}
        </Text>
        <Group gap={8}>
          <UnstyledButton
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              color: page === 1 ? 'var(--mantine-color-dark-3)' : MUTED,
              cursor: page === 1 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <IconChevronLeft size={16} />
          </UnstyledButton>
          <Text style={{ fontSize: 12, color: MUTED, fontFamily: HEADING }}>
            Page {page} of {totalPages}
          </Text>
          <UnstyledButton
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              color:
                page === totalPages ? 'var(--mantine-color-dark-3)' : MUTED,
              cursor: page === totalPages ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <IconChevronRight size={16} />
          </UnstyledButton>
        </Group>
      </Group>

      {/* Invoice detail modal */}
      <Modal
        opened={detailOpened}
        onClose={closeDetail}
        title={
          <Text style={{ fontFamily: HEADING, fontSize: 13, fontWeight: 600 }}>
            {'// Invoice Detail'}
          </Text>
        }
        size="lg"
        radius="sm"
        styles={{
          content: {
            background: 'var(--mantine-color-dark-7)',
            border: `1px solid ${CARD_BORDER}`,
          },
          header: {
            background: 'var(--mantine-color-dark-7)',
            borderBottom: `1px solid var(--mantine-color-dark-5)`,
          },
        }}
      >
        {selected && <InvoiceDetail invoice={selected} />}
      </Modal>
    </Stack>
  );
}

function InvoiceDetail({ invoice }: { invoice: Invoice }) {
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
      ? [['First Seen', fmt(invoice.firstSeenAt)] as [string, string]]
      : []),
    ...(invoice.paidAt
      ? [['Paid', fmt(invoice.paidAt)] as [string, string]]
      : []),
    ...(invoice.chainData?.txHash
      ? [['Tx Hash', String(invoice.chainData.txHash)] as [string, string]]
      : []),
  ];

  return (
    <Stack gap={0}>
      {rows.map(([label, value]) => (
        <Group
          key={label}
          gap="md"
          py="xs"
          style={{ borderBottom: `1px solid var(--mantine-color-dark-5)` }}
          wrap="nowrap"
          align="flex-start"
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: MUTED,
              fontFamily: HEADING,
              width: 120,
              flexShrink: 0,
            }}
          >
            {label}
          </Text>
          <Text
            style={{
              fontSize: 12,
              fontFamily: HEADING,
              color: 'var(--mantine-color-dark-0)',
              wordBreak: 'break-all',
            }}
          >
            {value}
          </Text>
        </Group>
      ))}
    </Stack>
  );
}
