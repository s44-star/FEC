(function (d) {
  var r = d.documentElement;
  r.classList.add('js');
  setTimeout(function () { r.classList.add('ready'); }, 2200);
  setTimeout(function () { if (!r.classList.contains('main-ok')) r.classList.add('fallback'); }, 4000);
})(document);
