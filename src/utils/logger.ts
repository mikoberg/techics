export function logFetchStart(name: string): void {
  console.log(`Fetching ${name}...`);
}

export function logFetchResult(count: number): void {
  console.log(`Found ${count} event${count === 1 ? "" : "s"}.`);
}
