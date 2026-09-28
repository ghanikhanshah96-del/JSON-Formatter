/** Zero-React contact actions — copy uses a tiny inline script. */
export function ContactActions({ email, siteName }: { email: string; siteName: string }) {
  const mailto = `mailto:${email}?subject=${encodeURIComponent(`${siteName} support`)}`;
  const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(`${siteName} support`)}`;

  return (
    <div className="contact-actions">
      <a className="button primary" href={mailto}>Open email app</a>
      <a className="button secondary" href={gmail} target="_blank" rel="noopener noreferrer">Compose in Gmail</a>
      <button type="button" className="button secondary" id="copy-email-btn" data-email={email}>
        Copy address
      </button>
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){var b=document.getElementById("copy-email-btn");if(!b)return;var t;b.addEventListener("click",function(){var e=b.getAttribute("data-email")||"";function ok(){b.textContent="Copied ✓";clearTimeout(t);t=setTimeout(function(){b.textContent="Copy address"},1800);}if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(e).then(ok).catch(function(){});}else{ok();}});})();`
        }}
      />
    </div>
  );
}
