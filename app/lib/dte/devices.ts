export type DeviceStatus = 'reference' | 'proposed';
export type DeviceGroup = 'System devices' | 'Processing devices' | 'Storage controllers' | 'Observability';

export interface DeviceDefinition {
  id: string;
  name: string;
  group: DeviceGroup;
  status: DeviceStatus;
  description: string;
  source: string;
  version: string;
  capabilities: string[];
  authority: string[];
  bars: Array<{ index: number; size: number; role: string }>;
  operations: string[];
}

const bounded = ['No guest-selected host paths', 'No DMA', 'No host process control'];

/** Documentation inventory, not a host hardware scan. "reference" means tested on Linux Bochs, not live. */
export const devices: DeviceDefinition[] = [
  {
    id: 'pci-switchgear',
    name: 'DTE PCI Switchgear',
    group: 'System devices',
    status: 'reference',
    description:
      'Optional Bochs PCI function 0x1d7e:0xacc1. Routes checked MMIO accesses to two 4 KiB BARs and reconciles INTx.',
    source: 'bochs/user_plugins/dte_npu_assd.cc',
    version: '1.0',
    capabilities: ['Memory Space', 'BAR0 NPU', 'BAR1 ASSD', 'Latched INTx'],
    authority: bounded,
    bars: [
      { index: 0, size: 4096, role: 'NPU' },
      { index: 1, size: 4096, role: 'ASSD' },
    ],
    operations: ['PCI config', 'MMIO dispatch', 'reset', 'snapshot registration'],
  },
  {
    id: 'npu',
    name: 'DTE NPU',
    group: 'Processing devices',
    status: 'reference',
    description: 'Bounded XOR 0x5a staging demonstrator. This is not a trained neural accelerator.',
    source: 'bochs/user_plugins/dte_npu_assd_model.cc',
    version: '1.0',
    capabilities: ['NPU_XOR', 'NO_DMA', '256-byte staging'],
    authority: bounded,
    bars: [{ index: 0, size: 4096, role: 'XOR staging and control' }],
    operations: ['XOR_5A', 'RESET'],
  },
  {
    id: 'grammar-cpu',
    name: 'Typed Operation Unit',
    group: 'Processing devices',
    status: 'proposed',
    description: 'Proposed n-ary typed operation grammar running as a coprocessor, not a replacement for x86.',
    source: 'proposal: DTE virtual-hardware specification §3–4',
    version: '0.1-draft',
    capabilities: ['Typed arity', 'Effect validation', 'Deterministic step'],
    authority: bounded,
    bars: [],
    operations: ['EVAL', 'BIND', 'REDUCE'],
  },
  {
    id: 'grid-gpu',
    name: 'Grid Compute Unit',
    group: 'Processing devices',
    status: 'proposed',
    description: 'Proposed tile/grid compute with deterministic barrier and reduction order; not Bochs VGA.',
    source: 'proposal: DTE virtual-hardware specification §3',
    version: '0.1-draft',
    capabilities: ['Grid tiles', 'Epoch barrier', 'Fixed-order reduction'],
    authority: bounded,
    bars: [],
    operations: ['DISPATCH', 'BARRIER', 'REDUCE'],
  },
  {
    id: 'assd',
    name: 'ASSD Volatile Records',
    group: 'Storage controllers',
    status: 'reference',
    description: 'Four 256-byte in-memory records. CHECKPOINT increments a volatile counter; it does not persist data.',
    source: 'bochs/user_plugins/dte_npu_assd_model.cc',
    version: '1.0',
    capabilities: ['ASSD_RECORDS', 'NO_DMA', 'Four slots'],
    authority: bounded,
    bars: [{ index: 1, size: 4096, role: 'Records and control' }],
    operations: ['PUT', 'GET', 'CHECKPOINT'],
  },
  {
    id: 'sparse-disk',
    name: 'Dictionary / Bitmap Disk',
    group: 'Storage controllers',
    status: 'proposed',
    description:
      'Proposed logical block disk with default block, presence bitmap, dictionary, code map and dirty overlay.',
    source: 'proposal: DTE virtual-hardware specification §3',
    version: '0.1-draft',
    capabilities: ['Copy-on-write', 'Logical block map', 'Snapshot generation'],
    authority: bounded,
    bars: [],
    operations: ['READ_BLOCK', 'WRITE_BLOCK', 'FLUSH'],
  },
  {
    id: 'graph-memory',
    name: 'Hypergraph Memory',
    group: 'Storage controllers',
    status: 'proposed',
    description: 'Proposed typed atom/hyperedge index; not implemented by the volatile ASSD slot reference.',
    source: 'proposal: Deep Tree Echo Core Self / hypergraph memory',
    version: '0.1-draft',
    capabilities: ['Typed nodes', 'Bounded traversal', 'Versioned edges'],
    authority: bounded,
    bars: [],
    operations: ['PUT_ATOM', 'LINK', 'TRAVERSE'],
  },
  {
    id: 'echo-trace',
    name: 'EchoTrace Inspection',
    group: 'Observability',
    status: 'reference',
    description: 'Host-owned read-only numeric NDJSON plus guest COM1 pass marker from the recorded Linux run.',
    source: 'build/inspection.ndjson (recorded run; not live)',
    version: '1.0',
    capabilities: ['Read-only inspection', 'Numeric counters', 'Serial witness'],
    authority: ['No guest-selected trace path', 'No control channel'],
    bars: [],
    operations: ['OBSERVE'],
  },
];

