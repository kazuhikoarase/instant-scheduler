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

  var keyColor1 = 'rgba(255,127,0,0.1)'; // bg
  var keyColor2 = 'rgba(127,0,0,0.5)';  // border

  qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];

  var lzpad = function(n, digits) {
    var s = '' + n;
    while (s.length < digits) {
      s = '0' + s;
    }
    return s;
  };

  var ctx = document.createElement('canvas').getContext('2d');
  ctx.canvas.setAttribute('id', 'cv');
  document.body.appendChild(ctx.canvas);

  var qrCv = document.createElement('canvas');
  qrCv.setAttribute('id', 'qrCv');
  document.body.appendChild(qrCv);

  var texts = function() {
    var rows = 2;
    var cols = 11;
    var texts = [];
    var each = function(cb) {
      var i = 0;
      for (var r = 0; r < rows; r += 1) {
        for (var c = 0; c < cols; c += 1) {
          cb(r, c, i);
          i += 1;
        }
      }
    };
    each(function(r, c) {
      var text = document.createElement('span');
      text.setAttribute('class', 'txt');
      text.textContent = r + 'x' + c;
      document.body.appendChild(text);
      texts.push(text);
    });
    texts.rows = rows;
    texts.cols = cols;
    texts.each = each;
    return texts;
  }();

  var buttons = function() {

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
    var buttons = [];
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
      var button = document.createElement('button');
      button.setAttribute('class', 'btn');
      button.setAttribute('tabindex', '-1');
      button.textContent = buttonSettings[i].label;
      button.style.display = buttonSettings[i].label? '' : 'none';
      button.addEventListener('mousedown', function(event) {
        event.preventDefault();
        schedule.putDigit(buttonSettings[i].label);
      });
      document.body.appendChild(button);
      buttons.push(button);
    });
    buttons.rows = rows;
    buttons.cols = cols;
    buttons.each = each;
    buttons.getButtonSizeAt = function(i) {
      return buttonSettings[i].size;
    };
    return buttons;
  }();

  var schedule = function() {

    var title = function() {
      var elm = document.createElement('input');
      elm.setAttribute('id', 'titleTx');
      elm.setAttribute('type', 'text');
      elm.setAttribute('placeHolder', messages.ENTER_HERE_YOUR_SCHEDULE);
      elm.addEventListener('input', function() { update(); });
      elm.addEventListener('focus', function() {
        setCurrentSel(sel);
      } );
      elm.addEventListener('blur', function() {
        setCurrentSel(null);
      } );
      document.body.appendChild(elm);
      if (location.hash.length > 0) {
        // restore from hash
        elm.value = decodeURIComponent(location.hash.substring(1) );
      }
      var sel = { $el: elm };
      return sel;
    }();

    var createSelection = function(prop, length) {
      var elm = document.createElement('span');
      elm.setAttribute('class', 'sel');
      elm.setAttribute('tabindex', '0');
      elm.addEventListener('focus', function() {
        setCurrentSel(sel);
      });
      elm.addEventListener('blur', function() {
        setCurrentSel(null);
      });
      document.body.appendChild(elm);
      var sel = { $el: elm, prop: prop, length: length, error: false };
      selections[prop] = sel;
    };

    var selections = {};
    createSelection('year', 4);
    createSelection('md', 4);
    createSelection('sTime', 4);
    createSelection('eTime', 4);

    var date = function() {
      var date = new Date();
      return {
        year: lzpad(date.getFullYear(), 4),
        md: lzpad(date.getMonth() + 1, 2) + lzpad(date.getDate(), 2),
        sTime: '1000',
        eTime: '1100'
      };
    }();
    var model = { currentSel: null };
    var getDisplayString = function() {
    return date.year + '/' +
      date.md.substring(0, 2) + '/' + date.md.substring(2, 4) + ' ' +
      date.sTime.substring(0, 2) + ':' + date.sTime.substring(2, 4) + '-' +
      date.eTime.substring(0, 2) + ':' + date.eTime.substring(2, 4);
    };
    var setCurrentSel = function(currentSel) {
      model.currentSel = currentSel;
      update();
    };
    var putDigit = function(d) {
      if (model.currentSel) {
        var s = date[model.currentSel.prop] + d;
        s = s.substring(s.length - model.currentSel.length);
        date[model.currentSel.prop] = s;
        update();
      }
    };
    var validate = function() {
      // validation
      var valDate = function(prop) {
        var tmpDate = new Date(0);
        tmpDate.setFullYear(+date.year);
        tmpDate.setMonth(+date.md.substring(0, 2) - 1);
        tmpDate.setDate(+date.md.substring(2, 4) );
        tmpDate.setHours(+date[prop].substring(0, 2) );
        tmpDate.setMinutes(+date[prop].substring(2, 4) );
        var sdate = lzpad(tmpDate.getFullYear(), 4) +
          lzpad(tmpDate.getMonth() + 1, 2) +
          lzpad(tmpDate.getDate(), 2) +
          lzpad(tmpDate.getHours(), 2) +
          lzpad(tmpDate.getMinutes(), 2);
        var error = false;
        if (!error  && sdate.substring(8, 12) != date[prop]) {
          selections[prop].error = true;
          error = true;
        }
        if (!error  && sdate.substring(4, 8) != date.md) {
          selections.md.error = true;
          error = true;
        }
        if (!error  && sdate.substring(0, 4) != date.year) {
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

    var layout = function(width, height) {

      validate();

      !function() {

        ctx.canvas.width = width;
        ctx.canvas.height = height;
        ctx.clearRect(0, 0, width, height);

        ctx.strokeStyle = '#00f';
        ctx.fillStyle = keyColor1;
        ctx.fillRect(0, 0, width, height);
        /*
        // debug-bg
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(width, height);
        ctx.moveTo(width, 0);
        ctx.lineTo(0, height);
        ctx.stroke();
        */
      }();

      var std = Math.min(width, height);
      var gap = ~~(std / 50);

      var tbdr = height / 160;
      var tpad = height / 100;
      var lbdr = height / 160;
      var lgap = height / 250;

      !function() {
        var selected = model.currentSel == title;
        var elm = title.$el;
        location.href = '#' + encodeURIComponent(title.$el.value);
        elm.style.left = (gap - tbdr) + 'px';
        elm.style.top = gap + 'px';
        elm.style.padding = tpad + 'px';
        elm.style.fontSize = (height / 25) + 'px';
        elm.style.width = (width - tpad * 2 - gap * 2) + 'px';
        elm.style.border = tbdr + 'px solid ' +
          (selected? keyColor2 : 'rgba(0,0,0,0)');
        elm.style.borderRadius = (height  / 120) + 'px';
      }();

      var ttop = 0;
      var btop = 0;

      !function() {

        var bs = ( (height + gap) / 8 - gap);
        var marginLeft = (width - ( (bs + gap) * buttons.cols - gap) ) / 2;
        var marginTop = (height - ( (bs + gap) * buttons.rows - gap) ) - gap;

        buttons.each(function(r, c, i) {

          var button = buttons[i];
          var left = marginLeft + c * (bs + gap);
          var top = marginTop + r * (bs + gap);

          if (i == 0) {
            btop = top - gap;
          }

          button.style.left = left + 'px';
          button.style.top = top + 'px';
          button.style.width = bs + 'px';
          button.style.height = bs + 'px';
          button.style.borderRadius = (bs / 2) + 'px';
          button.style.fontSize = (height / 16 *
            buttons.getButtonSizeAt(i) ) + 'px';
        });
      }();

      var s = getDisplayString();
      !function() {

        var hgap = 0;
        var vgap = std / 30;
        var th = (height + hgap) / 14 - hgap;
        var tw = th / 2;

        var marginLeft = (width - ( (tw + hgap) * texts.cols - hgap) ) / 2;
        var marginTop = (btop - ( (th + vgap) * texts.rows - vgap) );

        texts.each(function(r, c, i) {

          var text = texts[i];
          var left = marginLeft + c * (tw + hgap);
          var top = marginTop + r * (th + vgap);

          if (i == 0) {
            ttop = top;
          }

          text.style.left = left + 'px';
          text.style.top = top + 'px';
          text.style.width = tw + 'px';
          text.style.height = th + 'px';
          text.style.fontSize = th + 'px';
          text.textContent =  s.charAt(i);
        });

        var layoutSelection = function(sel, x, y, width, height) {
          var selected = model.currentSel == sel;
          var error = sel.error;
          var elm = sel.$el;
          var left = marginLeft + x * (tw + hgap) - lbdr - lgap;
          var top = marginTop + y * (th + vgap) - lbdr - lgap;
          elm.style.left = left + 'px';
          elm.style.top = top + 'px';
          elm.style.width = (tw * width + lgap * 2) + 'px';
          elm.style.height = (th * height + lgap * 2) + 'px';
          elm.style.backgroundColor = error?
            'rgba(255,0,0,0.2)' : 'rgba(0,0,0,0.1)';
          elm.style.border = lbdr + 'px solid ' +
            (selected? keyColor2 : 'rgba(0,0,0,0)');
          elm.style.borderRadius = lbdr * 2 + 'px';
        };

        layoutSelection(selections.year, 0, 0, 4, 1);
        layoutSelection(selections.md, 5, 0, 5, 1);
        layoutSelection(selections.sTime, 0, 1, 5, 1);
        layoutSelection(selections.eTime, 6, 1, 5, 1);
      }();

      !function() {

        for (var sel in selections) {
          if (selections[sel].error) {
            qrCv.style.display = 'none';
            return;
          }
        }
        qrCv.style.display = '';

        var vData = '';
        var appendVData = function(line) {
          vData += line + '\r\n';
        };

        var now = new Date();
        appendVData('BEGIN:VCALENDAR');
        appendVData('VERSION:2.0');
        appendVData('BEGIN:VEVENT');
        appendVData('DTSTAMP:' +
          lzpad(now.getFullYear(), 4) +
          lzpad(now.getMonth() + 1, 2) +
          lzpad(now.getDate(), 2) + 'T000000');
        appendVData('DTSTART:' +
          date.year + date.md + 'T' + date.sTime + '00');
        appendVData('DTEND:' +
          date.year + date.md + 'T' + date.eTime + '00');
        appendVData('SUMMARY:' +
          (title.$el.value || messages.UNTITLED_SCHEDULE) );
        appendVData('END:VEVENT');
        appendVData('END:VCALENDAR');

        var qr = qrcode(0, 'L');
        qr.addData(vData, 'Byte');
        qr.make();
        var modCount = qr.getModuleCount();
        var msize = 2;
        var quiet = msize * 4;
        var qsize = modCount * msize + quiet * 2;
        qrCv.width = qsize;
        qrCv.height = qsize;
        var qrCtx = qrCv.getContext('2d');
        qrCtx.clearRect(0, 0, qrCv.width, qrCv.height);
        qrCtx.fillStyle = '#fff';
        qrCtx.fillRect(0, 0, qrCv.width, qrCv.height);
        qrCtx.fillStyle = '#000';
        for (var r = 0; r < modCount; r += 1) {
          for (var c = 0; c < modCount; c += 1) {
            if (qr.isDark(r, c) ) {
              qrCtx.fillRect(c * msize + quiet, r * msize + quiet,
                msize, msize);
            }
          }
        }

        var translate = function(left, top) {
          return 'translate(' + left + 'px,' + top + 'px)';
        };

        var left = width / 2;
        var top = gap + title.$el.offsetHeight;
        var scale = (ttop - lbdr - top) / qsize * 0.9;

        //hDbgLine(top, 'orange');
        //hDbgLine(ttop - lbdr - lgap, 'blue');

        var tran = '';
        tran += translate(-qsize / 2, -qsize / 2);
        tran += 'scale(' + scale + ')';
        tran += translate(qsize / 2, qsize / 2);
        tran += translate(left / scale - qsize / 2,
          (ttop - lbdr - lgap + top) / 2 / scale - qsize / 2);
        qrCv.style.transform = tran;
      }();
    };

    document.addEventListener('keydown', function(event) {
      if (event.target != title.$el && event.key.match(/^[0-9]$/) ) {
        event.preventDefault();
        schedule.putDigit(event.key);
      }
    });

    var update = function() {
      layout(window.innerWidth, window.innerHeight);
    };

    selections.md.$el.focus();

    return {
      getDisplayString: getDisplayString,
      setCurrentSel: setCurrentSel,
      putDigit: putDigit,
      layout: layout
    };
  }();

  var hDbgLine = function(y, color) {
    ctx.strokeStyle = color || '#f00';
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width / 2, y);
    ctx.stroke();
  };
  var vDbgLine = function(x, color) {
    ctx.strokeStyle = color || '#f00';
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height / 2);
    ctx.stroke();
  };

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
