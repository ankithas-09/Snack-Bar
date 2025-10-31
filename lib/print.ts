// lib/print.ts

/**
 * Opens a system print dialog for the given HTML string.
 */
export function printHTML(html: string) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 2000);
  }, 100);
}

/**
 * Opens a preview of the HTML in a new tab — identical to print layout,
 * but no print command. Works even in strict Chrome popup environments.
 */
export function previewHTML(html: string) {
  // Open synchronously on user gesture to avoid popup block
  const previewWin = window.open("", "_blank", "noopener,noreferrer,width=400,height=600");
  if (!previewWin) {
    alert("Popup blocked — please allow popups for this site to preview the bill.");
    return;
  }

  // Write full document into the new window
  previewWin.document.open();
  previewWin.document.write(html);
  previewWin.document.close();

  // Focus after a brief delay for Chrome rendering
  setTimeout(() => previewWin.focus(), 200);
}
