(function(){
  window.app = window.app || {};
  window.app.switchGatewayTab = function(tab){
    var roles=['admin','teacher','student','parent'];
    if(roles.indexOf(tab)<0)return;
    roles.forEach(function(role){
      var button=document.getElementById('gw-tab-'+role);
      var form=document.getElementById('gateway-form-'+role);
      if(button)button.className=role===tab
        ?'py-2 px-1 rounded-xl text-[10px] sm:text-xs font-extrabold transition bg-indigo-600 text-white shadow-sm flex items-center justify-center gap-1'
        :'py-2 px-1 rounded-xl text-[10px] sm:text-xs font-extrabold transition text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1';
      if(form)form.classList.toggle('hidden',role!==tab);
    });
  };
})();