export const deviceGroups: DeviceGroup[] = [
  'System devices',
  'Processing devices',
  'Storage controllers',
  'Observability',
];
export const findDevice = (id: string) => devices.find((device) => device.id === id);

export function validateDefinition(raw: string): string[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return ['Invalid JSON: inspect the syntax before saving.'];
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return ['A device must be a JSON object.'];
  }

  const device = parsed as Record<string, unknown>;
  const errors: string[] = [];

  if (typeof device.id !== 'string' || !/^[a-z][a-z0-9-]{0,63}$/.test(device.id)) {
    errors.push('id must be a short kebab-case identifier.');
  }

  if (typeof device.name !== 'string' || device.name.length < 2 || device.name.length > 120) {
    errors.push('name must be 2–120 characters.');
  }

  if (!['reference', 'proposed'].includes(String(device.status))) {
    errors.push('status must be reference or proposed.');
  }

  if (!Array.isArray(device.capabilities) || device.capabilities.some((value) => typeof value !== 'string')) {
    errors.push('capabilities must be strings.');
  }

  if (!Array.isArray(device.authority) || device.authority.some((value) => typeof value !== 'string')) {
    errors.push('authority must be strings.');
  }

  if (!Array.isArray(device.operations) || device.operations.some((value) => typeof value !== 'string')) {
    errors.push('operations must be strings.');
  }

  if (!Array.isArray(device.bars)) {
    errors.push('bars must be an array.');
  } else {
    const indices = new Set<number>();

    for (const bar of device.bars) {
      if (!bar || typeof bar !== 'object') {
        errors.push('Each BAR must be an object.');
        continue;
      }

      const entry = bar as Record<string, unknown>;

      if (
        !Number.isInteger(entry.index) ||
        (entry.index as number) < 0 ||
        (entry.index as number) > 5 ||
        indices.has(entry.index as number)
      ) {
        errors.push('BAR indices must be unique integers from 0 to 5.');
      }

      indices.add(entry.index as number);

      if (
        !Number.isInteger(entry.size) ||
        (entry.size as number) < 4096 ||
        (entry.size as number) > 1048576 ||
        ((entry.size as number) & ((entry.size as number) - 1)) !== 0
      ) {
        errors.push('BAR size must be a power of two from 4096 to 1048576 bytes.');
      }
    }
  }

  return errors;
}
