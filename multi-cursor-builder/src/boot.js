/* Optional synchronous bootstrap in <head>, after config.js and before styles. */
(() => {
  const selectors=window.CursorBuilderConfig?.selectors||['[data-build]'];
  const style=document.createElement('style');
  style.textContent='.editor-boot :is('+selectors.join(',')+'){opacity:0}';
  document.head.append(style);document.documentElement.classList.add('editor-boot');
  setTimeout(()=>{document.documentElement.classList.remove('editor-boot');style.remove();},3000);
})();
