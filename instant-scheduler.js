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

  var messages = function() {
    var messages = {
      en: {
        ENTER_HERE_YOUR_SCHEDULE: 'Enter here your schedule',
        UNTITLED_SCHEDULE: 'Untitled schedule',
        WEEKDAYS: 'SUN,MON,TUE,WED,THU,FRI,SAT'
      },
      ja: {
        ENTER_HERE_YOUR_SCHEDULE: 'ここに予定を入力',
        UNTITLED_SCHEDULE: '無題の予定',
        WEEKDAYS: '日,月,火,水,木,金,土'
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

  var attachMousedownHandler = function(elm, handler) {
    elm.addEventListener('mousedown', handler);
    elm.addEventListener('touchstart', handler);
  };

  var schedule = function() {

    var bgCtx = document.createElement('canvas').getContext('2d');
    bgCtx.canvas.setAttribute('id', 'background');
    attachMousedownHandler(bgCtx.canvas, function(event) {
      event.preventDefault();
    });
    document.body.appendChild(bgCtx.canvas);

    var content = document.createElement('div');
    content.setAttribute('id', 'content');
    attachMousedownHandler(content, function(event) {
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
      elm.setAttribute('maxlength', '80');
      elm.setAttribute('placeHolder', messages.ENTER_HERE_YOUR_SCHEDULE);
      elm.addEventListener('input', function() { update(); });
      elm.addEventListener('focus', function() {
        setCurrentInput(inp);
      } );
      elm.addEventListener('blur', function() {
        setCurrentInput(null);
      } );
      titleHolder.appendChild(elm);
      if (location.hash.length > 0) {
        // restore from hash
        elm.value = decodeURIComponent(location.hash.substring(1) );
      }
      var inp = { $el: elm };
      return inp;
    }();

    var qrHolder = document.createElement('div');
    qrHolder.setAttribute('id', 'qr-holder');
    attachMousedownHandler(qrHolder, function(event) {
      event.preventDefault();
    });
    content.appendChild(qrHolder);

    var qrCtx = document.createElement('canvas').getContext('2d');
    qrCtx.canvas.setAttribute('id', 'qrcode');
    qrHolder.appendChild(qrCtx.canvas);

    var infoCtx = document.createElement('canvas').getContext('2d');
    infoCtx.canvas.setAttribute('id', 'info');
    qrHolder.appendChild(infoCtx.canvas);

    !function() {
      // load sad face.
      var img = document.createElement('img');
      img.addEventListener('load', function() {
        infoCtx.canvas.width = img.width;
        infoCtx.canvas.height = img.height;
        infoCtx.drawImage(img, 0, 0);
      });
      img.src = 'sad-face.png';
    }();

    var appendLabel = function(text) {
      var elm = document.createElement('span');
      elm.textContent = text;
      elm.setAttribute('class', 'label');
      content.appendChild(elm);
    };

    var appendInput = function(prop, length) {
      var elm = document.createElement('input');
      elm.value = '1234567';
      elm.setAttribute('class', 'num-input ' + prop);
      elm.readOnly = true;
      elm.addEventListener('focus', function() {
        setCurrentInput(inp);
      });
      elm.addEventListener('blur', function() {
        setCurrentInput(null);
      });
      var inp = { $el: elm, prop: prop, length: length, error: false };
      inputs[prop] = inp;
      content.appendChild(elm);
    };

    var appendBreak = function(parent) {
      parent.appendChild(document.createElement('br') );
    };

    var inputs = {};
    appendBreak(content);
    appendInput('year', 4);
    appendLabel('/');
    appendInput('md', 4);
    appendBreak(content);
    appendInput('sTime', 4);
    appendLabel('-');
    appendInput('eTime', 4);

    var day = function() {

      var day = document.createElement('span');
      day.setAttribute('id', 'day');
      day.textContent = 'あ';

      var holder = document.createElement('span');
      holder.setAttribute('class', 'holder');
      content.insertBefore(holder, inputs.md.$el.nextSibling);
      content.removeChild(inputs.md.$el);
      holder.appendChild(inputs.md.$el);
      holder.appendChild(day);

      return day;
    }();

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
        attachMousedownHandler(button, function(event) {
          event.preventDefault();
          putDigit(buttonSettings[i].label);
        });
        buttonsHolder.appendChild(button);
      });
    }();

    var model = {
      currentInput: inputs.md,
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

    var setCurrentInput = function(currentInput) {
      model.currentInput = currentInput;
      update();
    };

    var putDigit = function(d) {
      if (model.currentInput) {
        var s = model.date[model.currentInput.prop] + d;
        s = s.substring(s.length - model.currentInput.length);
        model.date[model.currentInput.prop] = s;
        update();
      }
    };

    var validate = function() {

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
        if (!error && sdate.substring(8, 12) != model.date[prop]) {
          inputs[prop].error = true;
          error = true;
        }
        if (!error && sdate.substring(4, 8) != model.date.md) {
          inputs.md.error = true;
          error = true;
        }
        if (!error && sdate.substring(0, 4) != model.date.year) {
          inputs.year.error = true;
          error = true;
        }
        return sdate;
      };

      // clear errors.
      inputs.year.error = false;
      inputs.md.error = false;
      inputs.sTime.error = false;
      inputs.eTime.error = false;

      var sTime = valDate('sTime');
      var eTime = valDate('eTime');

      if (!inputs.sTime.error && eTime < sTime) {
        inputs.eTime.error = true;
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
        modClass(elm, 'selected', model.currentInput == title);
      }();

      !function() {
        var error = inputs.year.error || inputs.md.error;
        if (error) {
          day.textContent = '?';
        } else {
          var weekdays = messages.WEEKDAYS.split(/,/g);
          if (weekdays.length != 7) {
            throw messages.WEEKDAYS;
          }
          var date = new Date(0);
          date.setFullYear(+model.date.year);
          date.setMonth(+model.date.md.substring(0, 2) - 1);
          date.setDate(+model.date.md.substring(2, 4) );
          day.textContent = weekdays[date.getDay()];
        }
      }();

      var anyError = function() {
        for (var prop in inputs) {
          if (inputs[prop].error) {
            return true;
          }
        }
        return false;
      }();

      !function() {
        var canvas = infoCtx.canvas;
        modClass(canvas, 'error', anyError);
      }();

      !function() {

        var canvas = qrCtx.canvas;

        modClass(canvas, 'error', anyError);
        if (anyError) {
          return;
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

        var layoutInput = function(inp, format) {
          var elm = inp.$el;
          modClass(elm, 'selected', model.currentInput == inp);
          modClass(elm, 'error', inp.error);
          elm.value = format(model.date[inp.prop]);
        };

        layoutInput(inputs.year, function(v) { return v; });
        layoutInput(inputs.md, function(v) {
          return v.substring(0, 2) + '/' + v.substring(2, 4); });
        layoutInput(inputs.sTime, function(v) {
          return v.substring(0, 2) + ':' + v.substring(2, 4); });
        layoutInput(inputs.eTime, function(v) {
          return v.substring(0, 2) + ':' + v.substring(2, 4); });
      }();

    };

    return {
      layout: layout
    };
  }();

  document.addEventListener('touchstart', function(event) {
    event.preventDefault();
  });

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
