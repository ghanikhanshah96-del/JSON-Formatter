export const LOAD_EXAMPLE_EVENT = "tool:load-example";
export const PENDING_EXAMPLE_KEY = "cft:pending-example";

/** Server-rendered example block — actions via tiny inline script. */
export function ExampleSnippet({ example, language }: { example: string; language: string }) {
  const exampleJson = JSON.stringify(example);

  return (
    <div className="example-block" data-example-block>
      <div className="example-actions">
        <button type="button" className="button secondary example-action" data-example-try>
          Try this example
        </button>
        <button type="button" className="button secondary example-action" data-example-copy>
          Copy
        </button>
      </div>
      <pre className="example-code"><code>{example}</code></pre>
      <p className="example-hint">Loads the sample into the {language.toUpperCase()} workspace above.</p>
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){var root=document.currentScript&&document.currentScript.parentElement;if(!root)return;var sample=${exampleJson};var tryBtn=root.querySelector("[data-example-try]");var copyBtn=root.querySelector("[data-example-copy]");if(tryBtn){tryBtn.addEventListener("click",function(){try{sessionStorage.setItem("${PENDING_EXAMPLE_KEY}",sample);}catch(e){}window.dispatchEvent(new CustomEvent("${LOAD_EXAMPLE_EVENT}",{detail:{example:sample}}));var gate=document.getElementById("tool-workspace-gate");if(gate){var btn=gate.querySelector("button.button");if(btn)btn.click();else{var ta=gate.querySelector("textarea");if(ta)ta.focus();}}var ws=document.querySelector(".tool-workspace");if(ws)ws.scrollIntoView({behavior:"smooth",block:"start"});});}if(copyBtn){copyBtn.addEventListener("click",function(){function done(){copyBtn.textContent="Copied";setTimeout(function(){copyBtn.textContent="Copy"},2000);}if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(sample).then(done).catch(function(){});}else done();});}})();`
        }}
      />
    </div>
  );
}
