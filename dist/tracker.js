var tracker = function (opts) { 


    ///*********************
    /// Private variables
    ///*********************

    var options = {};
    var scroll = {};
    var elements = [];
    var reappear = [];
    var appeared = 0;
    var disappeared = 0;
    var timer;
    var deltaSet;
    var done = false;
    var elementsLength = 0;
    var scrollLastPos = null;
    var scrollTimer = null;


    var init = function (opts) {
        options = opts || {};
        options.context = options.context || window;
        options.bounds = options.bounds || 0;
        options.debounce = options.debounce || 50;
        options.delta = {
            speed: options.deltaSpeed || 50,
            timeout: options.deltaTimeout || 500
        };

        //using window context
        if (typeof options.context.scrollY !== 'undefined') {
            options.context.scrollTop = options.context.scrollY;
            options.context.offsetTop = options.context.pageYOffset;
            options.context.clientHeight = options.context.innerHeight;
        }





        // http://stackoverflow.com/questions/9900311/how-do-i-target-only-internet-explorer-10-for-certain-situations-like-internet-e/13971998#13971998
        var isIE10 = false;
        if (Function('/*@cc_on return document.documentMode===10@*/')()) {
            isIE10 = true;
        }
        var completeOrLoaded = document.readyState === 'complete' || document.readyState === 'loaded';

        // call init if document is ready to be worked with and we missed the event
        if (isIE10) {
            if (completeOrLoaded) {
                setElement();
            }
        } else {
            if (completeOrLoaded || document.readyState === 'interactive') {
                setElement();
            }
        }

        // add an event listener to init when dom is ready
        options.context.addEventListener('DOMContentLoaded', setElement, false);
        options.context.addEventListener('scroll', track, false);
    }

    var setElement = function () {
        // get the elements to work with
        var els;
        if (typeof options.element === 'function') {
            els = options.element();
            elementsLength = els.length;
            for (var i = 0; i < elementsLength; i += 1) {
                elements.push(els[i]);
                reappear.push(true);
            }
        } else {
            if (typeof options.element !== 'undefined'){
                elements.push(options.element);
                reappear.push(true);
            }
            
        }
        begin();

    }

    var track = function () {
        //using window context
        if (typeof options.context.scrollY !== 'undefined') {
            options.context.scrollTop = options.context.scrollY;
            options.context.offsetTop = options.context.pageYOffset;
            options.context.clientHeight = options.context.innerHeight;
        }

        var newPos = options.context.scrollTop;  // pageYOffset for IE9
        if (typeof scrollLastPos !== 'undefined' && scrollLastPos != null) {
            scroll.velocity = newPos - scrollLastPos;
            scroll.delta = (scroll.velocity >= 0) ? scroll.velocity : (-1 * scroll.velocity);

        }
        scrollLastPos = newPos;
        if (typeof scrollTimer !== 'undefined') {
            clearTimeout(scrollTimer);
        }
        scrollTimer = setTimeout(function () {
            scrollLastPos = null;
        }, 30);
    }

    var begin = function () {
        // initial appear check before any scroll or resize event
        doCheckAppear();

        // add relevant listeners
        options.context.addEventListener('scroll', checkAppear, false);
        options.context.addEventListener('resize', checkAppear, false);
    }

    // called on scroll and resize event, so debounce the actual function that does
    // the heavy work of determining if an item is viewable and then "appearing" it
    var checkAppear = function () {
        if (scroll.delta < options.delta.speed) {
            if (!deltaSet) {
                deltaSet = true;
                doCheckAppear();
                setTimeout(function () {
                    deltaSet = false;
                }, options.delta.timeout);
            }
        }
        debounce();
    }

    // handle debouncing a function for better performance on scroll
    var debounce = function () {

        clearTimeout(timer);
        timer = setTimeout(function () {
            doCheckAppear();
        }, options.debounce);

    }

    var doCheckAppear = function () {
        if (done) {
            return;
        }

        elements.forEach(function (n, i) {
            if (n && viewable(n, options.bounds)) {
                // only act if the element is eligible to reappear
                if (reappear[i]) {
                    // mark this element as not eligible to appear
                    reappear[i] = false;
                    // increment the count of appeared items
                    appeared++;

                    // call the appear fn
                    if (options.appear) {
                        options.appear(n);
                    }
                    // if not tracking reappears or disappears, need to remove node here
                    if (!options.disappear && !options.reappear) {
                        // stop tracking this node, which is now viewable
                        elements[i] = null;
                    }
                }
            } else {
                if (reappear[i] === false) {
                    if (options.disappear) {
                        options.disappear(n);
                    }
                    // increment the dissappeared count
                    disappeared++;

                    // if not tracking reappears, need to remove node here
                    if (!options.reappear) {
                        // stop tracking this node, which is now viewable
                        elements[i] = null;
                    }
                }
                // element is out of view and eligible to be appeared again
                reappear[i] = true;
            }
        });

        // remove listeners if all items have (re)appeared
        if (!options.reappear && (!options.appear || options.appear && appeared === elementsLength) && (!options.disappear || options.disappear && disappeared === elementsLength)) {
            // ensure done is only called once (could be called from a trailing debounce/throttle)
            done = true;
            removeListeners();
            // all items have appeared, so call the done fn
            if (options.done) {
                options.done();
            }
        }
    }

    // determine if a given element (plus an additional "bounds" area around it) is in the viewport
    var viewable = function (el, bounds) {
        var rect = el.getBoundingClientRect();

        var elementPosition = el.offsetTop - options.context.scrollTop - options.context.offsetTop;
        var withinXRange = true; // todo (rect.top + rect.height) >= 0 && (rect.left + rect.width) >= 0;
        var withinYRange = (-1 * el.clientHeight) - bounds < elementPosition && elementPosition < options.context.clientHeight + bounds;


        return withinXRange && withinYRange;

    }

    var end = function () {
        elements = [];
        if (timer) {
            clearTimeout(timer);
        }
        removeListeners();
    }

    var removeListeners = function () {
        options.context.removeEventListener('scroll', checkAppear, false);
        options.context.removeEventListener('resize', checkAppear, false);
    }


    ///*********************
    /// public api
    ///*********************
    // manually fire check for visibility of tracked elements
    this.trigger = function () {
        doCheckAppear();
    };
    // pause tracking of elements
    this.pause = function () {
        removeListeners();
    };
    // resume tracking of elements after a pause
    this.resume = function () {
        begin();
    }
    // provide a means to stop monitoring all elements
    this.destroy = function () {
        end();
    };


    init(opts);


}
