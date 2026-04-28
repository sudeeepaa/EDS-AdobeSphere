/**
 * Nav block stub
 * Prevents 404 errors when a 'nav' block is referenced in fragments.
 */
export default async function decorate(block) {
  // The header block usually handles navigation parsing.
  // This stub ensures the block is marked as loaded.
  block.dataset.blockStatus = 'loaded';
}
