/**
 * Put a value on the clipboard and report whether it actually got there.
 *
 * `writeText` rejects for reasons the page cannot fix — an insecure context, a
 * permission the user denied, a document that is not focused — and the
 * fire-and-forget call these replaced turned each of those into an unhandled
 * rejection *plus* a toast claiming success. Two failure modes for one gesture:
 * an exception in the console and a lie in the UI.
 *
 * So the caller gets a boolean and decides what to say. That decision belongs to
 * the caller because only it knows whether the copy was the whole point of the
 * gesture or a secondary effect of a save.
 */
export async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}