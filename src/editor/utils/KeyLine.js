'use strict';

var EventEmitter = require('eventman');
var inherits = require('inherits');
var amgui = require('../amgui');

function KeyLine (opt) {

    EventEmitter.call(this);

    this._keys = [];

    this._height = amgui.LINE_HEIGHT;

    this._onChangeKey = this._onChangeKey.bind(this);
    this._onKeyNeedsRemove = this._onKeyNeedsRemove.bind(this);
    this._onChangeTimescale = this._onChangeTimescale.bind(this);
    this._onDblClick = this._onDblClick.bind(this);
    this._onMouseDown = this._onMouseDown.bind(this);
    
    this._createDomElem();

    amgui.callOnAdded(this.domElem, this._render.bind(this));

    am.timeline.on('changeTimescale', this._onChangeTimescale);

    var dropdownBinding = amgui.bindDropdown({
        deTarget: this.domElem,
        onOpening: function (e) {

            var key = this.getKeyUnderPos(e.screenX),
                dropdown = key && key.getDropdown();

            if (dropdown) {

                dropdownBinding.setDropdown(dropdown);
            }
            else {
                return false;
            }
        }.bind(this),
    });
}

inherits(KeyLine, EventEmitter);
var p = KeyLine.prototype;
module.exports = KeyLine;








Object.defineProperties(p, {

    keyCount: {

        get: function () {

            return this._keys.length;
        }
    }
});







p.addKey = function (key) {
    
    this._keys.push(key);
    key.parentKeyLine = this;

    key.on('changeTime', this._onChangeKey);
    key.on('changeEase', this._onChangeKey);
    key.on('select', this._onChangeKey);
    key.on('deselect', this._onChangeKey);
    key.on('needsRemove', this._onKeyNeedsRemove);
    
    this._render();
    this.emit('change');
};

p.removeKey = function (key) {

    var idx = this._keys.indexOf(key);

    if (idx === -1) {
        return false;
    }

    this._keys.splice(idx, 1);
    key.parentKeyLine = undefined;
    
    key.removeListener('changeTime', this._onChangeKey);
    key.removeListener('changeEase', this._onChangeKey);
    key.removeListener('select', this._onChangeKey);
    key.removeListener('deselect', this._onChangeKey);
    key.removeListener('needsRemove', this._onKeyNeedsRemove);

    key.dispose();

    this._render();
    this.emit('change');

    return true;
};

p.forEachKeys = function (fn, thisArg) {

    this._keys.forEach(fn, thisArg);
};

p.getKeyByTime = function (time) {

    return this._keys.find(function(key) {

        return key.time === time;
    });
};

p.getPrevKey = function (time) {

    var retKey;
    
    this._keys.forEach(function(key) {

        if (key.time < time && (!retKey || retKey.time < key.time)) {

            retKey = key;
        }
    });

    return retKey;
};

p.getNextKey = function (time) {

    var retKey;
    
    this._keys.forEach(function(key) {

        if (key.time > time && (!retKey || retKey.time > key.time)) {

            retKey = key;
        }
    });

    return retKey;
};

p.getClosestKey = function (time) {

    var retKey, retDist;
    
    this._keys.forEach(function(key) {

        var dist = Math.abs(time - key.time);

        if (!retKey || retDist > dist) {

            retDist = dist;
            retKey = key;
        }
    });

    return retKey;
};

p.getKeyUnderPos = function (x) {

    var time = am.timeline.screenXToTime(x),
        key = this.getClosestKey(time);

    if (key && (Math.abs(time - key.time) * am.timeline.timescale) < 4) {

        return key;
    }
};

p.getKeyTimes = function () {

    var times = [];

    this._keys.forEach(function (key) {

        times.push(key.time);
    });

    return times;
};









p._render = function () {

    var canvas = this._canvas,
        ctx = this._ctx,
        tlStart = am.timeline.start,
        tlTimescale = am.timeline.timescale;

    canvas.width = am.timeline.width;
    canvas.height = this._height;

    _.sortBy(this._keys, 'time').forEach(function (key, idx, arr) {

        var start = (key.time + tlStart) * tlTimescale,
            isLast = idx === arr.length - 1,
            end = isLast ? start : (arr[idx+1].time + tlStart) * tlTimescale,
            width = end - start;

        key.renderToLine(ctx, start, width);
    });
};
    
p._sortKeys = function () {

    this._keys.sort(function (a, b) {
        
        return a.time - b.time;
    });
};

p.show = function () {

    this.domElem.style.display = '';
};

p.hide = function () {

    this.domElem.style.display = 'none';
};








p._onChangeKey = function (key) {

    this._render();
    this.emit('change');
};

p._onChangeTimescale = function (key) {

    this._render();
};

p._onKeyNeedsRemove = function (key) {

    this.removeKey(key);
};

p._onDblClick = function (e) {

    var time = am.timeline.screenXToTime(e.screenX),
        prevKey = this.getPrevKey(time),
        nextKey = this.getNextKey(time);

    if (prevKey && nextKey) {

        am.timeline.inlineEaseEditor.show({
            key: prevKey,
            nextKey: nextKey
        });
    }
};

p._onMouseDown = function (e) {

    var key = this.getKeyUnderPos(e.screenX);

    if (key) {
        key.grab(e);
    }
};












p._createDomElem = function createKeyline(opt) {

    this.domElem = document.createElement('div');
    this.domElem.style.width = '100%';
    this.domElem.style.position = 'relative';
    this.domElem.setAttribute('debug-keyline', 1);
    this.domElem.style.overflow = 'hidden';


    //TODO remove _deLine if it's doesn't needed;
    this._deLine = document.createElement('div');
    this._deLine.style.position = 'relative';
    this._deLine.style.width = '100%';
    this._deLine.style.height = this._height + 'px';
    this.domElem.appendChild(this._deLine);
    amgui.createSeparator({parent: this._deLine});

    this._canvas = document.createElement('canvas');
    this._canvas.style.position = 'absolute';
    this._deLine.appendChild(this._canvas);
    this._ctx = this._canvas.getContext('2d');
    
    this._canvas.addEventListener('dblclick', this._onDblClick);
    this._canvas.addEventListener('mousedown', this._onMouseDown);
};

p.dispose = function () {
    //TODO
};