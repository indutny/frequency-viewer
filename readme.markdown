# frequency-viewer

plot frequencies given raw data

# example

``` js
var fscope = require('frequency-viewer')();
fscope.appendTo('#scope');
setInterval(function () { fscope.draw(data) }, 50);

function fn (t) {
    return sin(440) + sin(2000);
    function sin (x) { return Math.sin(2 * Math.PI * t * x) }
}

var data = new Float32Array(8000);
var index = 0;

(function next () {
    var t;
    for (var i = 0; i < 8000; i++) {
        t = (index + i) / 44000;
        data[(i+index) % data.length] = fn(t);
    }
    index += i;
    window.requestAnimationFrame(next);
})();
```

# methods

``` js
var fscope = require('frequency-viewer')
```

## var scope = fscope(opts)

## scope.draw(data)

Update the polyline with `data`, a `Float32Array` of raw data to compute
frequency domain information for.

## scope.appendTo(target)

Append the scope html element to `target`, a query selector string or container
element.

## scope.resize()

Compute the height and width of the container, resizing accordingly.

# install

With [npm](https://npmjs.org) do:

```
npm install frequency-viewer
```

# license

MIT
