//---------------------------------------------------------------------
// instant-scheduler
//
// Copyright (c) 2021 Kazuhiko Arase
//
// URL: https://github.com/kazuhikoarase/instant-scheduler
//
// Licensed under the MIT license:
//  http://www.opensource.org/licenses/mit-license.php
//
//---------------------------------------------------------------------

'use strict';

window.addEventListener('load', function() {

  document.addEventListener('touchstart', function(event) {
    event.preventDefault();
  });

  var messages = function() {
    var messages = {
      en: {
        ENTER_HERE_YOUR_SCHEDULE: 'Enter here your schedule',
        UNTITLED_SCHEDULE: 'Untitled schedule'
      },
      ja: {
        ENTER_HERE_YOUR_SCHEDULE: 'ここに予定を入力',
        UNTITLED_SCHEDULE: '無題の予定'
      }
    };
    var lang = navigator.language.toLowerCase().
      replace(/^([a-z]+).*$/, '$1');
    return messages[lang] || messages.en;
  }();

  qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];

  var lzpad = function(n, digits) {
    var s = '' + n;
    while (s.length < digits) {
      s = '0' + s;
    }
    return s;
  };

  var modClass = function(elm, className, append) {
    var values = '';
    (elm.getAttribute('class') || '').split(/\s+/g).forEach(function(value) {
      if (value != className) {
        values += ' ' + value;
      }
    });
    if (append) {
      values += ' ' + className;
    }
    elm.setAttribute('class', values);
  };

  var schedule = function() {

    var bgCtx = document.createElement('canvas').getContext('2d');
    bgCtx.canvas.setAttribute('id', 'background');
    bgCtx.canvas.addEventListener('mousedown', function(event) {
      event.preventDefault();
    });
    document.body.appendChild(bgCtx.canvas);

    var content = document.createElement('div');
    content.setAttribute('id', 'content');
    content.addEventListener('mousedown', function(event) {
      if (event.target.tagName != 'INPUT') {
        event.preventDefault();
      }
    });
    document.body.appendChild(content);

    var titleHolder = document.createElement('div');
    titleHolder.setAttribute('id', 'title-holder');
    content.appendChild(titleHolder);

    var title = function() {
      var elm = document.createElement('input');
      elm.setAttribute('id', 'title');
      elm.setAttribute('type', 'text');
      elm.setAttribute('placeHolder', messages.ENTER_HERE_YOUR_SCHEDULE);
      elm.addEventListener('input', function() { update(); });
      elm.addEventListener('focus', function() {
        setCurrentSel(sel);
      } );
      elm.addEventListener('blur', function() {
        setCurrentSel(null);
      } );
      titleHolder.appendChild(elm);
      if (location.hash.length > 0) {
        // restore from hash
        elm.value = decodeURIComponent(location.hash.substring(1) );
      }
      var sel = { $el: elm };
      return sel;
    }();

    var qrCtx = document.createElement('canvas').getContext('2d');
    qrCtx.canvas.setAttribute('id', 'qrcode');
    qrCtx.canvas.addEventListener('mousedown', function(event) {
      event.preventDefault();
    });
    content.appendChild(qrCtx.canvas);

    var appendLabel = function(text) {
      var elm = document.createElement('span');
      elm.textContent = text;
      elm.setAttribute('class', 'label');
      content.appendChild(elm);
    };

    var createSelection = function(prop, length) {
      var elm = document.createElement('input');
      elm.value = '1234567';
      elm.setAttribute('class', 'sel ' + prop);
      elm.readOnly = true;
      elm.addEventListener('focus', function() {
        setCurrentSel(sel);
      });
      elm.addEventListener('blur', function() {
        setCurrentSel(null);
      });

      var sel = { $el: elm, prop: prop, length: length, error: false };
      selections[prop] = sel;
      return sel;
    };

    var appendBreak = function(parent) {
      parent.appendChild(document.createElement('br') );
    };

    var selections = {};
    appendBreak(content);
    content.appendChild(createSelection('year', 4).$el );
    appendLabel('/');
    content.appendChild(createSelection('md', 4).$el );
    appendBreak(content);
    content.appendChild(createSelection('sTime', 4).$el );
    appendLabel('-');
    content.appendChild(createSelection('eTime', 4).$el );

    var buttonsHolder = document.createElement('div');
    buttonsHolder.setAttribute('id', 'buttons-holder');
    content.appendChild(buttonsHolder);

    !function() {

      var buttonSettings = [
        { label: '1', size: 1 },
        { label: '2', size: 1 },
        { label: '3', size: 1 },
        { label: '4', size: 1 },
        { label: '5', size: 1 },
        { label: '6', size: 1 },
        { label: '7', size: 1 },
        { label: '8', size: 1 },
        { label: '9', size: 1 },
        { label: '', size: 1 },
        { label: '0', size: 1 },
        { label: '', size: 1 }
      ];
  
      var rows = 4;
      var cols = 3;

      var each = function(cb) {
        var i = 0;
        for (var r = 0; r < rows; r += 1) {
          for (var c = 0; c < cols; c += 1) {
            cb(r, c, i);
            i += 1;
          }
        }
      };
      each(function(r, c, i) {
        if (i > 0 && c == 0) {
          appendBreak(buttonsHolder);
        }
        var button = document.createElement('button');
        button.setAttribute('class', 'num-button');
        button.setAttribute('tabindex', '-1');
        button.textContent = buttonSettings[i].label;
        button.style.display = buttonSettings[i].label? '' : 'none';
        button.addEventListener('mousedown', function(event) {
          event.preventDefault();
          putDigit(buttonSettings[i].label);
        });
        buttonsHolder.appendChild(button);
      });
    }();

    var model = {
      currentSel: selections.md,
      date: function() {
        var date = new Date();
        return {
          year: lzpad(date.getFullYear(), 4),
          md: lzpad(date.getMonth() + 1, 2) + lzpad(date.getDate(), 2),
          sTime: '1000',
          eTime: '1100'
        };
      }()
    };

    var setCurrentSel = function(currentSel) {
      model.currentSel = currentSel;
      update();
    };

    var putDigit = function(d) {
      if (model.currentSel) {
        var s = model.date[model.currentSel.prop] + d;
        s = s.substring(s.length - model.currentSel.length);
        model.date[model.currentSel.prop] = s;
        update();
      }
    };

    var validate = function() {
      // validation
      var valDate = function(prop) {
        var tmpDate = new Date(0);
        tmpDate.setFullYear(+model.date.year);
        tmpDate.setMonth(+model.date.md.substring(0, 2) - 1);
        tmpDate.setDate(+model.date.md.substring(2, 4) );
        tmpDate.setHours(+model.date[prop].substring(0, 2) );
        tmpDate.setMinutes(+model.date[prop].substring(2, 4) );
        var sdate = lzpad(tmpDate.getFullYear(), 4) +
          lzpad(tmpDate.getMonth() + 1, 2) +
          lzpad(tmpDate.getDate(), 2) +
          lzpad(tmpDate.getHours(), 2) +
          lzpad(tmpDate.getMinutes(), 2);
        var error = false;
        if (!error  && sdate.substring(8, 12) != model.date[prop]) {
          selections[prop].error = true;
          error = true;
        }
        if (!error  && sdate.substring(4, 8) != model.date.md) {
          selections.md.error = true;
          error = true;
        }
        if (!error  && sdate.substring(0, 4) != model.date.year) {
          selections.year.error = true;
          error = true;
        }
        return sdate;
      };

      // clear errors.
      selections.year.error = false;
      selections.md.error = false;
      selections.sTime.error = false;
      selections.eTime.error = false;

      var sTime = valDate('sTime');
      var dTime = valDate('eTime');

      if (dTime < sTime) {
        selections.eTime.error = true;
      }
    };

    document.addEventListener('keydown', function(event) {
      if (event.target != title.$el && event.key.match(/^[0-9]$/) ) {
        event.preventDefault();
        putDigit(event.key);
      }
    });

    var update = function() {
      layout(window.innerWidth, window.innerHeight);
    };

    var layout = function(width, height) {

      // setup root font size
      document.documentElement.style.fontSize = (height / 25) + 'px';

      validate();

      bgCtx.canvas.width = width;
      bgCtx.canvas.height = height;
      bgCtx.clearRect(0, 0, width, height);
/*
      // debug-bg
      bgCtx.strokeStyle = '#00f';
      bgCtx.beginPath();
      bgCtx.moveTo(0, 0);
      bgCtx.lineTo(width, height);
      bgCtx.moveTo(width, 0);
      bgCtx.lineTo(0, height);
      bgCtx.stroke();
*/
      content.style.width = width + 'px';
      content.style.height = height + 'px';
      var titleValue = title.$el.value.replace(/^\s+|\s+$/g,'');

      location.href = '#' + encodeURIComponent(titleValue);

      !function() {
        var elm = title.$el;
        modClass(elm, 'selected', model.currentSel == title);
      }();

      !function() {

        var canvas = qrCtx.canvas;

        modClass(canvas, 'error', false);
        for (var sel in selections) {
          if (selections[sel].error) {
            qrCtx.canvas.width = 1;
            qrCtx.canvas.height = 1;
            qrCtx.clearRect(0, 0, canvas.width, canvas.height);
            qrCtx.fillStyle = '#000';
            qrCtx.fillRect(0, 0, canvas.width, canvas.height);
            modClass(canvas, 'error', true);
            return;
          }
        }

        var vData = '';
        var appendVData = function(line) {
          vData += line + '\r\n';
        };

        var vDate = function(timeProp) {
          return model.date.year + model.date.md + 'T' +
            model.date[timeProp] + '00';
        };

        var now = new Date();
        appendVData('BEGIN:VCALENDAR');
        appendVData('VERSION:2.0');
        appendVData('BEGIN:VEVENT');
        appendVData('DTSTAMP:' +
          lzpad(now.getFullYear(), 4) +
          lzpad(now.getMonth() + 1, 2) +
          lzpad(now.getDate(), 2) + 'T000000');
        appendVData('DTSTART:' + vDate('sTime') );
        appendVData('DTEND:' + vDate('eTime') );
        appendVData('SUMMARY:' + (titleValue || messages.UNTITLED_SCHEDULE) );
        appendVData('END:VEVENT');
        appendVData('END:VCALENDAR');

        var qr = qrcode(0, 'L');
//        qr.addData(vData, 'Byte');
        qr.addData(vData, 'Byte');
        qr.make();
        var modCount = qr.getModuleCount();
        var msize = 2;
        var quiet = msize * 4;
        var qsize = modCount * msize + quiet * 2;
        qrCtx.canvas.width = qsize;
        qrCtx.canvas.height = qsize;
        qrCtx.clearRect(0, 0, canvas.width, canvas.height);
        qrCtx.fillStyle = '#fff';
        qrCtx.fillRect(0, 0, canvas.width, canvas.height);
        qrCtx.fillStyle = '#000';
        for (var r = 0; r < modCount; r += 1) {
          for (var c = 0; c < modCount; c += 1) {
            if (qr.isDark(r, c) ) {
              qrCtx.fillRect(c * msize + quiet, r * msize + quiet,
                msize, msize);
            }
          }
        }

      }();

      !function() {

        var layoutSelection = function(sel, format) {
          var elm = sel.$el;
          modClass(elm, 'selected', model.currentSel == sel);
          modClass(elm, 'error', sel.error);
          elm.value = format(model.date[sel.prop]);
        };

        layoutSelection(selections.year, function(v) { return v; });
        layoutSelection(selections.md, function(v) {
          return v.substring(0, 2) + '/' + v.substring(2, 4); });
        layoutSelection(selections.sTime, function(v) {
          return v.substring(0, 2) + ':' + v.substring(2, 4); });
        layoutSelection(selections.eTime, function(v) {
          return v.substring(0, 2) + ':' + v.substring(2, 4); });
      }();

    };

    return {
      layout: layout
    };
  }();

  var watcher = function() {
    var width = window.innerWidth;
    var height =  window.innerHeight;
    if (watcher.lastSize.width != width ||
        watcher.lastSize.height != height) {
      schedule.layout(width, height);
      watcher.lastSize = { width: width, height: height };
    }
    window.setTimeout(watcher, 500);
  };
  watcher.lastSize = { width: 0, height: 0 };
  watcher();
});
