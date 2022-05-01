/**
 * requestAnimationFrame
 */
window.requestAnimationFrame = (function(){
    return  window.requestAnimationFrame       ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame    ||
            window.oRequestAnimationFrame      ||
            window.msRequestAnimationFrame     ||
            function (callback) {
                window.setTimeout(callback, 1000 / 60);
            };
})();

var nau;
var gameStarted = false;
var gameIsRunning = false;
var particles;
var gravities;

/**
 * Vector
 */
function Vector(x, y) {
    this.x = x || 0;
    this.y = y || 0;
}

Vector.add = function(a, b) {
    return new Vector(a.x + b.x, a.y + b.y);
};

Vector.sub = function(a, b) {
    return new Vector(a.x - b.x, a.y - b.y);
};

Vector.scale = function(v, s) {
    return v.clone().scale(s);
};

Vector.random = function() {
    return new Vector(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1
    );
};

Vector.new = function(a, b) {
    return new Vector(
        a,b
    );
};

Vector.prototype = {
    set: function(x, y) {
        if (typeof x === 'object') {
            y = x.y;
            x = x.x;
        }
        this.x = x || 0;
        this.y = y || 0;
        return this;
    },

    add: function(v) {
        this.x += v.x;
        this.y += v.y;
        return this;
    },

    sub: function(v) {
        this.x -= v.x;
        this.y -= v.y;
        return this;
    },

    scale: function(s) {
        this.x *= s;
        this.y *= s;
        return this;
    },

    length: function() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    },

    lengthSq: function() {
        return this.x * this.x + this.y * this.y;
    },

    normalize: function() {
        var m = Math.sqrt(this.x * this.x + this.y * this.y);
        if (m) {
            this.x /= m;
            this.y /= m;
        }
        return this;
    },

    angle: function() {
        return Math.atan2(this.y, this.x);
    },

    angleTo: function(v) {
        var dx = v.x - this.x,
            dy = v.y - this.y;
        return Math.atan2(dy, dx);
    },

    distanceTo: function(v) {
        var dx = v.x - this.x,
            dy = v.y - this.y;
        return Math.sqrt(dx * dx + dy * dy);
    },

    distanceToSq: function(v) {
        var dx = v.x - this.x,
            dy = v.y - this.y;
        return dx * dx + dy * dy;
    },

    lerp: function(v, t) {
        this.x += (v.x - this.x) * t;
        this.y += (v.y - this.y) * t;
        return this;
    },

    clone: function() {
        return new Vector(this.x, this.y);
    },

    toString: function() {
        return '(x:' + this.x + ', y:' + this.y + ')';
    }
};



function StartGame() {
    if (!gameIsRunning) {
    gameIsRunning = true;
    gameStarted = true;
    nau.addSpeed(Vector.new(0.5,-0.5));
    }
}

function ResetGame() {
    gameIsRunning = false;
    gameStarted = false;
    particles.pop();
    /*nau.resetSpeed();
    nau.resetPos();*/
}
/**
 * GravityPoint
 */
function GravityPoint(x, y, radius, targets, isfinish, isasteroid, issun) {
    Vector.call(this, x, y);
    this.radius = radius;
    this.currentRadius = radius * 0.5;
    this.isfinish = isfinish;
    this.isasteroid = isasteroid;
    this.issun = issun;
    this.gravity = (isfinish || isasteroid ? 0:radius*radius*0.000025);
    if (issun) this.gravity = 0.04;

    this._targets = {
        particles: targets.particles || [],
        gravities: targets.gravities || []
    };
    this._speed = new Vector();
}

GravityPoint.RADIUS_LIMIT = 65;
GravityPoint.interferenceToPoint = false;

