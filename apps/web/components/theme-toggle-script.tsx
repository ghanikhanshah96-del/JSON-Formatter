/** Inline theme cycling — avoids a React client bundle on every page. */
export function ThemeToggleScript() {
  const code = `
(function(){
  var themes=["light","dark","system"];
  var icons={light:"☼",dark:"◐",system:"◑"};
  var nextKey="codeformattertools.theme";
  var legacyKeys=["codeformattools.theme","formatbase.theme"];
  function read(){
    try{
      var current=localStorage.getItem(nextKey);
      if(current&&themes.indexOf(current)!==-1) return current;
      for (var i=0;i<legacyKeys.length;i++){
        var legacy=localStorage.getItem(legacyKeys[i]);
        if(legacy&&themes.indexOf(legacy)!==-1){
          try{
            localStorage.setItem(nextKey,legacy);
            for (var j=0;j<legacyKeys.length;j++) localStorage.removeItem(legacyKeys[j]);
          }catch(e){}
          return legacy;
        }
      }
    }catch(e){}
    return "light";
  }
  function write(t){
    try{
      localStorage.setItem(nextKey,t);
      for (var i=0;i<legacyKeys.length;i++) localStorage.removeItem(legacyKeys[i]);
    }catch(e){}
  }
  function apply(t){
    var dark=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme=dark?"dark":"light";
  }
  function paint(t){
    var btn=document.getElementById("theme-toggle");
    if(!btn) return;
    var icon=btn.querySelector("[data-theme-icon]");
    var label=btn.querySelector("[data-theme-label]");
    if(icon) icon.textContent=icons[t]||"☼";
    if(label) label.textContent=t;
    btn.setAttribute("aria-label","Theme: "+t+". Change theme");
    btn.setAttribute("title","Theme: "+t);
  }
  var theme=read();
  apply(theme);
  paint(theme);
  var btn=document.getElementById("theme-toggle");
  if(btn){
    btn.addEventListener("click",function(){
      theme=themes[(themes.indexOf(theme)+1)%themes.length];
      write(theme); apply(theme); paint(theme);
    });
  }
  try{
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change",function(){
      if(read()==="system") apply("system");
    });
  }catch(e){}
})();`;

  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
