// lib/pdfExport.ts
// Converts a full standalone HTML document string (the same markup used for
// the desktop print/PDF flow) into an actual .pdf file, entirely client-side.
// This is used on mobile where window.open()+print() doesn't reliably let
// users save a PDF, so previously we fell back to downloading a raw .html
// file instead. This produces a real, ready-to-share .pdf file instead.

/**
 * Renders the given HTML document string off-screen and exports it as a
 * paginated A4 PDF, then triggers a browser download.
 *
 * @param fullHtml A complete HTML document (<!DOCTYPE html><html>...</html>)
 * @param filename Desired filename, should end in .pdf
 */
export async function downloadHtmlAsPdf(fullHtml: string, filename: string): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  // The desktop flow relies on window.print() firing on load — strip that
  // out here since we're rendering into an offscreen iframe, not printing it.
  const htmlForRender = fullHtml.replace(/<script>[\s\S]*?<\/script>/gi, '');

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.top = '0';
  iframe.style.left = '-99999px';
  iframe.style.width = '210mm';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  try {
    await new Promise<void>((resolve, reject) => {
      iframe.onload = () => resolve();
      iframe.onerror = () => reject(new Error('Failed to render paper'));
      iframe.srcdoc = htmlForRender;
    });

    // Give fonts/layout a moment to settle before measuring & capturing.
    await new Promise((r) => setTimeout(r, 200));

    const doc = iframe.contentDocument;
    const body = doc?.body;
    if (!doc || !body) {
      throw new Error('Could not access rendered paper content');
    }

    // Make sure the iframe box actually matches the content height so
    // html2canvas captures the full paper, not just the visible viewport.
    const fullHeight = Math.max(body.scrollHeight, doc.documentElement.scrollHeight);
    iframe.style.height = `${fullHeight}px`;

    const canvas = await html2canvas(body, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      windowWidth: body.scrollWidth,
      windowHeight: fullHeight,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
      position -= pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    pdf.save(filename);
  } finally {
    document.body.removeChild(iframe);
  }
}