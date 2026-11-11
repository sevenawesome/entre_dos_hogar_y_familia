export const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
/** Table layout and inline styles also work in mobile mail clients and Outlook. */
export function brandedEmail({
  title,
  lines,
  byline,
  baseUrl,
  unsubscribe,
  action,
}: {
  title: string;
  lines: string[];
  byline: string;
  baseUrl: string;
  unsubscribe?: string;
  action?: { title: string; url: string };
}) {
  const safeUrl = (url: string) => {
    const u = new URL(url);
    if (u.protocol !== "https:") throw Error("Invalid mail link");
    return escapeHtml(u.href);
  };
  const logo = safeUrl(`${baseUrl}/assets/logo.png`);
  const paragraphs = lines
    .map(
      (line) =>
        `<p style="margin:0 0 18px;line-height:1.75;color:#344B60">${escapeHtml(line).replace(/\n/g, "<br>")}</p>`,
    )
    .join("");
  return `<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body style="margin:0;padding:0;background:#FBF7EE;font:16px Arial,sans-serif;color:#06264A"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#FBF7EE"><tr><td align="center" style="padding:24px 16px"><table role="presentation" width="560" cellspacing="0" cellpadding="0" style="width:100%;max-width:560px"><tr><td align="center" style="padding:20px 24px 22px;border-top:5px solid #C79527"><img src="${logo}" width="280" alt="Amor que permanece" style="display:block;width:100%;max-width:280px;height:auto;margin:0 auto">${byline ? `<p style="font-size:12px;color:#526678;line-height:1.5;margin:6px 0 0;text-align:center">${escapeHtml(byline)}</p>` : ""}</td></tr><tr><td style="padding:30px 26px;background:#FFFFFF;border:1px solid #E9DFC9;border-radius:22px"><p style="margin:0 0 12px;color:#A77819;letter-spacing:2px;font-size:10px;font-weight:bold">UN AMOR QUE SE CUIDA CADA DÍA</p><h1 style="font:normal 28px Georgia,serif;line-height:1.25;color:#06264A;margin:0 0 24px">${escapeHtml(title)}</h1>${paragraphs}${action ? `<table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="background:#9A3F50;border-radius:12px;padding:15px 22px"><a href="${safeUrl(action.url)}" style="color:#FFFFFF;text-decoration:none;font-weight:bold">${escapeHtml(action.title)}</a></td></tr></table><p style="font-size:12px;line-height:1.6;word-break:break-all;margin:22px 0 0;color:#526678">Si el botón no funciona, abre este enlace:<br><a href="${safeUrl(action.url)}" style="color:#9A3F50">${escapeHtml(action.url)}</a></p>` : ""}</td></tr><tr><td style="padding:24px 12px;text-align:center;color:#526678;font-size:12px;line-height:1.7"><p style="color:#9A3F50;font:italic 18px Georgia,serif;margin:0 0 15px">Pequeños momentos. Una historia que permanece.</p>${unsubscribe ? `<p>Reciben este correo sobre su participación en Amor que permanece.<br><a href="${safeUrl(unsubscribe)}" style="color:#526678">Dejar de recibir correos opcionales</a></p>` : `<p>Este mensaje protege el acceso a su cuenta.<br>Si no lo solicitaron, pueden ignorarlo.</p>`}<p>Creado por <a href="https://www.sevenawesome.com/" style="color:#06264A">SevenAwesome</a></p></td></tr></table></td></tr></table></body></html>`;
}