GravityPoint.prototype = (function(o) {
    var s = new Vector(0, 0), p;
    for (p in o) s[p] = o[p];
    return s;
})({
    _easeRadius:   0,

    hitTest: function(p) {
        var a = p.pageX - this.x;
        var b = p.pageY - this.y;
        var c = Math.sqrt( a*a + b*b );
        return c < this.radius;
    },


    drag: function(x, y) {
        if (!this.isfinish && !this.isasteroid && !this.issun) {

        var a = x - this.x;
        var b = y - this.y;
        var c = Math.sqrt( a*a + b*b );
        if (c < this.radius) {
            this.x = x;
            this.y = y;
        }
        }
    },

    addSpeed: function(d) {
        this._speed = this._speed.add(d);
    },

    collapse: function(e) {
    },

    render: function(ctx) {
        if (this.destroyed) return;

        particles = this._targets.particles;
            var i, len;

        for (i = 0, len = particles.length; i < len; i++) {
            particles[i].addSpeed(Vector.sub(this, particles[i]).normalize().scale(this.gravity));
        }

        this._easeRadius = (this._easeRadius + (this.radius - this.currentRadius) * 0.07) * 0.95;
        this.currentRadius += this._easeRadius;
        if (this.currentRadius < 0) this.currentRadius = 0;

        if (this._collapsing) {
            this.radius *= 0.75;
            if (this.currentRadius < 1) this.destroyed = true;
            this._draw(ctx);
            return;
        }

        gravities = this._targets.gravities;
            var g, absorp,
            area = this.radius * this.radius * Math.PI, garea;

        for (i = 0, len = gravities.length; i < len; i++) {
            g = gravities[i];

            if (g === this || g.destroyed) continue;

            if (
                (this.currentRadius >= g.radius || this.dragging) &&
                this.distanceTo(g) < (this.currentRadius + g.radius) * 0.85
            ) {
                g.destroyed = true;
                this.gravity += g.gravity;

                absorp = Vector.sub(g, this).scale(g.radius / this.radius * 0.5);
                this.addSpeed(absorp);

                garea = g.radius * g.radius * Math.PI;
                this.currentRadius = Math.sqrt((area + garea * 3) / Math.PI);
                this.radius = Math.sqrt((area + garea) / Math.PI);
            }

            g.addSpeed(Vector.sub(this, g).normalize().scale(this.gravity));
        }

        if (GravityPoint.interferenceToPoint && !this.dragging)
            this.add(this._speed);

        this._speed = new Vector();

        if (this.currentRadius > GravityPoint.RADIUS_LIMIT) this.collapse();

        this._draw(ctx);
    },

    _draw: function(ctx) {
        var grd, r;

        ctx.save();

        grd = ctx.createRadialGradient(this.x, this.y, this.radius, this.x, this.y, this.radius * 5);
        grd.addColorStop(0, 'rgba(0, 0, 0, 0.1)');
        grd.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 5, 0, Math.PI * 2, false);
        ctx.fillStyle = grd;
        ctx.fill();

        r = Math.random() * this.currentRadius * 0.7 + this.currentRadius * 0.3;
        grd = ctx.createRadialGradient(this.x, this.y, r, this.x, this.y, this.currentRadius);


        if (this.isfinish) {
            grd.addColorStop(0, 'rgba(125, 0, 255, 1)');
            grd.addColorStop(1, Math.random() < 0.2 ? 'rgba(255, 196, 0, 0.15)' : 'rgba(103, 181, 191, 0.75)');
        }
        else if (this.isasteroid) {
            grd.addColorStop(0, 'rgba(100, 66, 33, 1)');
            //grd.addColorStop(1, Math.random() < 0.2 ? 'rgba(255, 196, 0, 0.15)' : 'rgba(103, 181, 191, 0.75)');
        }

        else if (this.issun) {
            grd.addColorStop(0, 'rgba(200, 200, 0, 1)');
            //grd.addColorStop(1, Math.random() < 0.2 ? 'rgba(255, 196, 0, 0.15)' : 'rgba(103, 181, 191, 0.75)');
        }

        else {
            grd.addColorStop(0, 'rgba(0, 0, 0, 1)');
            grd.addColorStop(1, Math.random() < 0.2 ? 'rgba(255, 196, 0, 0.15)' : 'rgba(103, 181, 191, 0.75)');
        }
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.currentRadius, 0, Math.PI * 2, false);
        ctx.fillStyle = grd;
        ctx.fill();
        ctx.restore();
    }
});


/**
 * Particle
 */
function Particle(x, y, radius) {
    Vector.call(this, x, y);
    this.radius = radius;

    this._latest = new Vector();
    this._speed  = new Vector();
}

Particle.prototype = (function(o) {
    var s = new Vector(0, 0), p;
    for (p in o) s[p] = o[p];
    return s;
})({
    resetSpeed: function() {
        this._speed.set(0,0);
    },

    addSpeed: function(d) {
        if (gameStarted) this._speed.add(d);
    },

    update: function() {
        if (this._speed.length() > 12) this._speed.normalize().scale(12);

        this._latest.set(this);
        this.add(this._speed);
    },

    resetPos: function() {
        this.x = screenWidth/2;
        this.y = screenHeight;
    }
});



// Initialize

