/** Inline theme cycling — avoids a React client bundle on every page. */
export function ThemeToggleScript() {
  const code = `
(function(){
  if (window.__cftThemeBound) return;
  window.__cftThemeBound = true;
  var themes=["light","dark","system"];
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
    return "system";
  }
  function write(t){
    try{
      localStorage.setItem(nextKey,t);
      for (var i=0;i<legacyKeys.length;i++) localStorage.removeItem(legacyKeys[i]);
    }catch(e){}
  }
  function resolved(t){
    return t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches)?"dark":"light";
  }
  function apply(t){
    document.documentElement.dataset.theme=resolved(t);
  }
  function actionLabel(t){
    if(t==="light") return {icon:"☾",label:"Dark",aria:"Switch to dark theme",pressed:"false"};
    if(t==="dark") return {icon:"◑",label:"System",aria:"Use system theme preference",pressed:"true"};
    return {icon:"☼",label:"Light",aria:"Switch to light theme",pressed:"false"};
  }
  function paint(t){
    var next=actionLabel(t);
    var buttons=document.querySelectorAll("[data-theme-toggle]");
    for (var i=0;i<buttons.length;i++){
      var btn=buttons[i];
      var icon=btn.querySelector("[data-theme-icon]");
      var label=btn.querySelector("[data-theme-label]");
      if(icon) icon.textContent=next.icon;
      if(label) label.textContent=next.label;
      btn.setAttribute("aria-label",next.aria);
      btn.setAttribute("title",next.aria);
      btn.setAttribute("aria-pressed",next.pressed);
    }
  }
  var theme=read();
  apply(theme);
  paint(theme);
  document.addEventListener("click",function(event){
    var btn=event.target && event.target.closest && event.target.closest("[data-theme-toggle]");
    if(!btn) return;
    theme=themes[(themes.indexOf(theme)+1)%themes.length];
    write(theme); apply(theme); paint(theme);
  });
  try{
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change",function(){
      if(read()==="system"){ apply("system"); paint("system"); }
    });
  }catch(e){}
})();`;

  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
