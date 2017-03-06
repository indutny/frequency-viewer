var FFT = require('fft.js');

var inherits = require('inherits');
var EventEmitter = require('events').EventEmitter;

var fs = require('fs');
var html = fs.readFileSync(__dirname + '/scope.html', 'utf8');
var domify = require('domify');
var slideways = require('slideways');

var FREQ_LOW = 10;
var FREQ_HIGH = 20000;
var POINT_DENSITY = 0.003;

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
    p.setAttribute('fill', opts.fill || 'cyan');
    p.setAttribute('stroke', opts.stroke || 'cyan');
    p.setAttribute('strokeWidth', opts.strokeWidth || '2px');
    this.svg.appendChild(this.polyline);
    
    this.scale = 0;
    this.createSlider({ min: -1, max: 5, init: 0 }, function (x) {
        self.scale = Math.pow(2, x);
    });

    this.fft = new FFT(opts.fft || 4096);

    // Circular buffer
    this.fftOffset = 0;
    this.fftInput = this.fft.createComplexArray();

    // Just storage
    this.fftOutput = this.fft.createComplexArray();

    // Output power
    this.power = new Float64Array(this.fft.size);

    // Frequency limits
    this.fftLow = Math.floor((FREQ_LOW / this.rate) * this.fft.size);
    this.fftHigh = Math.ceil((FREQ_HIGH / this.rate) * this.fft.size);
}

Scope.prototype.createSlider = function (opts, f) {
    if (!opts) opts = {};
    var a = slideways(opts);
    if (f) a.on('value', f);
    a.appendTo(this.element.querySelector('#sliders'));
    return a;
};

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

Scope.prototype._compute = function _compute (input) {
    // Fill circular buffer
    var off = 0;
    var fftInput = this.fftInput;
    var fftOff = this.fftOffset;
    while (off < input.length) {
        var limit = Math.min(input.length - off,
                             (fftInput.length - fftOff) >>> 1);
        for (var i = 0; i < limit; i++) {
            fftInput[fftOff] = input[off];
            off++;
            fftOff += 2;
        }
        fftOff %= fftInput.length;
        if (fftOff !== 0)
            break;
    }

    // Apply transform
    this.fft.transform(this.fftOutput, this.fftInput);

    // Get power output
    var norm = Math.pow(this.fft.size, 2);
    for (var i = 0; i < this.fftOutput.length; i += 2) {
      var re = this.fftOutput[i];
      var im = this.fftOutput[i + 1];

      this.power[i >>> 1] = (Math.pow(re, 2) + Math.pow(im, 2)) / norm;
    }
    return this.power;
};


Scope.prototype.draw = function (data) {
    var mag = this._compute(data);
    this._draw(mag);
};

Scope.prototype._draw = function (data) {
    var self = this;

    var points = [ '0,' + this.height ];
    var pfreq, pd;
    
    // Group points
    var lastOff = -1;
    var accPow = 0;
    var accCount = 0;

    var reference = 1e-8;
    for (var i = this.fftLow; i < this.fftHigh; i++) {
      accPow += data[i];
      accCount++;

      var freq = (i - this.fftLow) / (this.fftHigh - this.fftLow) *
                 (FREQ_HIGH - FREQ_LOW) + FREQ_LOW;
      var off = Math.log10(freq / FREQ_LOW) /
          Math.log10(FREQ_HIGH / FREQ_LOW);

      // Group values to not draw way too much
      off = Math.max(0, off);
      if (off - lastOff < POINT_DENSITY)
        continue;

      var pow = accPow / accCount;
      var db = 10 * Math.log(pow / reference) * this.scale;
      plot(off, db);

      accPow = 0;
      accCount = 0;
      lastOff = off;
    }
    
    function plot (x, d) {
        var x = x * self.width;
        var y = Math.max(0, self.height - d);
        points.push(x + ',' + y);
    }
    
    points.push(this.width + ',' + this.height);
    this.polyline.setAttribute('points', points.join(' '));
};

function createElement (name) {
    return document.createElementNS('http://www.w3.org/2000/svg', name);
}