(function() {

    // Configs

    var BACKGROUND_COLOR      = 'rgba(11, 51, 56, 1)',
        PARTICLE_RADIUS       = 10;


    // Vars

    var canvas, context,
        bufferCvs, bufferCtx,
        screenWidth, screenHeight,
        gravities = [],
        particles = [],
        grad, control;


    // Event Listeners

    function resize(e) {
        screenWidth  = canvas.width  = window.innerWidth;
        screenHeight = canvas.height = window.innerHeight;
        bufferCvs.width  = screenWidth;
        bufferCvs.height = screenHeight;
        context   = canvas.getContext('2d');
        bufferCtx = bufferCvs.getContext('2d');

        var cx = canvas.width * 0.5,
            cy = canvas.height * 0.5;

        grad = context.createRadialGradient(cx, cy, 0, cx, cy, Math.sqrt(cx * cx + cy * cy));
        grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
    }


    // Functions

    function addParticle(num) {
        var i, p;
        for (i = 0; i < num; i++) {
            nau = new Particle(screenWidth/2,screenHeight*9/10,PARTICLE_RADIUS);
            particles.push(nau);
        }
    }


    function dist(xp,yp,xg,yg){
        return Math.sqrt(((xp-xg)*(xp-xg)+(yp-yg)*(yp-yg)));
    }

    function checkCollision(x,y){

        if (y < 0) ResetGame();
        for (var i = 0; i < gravities.length; ++i) {
            g = gravities[i];
            if(dist(x,y,g.x,g.y) < g.radius){
                if(i === 0) document.location.href = "../win.html";
                else{
                    ResetGame();
                }
            }
        }
    }


    // GUI Control

    control = {
        particleNum: 1
    };


    // Init

    canvas  = document.getElementById('c');
    bufferCvs = document.createElement('canvas');

    window.addEventListener('resize', resize, false);
    resize(null);


    canvas.addEventListener('touchmove', function(e) {
        if (!gameStarted) {
        var touchLocation = e.targetTouches[0];
        var i;
        for (i = 0; i < gravities.length; ++i) {

            gravities[i].drag(touchLocation.pageX, touchLocation.pageY);
        }
        }
    });


    addParticle(control.particleNum);

    gravities.push(new GravityPoint(screenWidth*1/3, screenHeight*1/2, 65, {particles:null, gravities: null }, true));     //meta



    gravities.push(new GravityPoint(screenWidth*2/3, 1/3*screenHeight,40, {particles:particles, gravities: null }, false, false));      // is meta?, is asteroid?

    gravities.push(new GravityPoint(screenWidth*2/3, 2/3*screenHeight,40, {particles:particles, gravities: null }, false, false));


    gravities.push(new GravityPoint(screenWidth*1/4, 2/5*screenHeight,25, {particles:particles, gravities: null}, false, true));

    gravities.push(new GravityPoint(screenWidth*1/8, 2.75/6*screenHeight,25, {particles:particles, gravities: null}, false, true));

    gravities.push(new GravityPoint(screenWidth*1/8, 3.25/6*screenHeight,25, {particles:particles, gravities: null}, false, true));

    gravities.push(new GravityPoint(screenWidth*1/4, 3/5*screenHeight,25, {particles:particles, gravities: null}, false, true));

    gravities.push(new GravityPoint(screenWidth*2.15/5, 2.98/5*screenHeight,25, {particles:particles, gravities: null}, false, true));

    gravities.push(new GravityPoint(screenWidth*1.1/2, 3.25/6*screenHeight,25, {particles:particles, gravities: null}, false, true));

    gravities.push(new GravityPoint(0, 9/10*screenHeight,100, {particles:particles, gravities: null }, false, false, true));

    // Start Update

    var loop = function() {
        if (particles.length == 0) addParticle(control.particleNum);
        var i, len, g, p;

        context.save();
        context.fillStyle = BACKGROUND_COLOR;
        context.fillRect(0, 0, screenWidth, screenHeight);
        context.fillStyle = grad;
        context.fillRect(0, 0, screenWidth, screenHeight);
        context.restore();

        for (i = 0, len = gravities.length; i < len; i++) {
            g = gravities[i];
            if (g.dragging) g.drag(mouse);
            g.render(context);
            if (g.destroyed) {
                gravities.splice(i, 1);
                len--;
                i--;
            }
        }

        bufferCtx.save();
        bufferCtx.globalCompositeOperation = 'destination-out';
        bufferCtx.globalAlpha = 0.35;
        bufferCtx.fillRect(0, 0, screenWidth, screenHeight);
        bufferCtx.restore();

        len = particles.length;
        bufferCtx.save();
        bufferCtx.fillStyle = bufferCtx.strokeStyle = '#fff';
        bufferCtx.lineCap = bufferCtx.lineJoin = 'round';
        bufferCtx.lineWidth = PARTICLE_RADIUS * 2;
        bufferCtx.beginPath();
        for (i = 0; i < len; i++) {
            p = particles[i];
            p.update();
            bufferCtx.moveTo(p.x, p.y);
            checkCollision(p.x, p.y);
            bufferCtx.lineTo(p._latest.x, p._latest.y);
        }
        bufferCtx.stroke();
        bufferCtx.beginPath();

        bufferCtx.fill();
        bufferCtx.restore();

        context.drawImage(bufferCvs, 0, 0);

        requestAnimationFrame(loop);
    };
    loop();

})();

