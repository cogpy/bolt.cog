import { deviceGroups, devices, type DeviceDefinition } from '~/lib/dte/devices';
import styles from './DteWorkspace.module.scss';

interface Props {
  selected: string;
  onSelect: (device: DeviceDefinition) => void;
}

export function DeviceTree({ selected, onSelect }: Props) {
  return (
    <aside className={styles.deviceTree} aria-label="DTE Device Manager">
      <div className={styles.treeToolbar}>
        <span className="i-ph:desktop-tower-duotone" aria-hidden="true" />
        <strong>Device Manager</strong>
      </div>
      <div className={styles.treeHint}>Documentation inventory · not a live hardware scan</div>
      <div className={styles.computerRow}>
        <span className="i-ph:computer-tower" aria-hidden="true" /> DEEP TREE ECHO
      </div>
      {deviceGroups.map((group) => (
        <details className={styles.deviceGroup} key={group} open>
          <summary>{group}</summary>
          <div role="group" aria-label={group}>
            {devices
              .filter((device) => device.group === group)
              .map((device) => (
                <button
                  type="button"
                  key={device.id}
                  className={`${styles.deviceRow} ${selected === device.id ? styles.selected : ''}`}
                  aria-current={selected === device.id ? 'true' : undefined}
                  onClick={() => onSelect(device)}
                >
                  <span
                    className={device.status === 'reference' ? 'i-ph:cpu-duotone' : 'i-ph:circles-three-plus-duotone'}
                    aria-hidden="true"
                  />
                  <span className={styles.deviceName}>{device.name}</span>
                  <span
                    className={`${styles.statusDot} ${device.status === 'reference' ? styles.reference : styles.proposed}`}
                    title={device.status === 'reference' ? 'Recorded Linux reference' : 'Proposed only'}
                  />
                </button>
              ))}
          </div>
        </details>
      ))}
      <div className={styles.treeLegend}>
        <span className={styles.reference}>●</span> Linux reference <span className={styles.proposed}>●</span> Proposed
      </div>
    </aside>
  );
}
