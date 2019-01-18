export function sleep(interval: number): Promise<void> {
  return new Promise<void>((resolve: () => void) => {
    setTimeout(resolve, interval);
  });
}
