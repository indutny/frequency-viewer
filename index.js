var ndarray = require('ndarray');
var fft = require('ndarray-fft');
var mag = require('ndarray-complex').mag;

var inherits = require('inherits');
var EventEmitter = require('events').EventEmitter;

var fs = require('fs');
var html = fs.readFileSync(__dirname + '/scope.html', 'utf8');
var domify = require('domify');

module.exports = Scope;
inherits(Scope, EventEmitter);

function Scope (opts) {
    var self = this;
    if (!(this instanceof Scope)) return new Scope(opts);
    if (!opts) opts = {};
    this.rate = opts.rate || 44000;
    
    this.element = domify(html)[0];
    this.element.style.width = '100%';
    this.element.style.height = '100%';
    
    this.element.addEventListener('click', function (ev) {
        if (ev.target === self.svg || ev.target === sliders
        || ev.target === self.polyline) {
            self.emit('click', ev);
        }
    });
    
    this.svg = createElement('svg');
    this.svg.setAttribute('width', '100%');
    this.svg.setAttribute('height', '100%');
    this.element.appendChild(this.svg);
    
    var p = this.polyline = createElement('polyline');
    p.setAttribute('stroke', opts.stroke || 'cyan');
    p.setAttribute('stroke-width', opts.strokeWidth || '4px');
    p.setAttribute('fill', 'transparent');
    this.svg.appendChild(this.polyline);
}

Scope.prototype.appendTo = function (target) {
    if (typeof target === 'string') target = document.querySelector(target);
    target.appendChild(this.element);
    this._target = target;
    this.resize();
};

Scope.prototype.resize = function () {
    if (!this._target) return;
    var style = window.getComputedStyle(this._target);
    this.width = parseInt(style.width);
    this.height = parseInt(style.height);
};

Scope.prototype.draw = function (input) {
    var data = new Float32Array(input.length);
    for (var i = 0; i < input.length; i++) data[i] = input[i];
    
    var reals = ndarray(data, [ data.length, 1 ]);
    var imags = ndarray(new Float32Array(data.length), [ data.length, 1 ]);
    
    fft(1, reals, imags);
    mag(reals, reals, imags);
    
    var points = [];
    for (var i = 100; i < reals.data.length; i++) {
        var freq = i * this.rate / data.length;
        var x = freq === 0 ? 0 : Math.log(freq) / 10 * this.width;
        var d = reals.data[i];
        var y = this.height - d / 2;
        points.push(x + ',' + y);
    }
    this.polyline.setAttribute('points', points.join(' '));
};

function createElement (name) {
    return document.createElementNS('http://www.w3.org/2000/svg', name);
}
