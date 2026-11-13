/* Renders \( inline \) and \[ display \] LaTeX in the explainers' articles with the bundled KaTeX. */
(function(){
  function render(root){
    if(!window.renderMathInElement)return;
    (root?[root]:document.querySelectorAll('article,.explain')).forEach(el=>renderMathInElement(el,{
      delimiters:[{left:'\\[',right:'\\]',display:true},{left:'\\(',right:'\\)',display:false}],
      throwOnError:false,ignoredTags:['script','noscript','style','textarea','pre','code','svg']}));
  }
  window.renderMath=render;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>render());else render();
})();
