/* scripts/ui.js
   UI renderer and event bindings for LunaSleep.
   Defines window.App.init and window.App.render as contract requires.
*/
(function(window, $){
  window.App = window.App || {};

  // Internal state
  const state = {
    logs: [],
    editingId: null
  };

  // Render helpers
  function safeFormatDate(iso){
    try{ return iso; } catch(e){ return iso; }
  }

  function computeSummaries(logs){
    if(!logs || !logs.length) return {avg:0, avgQuality:0, longest:0, longestDate:null, streak:0};
    const durations = logs.map(l => l.durationMinutes || 0);
    const avg = Math.round(durations.reduce((a,b)=>a+b,0) / durations.length);
    const avgQuality = (logs.reduce((a,b)=>a + (b.quality||0),0) / logs.length).toFixed(1);
    const longestVal = Math.max(...durations);
    const longestIndex = durations.indexOf(longestVal);
    const longestDate = logs[longestIndex] ? logs[longestIndex].date : null;

    // compute streak: consecutive dates ending with most recent log
    const sorted = logs.slice().sort((a,b) => new Date(b.date) - new Date(a.date));
    let streak = 0;
    let prev = null;
    for(const item of sorted){
      if(!prev){ streak = 1; prev = new Date(item.date); continue; }
      const d = new Date(item.date);
      const diffDays = Math.round((prev - d) / 86400000);
      if(diffDays === 1){ streak += 1; prev = d; } else if(diffDays === 0){ prev = d; continue; } else break;
    }

    return {avg, avgQuality, longestVal, longestDate, streak};
  }

  function buildChart(logs){
    const $chart = $('#chart');
    $chart.empty();
    // Last 14 days map by date
    const map = {};
    const today = new Date();
    for(let i=13;i>=0;i--){
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      d.setDate(d.getDate() - i);
      map[window.App.Helpers.dateToISO(d)] = 0;
    }
    logs.forEach(l => {
      if(map.hasOwnProperty(l.date)) map[l.date] = Math.max(map[l.date], l.durationMinutes || 0);
    });
    const values = Object.entries(map);
    const max = Math.max(...values.map(v=>v[1]), 1);
    values.forEach(([date, minutes]) => {
      const h = Math.round((minutes / max) * 100);
      const height = Math.max(6, Math.round((minutes / (max || 1)) * 160));
      const bar = $(`<div tabindex="0" role="img" aria-label="${date}: ${minutes} minutes" class="chart-bar" style="height:${height}px; width:28px" title="${window.App.Helpers.formatDuration(minutes)} on ${date}"></div>`);
      bar.data('date', date);
      bar.on('mouseenter focus', function(){
        $(this).css('box-shadow','0 8px 20px rgba(2,6,23,0.12)');
      }).on('mouseleave blur', function(){
        $(this).css('box-shadow','');
      }).on('click', function(){
        // on small screens, show a simple tooltip via alert fallback
        const d = $(this).data('date');
        window.alert(`${d}: ${window.App.Helpers.formatDuration(minutes)}`);
      });
      $chart.append(bar);
    });
  }

  function renderList(logs){
    const $list = $('#logList');
    $list.empty();
    if(!logs.length){
      $list.append('<li class="py-6 text-sm text-slate-500">No logs yet. Add your first sleep entry.</li>');
      $('#totalLogs').text(0);
      return;
    }
    logs.slice().sort((a,b) => new Date(b.date) - new Date(a.date) || (b.durationMinutes||0) - (a.durationMinutes||0)).forEach(function(l){
      const li = $(
        `<li class="log-item" data-id="${l.id}">
          <div class="log-meta">
            <div>
              <div class="text-sm font-medium">${l.date}</div>
              <div class="text-xs text-slate-400">Bed ${l.bedtime} • Wake ${l.waketime}</div>
            </div>
            <div class="ml-4 text-slate-600 text-sm">
              <div class="log-duration">${window.App.Helpers.formatDuration(l.durationMinutes)}</div>
              <div class="text-xs text-slate-400">Quality: ${'⭐'.repeat(l.quality)}</div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button class="btn-ghost editBtn" title="Edit log">Edit</button>
            <button class="btn-ghost deleteBtn text-red-600" title="Delete log">Delete</button>
          </div>
        </li>`
      );
      // notes tooltip
      if(l.notes){
        li.find('.text-sm.font-medium').append(`<div class="text-xs text-slate-400 mt-1">${$('<div/>').text(l.notes).html()}</div>`);
      }
      // bindings
      li.find('.editBtn').on('click', function(){ openForEdit(l.id); });
      li.find('.deleteBtn').on('click', function(){ deleteLog(l.id); });
      $list.append(li);
    });
    $('#totalLogs').text(logs.length);
  }

  function openForEdit(id){
    const entry = state.logs.find(s => s.id === id);
    if(!entry) return;
    state.editingId = id;
    $('#logDate').val(entry.date);
    $('#bedtime').val(entry.bedtime);
    $('#waketime').val(entry.waketime);
    $('#notes').val(entry.notes || '');
    $('#quality').val(entry.quality);
    // set quality UI
    $('#qualityPicker .quality-btn').each(function(){
      const v = $(this).data('value');
      $(this).attr('aria-pressed', v === entry.quality ? 'true' : 'false');
    });
    $('#saveBtn').text('Update');
    window.scrollTo({top:0, behavior:'smooth'});
  }

  function deleteLog(id){
    if(!confirm('Delete this log?')) return;
    state.logs = state.logs.filter(l => l.id !== id);
    window.App.Storage.save(state.logs);
    App.render();
  }

  function resetForm(){
    state.editingId = null;
    $('#logForm')[0].reset();
    $('#quality').val(3);
    $('#qualityPicker .quality-btn').attr('aria-pressed','false');
    $('#qualityPicker .quality-btn[data-value="3"]').attr('aria-pressed','true');
    $('#saveBtn').text('Add Log');
    // default date to today
    const today = new Date();
    $('#logDate').val(window.App.Helpers.dateToISO(today));
  }

  // Public API required by contract
  window.App.init = function(){
    // Load logs
    state.logs = window.App.Storage.load().map(function(l){
      // ensure derived field
      const bedDt = window.App.Helpers.combineDateTime(l.date, l.bedtime);
      const wakeDt = window.App.Helpers.combineDateTime(l.date, l.waketime);
      const durationMinutes = window.App.Helpers.computeDurationMinutes(bedDt, wakeDt);
      return Object.assign({}, l, {durationMinutes});
    });

    // initial form date
    resetForm();

    // quality picker
    $('#qualityPicker').on('click', '.quality-btn', function(e){
      const v = Number($(this).data('value'));
      $('#quality').val(v);
      $('#qualityPicker .quality-btn').attr('aria-pressed','false');
      $(this).attr('aria-pressed','true');
    }).on('keydown', '.quality-btn', function(e){
      if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); $(this).trigger('click'); }
    });

    // Quick now: set wake to current time
    $('#quickNowBtn').on('click', function(){
      const t = new Date();
      const hh = String(t.getHours()).padStart(2,'0');
      const mm = String(t.getMinutes()).padStart(2,'0');
      $('#waketime').val(`${hh}:${mm}`);
    });

    $('#clearFormBtn').on('click', function(){ resetForm(); });

    // save form
    $('#logForm').on('submit', function(e){
      e.preventDefault();
      try{
        const data = {
          id: state.editingId || window.App.Helpers.generateId(),
          date: $('#logDate').val(),
          bedtime: $('#bedtime').val(),
          waketime: $('#waketime').val(),
          quality: Number($('#quality').val()) || 3,
          notes: $('#notes').val() || ''
        };
        const valid = window.App.Helpers.validateLog(data);
        if(!valid.valid){
          alert('Please fix: ' + valid.errors.join(', '));
          return;
        }
        const bedDt = window.App.Helpers.combineDateTime(data.date, data.bedtime);
        const wakeDt = window.App.Helpers.combineDateTime(data.date, data.waketime);
        data.durationMinutes = window.App.Helpers.computeDurationMinutes(bedDt, wakeDt);

        const exists = state.logs.findIndex(l => l.id === data.id);
        if(exists >= 0){ state.logs[exists] = data; }
        else { state.logs.push(data); }

        window.App.Storage.save(state.logs);
        resetForm();
        App.render();
      } catch(err){
        console.error('Save error', err);
        alert('Could not save the log. See console for details.');
      }
    });

    // clear all
    $('#clearAllBtn').on('click', function(){
      if(!confirm('Clear all logs? This cannot be undone.')) return;
      state.logs = [];
      window.App.Storage.clear();
      App.render();
    });

    // export
    $('#exportBtn').on('click', function(){
      const blob = window.App.Storage.export();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'luna-sleep-logs.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });

    // import
    $('#importFile').on('change', function(e){
      const file = e.target.files && e.target.files[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = function(ev){
        try{
          const result = window.App.Storage.import(ev.target.result);
          if(!result.ok){ alert('Import failed: ' + result.error); return; }
          // reload state
          state.logs = window.App.Storage.load().map(function(l){
            const bedDt = window.App.Helpers.combineDateTime(l.date, l.bedtime);
            const wakeDt = window.App.Helpers.combineDateTime(l.date, l.waketime);
            const durationMinutes = window.App.Helpers.computeDurationMinutes(bedDt, wakeDt);
            return Object.assign({}, l, {durationMinutes});
          });
          App.render();
          alert('Imported successfully');
        } catch(err){
          alert('Import failed');
        }
      };
      reader.readAsText(file);
      // reset input
      $(this).val('');
    });

    // load sample
    $('#importSampleBtn').on('click', function(){
      if(!confirm('Load sample logs? This will not remove your existing logs.')) return;
      const sample = [
        {date: window.App.Helpers.dateToISO(new Date(Date.now()-86400000*1)), bedtime:'23:10', waketime:'07:05', quality:4, notes:'Felt rested.'},
        {date: window.App.Helpers.dateToISO(new Date(Date.now()-86400000*2)), bedtime:'00:15', waketime:'08:00', quality:3, notes:'Woke once.'},
        {date: window.App.Helpers.dateToISO(new Date(Date.now()-86400000*3)), bedtime:'22:40', waketime:'06:40', quality:5, notes:'Great night.'}
      ];
      // merge without duplicates
      const current = window.App.Storage.load();
      const merged = current.concat(sample.map(s => Object.assign({id: window.App.Helpers.generateId()}, s)));
      window.App.Storage.save(merged);
      // reload state
      state.logs = window.App.Storage.load().map(function(l){
        const bedDt = window.App.Helpers.combineDateTime(l.date, l.bedtime);
        const wakeDt = window.App.Helpers.combineDateTime(l.date, l.waketime);
        const durationMinutes = window.App.Helpers.computeDurationMinutes(bedDt, wakeDt);
        return Object.assign({}, l, {durationMinutes});
      });
      App.render();
    });

    // keyboard accessibility: allow Enter on log list actions via delegation
    $('#logList').on('keydown', '.editBtn, .deleteBtn', function(e){ if(e.key === 'Enter'){ $(this).trigger('click'); } });
  };

  window.App.render = function(){
    // recalc durations
    state.logs = (state.logs || []).map(function(l){
      const bedDt = window.App.Helpers.combineDateTime(l.date, l.bedtime);
      const wakeDt = window.App.Helpers.combineDateTime(l.date, l.waketime);
      return Object.assign({}, l, {durationMinutes: window.App.Helpers.computeDurationMinutes(bedDt, wakeDt)});
    });

    // render summaries
    const sums = computeSummaries(state.logs);
    $('#avgSleep').text(sums.avg ? window.App.Helpers.formatDuration(sums.avg) : '-- h -- m');
    $('#avgQuality').text(sums.avgQuality || '--');
    $('#longest').text(sums.longestVal ? window.App.Helpers.formatDuration(sums.longestVal) : '-- h -- m');
    $('#longestDate').text(sums.longestDate || '—');
    $('#streak').text((sums.streak || 0) + ' nights');

    // draw chart
    buildChart(state.logs);

    // list
    renderList(state.logs);
  };

  // expose some internals for main or debug
  window.App._state = state;

})(window, jQuery);
