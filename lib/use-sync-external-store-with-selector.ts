/* oxlint-disable */
import { useMemo, useRef, useSyncExternalStore } from 'react';

export function useSyncExternalStoreWithSelector<TSnapshot, TSelection>(
  subscribe: (onStoreChange: () => void) => () => void,
  getSnapshot: () => TSnapshot,
  getServerSnapshot: (() => TSnapshot) | undefined,
  selector: (snapshot: TSnapshot) => TSelection,
  isEqual?: (a: TSelection, b: TSelection) => boolean,
): TSelection {
  const selectorRef = useRef(selector);
  selectorRef.current = selector;
  const equalRef = useRef(isEqual);
  equalRef.current = isEqual;
  const memo = useMemo(() => {
    let hasValue = false;
    let value: TSelection;
    return (snapshot: TSnapshot) => {
      const next = selectorRef.current(snapshot);
      if (!hasValue || !equalRef.current?.(value, next)) {
        value = next;
        hasValue = true;
      }
      return value;
    };
  }, []);
  return useSyncExternalStore(
    subscribe,
    () => memo(getSnapshot()),
    getServerSnapshot ? () => memo(getServerSnapshot()) : undefined,
  );
}
