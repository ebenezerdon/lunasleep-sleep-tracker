/* scripts/helpers.js
   Utilities and storage functions for LunaSleep
   Exposes: window.App.Helpers and window.App.Storage
*/
(function(window, $){
  window.App = window.App || {};
  window.App.Helpers = window.App.Helpers || {};
  window.App.Storage = window.App.Storage || {};

  // Generate a compact id
  window.App.Helpers.generateId = function(){
    return 'log_' + Date.now().toString(36) + Math.random().toString(36).slice(2,8);
  };

  // Parse date and time into a Date object. dateStr like 2025-01-01, timeStr like 23:30
  window.App.Helpers.combineDateTime = function(dateStr, timeStr){
    try{
      const parts = timeStr.split(':');
      const dt = new Date(dateStr + 'T00:00');
      dt.setHours(parseInt(parts[0],10));
      dt.setMinutes(parseInt(parts[1],10));
      dt.setSeconds(0);
      dt.setMilliseconds(0);
      return dt;
    } catch(e){
      return null;
    }
  };

  // Compute duration in minutes between two Date objects, adjust next day if needed
  window.App.Helpers.computeDurationMinutes = function(bedDt, wakeDt){
    try{
      if(wakeDt <= bedDt){
        // assume wake is next day
        const next = new Date(wakeDt.getTime());
        next.setDate(next.getDate() + 1);
        wakeDt = next;
      }
      const diff = (wakeDt - bedDt) / 60000; // minutes
      return Math.max(0, Math.round(diff));
    } catch(e){
      return 0;
    }
  };

  window.App.Helpers.formatDuration = function(minutes){
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h} h ${m} m`;
  };

  window.App.Helpers.dateToISO = function(date){
    // returns yyyy-mm-dd
    const y = date.getFullYear();
    const m = String(date.getMonth()+1).padStart(2,'0');
    const d = String(date.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  };

  // Validate a log entry object shape and values
  window.App.Helpers.validateLog = function(entry){
    const errors = [];
    if(!entry || typeof entry !== 'object'){
      errors.push('Invalid entry');
      return {valid:false, errors};
    }
    if(!entry.date) errors.push('Date is required');
    if(!entry.bedtime) errors.push('Bedtime is required');
    if(!entry.waketime) errors.push('Wake time is required');
    if(typeof entry.quality !== 'number' || entry.quality < 1 || entry.quality > 5) errors.push('Quality must be 1 to 5');
    return {valid: errors.length === 0, errors};
  };

  // Storage functions
  const STORAGE_KEY = 'luna_sleep_logs_v1';

  window.App.Storage.load = function(){
    try{
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if(!raw) return [];
      const parsed = JSON.parse(raw);
      if(!Array.isArray(parsed)) return [];
      return parsed;
    } catch(e){
      console.error('Load failed', e);
      return [];
    }
  };

  window.App.Storage.save = function(logs){
    try{
      const out = JSON.stringify(logs || []);
      window.localStorage.setItem(STORAGE_KEY, out);
      return true;
    } catch(e){
      console.error('Save failed', e);
      return false;
    }
  };

  window.App.Storage.clear = function(){
    try{
      window.localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch(e){
      return false;
    }
  };

  window.App.Storage.export = function(){
    const logs = window.App.Storage.load();
    const blob = new Blob([JSON.stringify(logs, null, 2)], {type:'application/json'});
    return blob;
  };

  window.App.Storage.import = function(json){
    try{
      if(typeof json === 'string') json = JSON.parse(json);
      if(!Array.isArray(json)) return {ok:false, error:'Invalid file format'};
      // basic validation
      const cleaned = json.map(function(e){
        return {
          id: e.id || window.App.Helpers.generateId(),
          date: e.date || '',
          bedtime: e.bedtime || '',
          waketime: e.waketime || '',
          quality: Number.isFinite(e.quality) ? e.quality : 3,
          notes: e.notes || ''
        };
      });
      window.App.Storage.save(cleaned);
      return {ok:true};
    } catch(e){
      return {ok:false, error: e && e.message ? e.message : 'Import failed'};
    }
  };

})(window, jQuery);
