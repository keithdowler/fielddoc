type SyncListener = () => void;

const listeners = new Set<SyncListener>();

export function requestAutomaticSync() {
  for (const listener of listeners) listener();
}

export function subscribeToAutomaticSync(listener: SyncListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
