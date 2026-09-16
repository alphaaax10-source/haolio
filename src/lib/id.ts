// Compact unique id generator (nanoid-style, no dependency).
const ALPHABET =
  'useandom26T198340PX75pxJACKVERYMINDBUSHWOLFGQZbfghjklqvwyzrict';

export function createId(size = 12): string {
  let id = '';
  for (let i = 0; i < size; i++) {
    id += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return id;
}
