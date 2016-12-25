// This is a manifest file that'll be compiled into application.js, which will include all the files
// listed below.
//
// Any JavaScript/Coffee file within this directory, lib/assets/javascripts, vendor/assets/javascripts,
// or any plugin's vendor/assets/javascripts directory can be referenced here using a relative path.
//
// It's not advisable to add code directly here, but if you do, it'll appear at the bottom of the
// compiled file.
//
// Read Sprockets README (https://github.com/rails/sprockets#sprockets-directives) for details
// about supported directives.
//
//= require jquery
//= require jquery_ujs
//= require bootstrap
//= require turbolinks
//= require_tree .
(function(e){if("function"==typeof bootstrap)bootstrap("hark",e);else if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else if("undefined"!=typeof ses){if(!ses.ok())return;ses.makeHark=e}else"undefined"!=typeof window?window.hark=e():global.hark=e()})(function(){var define,ses,bootstrap,module,exports;
    return (function(e,t,n){function i(n,s){if(!t[n]){if(!e[n]){var o=typeof require=="function"&&require;if(!s&&o)return o(n,!0);if(r)return r(n,!0);throw new Error("Cannot find module '"+n+"'")}var u=t[n]={exports:{}};e[n][0].call(u.exports,function(t){var r=e[n][1][t];return i(r?r:t)},u,u.exports)}return t[n].exports}var r=typeof require=="function"&&require;for(var s=0;s<n.length;s++)i(n[s]);return i})({1:[function(require,module,exports){
        var WildEmitter = require('wildemitter');

        function getMaxVolume (analyser, fftBins) {
            var maxVolume = -Infinity;
            analyser.getFloatFrequencyData(fftBins);

            for(var i=4, ii=fftBins.length; i < ii; i++) {
                if (fftBins[i] > maxVolume && fftBins[i] < 0) {
                    maxVolume = fftBins[i];
                }
            };

            return maxVolume;
        }


        var audioContextType = window.webkitAudioContext || window.AudioContext;
// use a single audio context due to hardware limits
        var audioContext = null;
        module.exports = function(stream, options) {
            var harker = new WildEmitter();


            // make it not break in non-supported browsers
            if (!audioContextType) return harker;

            //Config
            var options = options || {},
                smoothing = (options.smoothing || 0.1),
                interval = (options.interval || 50),
                threshold = options.threshold,
                play = options.play,
                history = options.history || 10,
                running = true;

            //Setup Audio Context
            if (!audioContext) {
                audioContext = new audioContextType();
            }
            var sourceNode, fftBins, analyser;

            analyser = audioContext.createAnalyser();
            analyser.fftSize = 512;
            analyser.smoothingTimeConstant = smoothing;
            fftBins = new Float32Array(analyser.fftSize);

            if (stream.jquery) stream = stream[0];
            if (stream instanceof HTMLAudioElement || stream instanceof HTMLVideoElement) {
                //Audio Tag
                sourceNode = audioContext.createMediaElementSource(stream);
                if (typeof play === 'undefined') play = true;
                threshold = threshold || -50;
            } else {
                //WebRTC Stream
                sourceNode = audioContext.createMediaStreamSource(stream);
                threshold = threshold || -50;
            }

            sourceNode.connect(analyser);
            if (play) analyser.connect(audioContext.destination);

            harker.speaking = false;

            harker.setThreshold = function(t) {
                threshold = t;
            };

            harker.setInterval = function(i) {
                interval = i;
            };

            harker.stop = function() {
                running = false;
                harker.emit('volume_change', -100, threshold);
                if (harker.speaking) {
                    harker.speaking = false;
                    harker.emit('stopped_speaking');
                }
            };
            harker.speakingHistory = [];
            for (var i = 0; i < history; i++) {
                harker.speakingHistory.push(0);
            }

            // Poll the analyser node to determine if speaking
            // and emit events if changed
            var looper = function() {
                setTimeout(function() {

                    //check if stop has been called
                    if(!running) {
                        return;
                    }

                    var currentVolume = getMaxVolume(analyser, fftBins);

                    harker.emit('volume_change', currentVolume, threshold);

                    var history = 0;
                    if (currentVolume > threshold && !harker.speaking) {
                        // trigger quickly, short history
                        for (var i = harker.speakingHistory.length - 3; i < harker.speakingHistory.length; i++) {
                            history += harker.speakingHistory[i];
                        }
                        if (history >= 2) {
                            harker.speaking = true;
                            harker.emit('speaking');
                        }
                    } else if (currentVolume < threshold && harker.speaking) {
                        for (var i = 0; i < harker.speakingHistory.length; i++) {
                            history += harker.speakingHistory[i];
                        }
                        if (history == 0) {
                            harker.speaking = false;
                            harker.emit('stopped_speaking');
                        }
                    }
                    harker.speakingHistory.shift();
                    harker.speakingHistory.push(0 + (currentVolume > threshold));

                    looper();
                }, interval);
            };
            looper();


            return harker;
        }

    },{"wildemitter":2}],2:[function(require,module,exports){
        /*
         WildEmitter.js is a slim little event emitter by @henrikjoreteg largely based
         on @visionmedia's Emitter from UI Kit.
         Why? I wanted it standalone.
         I also wanted support for wildcard emitters like this:
         emitter.on('*', function (eventName, other, event, payloads) {
         });
         emitter.on('somenamespace*', function (eventName, payloads) {
         });
         Please note that callbacks triggered by wildcard registered events also get
         the event name as the first argument.
         */
        module.exports = WildEmitter;

        function WildEmitter() {
            this.callbacks = {};
        }

// Listen on the given `event` with `fn`. Store a group name if present.
        WildEmitter.prototype.on = function (event, groupName, fn) {
            var hasGroup = (arguments.length === 3),
                group = hasGroup ? arguments[1] : undefined,
                func = hasGroup ? arguments[2] : arguments[1];
            func._groupName = group;
            (this.callbacks[event] = this.callbacks[event] || []).push(func);
            return this;
        };

// Adds an `event` listener that will be invoked a single
// time then automatically removed.
        WildEmitter.prototype.once = function (event, groupName, fn) {
            var self = this,
                hasGroup = (arguments.length === 3),
                group = hasGroup ? arguments[1] : undefined,
                func = hasGroup ? arguments[2] : arguments[1];
            function on() {
                self.off(event, on);
                func.apply(this, arguments);
            }
            this.on(event, group, on);
            return this;
        };

// Unbinds an entire group
        WildEmitter.prototype.releaseGroup = function (groupName) {
            var item, i, len, handlers;
            for (item in this.callbacks) {
                handlers = this.callbacks[item];
                for (i = 0, len = handlers.length; i < len; i++) {
                    if (handlers[i]._groupName === groupName) {
                        //console.log('removing');
                        // remove it and shorten the array we're looping through
                        handlers.splice(i, 1);
                        i--;
                        len--;
                    }
                }
            }
            return this;
        };

// Remove the given callback for `event` or all
// registered callbacks.
        WildEmitter.prototype.off = function (event, fn) {
            var callbacks = this.callbacks[event],
                i;

            if (!callbacks) return this;

            // remove all handlers
            if (arguments.length === 1) {
                delete this.callbacks[event];
                return this;
            }

            // remove specific handler
            i = callbacks.indexOf(fn);
            callbacks.splice(i, 1);
            return this;
        };

/// Emit `event` with the given args.
// also calls any `*` handlers
        WildEmitter.prototype.emit = function (event) {
            var args = [].slice.call(arguments, 1),
                callbacks = this.callbacks[event],
                specialCallbacks = this.getWildcardCallbacks(event),
                i,
                len,
                item,
                listeners;

            if (callbacks) {
                listeners = callbacks.slice();
                for (i = 0, len = listeners.length; i < len; ++i) {
                    if (listeners[i]) {
                        listeners[i].apply(this, args);
                    } else {
                        break;
                    }
                }
            }

            if (specialCallbacks) {
                len = specialCallbacks.length;
                listeners = specialCallbacks.slice();
                for (i = 0, len = listeners.length; i < len; ++i) {
                    if (listeners[i]) {
                        listeners[i].apply(this, [event].concat(args));
                    } else {
                        break;
                    }
                }
            }

            return this;
        };

// Helper for for finding special wildcard event handlers that match the event
        WildEmitter.prototype.getWildcardCallbacks = function (eventName) {
            var item,
                split,
                result = [];

            for (item in this.callbacks) {
                split = item.split('*');
                if (item === '*' || (split.length === 2 && eventName.slice(0, split[0].length) === split[0])) {
                    result = result.concat(this.callbacks[item]);
                }
            }
            return result;
        };

    },{}]},{},[1])(1)
});
;
// HARK************************************


// PUSHER*********************************
;(function() {
    function Pusher(app_key, options) {
        checkAppKey(app_key);
        options = options || {};

        var self = this;

        this.key = app_key;
        this.config = Pusher.Util.extend(
            Pusher.getGlobalConfig(),
            options.cluster ? Pusher.getClusterConfig(options.cluster) : {},
            options
        );

        this.channels = new Pusher.Channels();
        this.global_emitter = new Pusher.EventsDispatcher();
        this.sessionID = Math.floor(Math.random() * 1000000000);

        this.timeline = new Pusher.Timeline(this.key, this.sessionID, {
            cluster: this.config.cluster,
            features: Pusher.Util.getClientFeatures(),
            params: this.config.timelineParams || {},
            limit: 50,
            level: Pusher.Timeline.INFO,
            version: Pusher.VERSION
        });
        if (!this.config.disableStats) {
            this.timelineSender = new Pusher.TimelineSender(this.timeline, {
                host: this.config.statsHost,
                path: "/timeline/v2/jsonp"
            });
        }

        var getStrategy = function(options) {
            var config = Pusher.Util.extend({}, self.config, options);
            return Pusher.StrategyBuilder.build(
                Pusher.getDefaultStrategy(config), config
            );
        };

        this.connection = new Pusher.ConnectionManager(
            this.key,
            Pusher.Util.extend(
                { getStrategy: getStrategy,
                    timeline: this.timeline,
                    activityTimeout: this.config.activity_timeout,
                    pongTimeout: this.config.pong_timeout,
                    unavailableTimeout: this.config.unavailable_timeout
                },
                this.config,
                { encrypted: this.isEncrypted() }
            )
        );

        this.connection.bind('connected', function() {
            self.subscribeAll();
            if (self.timelineSender) {
                self.timelineSender.send(self.connection.isEncrypted());
            }
        });
        this.connection.bind('message', function(params) {
            var internal = (params.event.indexOf('pusher_internal:') === 0);
            if (params.channel) {
                var channel = self.channel(params.channel);
                if (channel) {
                    channel.handleEvent(params.event, params.data);
                }
            }
            // Emit globaly [deprecated]
            if (!internal) {
                self.global_emitter.emit(params.event, params.data);
            }
        });
        this.connection.bind('disconnected', function() {
            self.channels.disconnect();
        });
        this.connection.bind('error', function(err) {
            Pusher.warn('Error', err);
        });

        Pusher.instances.push(this);
        this.timeline.info({ instances: Pusher.instances.length });

        if (Pusher.isReady) {
            self.connect();
        }
    }
    var prototype = Pusher.prototype;

    Pusher.instances = [];
    Pusher.isReady = false;

    // To receive log output provide a Pusher.log function, for example
    // Pusher.log = function(m){console.log(m)}
    Pusher.debug = function() {
        if (!Pusher.log) {
            return;
        }
        Pusher.log(Pusher.Util.stringify.apply(this, arguments));
    };

    Pusher.warn = function() {
        var message = Pusher.Util.stringify.apply(this, arguments);
        if (window.console) {
            if (window.console.warn) {
                window.console.warn(message);
            } else if (window.console.log) {
                window.console.log(message);
            }
        }
        if (Pusher.log) {
            Pusher.log(message);
        }
    };

    Pusher.ready = function() {
        Pusher.isReady = true;
        for (var i = 0, l = Pusher.instances.length; i < l; i++) {
            Pusher.instances[i].connect();
        }
    };

    prototype.channel = function(name) {
        return this.channels.find(name);
    };

    prototype.allChannels = function() {
        return this.channels.all();
    };

    prototype.connect = function() {
        this.connection.connect();

        if (this.timelineSender) {
            if (!this.timelineSenderTimer) {
                var encrypted = this.connection.isEncrypted();
                var timelineSender = this.timelineSender;
                this.timelineSenderTimer = new Pusher.PeriodicTimer(60000, function() {
                    timelineSender.send(encrypted);
                });
            }
        }
    };

    prototype.disconnect = function() {
        this.connection.disconnect();

        if (this.timelineSenderTimer) {
            this.timelineSenderTimer.ensureAborted();
            this.timelineSenderTimer = null;
        }
    };

    prototype.bind = function(event_name, callback) {
        this.global_emitter.bind(event_name, callback);
        return this;
    };

    prototype.bind_all = function(callback) {
        this.global_emitter.bind_all(callback);
        return this;
    };

    prototype.subscribeAll = function() {
        var channelName;
        for (channelName in this.channels.channels) {
            if (this.channels.channels.hasOwnProperty(channelName)) {
                this.subscribe(channelName);
            }
        }
    };

    prototype.subscribe = function(channel_name) {
        var channel = this.channels.add(channel_name, this);
        if (this.connection.state === 'connected') {
            channel.subscribe();
        }
        return channel;
    };

    prototype.unsubscribe = function(channel_name) {
        var channel = this.channels.remove(channel_name);
        if (this.connection.state === 'connected') {
            channel.unsubscribe();
        }
    };

    prototype.send_event = function(event_name, data, channel) {
        return this.connection.send_event(event_name, data, channel);
    };

    prototype.isEncrypted = function() {
        if (Pusher.Util.getDocument().location.protocol === "https:") {
            return true;
        } else {
            return Boolean(this.config.encrypted);
        }
    };

    function checkAppKey(key) {
        if (key === null || key === undefined) {
            Pusher.warn(
                'Warning', 'You must pass your app key when you instantiate Pusher.'
            );
        }
    }

    Pusher.HTTP = {};

    this.Pusher = Pusher;
}).call(this);

;(function() {
    // We need to bind clear functions this way to avoid exceptions on IE8
    function clearTimeout(timer) {
        window.clearTimeout(timer);
    }
    function clearInterval(timer) {
        window.clearInterval(timer);
    }

    function GenericTimer(set, clear, delay, callback) {
        var self = this;

        this.clear = clear;
        this.timer = set(function() {
            if (self.timer !== null) {
                self.timer = callback(self.timer);
            }
        }, delay);
    }
    var prototype = GenericTimer.prototype;

    /** Returns whether the timer is still running.
     *
     * @return {Boolean}
     */
    prototype.isRunning = function() {
        return this.timer !== null;
    };

    /** Aborts a timer when it's running. */
    prototype.ensureAborted = function() {
        if (this.timer) {
            // Clear function is already bound
            this.clear(this.timer);
            this.timer = null;
        }
    };

    /** Cross-browser compatible one-off timer abstraction.
     *
     * @param {Number} delay
     * @param {Function} callback
     */
    Pusher.Timer = function(delay, callback) {
        return new GenericTimer(setTimeout, clearTimeout, delay, function(timer) {
            callback();
            return null;
        });
    };
    /** Cross-browser compatible periodic timer abstraction.
     *
     * @param {Number} delay
     * @param {Function} callback
     */
    Pusher.PeriodicTimer = function(delay, callback) {
        return new GenericTimer(setInterval, clearInterval, delay, function(timer) {
            callback();
            return timer;
        });
    };
}).call(this);

;(function() {
    Pusher.Util = {
        now: function() {
            if (Date.now) {
                return Date.now();
            } else {
                return new Date().valueOf();
            }
        },

        defer: function(callback) {
            return new Pusher.Timer(0, callback);
        },

        /** Merges multiple objects into the target argument.
         *
         * For properties that are plain Objects, performs a deep-merge. For the
         * rest it just copies the value of the property.
         *
         * To extend prototypes use it as following:
         *   Pusher.Util.extend(Target.prototype, Base.prototype)
         *
         * You can also use it to merge objects without altering them:
         *   Pusher.Util.extend({}, object1, object2)
         *
         * @param  {Object} target
         * @return {Object} the target argument
         */
        extend: function(target) {
            for (var i = 1; i < arguments.length; i++) {
                var extensions = arguments[i];
                for (var property in extensions) {
                    if (extensions[property] && extensions[property].constructor &&
                        extensions[property].constructor === Object) {
                        target[property] = Pusher.Util.extend(
                            target[property] || {}, extensions[property]
                        );
                    } else {
                        target[property] = extensions[property];
                    }
                }
            }
            return target;
        },

        stringify: function() {
            var m = ["Pusher"];
            for (var i = 0; i < arguments.length; i++) {
                if (typeof arguments[i] === "string") {
                    m.push(arguments[i]);
                } else {
                    if (window.JSON === undefined) {
                        m.push(arguments[i].toString());
                    } else {
                        m.push(JSON.stringify(arguments[i]));
                    }
                }
            }
            return m.join(" : ");
        },

        arrayIndexOf: function(array, item) { // MSIE doesn't have array.indexOf
            var nativeIndexOf = Array.prototype.indexOf;
            if (array === null) {
                return -1;
            }
            if (nativeIndexOf && array.indexOf === nativeIndexOf) {
                return array.indexOf(item);
            }
            for (var i = 0, l = array.length; i < l; i++) {
                if (array[i] === item) {
                    return i;
                }
            }
            return -1;
        },

        /** Applies a function f to all properties of an object.
         *
         * Function f gets 3 arguments passed:
         * - element from the object
         * - key of the element
         * - reference to the object
         *
         * @param {Object} object
         * @param {Function} f
         */
        objectApply: function(object, f) {
            for (var key in object) {
                if (Object.prototype.hasOwnProperty.call(object, key)) {
                    f(object[key], key, object);
                }
            }
        },

        /** Return a list of object's own property keys
         *
         * @param {Object} object
         * @returns {Array}
         */
        keys: function(object) {
            var keys = [];
            Pusher.Util.objectApply(object, function(_, key) {
                keys.push(key);
            });
            return keys;
        },

        /** Return a list of object's own property values
         *
         * @param {Object} object
         * @returns {Array}
         */
        values: function(object) {
            var values = [];
            Pusher.Util.objectApply(object, function(value) {
                values.push(value);
            });
            return values;
        },

        /** Applies a function f to all elements of an array.
         *
         * Function f gets 3 arguments passed:
         * - element from the array
         * - index of the element
         * - reference to the array
         *
         * @param {Array} array
         * @param {Function} f
         */
        apply: function(array, f, context) {
            for (var i = 0; i < array.length; i++) {
                f.call(context || window, array[i], i, array);
            }
        },

        /** Maps all elements of the array and returns the result.
         *
         * Function f gets 4 arguments passed:
         * - element from the array
         * - index of the element
         * - reference to the source array
         * - reference to the destination array
         *
         * @param {Array} array
         * @param {Function} f
         */
        map: function(array, f) {
            var result = [];
            for (var i = 0; i < array.length; i++) {
                result.push(f(array[i], i, array, result));
            }
            return result;
        },

        /** Maps all elements of the object and returns the result.
         *
         * Function f gets 4 arguments passed:
         * - element from the object
         * - key of the element
         * - reference to the source object
         * - reference to the destination object
         *
         * @param {Object} object
         * @param {Function} f
         */
        mapObject: function(object, f) {
            var result = {};
            Pusher.Util.objectApply(object, function(value, key) {
                result[key] = f(value);
            });
            return result;
        },

        /** Filters elements of the array using a test function.
         *
         * Function test gets 4 arguments passed:
         * - element from the array
         * - index of the element
         * - reference to the source array
         * - reference to the destination array
         *
         * @param {Array} array
         * @param {Function} f
         */
        filter: function(array, test) {
            test = test || function(value) { return !!value; };

            var result = [];
            for (var i = 0; i < array.length; i++) {
                if (test(array[i], i, array, result)) {
                    result.push(array[i]);
                }
            }
            return result;
        },

        /** Filters properties of the object using a test function.
         *
         * Function test gets 4 arguments passed:
         * - element from the object
         * - key of the element
         * - reference to the source object
         * - reference to the destination object
         *
         * @param {Object} object
         * @param {Function} f
         */
        filterObject: function(object, test) {
            var result = {};
            Pusher.Util.objectApply(object, function(value, key) {
                if ((test && test(value, key, object, result)) || Boolean(value)) {
                    result[key] = value;
                }
            });
            return result;
        },

        /** Flattens an object into a two-dimensional array.
         *
         * @param  {Object} object
         * @return {Array} resulting array of [key, value] pairs
         */
        flatten: function(object) {
            var result = [];
            Pusher.Util.objectApply(object, function(value, key) {
                result.push([key, value]);
            });
            return result;
        },

        /** Checks whether any element of the array passes the test.
         *
         * Function test gets 3 arguments passed:
         * - element from the array
         * - index of the element
         * - reference to the source array
         *
         * @param {Array} array
         * @param {Function} f
         */
        any: function(array, test) {
            for (var i = 0; i < array.length; i++) {
                if (test(array[i], i, array)) {
                    return true;
                }
            }
            return false;
        },

        /** Checks whether all elements of the array pass the test.
         *
         * Function test gets 3 arguments passed:
         * - element from the array
         * - index of the element
         * - reference to the source array
         *
         * @param {Array} array
         * @param {Function} f
         */
        all: function(array, test) {
            for (var i = 0; i < array.length; i++) {
                if (!test(array[i], i, array)) {
                    return false;
                }
            }
            return true;
        },

        /** Builds a function that will proxy a method call to its first argument.
         *
         * Allows partial application of arguments, so additional arguments are
         * prepended to the argument list.
         *
         * @param  {String} name method name
         * @return {Function} proxy function
         */
        method: function(name) {
            var boundArguments = Array.prototype.slice.call(arguments, 1);
            return function(object) {
                return object[name].apply(object, boundArguments.concat(arguments));
            };
        },

        getWindow: function() {
            return window;
        },

        getDocument: function() {
            return document;
        },

        getNavigator: function() {
            return navigator;
        },

        getLocalStorage: function() {
            try {
                return window.localStorage;
            } catch (e) {
                return undefined;
            }
        },

        getClientFeatures: function() {
            return Pusher.Util.keys(
                Pusher.Util.filterObject(
                    { "ws": Pusher.WSTransport, "flash": Pusher.FlashTransport },
                    function (t) { return t.isSupported({}); }
                )
            );
        },

        addWindowListener: function(event, listener) {
            var _window = Pusher.Util.getWindow();
            if (_window.addEventListener !== undefined) {
                _window.addEventListener(event, listener, false);
            } else {
                _window.attachEvent("on" + event, listener);
            }
        },

        removeWindowListener: function(event, listener) {
            var _window = Pusher.Util.getWindow();
            if (_window.addEventListener !== undefined) {
                _window.removeEventListener(event, listener, false);
            } else {
                _window.detachEvent("on" + event, listener);
            }
        },

        isXHRSupported: function() {
            var XHR = window.XMLHttpRequest;
            return Boolean(XHR) && (new XHR()).withCredentials !== undefined;
        },

        isXDRSupported: function(encrypted) {
            var protocol = encrypted ? "https:" : "http:";
            var documentProtocol = Pusher.Util.getDocument().location.protocol;
            return Boolean(window.XDomainRequest) && documentProtocol === protocol;
        }
    };
}).call(this);

;(function() {
    Pusher.VERSION = '2.2.2';
    Pusher.PROTOCOL = 7;

    // DEPRECATED: WS connection parameters
    Pusher.host = 'ws.pusherapp.com';
    Pusher.ws_port = 80;
    Pusher.wss_port = 443;
    // DEPRECATED: SockJS fallback parameters
    Pusher.sockjs_host = 'sockjs.pusher.com';
    Pusher.sockjs_http_port = 80;
    Pusher.sockjs_https_port = 443;
    Pusher.sockjs_path = "/pusher";
    // DEPRECATED: Stats
    Pusher.stats_host = 'stats.pusher.com';
    // DEPRECATED: Other settings
    Pusher.channel_auth_endpoint = '/pusher/auth';
    Pusher.channel_auth_transport = 'ajax';
    Pusher.activity_timeout = 120000;
    Pusher.pong_timeout = 30000;
    Pusher.unavailable_timeout = 10000;
    // CDN configuration
    Pusher.cdn_http = 'http://js.pusher.com/';
    Pusher.cdn_https = 'https://js.pusher.com/';
    Pusher.dependency_suffix = '';

    Pusher.getDefaultStrategy = function(config) {
        var wsStrategy;
        if (config.encrypted) {
            wsStrategy = [
                ":best_connected_ever",
                ":ws_loop",
                [":delayed", 2000, [":http_fallback_loop"]]
            ];
        } else {
            wsStrategy = [
                ":best_connected_ever",
                ":ws_loop",
                [":delayed", 2000, [":wss_loop"]],
                [":delayed", 5000, [":http_fallback_loop"]]
            ];
        }

        return [
            [":def", "ws_options", {
                hostUnencrypted: config.wsHost + ":" + config.wsPort,
                hostEncrypted: config.wsHost + ":" + config.wssPort
            }],
            [":def", "wss_options", [":extend", ":ws_options", {
                encrypted: true
            }]],
            [":def", "sockjs_options", {
                hostUnencrypted: config.httpHost + ":" + config.httpPort,
                hostEncrypted: config.httpHost + ":" + config.httpsPort
            }],
            [":def", "timeouts", {
                loop: true,
                timeout: 15000,
                timeoutLimit: 60000
            }],

            [":def", "ws_manager", [":transport_manager", {
                lives: 2,
                minPingDelay: 10000,
                maxPingDelay: config.activity_timeout
            }]],
            [":def", "streaming_manager", [":transport_manager", {
                lives: 2,
                minPingDelay: 10000,
                maxPingDelay: config.activity_timeout
            }]],

            [":def_transport", "ws", "ws", 3, ":ws_options", ":ws_manager"],
            [":def_transport", "wss", "ws", 3, ":wss_options", ":ws_manager"],
            [":def_transport", "flash", "flash", 2, ":ws_options", ":ws_manager"],
            [":def_transport", "sockjs", "sockjs", 1, ":sockjs_options"],
            [":def_transport", "xhr_streaming", "xhr_streaming", 1, ":sockjs_options", ":streaming_manager"],
            [":def_transport", "xdr_streaming", "xdr_streaming", 1, ":sockjs_options", ":streaming_manager"],
            [":def_transport", "xhr_polling", "xhr_polling", 1, ":sockjs_options"],
            [":def_transport", "xdr_polling", "xdr_polling", 1, ":sockjs_options"],

            [":def", "ws_loop", [":sequential", ":timeouts", ":ws"]],
            [":def", "wss_loop", [":sequential", ":timeouts", ":wss"]],
            [":def", "flash_loop", [":sequential", ":timeouts", ":flash"]],
            [":def", "sockjs_loop", [":sequential", ":timeouts", ":sockjs"]],

            [":def", "streaming_loop", [":sequential", ":timeouts",
                [":if", [":is_supported", ":xhr_streaming"],
                    ":xhr_streaming",
                    ":xdr_streaming"
                ]
            ]],
            [":def", "polling_loop", [":sequential", ":timeouts",
                [":if", [":is_supported", ":xhr_polling"],
                    ":xhr_polling",
                    ":xdr_polling"
                ]
            ]],

            [":def", "http_loop", [":if", [":is_supported", ":streaming_loop"], [
                ":best_connected_ever",
                ":streaming_loop",
                [":delayed", 4000, [":polling_loop"]]
            ], [
                ":polling_loop"
            ]]],

            [":def", "http_fallback_loop",
                [":if", [":is_supported", ":http_loop"], [
                    ":http_loop"
                ], [
                    ":sockjs_loop"
                ]]
            ],

            [":def", "strategy",
                [":cached", 1800000,
                    [":first_connected",
                        [":if", [":is_supported", ":ws"],
                            wsStrategy,
                            [":if", [":is_supported", ":flash"], [
                                ":best_connected_ever",
                                ":flash_loop",
                                [":delayed", 2000, [":http_fallback_loop"]]
                            ], [
                                ":http_fallback_loop"
                            ]]]
                    ]
                ]
            ]
        ];
    };
}).call(this);

;(function() {
    Pusher.getGlobalConfig = function() {
        return {
            wsHost: Pusher.host,
            wsPort: Pusher.ws_port,
            wssPort: Pusher.wss_port,
            httpHost: Pusher.sockjs_host,
            httpPort: Pusher.sockjs_http_port,
            httpsPort: Pusher.sockjs_https_port,
            httpPath: Pusher.sockjs_path,
            statsHost: Pusher.stats_host,
            authEndpoint: Pusher.channel_auth_endpoint,
            authTransport: Pusher.channel_auth_transport,
            // TODO make this consistent with other options in next major version
            activity_timeout: Pusher.activity_timeout,
            pong_timeout: Pusher.pong_timeout,
            unavailable_timeout: Pusher.unavailable_timeout
        };
    };

    Pusher.getClusterConfig = function(clusterName) {
        return {
            wsHost: "ws-" + clusterName + ".pusher.com",
            httpHost: "sockjs-" + clusterName + ".pusher.com"
        };
    };
}).call(this);

;(function() {
    function buildExceptionClass(name) {
        var constructor = function(message) {
            Error.call(this, message);
            this.name = name;
        };
        Pusher.Util.extend(constructor.prototype, Error.prototype);

        return constructor;
    }

    /** Error classes used throughout pusher-js library. */
    Pusher.Errors = {
        BadEventName: buildExceptionClass("BadEventName"),
        RequestTimedOut: buildExceptionClass("RequestTimedOut"),
        TransportPriorityTooLow: buildExceptionClass("TransportPriorityTooLow"),
        TransportClosed: buildExceptionClass("TransportClosed"),
        UnsupportedTransport: buildExceptionClass("UnsupportedTransport"),
        UnsupportedStrategy: buildExceptionClass("UnsupportedStrategy")
    };
}).call(this);

;(function() {
    /** Manages callback bindings and event emitting.
     *
     * @param Function failThrough called when no listeners are bound to an event
     */
    function EventsDispatcher(failThrough) {
        this.callbacks = new CallbackRegistry();
        this.global_callbacks = [];
        this.failThrough = failThrough;
    }
    var prototype = EventsDispatcher.prototype;

    prototype.bind = function(eventName, callback, context) {
        this.callbacks.add(eventName, callback, context);
        return this;
    };

    prototype.bind_all = function(callback) {
        this.global_callbacks.push(callback);
        return this;
    };

    prototype.unbind = function(eventName, callback, context) {
        this.callbacks.remove(eventName, callback, context);
        return this;
    };

    prototype.unbind_all = function(eventName, callback) {
        this.callbacks.remove(eventName, callback);
        return this;
    };

    prototype.emit = function(eventName, data) {
        var i;

        for (i = 0; i < this.global_callbacks.length; i++) {
            this.global_callbacks[i](eventName, data);
        }

        var callbacks = this.callbacks.get(eventName);
        if (callbacks && callbacks.length > 0) {
            for (i = 0; i < callbacks.length; i++) {
                callbacks[i].fn.call(callbacks[i].context || window, data);
            }
        } else if (this.failThrough) {
            this.failThrough(eventName, data);
        }

        return this;
    };

    /** Callback registry helper. */

    function CallbackRegistry() {
        this._callbacks = {};
    }

    CallbackRegistry.prototype.get = function(name) {
        return this._callbacks[prefix(name)];
    };

    CallbackRegistry.prototype.add = function(name, callback, context) {
        var prefixedEventName = prefix(name);
        this._callbacks[prefixedEventName] = this._callbacks[prefixedEventName] || [];
        this._callbacks[prefixedEventName].push({
            fn: callback,
            context: context
        });
    };

    CallbackRegistry.prototype.remove = function(name, callback, context) {
        if (!name && !callback && !context) {
            this._callbacks = {};
            return;
        }

        var names = name ? [prefix(name)] : Pusher.Util.keys(this._callbacks);

        if (callback || context) {
            Pusher.Util.apply(names, function(name) {
                this._callbacks[name] = Pusher.Util.filter(
                    this._callbacks[name] || [],
                    function(binding) {
                        return (callback && callback !== binding.fn) ||
                            (context && context !== binding.context);
                    }
                );
                if (this._callbacks[name].length === 0) {
                    delete this._callbacks[name];
                }
            }, this);
        } else {
            Pusher.Util.apply(names, function(name) {
                delete this._callbacks[name];
            }, this);
        }
    };

    function prefix(name) {
        return "_" + name;
    }

    Pusher.EventsDispatcher = EventsDispatcher;
}).call(this);

(function() {
    /** Builds receivers for JSONP and Script requests.
     *
     * Each receiver is an object with following fields:
     * - number - unique (for the factory instance), numerical id of the receiver
     * - id - a string ID that can be used in DOM attributes
     * - name - name of the function triggering the receiver
     * - callback - callback function
     *
     * Receivers are triggered only once, on the first callback call.
     *
     * Receivers can be called by their name or by accessing factory object
     * by the number key.
     *
     * @param {String} prefix the prefix used in ids
     * @param {String} name the name of the object
     */
    function ScriptReceiverFactory(prefix, name) {
        this.lastId = 0;
        this.prefix = prefix;
        this.name = name;
    }
    var prototype = ScriptReceiverFactory.prototype;

    /** Creates a script receiver.
     *
     * @param {Function} callback
     * @return {ScriptReceiver}
     */
    prototype.create = function(callback) {
        this.lastId++;

        var number = this.lastId;
        var id = this.prefix + number;
        var name = this.name + "[" + number + "]";

        var called = false;
        var callbackWrapper = function() {
            if (!called) {
                callback.apply(null, arguments);
                called = true;
            }
        };

        this[number] = callbackWrapper;
        return { number: number, id: id, name: name, callback: callbackWrapper };
    };

    /** Removes the script receiver from the list.
     *
     * @param {ScriptReceiver} receiver
     */
    prototype.remove = function(receiver) {
        delete this[receiver.number];
    };

    Pusher.ScriptReceiverFactory = ScriptReceiverFactory;
    Pusher.ScriptReceivers = new ScriptReceiverFactory(
        "_pusher_script_", "Pusher.ScriptReceivers"
    );
}).call(this);

(function() {
    /** Sends a generic HTTP GET request using a script tag.
     *
     * By constructing URL in a specific way, it can be used for loading
     * JavaScript resources or JSONP requests. It can notify about errors, but
     * only in certain environments. Please take care of monitoring the state of
     * the request yourself.
     *
     * @param {String} src
     */
    function ScriptRequest(src) {
        this.src = src;
    }
    var prototype = ScriptRequest.prototype;

    /** Sends the actual script request.
     *
     * @param {ScriptReceiver} receiver
     */
    prototype.send = function(receiver) {
        var self = this;
        var errorString = "Error loading " + self.src;

        self.script = document.createElement("script");
        self.script.id = receiver.id;
        self.script.src = self.src;
        self.script.type = "text/javascript";
        self.script.charset = "UTF-8";

        if (self.script.addEventListener) {
            self.script.onerror = function() {
                receiver.callback(errorString);
            };
            self.script.onload = function() {
                receiver.callback(null);
            };
        } else {
            self.script.onreadystatechange = function() {
                if (self.script.readyState === 'loaded' ||
                    self.script.readyState === 'complete') {
                    receiver.callback(null);
                }
            };
        }

        // Opera<11.6 hack for missing onerror callback
        if (self.script.async === undefined && document.attachEvent &&
            /opera/i.test(navigator.userAgent)) {
            self.errorScript = document.createElement("script");
            self.errorScript.id = receiver.id + "_error";
            self.errorScript.text = receiver.name + "('" + errorString + "');";
            self.script.async = self.errorScript.async = false;
        } else {
            self.script.async = true;
        }

        var head = document.getElementsByTagName('head')[0];
        head.insertBefore(self.script, head.firstChild);
        if (self.errorScript) {
            head.insertBefore(self.errorScript, self.script.nextSibling);
        }
    };

    /** Cleans up the DOM remains of the script request. */
    prototype.cleanup = function() {
        if (this.script) {
            this.script.onload = this.script.onerror = null;
            this.script.onreadystatechange = null;
        }
        if (this.script && this.script.parentNode) {
            this.script.parentNode.removeChild(this.script);
        }
        if (this.errorScript && this.errorScript.parentNode) {
            this.errorScript.parentNode.removeChild(this.errorScript);
        }
        this.script = null;
        this.errorScript = null;
    };

    Pusher.ScriptRequest = ScriptRequest;
}).call(this);

;(function() {
    /** Handles loading dependency files.
     *
     * Dependency loaders don't remember whether a resource has been loaded or
     * not. It is caller's responsibility to make sure the resource is not loaded
     * twice. This is because it's impossible to detect resource loading status
     * without knowing its content.
     *
     * Options:
     * - cdn_http - url to HTTP CND
     * - cdn_https - url to HTTPS CDN
     * - version - version of pusher-js
     * - suffix - suffix appended to all names of dependency files
     *
     * @param {Object} options
     */
    function DependencyLoader(options) {
        this.options = options;
        this.receivers = options.receivers || Pusher.ScriptReceivers;
        this.loading = {};
    }
    var prototype = DependencyLoader.prototype;

    /** Loads the dependency from CDN.
     *
     * @param  {String} name
     * @param  {Function} callback
     */
    prototype.load = function(name, callback) {
        var self = this;

        if (self.loading[name] && self.loading[name].length > 0) {
            self.loading[name].push(callback);
        } else {
            self.loading[name] = [callback];

            var request = new Pusher.ScriptRequest(self.getPath(name));
            var receiver = self.receivers.create(function(error) {
                self.receivers.remove(receiver);

                if (self.loading[name]) {
                    var callbacks = self.loading[name];
                    delete self.loading[name];

                    var successCallback = function(wasSuccessful) {
                        if (!wasSuccessful) {
                            request.cleanup();
                        }
                    };
                    for (var i = 0; i < callbacks.length; i++) {
                        callbacks[i](error, successCallback);
                    }
                }
            });
            request.send(receiver);
        }
    };

    /** Returns a root URL for pusher-js CDN.
     *
     * @returns {String}
     */
    prototype.getRoot = function(options) {
        var cdn;
        var protocol = Pusher.Util.getDocument().location.protocol;
        if ((options && options.encrypted) || protocol === "https:") {
            cdn = this.options.cdn_https;
        } else {
            cdn = this.options.cdn_http;
        }
        // make sure there are no double slashes
        return cdn.replace(/\/*$/, "") + "/" + this.options.version;
    };

    /** Returns a full path to a dependency file.
     *
     * @param {String} name
     * @returns {String}
     */
    prototype.getPath = function(name, options) {
        return this.getRoot(options) + '/' + name + this.options.suffix + '.js';
    };

    Pusher.DependencyLoader = DependencyLoader;
}).call(this);

;(function() {
    Pusher.DependenciesReceivers = new Pusher.ScriptReceiverFactory(
        "_pusher_dependencies", "Pusher.DependenciesReceivers"
    );
    Pusher.Dependencies = new Pusher.DependencyLoader({
        cdn_http: Pusher.cdn_http,
        cdn_https: Pusher.cdn_https,
        version: Pusher.VERSION,
        suffix: Pusher.dependency_suffix,
        receivers: Pusher.DependenciesReceivers
    });

    function initialize() {
        Pusher.ready();
    }

    // Allows calling a function when the document body is available
    function onDocumentBody(callback) {
        if (document.body) {
            callback();
        } else {
            setTimeout(function() {
                onDocumentBody(callback);
            }, 0);
        }
    }

    function initializeOnDocumentBody() {
        onDocumentBody(initialize);
    }

    if (!window.JSON) {
        Pusher.Dependencies.load("json2", initializeOnDocumentBody);
    } else {
        initializeOnDocumentBody();
    }
})();

(function() {

    var Base64 = {
        encode: function (s) {
            return btoa(utob(s));
        }
    };

    var fromCharCode = String.fromCharCode;

    var b64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    var b64tab = {};

    for (var i = 0, l = b64chars.length; i < l; i++) {
        b64tab[b64chars.charAt(i)] = i;
    }

    var cb_utob = function(c) {
        var cc = c.charCodeAt(0);
        return cc < 0x80 ? c
            : cc < 0x800 ? fromCharCode(0xc0 | (cc >>> 6)) +
        fromCharCode(0x80 | (cc & 0x3f))
            : fromCharCode(0xe0 | ((cc >>> 12) & 0x0f)) +
        fromCharCode(0x80 | ((cc >>>  6) & 0x3f)) +
        fromCharCode(0x80 | ( cc         & 0x3f));
    };

    var utob = function(u) {
        return u.replace(/[^\x00-\x7F]/g, cb_utob);
    };

    var cb_encode = function(ccc) {
        var padlen = [0, 2, 1][ccc.length % 3];
        var ord = ccc.charCodeAt(0) << 16
            | ((ccc.length > 1 ? ccc.charCodeAt(1) : 0) << 8)
            | ((ccc.length > 2 ? ccc.charCodeAt(2) : 0));
        var chars = [
            b64chars.charAt( ord >>> 18),
            b64chars.charAt((ord >>> 12) & 63),
            padlen >= 2 ? '=' : b64chars.charAt((ord >>> 6) & 63),
            padlen >= 1 ? '=' : b64chars.charAt(ord & 63)
        ];
        return chars.join('');
    };

    var btoa = window.btoa || function(b) {
            return b.replace(/[\s\S]{1,3}/g, cb_encode);
        };

    Pusher.Base64 = Base64;

}).call(this);

(function() {
    /** Sends data via JSONP.
     *
     * Data is a key-value map. Its values are JSON-encoded and then passed
     * through base64. Finally, keys and encoded values are appended to the query
     * string.
     *
     * The class itself does not guarantee raising errors on failures, as it's not
     * possible to support such feature on all browsers. Instead, JSONP endpoint
     * should call back in a way that's easy to distinguish from browser calls,
     * for example by passing a second argument to the receiver.
     *
     * @param {String} url
     * @param {Object} data key-value map of data to be submitted
     */
    function JSONPRequest(url, data) {
        this.url = url;
        this.data = data;
    }
    var prototype = JSONPRequest.prototype;

    /** Sends the actual JSONP request.
     *
     * @param {ScriptReceiver} receiver
     */
    prototype.send = function(receiver) {
        if (this.request) {
            return;
        }

        var params = Pusher.Util.filterObject(this.data, function(value) {
            return value !== undefined;
        });
        var query = Pusher.Util.map(
            Pusher.Util.flatten(encodeParamsObject(params)),
            Pusher.Util.method("join", "=")
        ).join("&");
        var url = this.url + "/" + receiver.number + "?" + query;

        this.request = new Pusher.ScriptRequest(url);
        this.request.send(receiver);
    };

    /** Cleans up the DOM remains of the JSONP request. */
    prototype.cleanup = function() {
        if (this.request) {
            this.request.cleanup();
        }
    };

    function encodeParamsObject(data) {
        return Pusher.Util.mapObject(data, function(value) {
            if (typeof value === "object") {
                value = JSON.stringify(value);
            }
            return encodeURIComponent(Pusher.Base64.encode(value.toString()));
        });
    }

    Pusher.JSONPRequest = JSONPRequest;
}).call(this);

(function() {
    function Timeline(key, session, options) {
        this.key = key;
        this.session = session;
        this.events = [];
        this.options = options || {};
        this.sent = 0;
        this.uniqueID = 0;
    }
    var prototype = Timeline.prototype;

    // Log levels
    Timeline.ERROR = 3;
    Timeline.INFO = 6;
    Timeline.DEBUG = 7;

    prototype.log = function(level, event) {
        if (level <= this.options.level) {
            this.events.push(
                Pusher.Util.extend({}, event, { timestamp: Pusher.Util.now() })
            );
            if (this.options.limit && this.events.length > this.options.limit) {
                this.events.shift();
            }
        }
    };

    prototype.error = function(event) {
        this.log(Timeline.ERROR, event);
    };

    prototype.info = function(event) {
        this.log(Timeline.INFO, event);
    };

    prototype.debug = function(event) {
        this.log(Timeline.DEBUG, event);
    };

    prototype.isEmpty = function() {
        return this.events.length === 0;
    };

    prototype.send = function(sendJSONP, callback) {
        var self = this;

        var data = Pusher.Util.extend({
            session: self.session,
            bundle: self.sent + 1,
            key: self.key,
            lib: "js",
            version: self.options.version,
            cluster: self.options.cluster,
            features: self.options.features,
            timeline: self.events
        }, self.options.params);

        self.events = [];
        sendJSONP(data, function(error, result) {
            if (!error) {
                self.sent++;
            }
            if (callback) {
                callback(error, result);
            }
        });

        return true;
    };

    prototype.generateUniqueID = function() {
        this.uniqueID++;
        return this.uniqueID;
    };

    Pusher.Timeline = Timeline;
}).call(this);

(function() {
    function TimelineSender(timeline, options) {
        this.timeline = timeline;
        this.options = options || {};
    }
    var prototype = TimelineSender.prototype;

    prototype.send = function(encrypted, callback) {
        var self = this;

        if (self.timeline.isEmpty()) {
            return;
        }

        var sendJSONP = function(data, callback) {
            var scheme = "http" + (encrypted ? "s" : "") + "://";
            var url = scheme + (self.host || self.options.host) + self.options.path;
            var request = new Pusher.JSONPRequest(url, data);

            var receiver = Pusher.ScriptReceivers.create(function(error, result) {
                Pusher.ScriptReceivers.remove(receiver);
                request.cleanup();

                if (result && result.host) {
                    self.host = result.host;
                }
                if (callback) {
                    callback(error, result);
                }
            });
            request.send(receiver);
        };
        self.timeline.send(sendJSONP, callback);
    };

    Pusher.TimelineSender = TimelineSender;
}).call(this);

;(function() {
    /** Launches all substrategies and emits prioritized connected transports.
     *
     * @param {Array} strategies
     */
    function BestConnectedEverStrategy(strategies) {
        this.strategies = strategies;
    }
    var prototype = BestConnectedEverStrategy.prototype;

    prototype.isSupported = function() {
        return Pusher.Util.any(this.strategies, Pusher.Util.method("isSupported"));
    };

    prototype.connect = function(minPriority, callback) {
        return connect(this.strategies, minPriority, function(i, runners) {
            return function(error, handshake) {
                runners[i].error = error;
                if (error) {
                    if (allRunnersFailed(runners)) {
                        callback(true);
                    }
                    return;
                }
                Pusher.Util.apply(runners, function(runner) {
                    runner.forceMinPriority(handshake.transport.priority);
                });
                callback(null, handshake);
            };
        });
    };

    /** Connects to all strategies in parallel.
     *
     * Callback builder should be a function that takes two arguments: index
     * and a list of runners. It should return another function that will be
     * passed to the substrategy with given index. Runners can be aborted using
     * abortRunner(s) functions from this class.
     *
     * @param  {Array} strategies
     * @param  {Function} callbackBuilder
     * @return {Object} strategy runner
     */
    function connect(strategies, minPriority, callbackBuilder) {
        var runners = Pusher.Util.map(strategies, function(strategy, i, _, rs) {
            return strategy.connect(minPriority, callbackBuilder(i, rs));
        });
        return {
            abort: function() {
                Pusher.Util.apply(runners, abortRunner);
            },
            forceMinPriority: function(p) {
                Pusher.Util.apply(runners, function(runner) {
                    runner.forceMinPriority(p);
                });
            }
        };
    }

    function allRunnersFailed(runners) {
        return Pusher.Util.all(runners, function(runner) {
            return Boolean(runner.error);
        });
    }

    function abortRunner(runner) {
        if (!runner.error && !runner.aborted) {
            runner.abort();
            runner.aborted = true;
        }
    }

    Pusher.BestConnectedEverStrategy = BestConnectedEverStrategy;
}).call(this);

;(function() {
    /** Caches last successful transport and uses it for following attempts.
     *
     * @param {Strategy} strategy
     * @param {Object} transports
     * @param {Object} options
     */
    function CachedStrategy(strategy, transports, options) {
        this.strategy = strategy;
        this.transports = transports;
        this.ttl = options.ttl || 1800*1000;
        this.encrypted = options.encrypted;
        this.timeline = options.timeline;
    }
    var prototype = CachedStrategy.prototype;

    prototype.isSupported = function() {
        return this.strategy.isSupported();
    };

    prototype.connect = function(minPriority, callback) {
        var encrypted = this.encrypted;
        var info = fetchTransportCache(encrypted);

        var strategies = [this.strategy];
        if (info && info.timestamp + this.ttl >= Pusher.Util.now()) {
            var transport = this.transports[info.transport];
            if (transport) {
                this.timeline.info({
                    cached: true,
                    transport: info.transport,
                    latency: info.latency
                });
                strategies.push(new Pusher.SequentialStrategy([transport], {
                    timeout: info.latency * 2 + 1000,
                    failFast: true
                }));
            }
        }

        var startTimestamp = Pusher.Util.now();
        var runner = strategies.pop().connect(
            minPriority,
            function cb(error, handshake) {
                if (error) {
                    flushTransportCache(encrypted);
                    if (strategies.length > 0) {
                        startTimestamp = Pusher.Util.now();
                        runner = strategies.pop().connect(minPriority, cb);
                    } else {
                        callback(error);
                    }
                } else {
                    storeTransportCache(
                        encrypted,
                        handshake.transport.name,
                        Pusher.Util.now() - startTimestamp
                    );
                    callback(null, handshake);
                }
            }
        );

        return {
            abort: function() {
                runner.abort();
            },
            forceMinPriority: function(p) {
                minPriority = p;
                if (runner) {
                    runner.forceMinPriority(p);
                }
            }
        };
    };

    function getTransportCacheKey(encrypted) {
        return "pusherTransport" + (encrypted ? "Encrypted" : "Unencrypted");
    }

    function fetchTransportCache(encrypted) {
        var storage = Pusher.Util.getLocalStorage();
        if (storage) {
            try {
                var serializedCache = storage[getTransportCacheKey(encrypted)];
                if (serializedCache) {
                    return JSON.parse(serializedCache);
                }
            } catch (e) {
                flushTransportCache(encrypted);
            }
        }
        return null;
    }

    function storeTransportCache(encrypted, transport, latency) {
        var storage = Pusher.Util.getLocalStorage();
        if (storage) {
            try {
                storage[getTransportCacheKey(encrypted)] = JSON.stringify({
                    timestamp: Pusher.Util.now(),
                    transport: transport,
                    latency: latency
                });
            } catch (e) {
                // catch over quota exceptions raised by localStorage
            }
        }
    }

    function flushTransportCache(encrypted) {
        var storage = Pusher.Util.getLocalStorage();
        if (storage) {
            try {
                delete storage[getTransportCacheKey(encrypted)];
            } catch (e) {
                // catch exceptions raised by localStorage
            }
        }
    }

    Pusher.CachedStrategy = CachedStrategy;
}).call(this);

;(function() {
    /** Runs substrategy after specified delay.
     *
     * Options:
     * - delay - time in miliseconds to delay the substrategy attempt
     *
     * @param {Strategy} strategy
     * @param {Object} options
     */
    function DelayedStrategy(strategy, options) {
        this.strategy = strategy;
        this.options = { delay: options.delay };
    }
    var prototype = DelayedStrategy.prototype;

    prototype.isSupported = function() {
        return this.strategy.isSupported();
    };

    prototype.connect = function(minPriority, callback) {
        var strategy = this.strategy;
        var runner;
        var timer = new Pusher.Timer(this.options.delay, function() {
            runner = strategy.connect(minPriority, callback);
        });

        return {
            abort: function() {
                timer.ensureAborted();
                if (runner) {
                    runner.abort();
                }
            },
            forceMinPriority: function(p) {
                minPriority = p;
                if (runner) {
                    runner.forceMinPriority(p);
                }
            }
        };
    };

    Pusher.DelayedStrategy = DelayedStrategy;
}).call(this);

;(function() {
    /** Launches the substrategy and terminates on the first open connection.
     *
     * @param {Strategy} strategy
     */
    function FirstConnectedStrategy(strategy) {
        this.strategy = strategy;
    }
    var prototype = FirstConnectedStrategy.prototype;

    prototype.isSupported = function() {
        return this.strategy.isSupported();
    };

    prototype.connect = function(minPriority, callback) {
        var runner = this.strategy.connect(
            minPriority,
            function(error, handshake) {
                if (handshake) {
                    runner.abort();
                }
                callback(error, handshake);
            }
        );
        return runner;
    };

    Pusher.FirstConnectedStrategy = FirstConnectedStrategy;
}).call(this);

;(function() {
    /** Proxies method calls to one of substrategies basing on the test function.
     *
     * @param {Function} test
     * @param {Strategy} trueBranch strategy used when test returns true
     * @param {Strategy} falseBranch strategy used when test returns false
     */
    function IfStrategy(test, trueBranch, falseBranch) {
        this.test = test;
        this.trueBranch = trueBranch;
        this.falseBranch = falseBranch;
    }
    var prototype = IfStrategy.prototype;

    prototype.isSupported = function() {
        var branch = this.test() ? this.trueBranch : this.falseBranch;
        return branch.isSupported();
    };

    prototype.connect = function(minPriority, callback) {
        var branch = this.test() ? this.trueBranch : this.falseBranch;
        return branch.connect(minPriority, callback);
    };

    Pusher.IfStrategy = IfStrategy;
}).call(this);

;(function() {
    /** Loops through strategies with optional timeouts.
     *
     * Options:
     * - loop - whether it should loop through the substrategy list
     * - timeout - initial timeout for a single substrategy
     * - timeoutLimit - maximum timeout
     *
     * @param {Strategy[]} strategies
     * @param {Object} options
     */
    function SequentialStrategy(strategies, options) {
        this.strategies = strategies;
        this.loop = Boolean(options.loop);
        this.failFast = Boolean(options.failFast);
        this.timeout = options.timeout;
        this.timeoutLimit = options.timeoutLimit;
    }
    var prototype = SequentialStrategy.prototype;

    prototype.isSupported = function() {
        return Pusher.Util.any(this.strategies, Pusher.Util.method("isSupported"));
    };

    prototype.connect = function(minPriority, callback) {
        var self = this;

        var strategies = this.strategies;
        var current = 0;
        var timeout = this.timeout;
        var runner = null;

        var tryNextStrategy = function(error, handshake) {
            if (handshake) {
                callback(null, handshake);
            } else {
                current = current + 1;
                if (self.loop) {
                    current = current % strategies.length;
                }

                if (current < strategies.length) {
                    if (timeout) {
                        timeout = timeout * 2;
                        if (self.timeoutLimit) {
                            timeout = Math.min(timeout, self.timeoutLimit);
                        }
                    }
                    runner = self.tryStrategy(
                        strategies[current],
                        minPriority,
                        { timeout: timeout, failFast: self.failFast },
                        tryNextStrategy
                    );
                } else {
                    callback(true);
                }
            }
        };

        runner = this.tryStrategy(
            strategies[current],
            minPriority,
            { timeout: timeout, failFast: this.failFast },
            tryNextStrategy
        );

        return {
            abort: function() {
                runner.abort();
            },
            forceMinPriority: function(p) {
                minPriority = p;
                if (runner) {
                    runner.forceMinPriority(p);
                }
            }
        };
    };

    /** @private */
    prototype.tryStrategy = function(strategy, minPriority, options, callback) {
        var timer = null;
        var runner = null;

        if (options.timeout > 0) {
            timer = new Pusher.Timer(options.timeout, function() {
                runner.abort();
                callback(true);
            });
        }

        runner = strategy.connect(minPriority, function(error, handshake) {
            if (error && timer && timer.isRunning() && !options.failFast) {
                // advance to the next strategy after the timeout
                return;
            }
            if (timer) {
                timer.ensureAborted();
            }
            callback(error, handshake);
        });

        return {
            abort: function() {
                if (timer) {
                    timer.ensureAborted();
                }
                runner.abort();
            },
            forceMinPriority: function(p) {
                runner.forceMinPriority(p);
            }
        };
    };

    Pusher.SequentialStrategy = SequentialStrategy;
}).call(this);

;(function() {
    /** Provides a strategy interface for transports.
     *
     * @param {String} name
     * @param {Number} priority
     * @param {Class} transport
     * @param {Object} options
     */
    function TransportStrategy(name, priority, transport, options) {
        this.name = name;
        this.priority = priority;
        this.transport = transport;
        this.options = options || {};
    }
    var prototype = TransportStrategy.prototype;

    /** Returns whether the transport is supported in the browser.
     *
     * @returns {Boolean}
     */
    prototype.isSupported = function() {
        return this.transport.isSupported({
            encrypted: this.options.encrypted
        });
    };

    /** Launches a connection attempt and returns a strategy runner.
     *
     * @param  {Function} callback
     * @return {Object} strategy runner
     */
    prototype.connect = function(minPriority, callback) {
        if (!this.isSupported()) {
            return failAttempt(new Pusher.Errors.UnsupportedStrategy(), callback);
        } else if (this.priority < minPriority) {
            return failAttempt(new Pusher.Errors.TransportPriorityTooLow(), callback);
        }

        var self = this;
        var connected = false;

        var transport = this.transport.createConnection(
            this.name, this.priority, this.options.key, this.options
        );
        var handshake = null;

        var onInitialized = function() {
            transport.unbind("initialized", onInitialized);
            transport.connect();
        };
        var onOpen = function() {
            handshake = new Pusher.Handshake(transport, function(result) {
                connected = true;
                unbindListeners();
                callback(null, result);
            });
        };
        var onError = function(error) {
            unbindListeners();
            callback(error);
        };
        var onClosed = function() {
            unbindListeners();
            callback(new Pusher.Errors.TransportClosed(transport));
        };

        var unbindListeners = function() {
            transport.unbind("initialized", onInitialized);
            transport.unbind("open", onOpen);
            transport.unbind("error", onError);
            transport.unbind("closed", onClosed);
        };

        transport.bind("initialized", onInitialized);
        transport.bind("open", onOpen);
        transport.bind("error", onError);
        transport.bind("closed", onClosed);

        // connect will be called automatically after initialization
        transport.initialize();

        return {
            abort: function() {
                if (connected) {
                    return;
                }
                unbindListeners();
                if (handshake) {
                    handshake.close();
                } else {
                    transport.close();
                }
            },
            forceMinPriority: function(p) {
                if (connected) {
                    return;
                }
                if (self.priority < p) {
                    if (handshake) {
                        handshake.close();
                    } else {
                        transport.close();
                    }
                }
            }
        };
    };

    function failAttempt(error, callback) {
        Pusher.Util.defer(function() {
            callback(error);
        });
        return {
            abort: function() {},
            forceMinPriority: function() {}
        };
    }

    Pusher.TransportStrategy = TransportStrategy;
}).call(this);

(function() {
    function getGenericURL(baseScheme, params, path) {
        var scheme = baseScheme + (params.encrypted ? "s" : "");
        var host = params.encrypted ? params.hostEncrypted : params.hostUnencrypted;
        return scheme + "://" + host + path;
    }

    function getGenericPath(key, queryString) {
        var path = "/app/" + key;
        var query =
            "?protocol=" + Pusher.PROTOCOL +
            "&client=js" +
            "&version=" + Pusher.VERSION +
            (queryString ? ("&" + queryString) : "");
        return path + query;
    }

    /** URL schemes for different transport types. */
    Pusher.URLSchemes = {
        /** Standard WebSocket URL scheme. */
        ws: {
            getInitial: function(key, params) {
                return getGenericURL("ws", params, getGenericPath(key, "flash=false"));
            }
        },
        /** URL scheme for Flash. Same as WebSocket, but with a flash parameter. */
        flash: {
            getInitial: function(key, params) {
                return getGenericURL("ws", params, getGenericPath(key, "flash=true"));
            }
        },
        /** SockJS URL scheme. Supplies the path separately from the initial URL. */
        sockjs: {
            getInitial: function(key, params) {
                return getGenericURL("http", params, params.httpPath || "/pusher", "");
            },
            getPath: function(key, params) {
                return getGenericPath(key);
            }
        },
        /** URL scheme for HTTP transports. Basically, WS scheme with a prefix. */
        http: {
            getInitial: function(key, params) {
                var path = (params.httpPath || "/pusher") + getGenericPath(key);
                return getGenericURL("http", params, path);
            }
        }
    };
}).call(this);

(function() {
    /** Provides universal API for transport connections.
     *
     * Transport connection is a low-level object that wraps a connection method
     * and exposes a simple evented interface for the connection state and
     * messaging. It does not implement Pusher-specific WebSocket protocol.
     *
     * Additionally, it fetches resources needed for transport to work and exposes
     * an interface for querying transport features.
     *
     * States:
     * - new - initial state after constructing the object
     * - initializing - during initialization phase, usually fetching resources
     * - intialized - ready to establish a connection
     * - connection - when connection is being established
     * - open - when connection ready to be used
     * - closed - after connection was closed be either side
     *
     * Emits:
     * - error - after the connection raised an error
     *
     * Options:
     * - encrypted - whether connection should use ssl
     * - hostEncrypted - host to connect to when connection is encrypted
     * - hostUnencrypted - host to connect to when connection is not encrypted
     *
     * @param {String} key application key
     * @param {Object} options
     */
    function TransportConnection(hooks, name, priority, key, options) {
        Pusher.EventsDispatcher.call(this);

        this.hooks = hooks;
        this.name = name;
        this.priority = priority;
        this.key = key;
        this.options = options;

        this.state = "new";
        this.timeline = options.timeline;
        this.activityTimeout = options.activityTimeout;
        this.id = this.timeline.generateUniqueID();
    }
    var prototype = TransportConnection.prototype;
    Pusher.Util.extend(prototype, Pusher.EventsDispatcher.prototype);

    /** Checks whether the transport handles activity checks by itself.
     *
     * @return {Boolean}
     */
    prototype.handlesActivityChecks = function() {
        return Boolean(this.hooks.handlesActivityChecks);
    };

    /** Checks whether the transport supports the ping/pong API.
     *
     * @return {Boolean}
     */
    prototype.supportsPing = function() {
        return Boolean(this.hooks.supportsPing);
    };

    /** Initializes the transport.
     *
     * Fetches resources if needed and then transitions to initialized.
     */
    prototype.initialize = function() {
        var self = this;

        self.timeline.info(self.buildTimelineMessage({
            transport: self.name + (self.options.encrypted ? "s" : "")
        }));

        if (self.hooks.beforeInitialize) {
            self.hooks.beforeInitialize();
        }

        if (self.hooks.isInitialized()) {
            self.changeState("initialized");
        } else if (self.hooks.file) {
            self.changeState("initializing");
            Pusher.Dependencies.load(self.hooks.file, function(error, callback) {
                if (self.hooks.isInitialized()) {
                    self.changeState("initialized");
                    callback(true);
                } else {
                    if (error) {
                        self.onError(error);
                    }
                    self.onClose();
                    callback(false);
                }
            });
        } else {
            self.onClose();
        }
    };

    /** Tries to establish a connection.
     *
     * @returns {Boolean} false if transport is in invalid state
     */
    prototype.connect = function() {
        var self = this;

        if (self.socket || self.state !== "initialized") {
            return false;
        }

        var url = self.hooks.urls.getInitial(self.key, self.options);
        try {
            self.socket = self.hooks.getSocket(url, self.options);
        } catch (e) {
            Pusher.Util.defer(function() {
                self.onError(e);
                self.changeState("closed");
            });
            return false;
        }

        self.bindListeners();

        Pusher.debug("Connecting", { transport: self.name, url: url });
        self.changeState("connecting");
        return true;
    };

    /** Closes the connection.
     *
     * @return {Boolean} true if there was a connection to close
     */
    prototype.close = function() {
        if (this.socket) {
            this.socket.close();
            return true;
        } else {
            return false;
        }
    };

    /** Sends data over the open connection.
     *
     * @param {String} data
     * @return {Boolean} true only when in the "open" state
     */
    prototype.send = function(data) {
        var self = this;

        if (self.state === "open") {
            // Workaround for MobileSafari bug (see https://gist.github.com/2052006)
            Pusher.Util.defer(function() {
                if (self.socket) {
                    self.socket.send(data);
                }
            });
            return true;
        } else {
            return false;
        }
    };

    /** Sends a ping if the connection is open and transport supports it. */
    prototype.ping = function() {
        if (this.state === "open" && this.supportsPing()) {
            this.socket.ping();
        }
    };

    /** @private */
    prototype.onOpen = function() {
        if (this.hooks.beforeOpen) {
            this.hooks.beforeOpen(
                this.socket, this.hooks.urls.getPath(this.key, this.options)
            );
        }
        this.changeState("open");
        this.socket.onopen = undefined;
    };

    /** @private */
    prototype.onError = function(error) {
        this.emit("error", { type: 'WebSocketError', error: error });
        this.timeline.error(this.buildTimelineMessage({ error: error.toString() }));
    };

    /** @private */
    prototype.onClose = function(closeEvent) {
        if (closeEvent) {
            this.changeState("closed", {
                code: closeEvent.code,
                reason: closeEvent.reason,
                wasClean: closeEvent.wasClean
            });
        } else {
            this.changeState("closed");
        }
        this.unbindListeners();
        this.socket = undefined;
    };

    /** @private */
    prototype.onMessage = function(message) {
        this.emit("message", message);
    };

    /** @private */
    prototype.onActivity = function() {
        this.emit("activity");
    };

    /** @private */
    prototype.bindListeners = function() {
        var self = this;

        self.socket.onopen = function() {
            self.onOpen();
        };
        self.socket.onerror = function(error) {
            self.onError(error);
        };
        self.socket.onclose = function(closeEvent) {
            self.onClose(closeEvent);
        };
        self.socket.onmessage = function(message) {
            self.onMessage(message);
        };

        if (self.supportsPing()) {
            self.socket.onactivity = function() { self.onActivity(); };
        }
    };

    /** @private */
    prototype.unbindListeners = function() {
        if (this.socket) {
            this.socket.onopen = undefined;
            this.socket.onerror = undefined;
            this.socket.onclose = undefined;
            this.socket.onmessage = undefined;
            if (this.supportsPing()) {
                this.socket.onactivity = undefined;
            }
        }
    };

    /** @private */
    prototype.changeState = function(state, params) {
        this.state = state;
        this.timeline.info(this.buildTimelineMessage({
            state: state,
            params: params
        }));
        this.emit(state, params);
    };

    /** @private */
    prototype.buildTimelineMessage = function(message) {
        return Pusher.Util.extend({ cid: this.id }, message);
    };

    Pusher.TransportConnection = TransportConnection;
}).call(this);

(function() {
    /** Provides interface for transport connection instantiation.
     *
     * Takes transport-specific hooks as the only argument, which allow checking
     * for transport support and creating its connections.
     *
     * Supported hooks:
     * - file - the name of the file to be fetched during initialization
     * - urls - URL scheme to be used by transport
     * - handlesActivityCheck - true when the transport handles activity checks
     * - supportsPing - true when the transport has a ping/activity API
     * - isSupported - tells whether the transport is supported in the environment
     * - getSocket - creates a WebSocket-compatible transport socket
     *
     * See transports.js for specific implementations.
     *
     * @param {Object} hooks object containing all needed transport hooks
     */
    function Transport(hooks) {
        this.hooks = hooks;
    }
    var prototype = Transport.prototype;

    /** Returns whether the transport is supported in the environment.
     *
     * @param {Object} environment the environment details (encryption, settings)
     * @returns {Boolean} true when the transport is supported
     */
    prototype.isSupported = function(environment) {
        return this.hooks.isSupported(environment);
    };

    /** Creates a transport connection.
     *
     * @param {String} name
     * @param {Number} priority
     * @param {String} key the application key
     * @param {Object} options
     * @returns {TransportConnection}
     */
    prototype.createConnection = function(name, priority, key, options) {
        return new Pusher.TransportConnection(
            this.hooks, name, priority, key, options
        );
    };

    Pusher.Transport = Transport;
}).call(this);

(function() {
    /** WebSocket transport.
     *
     * Uses native WebSocket implementation, including MozWebSocket supported by
     * earlier Firefox versions.
     */
    Pusher.WSTransport = new Pusher.Transport({
        urls: Pusher.URLSchemes.ws,
        handlesActivityChecks: false,
        supportsPing: false,

        isInitialized: function() {
            return Boolean(window.WebSocket || window.MozWebSocket);
        },
        isSupported: function() {
            return Boolean(window.WebSocket || window.MozWebSocket);
        },
        getSocket: function(url) {
            var Constructor = window.WebSocket || window.MozWebSocket;
            return new Constructor(url);
        }
    });

    /** Flash transport using the WebSocket protocol. */
    Pusher.FlashTransport = new Pusher.Transport({
        file: "flashfallback",
        urls: Pusher.URLSchemes.flash,
        handlesActivityChecks: false,
        supportsPing: false,

        isSupported: function() {
            try {
                return Boolean(new ActiveXObject('ShockwaveFlash.ShockwaveFlash'));
            } catch (e1) {
                try {
                    var nav = Pusher.Util.getNavigator();
                    return Boolean(
                        nav &&
                        nav.mimeTypes &&
                        nav.mimeTypes["application/x-shockwave-flash"] !== undefined
                    );
                } catch (e2) {
                    return false;
                }
            }
        },
        beforeInitialize: function() {
            if (window.WEB_SOCKET_SUPPRESS_CROSS_DOMAIN_SWF_ERROR === undefined) {
                window.WEB_SOCKET_SUPPRESS_CROSS_DOMAIN_SWF_ERROR = true;
            }
            window.WEB_SOCKET_SWF_LOCATION = Pusher.Dependencies.getRoot() +
                "/WebSocketMain.swf";
        },
        isInitialized: function() {
            return window.FlashWebSocket !== undefined;
        },
        getSocket: function(url) {
            return new FlashWebSocket(url);
        }
    });

    /** SockJS transport. */
    Pusher.SockJSTransport = new Pusher.Transport({
        file: "sockjs",
        urls: Pusher.URLSchemes.sockjs,
        handlesActivityChecks: true,
        supportsPing: false,

        isSupported: function() {
            return true;
        },
        isInitialized: function() {
            return window.SockJS !== undefined;
        },
        getSocket: function(url, options) {
            return new SockJS(url, null, {
                js_path: Pusher.Dependencies.getPath("sockjs", {
                    encrypted: options.encrypted
                }),
                ignore_null_origin: options.ignoreNullOrigin
            });
        },
        beforeOpen: function(socket, path) {
            socket.send(JSON.stringify({
                path: path
            }));
        }
    });

    var httpConfiguration = {
        urls: Pusher.URLSchemes.http,
        handlesActivityChecks: false,
        supportsPing: true,
        isInitialized: function() {
            return Boolean(Pusher.HTTP.Socket);
        }
    };

    var streamingConfiguration = Pusher.Util.extend(
        { getSocket: function(url) {
            return Pusher.HTTP.getStreamingSocket(url);
        }
        },
        httpConfiguration
    );
    var pollingConfiguration = Pusher.Util.extend(
        { getSocket: function(url) {
            return Pusher.HTTP.getPollingSocket(url);
        }
        },
        httpConfiguration
    );

    var xhrConfiguration = {
        file: "xhr",
        isSupported: Pusher.Util.isXHRSupported
    };
    var xdrConfiguration = {
        file: "xdr",
        isSupported: function(environment) {
            return Pusher.Util.isXDRSupported(environment.encrypted);
        }
    };

    /** HTTP streaming transport using CORS-enabled XMLHttpRequest. */
    Pusher.XHRStreamingTransport = new Pusher.Transport(
        Pusher.Util.extend({}, streamingConfiguration, xhrConfiguration)
    );
    /** HTTP streaming transport using XDomainRequest (IE 8,9). */
    Pusher.XDRStreamingTransport = new Pusher.Transport(
        Pusher.Util.extend({}, streamingConfiguration, xdrConfiguration)
    );
    /** HTTP long-polling transport using CORS-enabled XMLHttpRequest. */
    Pusher.XHRPollingTransport = new Pusher.Transport(
        Pusher.Util.extend({}, pollingConfiguration, xhrConfiguration)
    );
    /** HTTP long-polling transport using XDomainRequest (IE 8,9). */
    Pusher.XDRPollingTransport = new Pusher.Transport(
        Pusher.Util.extend({}, pollingConfiguration, xdrConfiguration)
    );
}).call(this);

;(function() {
    /** Creates transport connections monitored by a transport manager.
     *
     * When a transport is closed, it might mean the environment does not support
     * it. It's possible that messages get stuck in an intermediate buffer or
     * proxies terminate inactive connections. To combat these problems,
     * assistants monitor the connection lifetime, report unclean exits and
     * adjust ping timeouts to keep the connection active. The decision to disable
     * a transport is the manager's responsibility.
     *
     * @param {TransportManager} manager
     * @param {TransportConnection} transport
     * @param {Object} options
     */
    function AssistantToTheTransportManager(manager, transport, options) {
        this.manager = manager;
        this.transport = transport;
        this.minPingDelay = options.minPingDelay;
        this.maxPingDelay = options.maxPingDelay;
        this.pingDelay = undefined;
    }
    var prototype = AssistantToTheTransportManager.prototype;

    /** Creates a transport connection.
     *
     * This function has the same API as Transport#createConnection.
     *
     * @param {String} name
     * @param {Number} priority
     * @param {String} key the application key
     * @param {Object} options
     * @returns {TransportConnection}
     */
    prototype.createConnection = function(name, priority, key, options) {
        var self = this;

        options = Pusher.Util.extend({}, options, {
            activityTimeout: self.pingDelay
        });
        var connection = self.transport.createConnection(
            name, priority, key, options
        );

        var openTimestamp = null;

        var onOpen = function() {
            connection.unbind("open", onOpen);
            connection.bind("closed", onClosed);
            openTimestamp = Pusher.Util.now();
        };
        var onClosed = function(closeEvent) {
            connection.unbind("closed", onClosed);

            if (closeEvent.code === 1002 || closeEvent.code === 1003) {
                // we don't want to use transports not obeying the protocol
                self.manager.reportDeath();
            } else if (!closeEvent.wasClean && openTimestamp) {
                // report deaths only for short-living transport
                var lifespan = Pusher.Util.now() - openTimestamp;
                if (lifespan < 2 * self.maxPingDelay) {
                    self.manager.reportDeath();
                    self.pingDelay = Math.max(lifespan / 2, self.minPingDelay);
                }
            }
        };

        connection.bind("open", onOpen);
        return connection;
    };

    /** Returns whether the transport is supported in the environment.
     *
     * This function has the same API as Transport#isSupported. Might return false
     * when the manager decides to kill the transport.
     *
     * @param {Object} environment the environment details (encryption, settings)
     * @returns {Boolean} true when the transport is supported
     */
    prototype.isSupported = function(environment) {
        return this.manager.isAlive() && this.transport.isSupported(environment);
    };

    Pusher.AssistantToTheTransportManager = AssistantToTheTransportManager;
}).call(this);

;(function() {
    /** Keeps track of the number of lives left for a transport.
     *
     * In the beginning of a session, transports may be assigned a number of
     * lives. When an AssistantToTheTransportManager instance reports a transport
     * connection closed uncleanly, the transport loses a life. When the number
     * of lives drops to zero, the transport gets disabled by its manager.
     *
     * @param {Object} options
     */
    function TransportManager(options) {
        this.options = options || {};
        this.livesLeft = this.options.lives || Infinity;
    }
    var prototype = TransportManager.prototype;

    /** Creates a assistant for the transport.
     *
     * @param {Transport} transport
     * @returns {AssistantToTheTransportManager}
     */
    prototype.getAssistant = function(transport) {
        return new Pusher.AssistantToTheTransportManager(this, transport, {
            minPingDelay: this.options.minPingDelay,
            maxPingDelay: this.options.maxPingDelay
        });
    };

    /** Returns whether the transport has any lives left.
     *
     * @returns {Boolean}
     */
    prototype.isAlive = function() {
        return this.livesLeft > 0;
    };

    /** Takes one life from the transport. */
    prototype.reportDeath = function() {
        this.livesLeft -= 1;
    };

    Pusher.TransportManager = TransportManager;
}).call(this);

;(function() {
    var StrategyBuilder = {
        /** Transforms a JSON scheme to a strategy tree.
         *
         * @param {Array} scheme JSON strategy scheme
         * @param {Object} options a hash of symbols to be included in the scheme
         * @returns {Strategy} strategy tree that's represented by the scheme
         */
        build: function(scheme, options) {
            var context = Pusher.Util.extend({}, globalContext, options);
            return evaluate(scheme, context)[1].strategy;
        }
    };

    var transports = {
        ws: Pusher.WSTransport,
        flash: Pusher.FlashTransport,
        sockjs: Pusher.SockJSTransport,
        xhr_streaming: Pusher.XHRStreamingTransport,
        xdr_streaming: Pusher.XDRStreamingTransport,
        xhr_polling: Pusher.XHRPollingTransport,
        xdr_polling: Pusher.XDRPollingTransport
    };

    var UnsupportedStrategy = {
        isSupported: function() {
            return false;
        },
        connect: function(_, callback) {
            var deferred = Pusher.Util.defer(function() {
                callback(new Pusher.Errors.UnsupportedStrategy());
            });
            return {
                abort: function() {
                    deferred.ensureAborted();
                },
                forceMinPriority: function() {}
            };
        }
    };

    // DSL bindings

    function returnWithOriginalContext(f) {
        return function(context) {
            return [f.apply(this, arguments), context];
        };
    }

    var globalContext = {
        extend: function(context, first, second) {
            return [Pusher.Util.extend({}, first, second), context];
        },

        def: function(context, name, value) {
            if (context[name] !== undefined) {
                throw "Redefining symbol " + name;
            }
            context[name] = value;
            return [undefined, context];
        },

        def_transport: function(context, name, type, priority, options, manager) {
            var transportClass = transports[type];
            if (!transportClass) {
                throw new Pusher.Errors.UnsupportedTransport(type);
            }

            var enabled =
                (!context.enabledTransports ||
                Pusher.Util.arrayIndexOf(context.enabledTransports, name) !== -1) &&
                (!context.disabledTransports ||
                Pusher.Util.arrayIndexOf(context.disabledTransports, name) === -1) &&
                (name !== "flash" || context.disableFlash !== true);

            var transport;
            if (enabled) {
                transport = new Pusher.TransportStrategy(
                    name,
                    priority,
                    manager ? manager.getAssistant(transportClass) : transportClass,
                    Pusher.Util.extend({
                        key: context.key,
                        encrypted: context.encrypted,
                        timeline: context.timeline,
                        ignoreNullOrigin: context.ignoreNullOrigin
                    }, options)
                );
            } else {
                transport = UnsupportedStrategy;
            }

            var newContext = context.def(context, name, transport)[1];
            newContext.transports = context.transports || {};
            newContext.transports[name] = transport;
            return [undefined, newContext];
        },

        transport_manager: returnWithOriginalContext(function(_, options) {
            return new Pusher.TransportManager(options);
        }),

        sequential: returnWithOriginalContext(function(_, options) {
            var strategies = Array.prototype.slice.call(arguments, 2);
            return new Pusher.SequentialStrategy(strategies, options);
        }),

        cached: returnWithOriginalContext(function(context, ttl, strategy){
            return new Pusher.CachedStrategy(strategy, context.transports, {
                ttl: ttl,
                timeline: context.timeline,
                encrypted: context.encrypted
            });
        }),

        first_connected: returnWithOriginalContext(function(_, strategy) {
            return new Pusher.FirstConnectedStrategy(strategy);
        }),

        best_connected_ever: returnWithOriginalContext(function() {
            var strategies = Array.prototype.slice.call(arguments, 1);
            return new Pusher.BestConnectedEverStrategy(strategies);
        }),

        delayed: returnWithOriginalContext(function(_, delay, strategy) {
            return new Pusher.DelayedStrategy(strategy, { delay: delay });
        }),

        "if": returnWithOriginalContext(function(_, test, trueBranch, falseBranch) {
            return new Pusher.IfStrategy(test, trueBranch, falseBranch);
        }),

        is_supported: returnWithOriginalContext(function(_, strategy) {
            return function() {
                return strategy.isSupported();
            };
        })
    };

    // DSL interpreter

    function isSymbol(expression) {
        return (typeof expression === "string") && expression.charAt(0) === ":";
    }

    function getSymbolValue(expression, context) {
        return context[expression.slice(1)];
    }

    function evaluateListOfExpressions(expressions, context) {
        if (expressions.length === 0) {
            return [[], context];
        }
        var head = evaluate(expressions[0], context);
        var tail = evaluateListOfExpressions(expressions.slice(1), head[1]);
        return [[head[0]].concat(tail[0]), tail[1]];
    }

    function evaluateString(expression, context) {
        if (!isSymbol(expression)) {
            return [expression, context];
        }
        var value = getSymbolValue(expression, context);
        if (value === undefined) {
            throw "Undefined symbol " + expression;
        }
        return [value, context];
    }

    function evaluateArray(expression, context) {
        if (isSymbol(expression[0])) {
            var f = getSymbolValue(expression[0], context);
            if (expression.length > 1) {
                if (typeof f !== "function") {
                    throw "Calling non-function " + expression[0];
                }
                var args = [Pusher.Util.extend({}, context)].concat(
                    Pusher.Util.map(expression.slice(1), function(arg) {
                        return evaluate(arg, Pusher.Util.extend({}, context))[0];
                    })
                );
                return f.apply(this, args);
            } else {
                return [f, context];
            }
        } else {
            return evaluateListOfExpressions(expression, context);
        }
    }

    function evaluate(expression, context) {
        var expressionType = typeof expression;
        if (typeof expression === "string") {
            return evaluateString(expression, context);
        } else if (typeof expression === "object") {
            if (expression instanceof Array && expression.length > 0) {
                return evaluateArray(expression, context);
            }
        }
        return [expression, context];
    }

    Pusher.StrategyBuilder = StrategyBuilder;
}).call(this);

;(function() {
    /**
     * Provides functions for handling Pusher protocol-specific messages.
     */
    var Protocol = {};

    /**
     * Decodes a message in a Pusher format.
     *
     * Throws errors when messages are not parse'able.
     *
     * @param  {Object} message
     * @return {Object}
     */
    Protocol.decodeMessage = function(message) {
        try {
            var params = JSON.parse(message.data);
            if (typeof params.data === 'string') {
                try {
                    params.data = JSON.parse(params.data);
                } catch (e) {
                    if (!(e instanceof SyntaxError)) {
                        // TODO looks like unreachable code
                        // https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/JSON/parse
                        throw e;
                    }
                }
            }
            return params;
        } catch (e) {
            throw { type: 'MessageParseError', error: e, data: message.data};
        }
    };

    /**
     * Encodes a message to be sent.
     *
     * @param  {Object} message
     * @return {String}
     */
    Protocol.encodeMessage = function(message) {
        return JSON.stringify(message);
    };

    /** Processes a handshake message and returns appropriate actions.
     *
     * Returns an object with an 'action' and other action-specific properties.
     *
     * There are three outcomes when calling this function. First is a successful
     * connection attempt, when pusher:connection_established is received, which
     * results in a 'connected' action with an 'id' property. When passeWebSocket is closed before the connection is establishedd a
     * pusher:error event, it returns a result with action appropriate to the
     * close code and an error. Otherwise, it raises an exception.
     *
     * @param {String} message
     * @result Object
     */
    Protocol.processHandshake = function(message) {
        message = this.decodeMessage(message);

        if (message.event === "pusher:connection_established") {
            if (!message.data.activity_timeout) {
                throw "No activity timeout specified in handshake";
            }
            return {
                action: "connected",
                id: message.data.socket_id,
                activityTimeout: message.data.activity_timeout * 1000
            };
        } else if (message.event === "pusher:error") {
            // From protocol 6 close codes are sent only once, so this only
            // happens when connection does not support close codes
            return {
                action: this.getCloseAction(message.data),
                error: this.getCloseError(message.data)
            };
        } else {
            throw "Invalid handshake";
        }
    };

    /**
     * Dispatches the close event and returns an appropriate action name.
     *
     * See:
     * 1. https://developer.mozilla.org/en-US/docs/WebSockets/WebSockets_reference/CloseEvent
     * 2. http://pusher.com/docs/pusher_protocol
     *
     * @param  {CloseEvent} closeEvent
     * @return {String} close action name
     */
    Protocol.getCloseAction = function(closeEvent) {
        if (closeEvent.code < 4000) {
            // ignore 1000 CLOSE_NORMAL, 1001 CLOSE_GOING_AWAY,
            //        1005 CLOSE_NO_STATUS, 1006 CLOSE_ABNORMAL
            // ignore 1007...3999
            // handle 1002 CLOSE_PROTOCOL_ERROR, 1003 CLOSE_UNSUPPORTED,
            //        1004 CLOSE_TOO_LARGE
            if (closeEvent.code >= 1002 && closeEvent.code <= 1004) {
                return "backoff";
            } else {
                return null;
            }
        } else if (closeEvent.code === 4000) {
            return "ssl_only";
        } else if (closeEvent.code < 4100) {
            return "refused";
        } else if (closeEvent.code < 4200) {
            return "backoff";
        } else if (closeEvent.code < 4300) {
            return "retry";
        } else {
            // unknown error
            return "refused";
        }
    };

    /**
     * Returns an error or null basing on the close event.
     *
     * Null is returned when connection was closed cleanly. Otherwise, an object
     * with error details is returned.
     *
     * @param  {CloseEvent} closeEvent
     * @return {Object} error object
     */
    Protocol.getCloseError = function(closeEvent) {
        if (closeEvent.code !== 1000 && closeEvent.code !== 1001) {
            return {
                type: 'PusherError',
                data: {
                    code: closeEvent.code,
                    message: closeEvent.reason || closeEvent.message
                }
            };
        } else {
            return null;
        }
    };

    Pusher.Protocol = Protocol;
}).call(this);

;(function() {
    /**
     * Provides Pusher protocol interface for transports.
     *
     * Emits following events:
     * - message - on received messages
     * - ping - on ping requests
     * - pong - on pong responses
     * - error - when the transport emits an error
     * - closed - after closing the transport
     *
     * It also emits more events when connection closes with a code.
     * See Protocol.getCloseAction to get more details.
     *
     * @param {Number} id
     * @param {AbstractTransport} transport
     */
    function Connection(id, transport) {
        Pusher.EventsDispatcher.call(this);

        this.id = id;
        this.transport = transport;
        this.activityTimeout = transport.activityTimeout;
        this.bindListeners();
    }
    var prototype = Connection.prototype;
    Pusher.Util.extend(prototype, Pusher.EventsDispatcher.prototype);

    /** Returns whether used transport handles activity checks by itself
     *
     * @returns {Boolean} true if activity checks are handled by the transport
     */
    prototype.handlesActivityChecks = function() {
        return this.transport.handlesActivityChecks();
    };

    /** Sends raw data.
     *
     * @param {String} data
     */
    prototype.send = function(data) {
        return this.transport.send(data);
    };

    /** Sends an event.
     *
     * @param {String} name
     * @param {String} data
     * @param {String} [channel]
     * @returns {Boolean} whether message was sent or not
     */
    prototype.send_event = function(name, data, channel) {
        var message = { event: name, data: data };
        if (channel) {
            message.channel = channel;
        }
        Pusher.debug('Event sent', message);
        return this.send(Pusher.Protocol.encodeMessage(message));
    };

    /** Sends a ping message to the server.
     *
     * Basing on the underlying transport, it might send either transport's
     * protocol-specific ping or pusher:ping event.
     */
    prototype.ping = function() {
        if (this.transport.supportsPing()) {
            this.transport.ping();
        } else {
            this.send_event('pusher:ping', {});
        }
    };

    /** Closes the connection. */
    prototype.close = function() {
        this.transport.close();
    };

    /** @private */
    prototype.bindListeners = function() {
        var self = this;

        var listeners = {
            message: function(m) {
                var message;
                try {
                    message = Pusher.Protocol.decodeMessage(m);
                } catch(e) {
                    self.emit('error', {
                        type: 'MessageParseError',
                        error: e,
                        data: m.data
                    });
                }

                if (message !== undefined) {
                    Pusher.debug('Event recd', message);

                    switch (message.event) {
                        case 'pusher:error':
                            self.emit('error', { type: 'PusherError', data: message.data });
                            break;
                        case 'pusher:ping':
                            self.emit("ping");
                            break;
                        case 'pusher:pong':
                            self.emit("pong");
                            break;
                    }
                    self.emit('message', message);
                }
            },
            activity: function() {
                self.emit("activity");
            },
            error: function(error) {
                self.emit("error", { type: "WebSocketError", error: error });
            },
            closed: function(closeEvent) {
                unbindListeners();

                if (closeEvent && closeEvent.code) {
                    self.handleCloseEvent(closeEvent);
                }

                self.transport = null;
                self.emit("closed");
            }
        };

        var unbindListeners = function() {
            Pusher.Util.objectApply(listeners, function(listener, event) {
                self.transport.unbind(event, listener);
            });
        };

        Pusher.Util.objectApply(listeners, function(listener, event) {
            self.transport.bind(event, listener);
        });
    };

    /** @private */
    prototype.handleCloseEvent = function(closeEvent) {
        var action = Pusher.Protocol.getCloseAction(closeEvent);
        var error = Pusher.Protocol.getCloseError(closeEvent);
        if (error) {
            this.emit('error', error);
        }
        if (action) {
            this.emit(action);
        }
    };

    Pusher.Connection = Connection;
}).call(this);

;(function() {
    /**
     * Handles Pusher protocol handshakes for transports.
     *
     * Calls back with a result object after handshake is completed. Results
     * always have two fields:
     * - action - string describing action to be taken after the handshake
     * - transport - the transport object passed to the constructor
     *
     * Different actions can set different additional properties on the result.
     * In the case of 'connected' action, there will be a 'connection' property
     * containing a Connection object for the transport. Other actions should
     * carry an 'error' property.
     *
     * @param {AbstractTransport} transport
     * @param {Function} callback
     */
    function Handshake(transport, callback) {
        this.transport = transport;
        this.callback = callback;
        this.bindListeners();
    }
    var prototype = Handshake.prototype;

    prototype.close = function() {
        this.unbindListeners();
        this.transport.close();
    };

    /** @private */
    prototype.bindListeners = function() {
        var self = this;

        self.onMessage = function(m) {
            self.unbindListeners();

            try {
                var result = Pusher.Protocol.processHandshake(m);
                if (result.action === "connected") {
                    self.finish("connected", {
                        connection: new Pusher.Connection(result.id, self.transport),
                        activityTimeout: result.activityTimeout
                    });
                } else {
                    self.finish(result.action, { error: result.error });
                    self.transport.close();
                }
            } catch (e) {
                self.finish("error", { error: e });
                self.transport.close();
            }
        };

        self.onClosed = function(closeEvent) {
            self.unbindListeners();

            var action = Pusher.Protocol.getCloseAction(closeEvent) || "backoff";
            var error = Pusher.Protocol.getCloseError(closeEvent);
            self.finish(action, { error: error });
        };

        self.transport.bind("message", self.onMessage);
        self.transport.bind("closed", self.onClosed);
    };

    /** @private */
    prototype.unbindListeners = function() {
        this.transport.unbind("message", this.onMessage);
        this.transport.unbind("closed", this.onClosed);
    };

    /** @private */
    prototype.finish = function(action, params) {
        this.callback(
            Pusher.Util.extend({ transport: this.transport, action: action }, params)
        );
    };

    Pusher.Handshake = Handshake;
}).call(this);

;(function() {
    /** Manages connection to Pusher.
     *
     * Uses a strategy (currently only default), timers and network availability
     * info to establish a connection and export its state. In case of failures,
     * manages reconnection attempts.
     *
     * Exports state changes as following events:
     * - "state_change", { previous: p, current: state }
     * - state
     *
     * States:
     * - initialized - initial state, never transitioned to
     * - connecting - connection is being established
     * - connected - connection has been fully established
     * - disconnected - on requested disconnection
     * - unavailable - after connection timeout or when there's no network
     * - failed - when the connection strategy is not supported
     *
     * Options:
     * - unavailableTimeout - time to transition to unavailable state
     * - activityTimeout - time after which ping message should be sent
     * - pongTimeout - time for Pusher to respond with pong before reconnecting
     *
     * @param {String} key application key
     * @param {Object} options
     */
    function ConnectionManager(key, options) {
        Pusher.EventsDispatcher.call(this);

        this.key = key;
        this.options = options || {};
        this.state = "initialized";
        this.connection = null;
        this.encrypted = !!options.encrypted;
        this.timeline = this.options.timeline;

        this.connectionCallbacks = this.buildConnectionCallbacks();
        this.errorCallbacks = this.buildErrorCallbacks();
        this.handshakeCallbacks = this.buildHandshakeCallbacks(this.errorCallbacks);

        var self = this;

        Pusher.Network.bind("online", function() {
            self.timeline.info({ netinfo: "online" });
            if (self.state === "connecting" || self.state === "unavailable") {
                self.retryIn(0);
            }
        });
        Pusher.Network.bind("offline", function() {
            self.timeline.info({ netinfo: "offline" });
            if (self.connection) {
                self.sendActivityCheck();
            }
        });

        this.updateStrategy();
    }
    var prototype = ConnectionManager.prototype;

    Pusher.Util.extend(prototype, Pusher.EventsDispatcher.prototype);

    /** Establishes a connection to Pusher.
     *
     * Does nothing when connection is already established. See top-level doc
     * to find events emitted on connection attempts.
     */
    prototype.connect = function() {
        if (this.connection || this.runner) {
            return;
        }
        if (!this.strategy.isSupported()) {
            this.updateState("failed");
            return;
        }
        this.updateState("connecting");
        this.startConnecting();
        this.setUnavailableTimer();
    };

    /** Sends raw data.
     *
     * @param {String} data
     */
    prototype.send = function(data) {
        if (this.connection) {
            return this.connection.send(data);
        } else {
            return false;
        }
    };

    /** Sends an event.
     *
     * @param {String} name
     * @param {String} data
     * @param {String} [channel]
     * @returns {Boolean} whether message was sent or not
     */
    prototype.send_event = function(name, data, channel) {
        if (this.connection) {
            return this.connection.send_event(name, data, channel);
        } else {
            return false;
        }
    };

    /** Closes the connection. */
    prototype.disconnect = function() {
        this.disconnectInternally();
        this.updateState("disconnected");
    };

    prototype.isEncrypted = function() {
        return this.encrypted;
    };

    /** @private */
    prototype.startConnecting = function() {
        var self = this;
        var callback = function(error, handshake) {
            if (error) {
                self.runner = self.strategy.connect(0, callback);
            } else {
                if (handshake.action === "error") {
                    self.emit("error", { type: "HandshakeError", error: handshake.error });
                    self.timeline.error({ handshakeError: handshake.error });
                } else {
                    self.abortConnecting(); // we don't support switching connections yet
                    self.handshakeCallbacks[handshake.action](handshake);
                }
            }
        };
        self.runner = self.strategy.connect(0, callback);
    };

    /** @private */
    prototype.abortConnecting = function() {
        if (this.runner) {
            this.runner.abort();
            this.runner = null;
        }
    };

    /** @private */
    prototype.disconnectInternally = function() {
        this.abortConnecting();
        this.clearRetryTimer();
        this.clearUnavailableTimer();
        if (this.connection) {
            var connection = this.abandonConnection();
            connection.close();
        }
    };

    /** @private */
    prototype.updateStrategy = function() {
        this.strategy = this.options.getStrategy({
            key: this.key,
            timeline: this.timeline,
            encrypted: this.encrypted
        });
    };

    /** @private */
    prototype.retryIn = function(delay) {
        var self = this;
        self.timeline.info({ action: "retry", delay: delay });
        if (delay > 0) {
            self.emit("connecting_in", Math.round(delay / 1000));
        }
        self.retryTimer = new Pusher.Timer(delay || 0, function() {
            self.disconnectInternally();
            self.connect();
        });
    };

    /** @private */
    prototype.clearRetryTimer = function() {
        if (this.retryTimer) {
            this.retryTimer.ensureAborted();
            this.retryTimer = null;
        }
    };

    /** @private */
    prototype.setUnavailableTimer = function() {
        var self = this;
        self.unavailableTimer = new Pusher.Timer(
            self.options.unavailableTimeout,
            function() {
                self.updateState("unavailable");
            }
        );
    };

    /** @private */
    prototype.clearUnavailableTimer = function() {
        if (this.unavailableTimer) {
            this.unavailableTimer.ensureAborted();
        }
    };

    /** @private */
    prototype.sendActivityCheck = function() {
        var self = this;
        self.stopActivityCheck();
        self.connection.ping();
        // wait for pong response
        self.activityTimer = new Pusher.Timer(
            self.options.pongTimeout,
            function() {
                self.timeline.error({ pong_timed_out: self.options.pongTimeout });
                self.retryIn(0);
            }
        );
    };

    /** @private */
    prototype.resetActivityCheck = function() {
        var self = this;
        self.stopActivityCheck();
        // send ping after inactivity
        if (!self.connection.handlesActivityChecks()) {
            self.activityTimer = new Pusher.Timer(self.activityTimeout, function() {
                self.sendActivityCheck();
            });
        }
    };

    /** @private */
    prototype.stopActivityCheck = function() {
        if (this.activityTimer) {
            this.activityTimer.ensureAborted();
        }
    };

    /** @private */
    prototype.buildConnectionCallbacks = function() {
        var self = this;
        return {
            message: function(message) {
                // includes pong messages from server
                self.resetActivityCheck();
                self.emit('message', message);
            },
            ping: function() {
                self.send_event('pusher:pong', {});
            },
            activity: function() {
                self.resetActivityCheck();
            },
            error: function(error) {
                // just emit error to user - socket will already be closed by browser
                self.emit("error", { type: "WebSocketError", error: error });
            },
            closed: function() {
                self.abandonConnection();
                if (self.shouldRetry()) {
                    self.retryIn(1000);
                }
            }
        };
    };

    /** @private */
    prototype.buildHandshakeCallbacks = function(errorCallbacks) {
        var self = this;
        return Pusher.Util.extend({}, errorCallbacks, {
            connected: function(handshake) {
                self.activityTimeout = Math.min(
                    self.options.activityTimeout,
                    handshake.activityTimeout,
                    handshake.connection.activityTimeout || Infinity
                );
                self.clearUnavailableTimer();
                self.setConnection(handshake.connection);
                self.socket_id = self.connection.id;
                self.updateState("connected", { socket_id: self.socket_id });
            }
        });
    };

    /** @private */
    prototype.buildErrorCallbacks = function() {
        var self = this;

        function withErrorEmitted(callback) {
            return function(result) {
                if (result.error) {
                    self.emit("error", { type: "WebSocketError", error: result.error });
                }
                callback(result);
            };
        }

        return {
            ssl_only: withErrorEmitted(function() {
                self.encrypted = true;
                self.updateStrategy();
                self.retryIn(0);
            }),
            refused: withErrorEmitted(function() {
                self.disconnect();
            }),
            backoff: withErrorEmitted(function() {
                self.retryIn(1000);
            }),
            retry: withErrorEmitted(function() {
                self.retryIn(0);
            })
        };
    };

    /** @private */
    prototype.setConnection = function(connection) {
        this.connection = connection;
        for (var event in this.connectionCallbacks) {
            this.connection.bind(event, this.connectionCallbacks[event]);
        }
        this.resetActivityCheck();
    };

    /** @private */
    prototype.abandonConnection = function() {
        if (!this.connection) {
            return;
        }
        this.stopActivityCheck();
        for (var event in this.connectionCallbacks) {
            this.connection.unbind(event, this.connectionCallbacks[event]);
        }
        var connection = this.connection;
        this.connection = null;
        return connection;
    };

    /** @private */
    prototype.updateState = function(newState, data) {
        var previousState = this.state;
        this.state = newState;
        if (previousState !== newState) {
            Pusher.debug('State changed', previousState + ' -> ' + newState);
            this.timeline.info({ state: newState, params: data });
            this.emit('state_change', { previous: previousState, current: newState });
            this.emit(newState, data);
        }
    };

    /** @private */
    prototype.shouldRetry = function() {
        return this.state === "connecting" || this.state === "connected";
    };

    Pusher.ConnectionManager = ConnectionManager;
}).call(this);

;(function() {
    /** Really basic interface providing network availability info.
     *
     * Emits:
     * - online - when browser goes online
     * - offline - when browser goes offline
     */
    function NetInfo() {
        Pusher.EventsDispatcher.call(this);

        var self = this;
        // This is okay, as IE doesn't support this stuff anyway.
        if (window.addEventListener !== undefined) {
            window.addEventListener("online", function() {
                self.emit('online');
            }, false);
            window.addEventListener("offline", function() {
                self.emit('offline');
            }, false);
        }
    }
    Pusher.Util.extend(NetInfo.prototype, Pusher.EventsDispatcher.prototype);

    var prototype = NetInfo.prototype;

    /** Returns whether browser is online or not
     *
     * Offline means definitely offline (no connection to router).
     * Inverse does NOT mean definitely online (only currently supported in Safari
     * and even there only means the device has a connection to the router).
     *
     * @return {Boolean}
     */
    prototype.isOnline = function() {
        if (window.navigator.onLine === undefined) {
            return true;
        } else {
            return window.navigator.onLine;
        }
    };

    Pusher.NetInfo = NetInfo;
    Pusher.Network = new NetInfo();
}).call(this);

;(function() {
    /** Represents a collection of members of a presence channel. */
    function Members() {
        this.reset();
    }
    var prototype = Members.prototype;

    /** Returns member's info for given id.
     *
     * Resulting object containts two fields - id and info.
     *
     * @param {Number} id
     * @return {Object} member's info or null
     */
    prototype.get = function(id) {
        if (Object.prototype.hasOwnProperty.call(this.members, id)) {
            return {
                id: id,
                info: this.members[id]
            };
        } else {
            return null;
        }
    };

    /** Calls back for each member in unspecified order.
     *
     * @param  {Function} callback
     */
    prototype.each = function(callback) {
        var self = this;
        Pusher.Util.objectApply(self.members, function(member, id) {
            callback(self.get(id));
        });
    };

    /** Updates the id for connected member. For internal use only. */
    prototype.setMyID = function(id) {
        this.myID = id;
    };

    /** Handles subscription data. For internal use only. */
    prototype.onSubscription = function(subscriptionData) {
        this.members = subscriptionData.presence.hash;
        this.count = subscriptionData.presence.count;
        this.me = this.get(this.myID);
    };

    /** Adds a new member to the collection. For internal use only. */
    prototype.addMember = function(memberData) {
        if (this.get(memberData.user_id) === null) {
            this.count++;
        }
        this.members[memberData.user_id] = memberData.user_info;
        return this.get(memberData.user_id);
    };

    /** Adds a member from the collection. For internal use only. */
    prototype.removeMember = function(memberData) {
        var member = this.get(memberData.user_id);
        if (member) {
            delete this.members[memberData.user_id];
            this.count--;
        }
        return member;
    };

    /** Resets the collection to the initial state. For internal use only. */
    prototype.reset = function() {
        this.members = {};
        this.count = 0;
        this.myID = null;
        this.me = null;
    };

    Pusher.Members = Members;
}).call(this);

;(function() {
    /** Provides base public channel interface with an event emitter.
     *
     * Emits:
     * - pusher:subscription_succeeded - after subscribing successfully
     * - other non-internal events
     *
     * @param {String} name
     * @param {Pusher} pusher
     */
    function Channel(name, pusher) {
        Pusher.EventsDispatcher.call(this, function(event, data) {
            Pusher.debug('No callbacks on ' + name + ' for ' + event);
        });

        this.name = name;
        this.pusher = pusher;
        this.subscribed = false;
    }
    var prototype = Channel.prototype;
    Pusher.Util.extend(prototype, Pusher.EventsDispatcher.prototype);

    /** Skips authorization, since public channels don't require it.
     *
     * @param {Function} callback
     */
    prototype.authorize = function(socketId, callback) {
        return callback(false, {});
    };

    /** Triggers an event */
    prototype.trigger = function(event, data) {
        if (event.indexOf("client-") !== 0) {
            throw new Pusher.Errors.BadEventName(
                "Event '" + event + "' does not start with 'client-'"
            );
        }
        return this.pusher.send_event(event, data, this.name);
    };

    /** Signals disconnection to the channel. For internal use only. */
    prototype.disconnect = function() {
        this.subscribed = false;
    };

    /** Handles an event. For internal use only.
     *
     * @param {String} event
     * @param {*} data
     */
    prototype.handleEvent = function(event, data) {
        if (event.indexOf("pusher_internal:") === 0) {
            if (event === "pusher_internal:subscription_succeeded") {
                this.subscribed = true;
                this.emit("pusher:subscription_succeeded", data);
            }
        } else {
            this.emit(event, data);
        }
    };

    /** Sends a subscription request. For internal use only. */
    prototype.subscribe = function() {
        var self = this;

        self.authorize(self.pusher.connection.socket_id, function(error, data) {
            if (error) {
                self.handleEvent('pusher:subscription_error', data);
            } else {
                self.pusher.send_event('pusher:subscribe', {
                    auth: data.auth,
                    channel_data: data.channel_data,
                    channel: self.name
                });
            }
        });
    };

    /** Sends an unsubscription request. For internal use only. */
    prototype.unsubscribe = function() {
        this.pusher.send_event('pusher:unsubscribe', {
            channel: this.name
        });
    };

    Pusher.Channel = Channel;
}).call(this);

;(function() {
    /** Extends public channels to provide private channel interface.
     *
     * @param {String} name
     * @param {Pusher} pusher
     */
    function PrivateChannel(name, pusher) {
        Pusher.Channel.call(this, name, pusher);
    }
    var prototype = PrivateChannel.prototype;
    Pusher.Util.extend(prototype, Pusher.Channel.prototype);

    /** Authorizes the connection to use the channel.
     *
     * @param  {String} socketId
     * @param  {Function} callback
     */
    prototype.authorize = function(socketId, callback) {
        var authorizer = new Pusher.Channel.Authorizer(this, this.pusher.config);
        return authorizer.authorize(socketId, callback);
    };

    Pusher.PrivateChannel = PrivateChannel;
}).call(this);

;(function() {
    /** Adds presence channel functionality to private channels.
     *
     * @param {String} name
     * @param {Pusher} pusher
     */
    function PresenceChannel(name, pusher) {
        Pusher.PrivateChannel.call(this, name, pusher);
        this.members = new Pusher.Members();
    }
    var prototype = PresenceChannel.prototype;
    Pusher.Util.extend(prototype, Pusher.PrivateChannel.prototype);

    /** Authenticates the connection as a member of the channel.
     *
     * @param  {String} socketId
     * @param  {Function} callback
     */
    prototype.authorize = function(socketId, callback) {
        var _super = Pusher.PrivateChannel.prototype.authorize;
        var self = this;
        _super.call(self, socketId, function(error, authData) {
            if (!error) {
                if (authData.channel_data === undefined) {
                    Pusher.warn(
                        "Invalid auth response for channel '" +
                        self.name +
                        "', expected 'channel_data' field"
                    );
                    callback("Invalid auth response");
                    return;
                }
                var channelData = JSON.parse(authData.channel_data);
                self.members.setMyID(channelData.user_id);
            }
            callback(error, authData);
        });
    };

    /** Handles presence and subscription events. For internal use only.
     *
     * @param {String} event
     * @param {*} data
     */
    prototype.handleEvent = function(event, data) {
        switch (event) {
            case "pusher_internal:subscription_succeeded":
                this.members.onSubscription(data);
                this.subscribed = true;
                this.emit("pusher:subscription_succeeded", this.members);
                break;
            case "pusher_internal:member_added":
                var addedMember = this.members.addMember(data);
                this.emit('pusher:member_added', addedMember);
                break;
            case "pusher_internal:member_removed":
                var removedMember = this.members.removeMember(data);
                if (removedMember) {
                    this.emit('pusher:member_removed', removedMember);
                }
                break;
            default:
                Pusher.PrivateChannel.prototype.handleEvent.call(this, event, data);
        }
    };

    /** Resets the channel state, including members map. For internal use only. */
    prototype.disconnect = function() {
        this.members.reset();
        Pusher.PrivateChannel.prototype.disconnect.call(this);
    };

    Pusher.PresenceChannel = PresenceChannel;
}).call(this);

;(function() {
    /** Handles a channel map. */
    function Channels() {
        this.channels = {};
    }
    var prototype = Channels.prototype;

    /** Creates or retrieves an existing channel by its name.
     *
     * @param {String} name
     * @param {Pusher} pusher
     * @return {Channel}
     */
    prototype.add = function(name, pusher) {
        if (!this.channels[name]) {
            this.channels[name] = createChannel(name, pusher);
        }
        return this.channels[name];
    };

    /** Returns a list of all channels
     *
     * @return {Array}
     */
    prototype.all = function(name) {
        return Pusher.Util.values(this.channels);
    };

    /** Finds a channel by its name.
     *
     * @param {String} name
     * @return {Channel} channel or null if it doesn't exist
     */
    prototype.find = function(name) {
        return this.channels[name];
    };

    /** Removes a channel from the map.
     *
     * @param {String} name
     */
    prototype.remove = function(name) {
        var channel = this.channels[name];
        delete this.channels[name];
        return channel;
    };

    /** Proxies disconnection signal to all channels. */
    prototype.disconnect = function() {
        Pusher.Util.objectApply(this.channels, function(channel) {
            channel.disconnect();
        });
    };

    function createChannel(name, pusher) {
        if (name.indexOf('private-') === 0) {
            return new Pusher.PrivateChannel(name, pusher);
        } else if (name.indexOf('presence-') === 0) {
            return new Pusher.PresenceChannel(name, pusher);
        } else {
            return new Pusher.Channel(name, pusher);
        }
    }

    Pusher.Channels = Channels;
}).call(this);

;(function() {
    Pusher.Channel.Authorizer = function(channel, options) {
        this.channel = channel;
        this.type = options.authTransport;

        this.options = options;
        this.authOptions = (options || {}).auth || {};
    };

    Pusher.Channel.Authorizer.prototype = {
        composeQuery: function(socketId) {
            var query = '&socket_id=' + encodeURIComponent(socketId) +
                '&channel_name=' + encodeURIComponent(this.channel.name);

            for(var i in this.authOptions.params) {
                query += "&" + encodeURIComponent(i) + "=" + encodeURIComponent(this.authOptions.params[i]);
            }

            return query;
        },

        authorize: function(socketId, callback) {
            return Pusher.authorizers[this.type].call(this, socketId, callback);
        }
    };

    var nextAuthCallbackID = 1;

    Pusher.auth_callbacks = {};
    Pusher.authorizers = {
        ajax: function(socketId, callback){
            var self = this, xhr;

            if (Pusher.XHR) {
                xhr = new Pusher.XHR();
            } else {
                xhr = (window.XMLHttpRequest ? new window.XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP"));
            }

            xhr.open("POST", self.options.authEndpoint, true);

            // add request headers
            xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
            for(var headerName in this.authOptions.headers) {
                xhr.setRequestHeader(headerName, this.authOptions.headers[headerName]);
            }

            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        var data, parsed = false;

                        try {
                            data = JSON.parse(xhr.responseText);
                            parsed = true;
                        } catch (e) {
                            callback(true, 'JSON returned from webapp was invalid, yet status code was 200. Data was: ' + xhr.responseText);
                        }

                        if (parsed) { // prevents double execution.
                            callback(false, data);
                        }
                    } else {
                        Pusher.warn("Couldn't get auth info from your webapp", xhr.status);
                        callback(true, xhr.status);
                    }
                }
            };

            xhr.send(this.composeQuery(socketId));
            return xhr;
        },

        jsonp: function(socketId, callback){
            if(this.authOptions.headers !== undefined) {
                Pusher.warn("Warn", "To send headers with the auth request, you must use AJAX, rather than JSONP.");
            }

            var callbackName = nextAuthCallbackID.toString();
            nextAuthCallbackID++;

            var document = Pusher.Util.getDocument();
            var script = document.createElement("script");
            // Hacked wrapper.
            Pusher.auth_callbacks[callbackName] = function(data) {
                callback(false, data);
            };

            var callback_name = "Pusher.auth_callbacks['" + callbackName + "']";
            script.src = this.options.authEndpoint +
                '?callback=' +
                encodeURIComponent(callback_name) +
                this.composeQuery(socketId);

            var head = document.getElementsByTagName("head")[0] || document.documentElement;
            head.insertBefore( script, head.firstChild );
        }
    };
}).call(this);
// PUSHER*********************************

// SIMPLEPEER*****************************
!function (e) {
    if ("object" == typeof exports && "undefined" != typeof module)module.exports = e(); else if ("function" == typeof define && define.amd)define([], e); else {
        var t;
        "undefined" != typeof window ? t = window : "undefined" != typeof global ? t = global : "undefined" != typeof self && (t = self), t.SimplePeer = e()
    }
}(function () {
    return function e(t, n, r) {
        function i(s, a) {
            if (!n[s]) {
                if (!t[s]) {
                    var u = "function" == typeof require && require;
                    if (!a && u)return u(s, !0);
                    if (o)return o(s, !0);
                    var c = new Error("Cannot find module '" + s + "'");
                    throw c.code = "MODULE_NOT_FOUND", c
                }
                var h = n[s] = {exports: {}};
                t[s][0].call(h.exports, function (e) {
                    var n = t[s][1][e];
                    return i(n ? n : e)
                }, h, h.exports, e, t, n, r)
            }
            return n[s].exports
        }

        for (var o = "function" == typeof require && require, s = 0; s < r.length; s++)i(r[s]);
        return i
    }({
        "./": [function (e, t) {
            function n(e) {
                return this instanceof n ? (o.call(this), e = s({
                    initiator: !1,
                    stream: !1,
                    config: n.config,
                    constraints: n.constraints,
                    channelName: e && e.initiator ? "simple-peer-" + a(160) : null,
                    trickle: !0
                }, e), s(this, e), i("new peer initiator: %s channelName: %s", this.initiator, this.channelName), this.destroyed = !1, this.ready = !1, this._pcReady = !1, this._channelReady = !1, this._dataStreams = [], this._iceComplete = !1, this._pc = new d(this.config, this.constraints), this._pc.oniceconnectionstatechange = this._onIceConnectionStateChange.bind(this), this._pc.onsignalingstatechange = this._onSignalingStateChange.bind(this), this._pc.onicecandidate = this._onIceCandidate.bind(this), this._channel = null, this.stream && this._setupVideo(this.stream), void(this.initiator ? (this._setupData({channel: this._pc.createDataChannel(this.channelName)}), this._pc.onnegotiationneeded = h(function () {
                    this._pc.createOffer(function (e) {
                        this._pc.setLocalDescription(e);
                        var t = function () {
                            this.emit("signal", this._pc.localDescription || e)
                        }.bind(this);
                        this.trickle || this._iceComplete ? t() : this.once("_iceComplete", t)
                    }.bind(this), this._onError.bind(this))
                }.bind(this)), window.mozRTCPeerConnection && setTimeout(this._pc.onnegotiationneeded.bind(this._pc), 0)) : this._pc.ondatachannel = this._setupData.bind(this))) : new n(e)
            }

            function r(e) {
                f.Duplex.call(this, e), this._peer = e._peer, i("new stream")
            }

            t.exports = n;
            var i = e("debug")("simple-peer"), o = e("events").EventEmitter, s = e("extend.js"), a = e("hat"), u = e("inherits"), c = e("is-typedarray"), h = e("once"), f = e("stream"), l = e("typedarray-to-buffer"), d = "undefined" != typeof window && (window.mozRTCPeerConnection || window.RTCPeerConnection || window.webkitRTCPeerConnection), p = "undefined" != typeof window && (window.mozRTCSessionDescription || window.RTCSessionDescription || window.webkitRTCSessionDescription), g = "undefined" != typeof window && (window.mozRTCIceCandidate || window.RTCIceCandidate || window.webkitRTCIceCandidate);
            u(n, o), n.config = {iceServers: [{url: "stun:23.21.150.121"}]}, n.constraints = {}, n.prototype.send = function (e, t) {
                return this._channelReady ? (i("send %s", e), this._channel.send(c.strict(e) || e instanceof ArrayBuffer || e instanceof Blob || "string" == typeof e ? e : JSON.stringify(e)), void(t && t(null))) : this.once("ready", this.send.bind(this, e, t))
            }, n.prototype.signal = function (e) {
                if (!this.destroyed) {
                    if ("string" == typeof e)try {
                        e = JSON.parse(e)
                    } catch (t) {
                        e = {}
                    }
                    if (i("signal %s", JSON.stringify(e)), e.sdp && this._pc.setRemoteDescription(new p(e), function () {
                            var e = "offer" === this._pc.remoteDescription.type;
                            e && this._pc.createAnswer(function (e) {
                                this._pc.setLocalDescription(e);
                                var t = function () {
                                    this.emit("signal", this._pc.localDescription || e)
                                }.bind(this);
                                this.trickle || this._iceComplete ? t() : this.once("_iceComplete", t)
                            }.bind(this), this._onError.bind(this))
                        }.bind(this), this._onError.bind(this)), e.candidate)try {
                        this._pc.addIceCandidate(new g(e.candidate))
                    } catch (t) {
                        this.destroy(new Error("error adding candidate, " + t.message))
                    }
                    e.sdp || e.candidate || this.destroy(new Error("signal() called with invalid signal data"))
                }
            }, n.prototype.destroy = function (e, t) {
                if (!this.destroyed) {
                    if (i("destroy (error: %s)", e && e.message), this.destroyed = !0, this.ready = !1, "function" == typeof e && (t = e, e = null), t && this.once("close", t), this._pc) {
                        try {
                            this._pc.close()
                        } catch (e) {
                        }
                        this._pc.oniceconnectionstatechange = null, this._pc.onsignalingstatechange = null, this._pc.onicecandidate = null
                    }
                    if (this._channel) {
                        try {
                            this._channel.close()
                        } catch (e) {
                        }
                        this._channel.onmessage = null, this._channel.onopen = null, this._channel.onclose = null
                    }
                    this._pc = null, this._channel = null, this._dataStreams.forEach(function (t) {
                        e && t.emit("error", e), t._readableState.ended || t.push(null), t._writableState.finished || t.end()
                    }), this._dataStreams = [], e && this.emit("error", e), this.emit("close")
                }
            }, n.prototype.getDataStream = function (e) {
                if (this.destroyed)throw new Error("peer is destroyed");
                var t = new r(s({_peer: this}, e));
                return this._dataStreams.push(t), t
            }, n.prototype._setupData = function (e) {
                this._channel = e.channel, this.channelName = this._channel.label, this._channel.binaryType = "arraybuffer", this._channel.onmessage = this._onChannelMessage.bind(this), this._channel.onopen = this._onChannelOpen.bind(this), this._channel.onclose = this._onChannelClose.bind(this)
            }, n.prototype._setupVideo = function (e) {
                this._pc.addStream(e), this._pc.onaddstream = this._onAddStream.bind(this)
            }, n.prototype._onIceConnectionStateChange = function () {
                var e = this._pc.iceGatheringState, t = this._pc.iceConnectionState;
                this.emit("iceConnectionStateChange", e, t), i("iceConnectionStateChange %s %s", e, t), ("connected" === t || "completed" === t) && (this._pcReady = !0, this._maybeReady()), ("disconnected" === t || "closed" === t) && this.destroy()
            }, n.prototype._maybeReady = function () {
                i("maybeReady pc %s channel %s", this._pcReady, this._channelReady), !this.ready && this._pcReady && this._channelReady && (i("ready"), this.ready = !0, this.emit("ready"))
            }, n.prototype._onSignalingStateChange = function () {
                this.emit("signalingStateChange", this._pc.signalingState), i("signalingStateChange %s", this._pc.signalingState)
            }, n.prototype._onIceCandidate = function (e) {
                e.candidate && this.trickle ? this.emit("signal", {candidate: e.candidate}) : e.candidate || (this._iceComplete = !0, this.emit("_iceComplete"))
            }, n.prototype._onChannelMessage = function (e) {
                if (!this.destroyed) {
                    var t = e.data;
                    if (i("receive %s", t), t instanceof ArrayBuffer)t = l(new Uint8Array(t)), this.emit("message", t); else try {
                        this.emit("message", JSON.parse(t))
                    } catch (n) {
                        this.emit("message", t)
                    }
                    this._dataStreams.forEach(function (e) {
                        e.push(t)
                    })
                }
            }, n.prototype._onChannelOpen = function () {
                this._channelReady = !0, this._maybeReady()
            }, n.prototype._onChannelClose = function () {
                this._channelReady = !1, this.destroy()
            }, n.prototype._onAddStream = function (e) {
                this.emit("stream", e.stream)
            }, n.prototype._onError = function (e) {
                i("error %s", e.message), this.destroy(e)
            }, u(r, f.Duplex), r.prototype.destroy = function () {
                this._peer.destroy()
            }, r.prototype._read = function () {
            }, r.prototype._write = function (e, t, n) {
                this._peer.send(e, n)
            }
        }, {
            debug: 20,
            events: 4,
            "extend.js": 23,
            hat: 24,
            inherits: 25,
            "is-typedarray": 26,
            once: 27,
            stream: 19,
            "typedarray-to-buffer": 28
        }],
        1: [function (e, t, n) {
            function r(e, t, n) {
                if (!(this instanceof r))return new r(e, t, n);
                var i, o = typeof e;
                if ("number" === o)i = e > 0 ? e >>> 0 : 0; else if ("string" === o)"base64" === t && (e = A(e)), i = r.byteLength(e, t); else {
                    if ("object" !== o || null === e)throw new Error("First argument needs to be a number, array or string.");
                    "Buffer" === e.type && B(e.data) && (e = e.data), i = +e.length > 0 ? Math.floor(+e.length) : 0
                }
                var s;
                H ? s = r._augment(new Uint8Array(i)) : (s = this, s.length = i, s._isBuffer = !0);
                var a;
                if (H && "number" == typeof e.byteLength)s._set(e); else if (x(e))if (r.isBuffer(e))for (a = 0; i > a; a++)s[a] = e.readUInt8(a); else for (a = 0; i > a; a++)s[a] = (e[a] % 256 + 256) % 256; else if ("string" === o)s.write(e, 0, t); else if ("number" === o && !H && !n)for (a = 0; i > a; a++)s[a] = 0;
                return s
            }

            function i(e, t, n, r) {
                n = Number(n) || 0;
                var i = e.length - n;
                r ? (r = Number(r), r > i && (r = i)) : r = i;
                var o = t.length;
                z(o % 2 === 0, "Invalid hex string"), r > o / 2 && (r = o / 2);
                for (var s = 0; r > s; s++) {
                    var a = parseInt(t.substr(2 * s, 2), 16);
                    z(!isNaN(a), "Invalid hex string"), e[n + s] = a
                }
                return s
            }

            function o(e, t, n, r) {
                var i = N(R(t), e, n, r);
                return i
            }

            function s(e, t, n, r) {
                var i = N(T(t), e, n, r);
                return i
            }

            function a(e, t, n, r) {
                return s(e, t, n, r)
            }

            function u(e, t, n, r) {
                var i = N(D(t), e, n, r);
                return i
            }

            function c(e, t, n, r) {
                var i = N(U(t), e, n, r);
                return i
            }

            function h(e, t, n) {
                return J.fromByteArray(0 === t && n === e.length ? e : e.slice(t, n))
            }

            function f(e, t, n) {
                var r = "", i = "";
                n = Math.min(e.length, n);
                for (var o = t; n > o; o++)e[o] <= 127 ? (r += O(i) + String.fromCharCode(e[o]), i = "") : i += "%" + e[o].toString(16);
                return r + O(i)
            }

            function l(e, t, n) {
                var r = "";
                n = Math.min(e.length, n);
                for (var i = t; n > i; i++)r += String.fromCharCode(e[i]);
                return r
            }

            function d(e, t, n) {
                return l(e, t, n)
            }

            function p(e, t, n) {
                var r = e.length;
                (!t || 0 > t) && (t = 0), (!n || 0 > n || n > r) && (n = r);
                for (var i = "", o = t; n > o; o++)i += j(e[o]);
                return i
            }

            function g(e, t, n) {
                for (var r = e.slice(t, n), i = "", o = 0; o < r.length; o += 2)i += String.fromCharCode(r[o] + 256 * r[o + 1]);
                return i
            }

            function m(e, t, n, r) {
                r || (z("boolean" == typeof n, "missing or invalid endian"), z(void 0 !== t && null !== t, "missing offset"), z(t + 1 < e.length, "Trying to read beyond buffer length"));
                var i = e.length;
                if (!(t >= i)) {
                    var o;
                    return n ? (o = e[t], i > t + 1 && (o |= e[t + 1] << 8)) : (o = e[t] << 8, i > t + 1 && (o |= e[t + 1])), o
                }
            }

            function v(e, t, n, r) {
                r || (z("boolean" == typeof n, "missing or invalid endian"), z(void 0 !== t && null !== t, "missing offset"), z(t + 3 < e.length, "Trying to read beyond buffer length"));
                var i = e.length;
                if (!(t >= i)) {
                    var o;
                    return n ? (i > t + 2 && (o = e[t + 2] << 16), i > t + 1 && (o |= e[t + 1] << 8), o |= e[t], i > t + 3 && (o += e[t + 3] << 24 >>> 0)) : (i > t + 1 && (o = e[t + 1] << 16), i > t + 2 && (o |= e[t + 2] << 8), i > t + 3 && (o |= e[t + 3]), o += e[t] << 24 >>> 0), o
                }
            }

            function b(e, t, n, r) {
                r || (z("boolean" == typeof n, "missing or invalid endian"), z(void 0 !== t && null !== t, "missing offset"), z(t + 1 < e.length, "Trying to read beyond buffer length"));
                var i = e.length;
                if (!(t >= i)) {
                    var o = m(e, t, n, !0), s = 32768 & o;
                    return s ? -1 * (65535 - o + 1) : o
                }
            }

            function y(e, t, n, r) {
                r || (z("boolean" == typeof n, "missing or invalid endian"), z(void 0 !== t && null !== t, "missing offset"), z(t + 3 < e.length, "Trying to read beyond buffer length"));
                var i = e.length;
                if (!(t >= i)) {
                    var o = v(e, t, n, !0), s = 2147483648 & o;
                    return s ? -1 * (4294967295 - o + 1) : o
                }
            }

            function w(e, t, n, r) {
                return r || (z("boolean" == typeof n, "missing or invalid endian"), z(t + 3 < e.length, "Trying to read beyond buffer length")), q.read(e, t, n, 23, 4)
            }

            function _(e, t, n, r) {
                return r || (z("boolean" == typeof n, "missing or invalid endian"), z(t + 7 < e.length, "Trying to read beyond buffer length")), q.read(e, t, n, 52, 8)
            }

            function E(e, t, n, r, i) {
                i || (z(void 0 !== t && null !== t, "missing value"), z("boolean" == typeof r, "missing or invalid endian"), z(void 0 !== n && null !== n, "missing offset"), z(n + 1 < e.length, "trying to write beyond buffer length"), F(t, 65535));
                var o = e.length;
                if (!(n >= o)) {
                    for (var s = 0, a = Math.min(o - n, 2); a > s; s++)e[n + s] = (t & 255 << 8 * (r ? s : 1 - s)) >>> 8 * (r ? s : 1 - s);
                    return n + 2
                }
            }

            function S(e, t, n, r, i) {
                i || (z(void 0 !== t && null !== t, "missing value"), z("boolean" == typeof r, "missing or invalid endian"), z(void 0 !== n && null !== n, "missing offset"), z(n + 3 < e.length, "trying to write beyond buffer length"), F(t, 4294967295));
                var o = e.length;
                if (!(n >= o)) {
                    for (var s = 0, a = Math.min(o - n, 4); a > s; s++)e[n + s] = t >>> 8 * (r ? s : 3 - s) & 255;
                    return n + 4
                }
            }

            function L(e, t, n, r, i) {
                i || (z(void 0 !== t && null !== t, "missing value"), z("boolean" == typeof r, "missing or invalid endian"), z(void 0 !== n && null !== n, "missing offset"), z(n + 1 < e.length, "Trying to write beyond buffer length"), W(t, 32767, -32768));
                var o = e.length;
                if (!(n >= o))return t >= 0 ? E(e, t, n, r, i) : E(e, 65535 + t + 1, n, r, i), n + 2
            }

            function C(e, t, n, r, i) {
                i || (z(void 0 !== t && null !== t, "missing value"), z("boolean" == typeof r, "missing or invalid endian"), z(void 0 !== n && null !== n, "missing offset"), z(n + 3 < e.length, "Trying to write beyond buffer length"), W(t, 2147483647, -2147483648));
                var o = e.length;
                if (!(n >= o))return t >= 0 ? S(e, t, n, r, i) : S(e, 4294967295 + t + 1, n, r, i), n + 4
            }

            function k(e, t, n, r, i) {
                i || (z(void 0 !== t && null !== t, "missing value"), z("boolean" == typeof r, "missing or invalid endian"), z(void 0 !== n && null !== n, "missing offset"), z(n + 3 < e.length, "Trying to write beyond buffer length"), P(t, 3.4028234663852886e38, -3.4028234663852886e38));
                var o = e.length;
                if (!(n >= o))return q.write(e, t, n, r, 23, 4), n + 4
            }

            function I(e, t, n, r, i) {
                i || (z(void 0 !== t && null !== t, "missing value"), z("boolean" == typeof r, "missing or invalid endian"), z(void 0 !== n && null !== n, "missing offset"), z(n + 7 < e.length, "Trying to write beyond buffer length"), P(t, 1.7976931348623157e308, -1.7976931348623157e308));
                var o = e.length;
                if (!(n >= o))return q.write(e, t, n, r, 52, 8), n + 8
            }

            function A(e) {
                for (e = M(e).replace(V, ""); e.length % 4 !== 0;)e += "=";
                return e
            }

            function M(e) {
                return e.trim ? e.trim() : e.replace(/^\s+|\s+$/g, "")
            }

            function B(e) {
                return (Array.isArray || function (e) {
                    return "[object Array]" === Object.prototype.toString.call(e)
                })(e)
            }

            function x(e) {
                return B(e) || r.isBuffer(e) || e && "object" == typeof e && "number" == typeof e.length
            }

            function j(e) {
                return 16 > e ? "0" + e.toString(16) : e.toString(16)
            }

            function R(e) {
                for (var t = [], n = 0; n < e.length; n++) {
                    var r = e.charCodeAt(n);
                    if (127 >= r)t.push(r); else {
                        var i = n;
                        r >= 55296 && 57343 >= r && n++;
                        for (var o = encodeURIComponent(e.slice(i, n + 1)).substr(1).split("%"), s = 0; s < o.length; s++)t.push(parseInt(o[s], 16))
                    }
                }
                return t
            }

            function T(e) {
                for (var t = [], n = 0; n < e.length; n++)t.push(255 & e.charCodeAt(n));
                return t
            }

            function U(e) {
                for (var t, n, r, i = [], o = 0; o < e.length; o++)t = e.charCodeAt(o), n = t >> 8, r = t % 256, i.push(r), i.push(n);
                return i
            }

            function D(e) {
                return J.toByteArray(e)
            }

            function N(e, t, n, r) {
                for (var i = 0; r > i && !(i + n >= t.length || i >= e.length); i++)t[i + n] = e[i];
                return i
            }

            function O(e) {
                try {
                    return decodeURIComponent(e)
                } catch (t) {
                    return String.fromCharCode(65533)
                }
            }

            function F(e, t) {
                z("number" == typeof e, "cannot write a non-number as a number"), z(e >= 0, "specified a negative value for writing an unsigned value"), z(t >= e, "value is larger than maximum value for type"), z(Math.floor(e) === e, "value has a fractional component")
            }

            function W(e, t, n) {
                z("number" == typeof e, "cannot write a non-number as a number"), z(t >= e, "value larger than maximum allowed value"), z(e >= n, "value smaller than minimum allowed value"), z(Math.floor(e) === e, "value has a fractional component")
            }

            function P(e, t, n) {
                z("number" == typeof e, "cannot write a non-number as a number"), z(t >= e, "value larger than maximum allowed value"), z(e >= n, "value smaller than minimum allowed value")
            }

            function z(e, t) {
                if (!e)throw new Error(t || "Failed assertion")
            }

            var J = e("base64-js"), q = e("ieee754");
            n.Buffer = r, n.SlowBuffer = r, n.INSPECT_MAX_BYTES = 50, r.poolSize = 8192;
            var H = function () {
                try {
                    var e = new ArrayBuffer(0), t = new Uint8Array(e);
                    return t.foo = function () {
                        return 42
                    }, 42 === t.foo() && "function" == typeof t.subarray && 0 === new Uint8Array(1).subarray(1, 1).byteLength
                } catch (n) {
                    return !1
                }
            }();
            r.isEncoding = function (e) {
                switch (String(e).toLowerCase()) {
                    case"hex":
                    case"utf8":
                    case"utf-8":
                    case"ascii":
                    case"binary":
                    case"base64":
                    case"raw":
                    case"ucs2":
                    case"ucs-2":
                    case"utf16le":
                    case"utf-16le":
                        return !0;
                    default:
                        return !1
                }
            }, r.isBuffer = function (e) {
                return !(null == e || !e._isBuffer)
            }, r.byteLength = function (e, t) {
                var n;
                switch (e = e.toString(), t || "utf8") {
                    case"hex":
                        n = e.length / 2;
                        break;
                    case"utf8":
                    case"utf-8":
                        n = R(e).length;
                        break;
                    case"ascii":
                    case"binary":
                    case"raw":
                        n = e.length;
                        break;
                    case"base64":
                        n = D(e).length;
                        break;
                    case"ucs2":
                    case"ucs-2":
                    case"utf16le":
                    case"utf-16le":
                        n = 2 * e.length;
                        break;
                    default:
                        throw new Error("Unknown encoding")
                }
                return n
            }, r.concat = function (e, t) {
                if (z(B(e), "Usage: Buffer.concat(list[, length])"), 0 === e.length)return new r(0);
                if (1 === e.length)return e[0];
                var n;
                if (void 0 === t)for (t = 0, n = 0; n < e.length; n++)t += e[n].length;
                var i = new r(t), o = 0;
                for (n = 0; n < e.length; n++) {
                    var s = e[n];
                    s.copy(i, o), o += s.length
                }
                return i
            }, r.compare = function (e, t) {
                z(r.isBuffer(e) && r.isBuffer(t), "Arguments must be Buffers");
                for (var n = e.length, i = t.length, o = 0, s = Math.min(n, i); s > o && e[o] === t[o]; o++);
                return o !== s && (n = e[o], i = t[o]), i > n ? -1 : n > i ? 1 : 0
            }, r.prototype.write = function (e, t, n, r) {
                if (isFinite(t))isFinite(n) || (r = n, n = void 0); else {
                    var h = r;
                    r = t, t = n, n = h
                }
                t = Number(t) || 0;
                var f = this.length - t;
                n ? (n = Number(n), n > f && (n = f)) : n = f, r = String(r || "utf8").toLowerCase();
                var l;
                switch (r) {
                    case"hex":
                        l = i(this, e, t, n);
                        break;
                    case"utf8":
                    case"utf-8":
                        l = o(this, e, t, n);
                        break;
                    case"ascii":
                        l = s(this, e, t, n);
                        break;
                    case"binary":
                        l = a(this, e, t, n);
                        break;
                    case"base64":
                        l = u(this, e, t, n);
                        break;
                    case"ucs2":
                    case"ucs-2":
                    case"utf16le":
                    case"utf-16le":
                        l = c(this, e, t, n);
                        break;
                    default:
                        throw new Error("Unknown encoding")
                }
                return l
            }, r.prototype.toString = function (e, t, n) {
                var r = this;
                if (e = String(e || "utf8").toLowerCase(), t = Number(t) || 0, n = void 0 === n ? r.length : Number(n), n === t)return "";
                var i;
                switch (e) {
                    case"hex":
                        i = p(r, t, n);
                        break;
                    case"utf8":
                    case"utf-8":
                        i = f(r, t, n);
                        break;
                    case"ascii":
                        i = l(r, t, n);
                        break;
                    case"binary":
                        i = d(r, t, n);
                        break;
                    case"base64":
                        i = h(r, t, n);
                        break;
                    case"ucs2":
                    case"ucs-2":
                    case"utf16le":
                    case"utf-16le":
                        i = g(r, t, n);
                        break;
                    default:
                        throw new Error("Unknown encoding")
                }
                return i
            }, r.prototype.toJSON = function () {
                return {type: "Buffer", data: Array.prototype.slice.call(this._arr || this, 0)}
            }, r.prototype.equals = function (e) {
                return z(r.isBuffer(e), "Argument must be a Buffer"), 0 === r.compare(this, e)
            }, r.prototype.compare = function (e) {
                return z(r.isBuffer(e), "Argument must be a Buffer"), r.compare(this, e)
            }, r.prototype.copy = function (e, t, n, r) {
                var i = this;
                if (n || (n = 0), r || 0 === r || (r = this.length), t || (t = 0), r !== n && 0 !== e.length && 0 !== i.length) {
                    z(r >= n, "sourceEnd < sourceStart"), z(t >= 0 && t < e.length, "targetStart out of bounds"), z(n >= 0 && n < i.length, "sourceStart out of bounds"), z(r >= 0 && r <= i.length, "sourceEnd out of bounds"), r > this.length && (r = this.length), e.length - t < r - n && (r = e.length - t + n);
                    var o = r - n;
                    if (100 > o || !H)for (var s = 0; o > s; s++)e[s + t] = this[s + n]; else e._set(this.subarray(n, n + o), t)
                }
            }, r.prototype.slice = function (e, t) {
                var n = this.length;
                if (e = ~~e, t = void 0 === t ? n : ~~t, 0 > e ? (e += n, 0 > e && (e = 0)) : e > n && (e = n), 0 > t ? (t += n, 0 > t && (t = 0)) : t > n && (t = n), e > t && (t = e), H)return r._augment(this.subarray(e, t));
                for (var i = t - e, o = new r(i, void 0, !0), s = 0; i > s; s++)o[s] = this[s + e];
                return o
            }, r.prototype.get = function (e) {
                return console.log(".get() is deprecated. Access using array indexes instead."), this.readUInt8(e)
            }, r.prototype.set = function (e, t) {
                return console.log(".set() is deprecated. Access using array indexes instead."), this.writeUInt8(e, t)
            }, r.prototype.readUInt8 = function (e, t) {
                return t || (z(void 0 !== e && null !== e, "missing offset"), z(e < this.length, "Trying to read beyond buffer length")), e >= this.length ? void 0 : this[e]
            }, r.prototype.readUInt16LE = function (e, t) {
                return m(this, e, !0, t)
            }, r.prototype.readUInt16BE = function (e, t) {
                return m(this, e, !1, t)
            }, r.prototype.readUInt32LE = function (e, t) {
                return v(this, e, !0, t)
            }, r.prototype.readUInt32BE = function (e, t) {
                return v(this, e, !1, t)
            }, r.prototype.readInt8 = function (e, t) {
                if (t || (z(void 0 !== e && null !== e, "missing offset"), z(e < this.length, "Trying to read beyond buffer length")), !(e >= this.length)) {
                    var n = 128 & this[e];
                    return n ? -1 * (255 - this[e] + 1) : this[e]
                }
            }, r.prototype.readInt16LE = function (e, t) {
                return b(this, e, !0, t)
            }, r.prototype.readInt16BE = function (e, t) {
                return b(this, e, !1, t)
            }, r.prototype.readInt32LE = function (e, t) {
                return y(this, e, !0, t)
            }, r.prototype.readInt32BE = function (e, t) {
                return y(this, e, !1, t)
            }, r.prototype.readFloatLE = function (e, t) {
                return w(this, e, !0, t)
            }, r.prototype.readFloatBE = function (e, t) {
                return w(this, e, !1, t)
            }, r.prototype.readDoubleLE = function (e, t) {
                return _(this, e, !0, t)
            }, r.prototype.readDoubleBE = function (e, t) {
                return _(this, e, !1, t)
            }, r.prototype.writeUInt8 = function (e, t, n) {
                return n || (z(void 0 !== e && null !== e, "missing value"), z(void 0 !== t && null !== t, "missing offset"), z(t < this.length, "trying to write beyond buffer length"), F(e, 255)), t >= this.length ? void 0 : (this[t] = e, t + 1)
            }, r.prototype.writeUInt16LE = function (e, t, n) {
                return E(this, e, t, !0, n)
            }, r.prototype.writeUInt16BE = function (e, t, n) {
                return E(this, e, t, !1, n)
            }, r.prototype.writeUInt32LE = function (e, t, n) {
                return S(this, e, t, !0, n)
            }, r.prototype.writeUInt32BE = function (e, t, n) {
                return S(this, e, t, !1, n)
            }, r.prototype.writeInt8 = function (e, t, n) {
                return n || (z(void 0 !== e && null !== e, "missing value"), z(void 0 !== t && null !== t, "missing offset"), z(t < this.length, "Trying to write beyond buffer length"), W(e, 127, -128)), t >= this.length ? void 0 : (e >= 0 ? this.writeUInt8(e, t, n) : this.writeUInt8(255 + e + 1, t, n), t + 1)
            }, r.prototype.writeInt16LE = function (e, t, n) {
                return L(this, e, t, !0, n)
            }, r.prototype.writeInt16BE = function (e, t, n) {
                return L(this, e, t, !1, n)
            }, r.prototype.writeInt32LE = function (e, t, n) {
                return C(this, e, t, !0, n)
            }, r.prototype.writeInt32BE = function (e, t, n) {
                return C(this, e, t, !1, n)
            }, r.prototype.writeFloatLE = function (e, t, n) {
                return k(this, e, t, !0, n)
            }, r.prototype.writeFloatBE = function (e, t, n) {
                return k(this, e, t, !1, n)
            }, r.prototype.writeDoubleLE = function (e, t, n) {
                return I(this, e, t, !0, n)
            }, r.prototype.writeDoubleBE = function (e, t, n) {
                return I(this, e, t, !1, n)
            }, r.prototype.fill = function (e, t, n) {
                if (e || (e = 0), t || (t = 0), n || (n = this.length), z(n >= t, "end < start"), n !== t && 0 !== this.length) {
                    z(t >= 0 && t < this.length, "start out of bounds"), z(n >= 0 && n <= this.length, "end out of bounds");
                    var r;
                    if ("number" == typeof e)for (r = t; n > r; r++)this[r] = e; else {
                        var i = R(e.toString()), o = i.length;
                        for (r = t; n > r; r++)this[r] = i[r % o]
                    }
                    return this
                }
            }, r.prototype.inspect = function () {
                for (var e = [], t = this.length, r = 0; t > r; r++)if (e[r] = j(this[r]), r === n.INSPECT_MAX_BYTES) {
                    e[r + 1] = "...";
                    break
                }
                return "<Buffer " + e.join(" ") + ">"
            }, r.prototype.toArrayBuffer = function () {
                if ("undefined" != typeof Uint8Array) {
                    if (H)return new r(this).buffer;
                    for (var e = new Uint8Array(this.length), t = 0, n = e.length; n > t; t += 1)e[t] = this[t];
                    return e.buffer
                }
                throw new Error("Buffer.toArrayBuffer not supported in this browser")
            };
            var $ = r.prototype;
            r._augment = function (e) {
                return e._isBuffer = !0, e._get = e.get, e._set = e.set, e.get = $.get, e.set = $.set, e.write = $.write, e.toString = $.toString, e.toLocaleString = $.toString, e.toJSON = $.toJSON, e.equals = $.equals, e.compare = $.compare, e.copy = $.copy, e.slice = $.slice, e.readUInt8 = $.readUInt8, e.readUInt16LE = $.readUInt16LE, e.readUInt16BE = $.readUInt16BE, e.readUInt32LE = $.readUInt32LE, e.readUInt32BE = $.readUInt32BE, e.readInt8 = $.readInt8, e.readInt16LE = $.readInt16LE, e.readInt16BE = $.readInt16BE, e.readInt32LE = $.readInt32LE, e.readInt32BE = $.readInt32BE, e.readFloatLE = $.readFloatLE, e.readFloatBE = $.readFloatBE, e.readDoubleLE = $.readDoubleLE, e.readDoubleBE = $.readDoubleBE, e.writeUInt8 = $.writeUInt8, e.writeUInt16LE = $.writeUInt16LE, e.writeUInt16BE = $.writeUInt16BE, e.writeUInt32LE = $.writeUInt32LE, e.writeUInt32BE = $.writeUInt32BE, e.writeInt8 = $.writeInt8, e.writeInt16LE = $.writeInt16LE, e.writeInt16BE = $.writeInt16BE, e.writeInt32LE = $.writeInt32LE, e.writeInt32BE = $.writeInt32BE, e.writeFloatLE = $.writeFloatLE, e.writeFloatBE = $.writeFloatBE, e.writeDoubleLE = $.writeDoubleLE, e.writeDoubleBE = $.writeDoubleBE, e.fill = $.fill, e.inspect = $.inspect, e.toArrayBuffer = $.toArrayBuffer, e
            };
            var V = /[^+\/0-9A-z]/g
        }, {"base64-js": 2, ieee754: 3}],
        2: [function (e, t, n) {
            var r = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
            !function (e) {
                "use strict";
                function t(e) {
                    var t = e.charCodeAt(0);
                    return t === s ? 62 : t === a ? 63 : u > t ? -1 : u + 10 > t ? t - u + 26 + 26 : h + 26 > t ? t - h : c + 26 > t ? t - c + 26 : void 0
                }

                function n(e) {
                    function n(e) {
                        c[f++] = e
                    }

                    var r, i, s, a, u, c;
                    if (e.length % 4 > 0)throw new Error("Invalid string. Length must be a multiple of 4");
                    var h = e.length;
                    u = "=" === e.charAt(h - 2) ? 2 : "=" === e.charAt(h - 1) ? 1 : 0, c = new o(3 * e.length / 4 - u), s = u > 0 ? e.length - 4 : e.length;
                    var f = 0;
                    for (r = 0, i = 0; s > r; r += 4, i += 3)a = t(e.charAt(r)) << 18 | t(e.charAt(r + 1)) << 12 | t(e.charAt(r + 2)) << 6 | t(e.charAt(r + 3)), n((16711680 & a) >> 16), n((65280 & a) >> 8), n(255 & a);
                    return 2 === u ? (a = t(e.charAt(r)) << 2 | t(e.charAt(r + 1)) >> 4, n(255 & a)) : 1 === u && (a = t(e.charAt(r)) << 10 | t(e.charAt(r + 1)) << 4 | t(e.charAt(r + 2)) >> 2, n(a >> 8 & 255), n(255 & a)), c
                }

                function i(e) {
                    function t(e) {
                        return r.charAt(e)
                    }

                    function n(e) {
                        return t(e >> 18 & 63) + t(e >> 12 & 63) + t(e >> 6 & 63) + t(63 & e)
                    }

                    var i, o, s, a = e.length % 3, u = "";
                    for (i = 0, s = e.length - a; s > i; i += 3)o = (e[i] << 16) + (e[i + 1] << 8) + e[i + 2], u += n(o);
                    switch (a) {
                        case 1:
                            o = e[e.length - 1], u += t(o >> 2), u += t(o << 4 & 63), u += "==";
                            break;
                        case 2:
                            o = (e[e.length - 2] << 8) + e[e.length - 1], u += t(o >> 10), u += t(o >> 4 & 63), u += t(o << 2 & 63), u += "="
                    }
                    return u
                }

                var o = "undefined" != typeof Uint8Array ? Uint8Array : Array, s = "+".charCodeAt(0), a = "/".charCodeAt(0), u = "0".charCodeAt(0), c = "a".charCodeAt(0), h = "A".charCodeAt(0);
                e.toByteArray = n, e.fromByteArray = i
            }("undefined" == typeof n ? this.base64js = {} : n)
        }, {}],
        3: [function (e, t, n) {
            n.read = function (e, t, n, r, i) {
                var o, s, a = 8 * i - r - 1, u = (1 << a) - 1, c = u >> 1, h = -7, f = n ? i - 1 : 0, l = n ? -1 : 1, d = e[t + f];
                for (f += l, o = d & (1 << -h) - 1, d >>= -h, h += a; h > 0; o = 256 * o + e[t + f], f += l, h -= 8);
                for (s = o & (1 << -h) - 1, o >>= -h, h += r; h > 0; s = 256 * s + e[t + f], f += l, h -= 8);
                if (0 === o)o = 1 - c; else {
                    if (o === u)return s ? 0 / 0 : 1 / 0 * (d ? -1 : 1);
                    s += Math.pow(2, r), o -= c
                }
                return (d ? -1 : 1) * s * Math.pow(2, o - r)
            }, n.write = function (e, t, n, r, i, o) {
                var s, a, u, c = 8 * o - i - 1, h = (1 << c) - 1, f = h >> 1, l = 23 === i ? Math.pow(2, -24) - Math.pow(2, -77) : 0, d = r ? 0 : o - 1, p = r ? 1 : -1, g = 0 > t || 0 === t && 0 > 1 / t ? 1 : 0;
                for (t = Math.abs(t), isNaN(t) || 1 / 0 === t ? (a = isNaN(t) ? 1 : 0, s = h) : (s = Math.floor(Math.log(t) / Math.LN2), t * (u = Math.pow(2, -s)) < 1 && (s--, u *= 2), t += s + f >= 1 ? l / u : l * Math.pow(2, 1 - f), t * u >= 2 && (s++, u /= 2), s + f >= h ? (a = 0, s = h) : s + f >= 1 ? (a = (t * u - 1) * Math.pow(2, i), s += f) : (a = t * Math.pow(2, f - 1) * Math.pow(2, i), s = 0)); i >= 8; e[n + d] = 255 & a, d += p, a /= 256, i -= 8);
                for (s = s << i | a, c += i; c > 0; e[n + d] = 255 & s, d += p, s /= 256, c -= 8);
                e[n + d - p] |= 128 * g
            }
        }, {}],
        4: [function (e, t) {
            function n() {
                this._events = this._events || {}, this._maxListeners = this._maxListeners || void 0
            }

            function r(e) {
                return "function" == typeof e
            }

            function i(e) {
                return "number" == typeof e
            }

            function o(e) {
                return "object" == typeof e && null !== e
            }

            function s(e) {
                return void 0 === e
            }

            t.exports = n, n.EventEmitter = n, n.prototype._events = void 0, n.prototype._maxListeners = void 0, n.defaultMaxListeners = 10, n.prototype.setMaxListeners = function (e) {
                if (!i(e) || 0 > e || isNaN(e))throw TypeError("n must be a positive number");
                return this._maxListeners = e, this
            }, n.prototype.emit = function (e) {
                var t, n, i, a, u, c;
                if (this._events || (this._events = {}), "error" === e && (!this._events.error || o(this._events.error) && !this._events.error.length))throw t = arguments[1], t instanceof Error ? t : TypeError('Uncaught, unspecified "error" event.');
                if (n = this._events[e], s(n))return !1;
                if (r(n))switch (arguments.length) {
                    case 1:
                        n.call(this);
                        break;
                    case 2:
                        n.call(this, arguments[1]);
                        break;
                    case 3:
                        n.call(this, arguments[1], arguments[2]);
                        break;
                    default:
                        for (i = arguments.length, a = new Array(i - 1), u = 1; i > u; u++)a[u - 1] = arguments[u];
                        n.apply(this, a)
                } else if (o(n)) {
                    for (i = arguments.length, a = new Array(i - 1), u = 1; i > u; u++)a[u - 1] = arguments[u];
                    for (c = n.slice(), i = c.length, u = 0; i > u; u++)c[u].apply(this, a)
                }
                return !0
            }, n.prototype.addListener = function (e, t) {
                var i;
                if (!r(t))throw TypeError("listener must be a function");
                if (this._events || (this._events = {}), this._events.newListener && this.emit("newListener", e, r(t.listener) ? t.listener : t), this._events[e] ? o(this._events[e]) ? this._events[e].push(t) : this._events[e] = [this._events[e], t] : this._events[e] = t, o(this._events[e]) && !this._events[e].warned) {
                    var i;
                    i = s(this._maxListeners) ? n.defaultMaxListeners : this._maxListeners, i && i > 0 && this._events[e].length > i && (this._events[e].warned = !0, console.error("(node) warning: possible EventEmitter memory leak detected. %d listeners added. Use emitter.setMaxListeners() to increase limit.", this._events[e].length), "function" == typeof console.trace && console.trace())
                }
                return this
            }, n.prototype.on = n.prototype.addListener, n.prototype.once = function (e, t) {
                function n() {
                    this.removeListener(e, n), i || (i = !0, t.apply(this, arguments))
                }

                if (!r(t))throw TypeError("listener must be a function");
                var i = !1;
                return n.listener = t, this.on(e, n), this
            }, n.prototype.removeListener = function (e, t) {
                var n, i, s, a;
                if (!r(t))throw TypeError("listener must be a function");
                if (!this._events || !this._events[e])return this;
                if (n = this._events[e], s = n.length, i = -1, n === t || r(n.listener) && n.listener === t)delete this._events[e], this._events.removeListener && this.emit("removeListener", e, t); else if (o(n)) {
                    for (a = s; a-- > 0;)if (n[a] === t || n[a].listener && n[a].listener === t) {
                        i = a;
                        break
                    }
                    if (0 > i)return this;
                    1 === n.length ? (n.length = 0, delete this._events[e]) : n.splice(i, 1), this._events.removeListener && this.emit("removeListener", e, t)
                }
                return this
            }, n.prototype.removeAllListeners = function (e) {
                var t, n;
                if (!this._events)return this;
                if (!this._events.removeListener)return 0 === arguments.length ? this._events = {} : this._events[e] && delete this._events[e], this;
                if (0 === arguments.length) {
                    for (t in this._events)"removeListener" !== t && this.removeAllListeners(t);
                    return this.removeAllListeners("removeListener"), this._events = {}, this
                }
                if (n = this._events[e], r(n))this.removeListener(e, n); else for (; n.length;)this.removeListener(e, n[n.length - 1]);
                return delete this._events[e], this
            }, n.prototype.listeners = function (e) {
                var t;
                return t = this._events && this._events[e] ? r(this._events[e]) ? [this._events[e]] : this._events[e].slice() : []
            }, n.listenerCount = function (e, t) {
                var n;
                return n = e._events && e._events[t] ? r(e._events[t]) ? 1 : e._events[t].length : 0
            }
        }, {}],
        5: [function (e, t) {
            t.exports = Array.isArray || function (e) {
                    return "[object Array]" == Object.prototype.toString.call(e)
                }
        }, {}],
        6: [function (e, t) {
            function n() {
            }

            var r = t.exports = {};
            r.nextTick = function () {
                var e = "undefined" != typeof window && window.setImmediate, t = "undefined" != typeof window && window.postMessage && window.addEventListener;
                if (e)return function (e) {
                    return window.setImmediate(e)
                };
                if (t) {
                    var n = [];
                    return window.addEventListener("message", function (e) {
                        var t = e.source;
                        if ((t === window || null === t) && "process-tick" === e.data && (e.stopPropagation(), n.length > 0)) {
                            var r = n.shift();
                            r()
                        }
                    }, !0), function (e) {
                        n.push(e), window.postMessage("process-tick", "*")
                    }
                }
                return function (e) {
                    setTimeout(e, 0)
                }
            }(), r.title = "browser", r.browser = !0, r.env = {}, r.argv = [], r.on = n, r.addListener = n, r.once = n, r.off = n, r.removeListener = n, r.removeAllListeners = n, r.emit = n, r.binding = function () {
                throw new Error("process.binding is not supported")
            }, r.cwd = function () {
                return "/"
            }, r.chdir = function () {
                throw new Error("process.chdir is not supported")
            }
        }, {}],
        7: [function (e, t) {
            t.exports = e("./lib/_stream_duplex.js")
        }, {"./lib/_stream_duplex.js": 8}],
        8: [function (e, t) {
            (function (n) {
                function r(e) {
                    return this instanceof r ? (u.call(this, e), c.call(this, e), e && e.readable === !1 && (this.readable = !1), e && e.writable === !1 && (this.writable = !1), this.allowHalfOpen = !0, e && e.allowHalfOpen === !1 && (this.allowHalfOpen = !1), void this.once("end", i)) : new r(e)
                }

                function i() {
                    this.allowHalfOpen || this._writableState.ended || n.nextTick(this.end.bind(this))
                }

                function o(e, t) {
                    for (var n = 0, r = e.length; r > n; n++)t(e[n], n)
                }

                t.exports = r;
                var s = Object.keys || function (e) {
                        var t = [];
                        for (var n in e)t.push(n);
                        return t
                    }, a = e("core-util-is");
                a.inherits = e("inherits");
                var u = e("./_stream_readable"), c = e("./_stream_writable");
                a.inherits(r, u), o(s(c.prototype), function (e) {
                    r.prototype[e] || (r.prototype[e] = c.prototype[e])
                })
            }).call(this, e("_process"))
        }, {"./_stream_readable": 10, "./_stream_writable": 12, _process: 6, "core-util-is": 13, inherits: 25}],
        9: [function (e, t) {
            function n(e) {
                return this instanceof n ? void r.call(this, e) : new n(e)
            }

            t.exports = n;
            var r = e("./_stream_transform"), i = e("core-util-is");
            i.inherits = e("inherits"), i.inherits(n, r), n.prototype._transform = function (e, t, n) {
                n(null, e)
            }
        }, {"./_stream_transform": 11, "core-util-is": 13, inherits: 25}],
        10: [function (e, t) {
            (function (n) {
                function r(t) {
                    t = t || {};
                    var n = t.highWaterMark;
                    this.highWaterMark = n || 0 === n ? n : 16384, this.highWaterMark = ~~this.highWaterMark, this.buffer = [], this.length = 0, this.pipes = null, this.pipesCount = 0, this.flowing = !1, this.ended = !1, this.endEmitted = !1, this.reading = !1, this.calledRead = !1, this.sync = !0, this.needReadable = !1, this.emittedReadable = !1, this.readableListening = !1, this.objectMode = !!t.objectMode, this.defaultEncoding = t.defaultEncoding || "utf8", this.ranOut = !1, this.awaitDrain = 0, this.readingMore = !1, this.decoder = null, this.encoding = null, t.encoding && (A || (A = e("string_decoder/").StringDecoder), this.decoder = new A(t.encoding), this.encoding = t.encoding)
                }

                function i(e) {
                    return this instanceof i ? (this._readableState = new r(e, this), this.readable = !0, void k.call(this)) : new i(e)
                }

                function o(e, t, n, r, i) {
                    var o = c(t, n);
                    if (o)e.emit("error", o); else if (null === n || void 0 === n)t.reading = !1, t.ended || h(e, t); else if (t.objectMode || n && n.length > 0)if (t.ended && !i) {
                        var a = new Error("stream.push() after EOF");
                        e.emit("error", a)
                    } else if (t.endEmitted && i) {
                        var a = new Error("stream.unshift() after end event");
                        e.emit("error", a)
                    } else!t.decoder || i || r || (n = t.decoder.write(n)), t.length += t.objectMode ? 1 : n.length, i ? t.buffer.unshift(n) : (t.reading = !1, t.buffer.push(n)), t.needReadable && f(e), d(e, t); else i || (t.reading = !1);
                    return s(t)
                }

                function s(e) {
                    return !e.ended && (e.needReadable || e.length < e.highWaterMark || 0 === e.length)
                }

                function a(e) {
                    if (e >= M)e = M; else {
                        e--;
                        for (var t = 1; 32 > t; t <<= 1)e |= e >> t;
                        e++
                    }
                    return e
                }

                function u(e, t) {
                    return 0 === t.length && t.ended ? 0 : t.objectMode ? 0 === e ? 0 : 1 : isNaN(e) || null === e ? t.flowing && t.buffer.length ? t.buffer[0].length : t.length : 0 >= e ? 0 : (e > t.highWaterMark && (t.highWaterMark = a(e)), e > t.length ? t.ended ? t.length : (t.needReadable = !0, 0) : e)
                }

                function c(e, t) {
                    var n = null;
                    return L.isBuffer(t) || "string" == typeof t || null === t || void 0 === t || e.objectMode || n || (n = new TypeError("Invalid non-string/buffer chunk")), n
                }

                function h(e, t) {
                    if (t.decoder && !t.ended) {
                        var n = t.decoder.end();
                        n && n.length && (t.buffer.push(n), t.length += t.objectMode ? 1 : n.length)
                    }
                    t.ended = !0, t.length > 0 ? f(e) : w(e)
                }

                function f(e) {
                    var t = e._readableState;
                    t.needReadable = !1, t.emittedReadable || (t.emittedReadable = !0, t.sync ? n.nextTick(function () {
                        l(e)
                    }) : l(e))
                }

                function l(e) {
                    e.emit("readable")
                }

                function d(e, t) {
                    t.readingMore || (t.readingMore = !0, n.nextTick(function () {
                        p(e, t)
                    }))
                }

                function p(e, t) {
                    for (var n = t.length; !t.reading && !t.flowing && !t.ended && t.length < t.highWaterMark && (e.read(0), n !== t.length);)n = t.length;
                    t.readingMore = !1
                }

                function g(e) {
                    return function () {
                        var t = e._readableState;
                        t.awaitDrain--, 0 === t.awaitDrain && m(e)
                    }
                }

                function m(e) {
                    function t(e) {
                        var t = e.write(n);
                        !1 === t && r.awaitDrain++
                    }

                    var n, r = e._readableState;
                    for (r.awaitDrain = 0; r.pipesCount && null !== (n = e.read());)if (1 === r.pipesCount ? t(r.pipes, 0, null) : _(r.pipes, t), e.emit("data", n), r.awaitDrain > 0)return;
                    return 0 === r.pipesCount ? (r.flowing = !1, void(C.listenerCount(e, "data") > 0 && b(e))) : void(r.ranOut = !0)
                }

                function v() {
                    this._readableState.ranOut && (this._readableState.ranOut = !1, m(this))
                }

                function b(e, t) {
                    var r = e._readableState;
                    if (r.flowing)throw new Error("Cannot switch to old mode now.");
                    var i = t || !1, o = !1;
                    e.readable = !0, e.pipe = k.prototype.pipe, e.on = e.addListener = k.prototype.on, e.on("readable", function () {
                        o = !0;
                        for (var t; !i && null !== (t = e.read());)e.emit("data", t);
                        null === t && (o = !1, e._readableState.needReadable = !0)
                    }), e.pause = function () {
                        i = !0, this.emit("pause")
                    }, e.resume = function () {
                        i = !1, o ? n.nextTick(function () {
                            e.emit("readable")
                        }) : this.read(0), this.emit("resume")
                    }, e.emit("readable")
                }

                function y(e, t) {
                    var n, r = t.buffer, i = t.length, o = !!t.decoder, s = !!t.objectMode;
                    if (0 === r.length)return null;
                    if (0 === i)n = null; else if (s)n = r.shift(); else if (!e || e >= i)n = o ? r.join("") : L.concat(r, i), r.length = 0; else if (e < r[0].length) {
                        var a = r[0];
                        n = a.slice(0, e), r[0] = a.slice(e)
                    } else if (e === r[0].length)n = r.shift(); else {
                        n = o ? "" : new L(e);
                        for (var u = 0, c = 0, h = r.length; h > c && e > u; c++) {
                            var a = r[0], f = Math.min(e - u, a.length);
                            o ? n += a.slice(0, f) : a.copy(n, u, 0, f), f < a.length ? r[0] = a.slice(f) : r.shift(), u += f
                        }
                    }
                    return n
                }

                function w(e) {
                    var t = e._readableState;
                    if (t.length > 0)throw new Error("endReadable called on non-empty stream");
                    !t.endEmitted && t.calledRead && (t.ended = !0, n.nextTick(function () {
                        t.endEmitted || 0 !== t.length || (t.endEmitted = !0, e.readable = !1, e.emit("end"))
                    }))
                }

                function _(e, t) {
                    for (var n = 0, r = e.length; r > n; n++)t(e[n], n)
                }

                function E(e, t) {
                    for (var n = 0, r = e.length; r > n; n++)if (e[n] === t)return n;
                    return -1
                }

                t.exports = i;
                var S = e("isarray"), L = e("buffer").Buffer;
                i.ReadableState = r;
                var C = e("events").EventEmitter;
                C.listenerCount || (C.listenerCount = function (e, t) {
                    return e.listeners(t).length
                });
                var k = e("stream"), I = e("core-util-is");
                I.inherits = e("inherits");
                var A;
                I.inherits(i, k), i.prototype.push = function (e, t) {
                    var n = this._readableState;
                    return "string" != typeof e || n.objectMode || (t = t || n.defaultEncoding, t !== n.encoding && (e = new L(e, t), t = "")), o(this, n, e, t, !1)
                }, i.prototype.unshift = function (e) {
                    var t = this._readableState;
                    return o(this, t, e, "", !0)
                }, i.prototype.setEncoding = function (t) {
                    A || (A = e("string_decoder/").StringDecoder), this._readableState.decoder = new A(t), this._readableState.encoding = t
                };
                var M = 8388608;
                i.prototype.read = function (e) {
                    var t = this._readableState;
                    t.calledRead = !0;
                    var n = e;
                    if (("number" != typeof e || e > 0) && (t.emittedReadable = !1), 0 === e && t.needReadable && (t.length >= t.highWaterMark || t.ended))return f(this), null;
                    if (e = u(e, t), 0 === e && t.ended)return 0 === t.length && w(this), null;
                    var r = t.needReadable;
                    t.length - e <= t.highWaterMark && (r = !0), (t.ended || t.reading) && (r = !1), r && (t.reading = !0, t.sync = !0, 0 === t.length && (t.needReadable = !0), this._read(t.highWaterMark), t.sync = !1), r && !t.reading && (e = u(n, t));
                    var i;
                    return i = e > 0 ? y(e, t) : null, null === i && (t.needReadable = !0, e = 0), t.length -= e, 0 !== t.length || t.ended || (t.needReadable = !0), t.ended && !t.endEmitted && 0 === t.length && w(this), i
                }, i.prototype._read = function () {
                    this.emit("error", new Error("not implemented"))
                }, i.prototype.pipe = function (e, t) {
                    function r(e) {
                        e === h && o()
                    }

                    function i() {
                        e.end()
                    }

                    function o() {
                        e.removeListener("close", a), e.removeListener("finish", u), e.removeListener("drain", p), e.removeListener("error", s), e.removeListener("unpipe", r), h.removeListener("end", i), h.removeListener("end", o), (!e._writableState || e._writableState.needDrain) && p()
                    }

                    function s(t) {
                        c(), e.removeListener("error", s), 0 === C.listenerCount(e, "error") && e.emit("error", t)
                    }

                    function a() {
                        e.removeListener("finish", u), c()
                    }

                    function u() {
                        e.removeListener("close", a), c()
                    }

                    function c() {
                        h.unpipe(e)
                    }

                    var h = this, f = this._readableState;
                    switch (f.pipesCount) {
                        case 0:
                            f.pipes = e;
                            break;
                        case 1:
                            f.pipes = [f.pipes, e];
                            break;
                        default:
                            f.pipes.push(e)
                    }
                    f.pipesCount += 1;
                    var l = (!t || t.end !== !1) && e !== n.stdout && e !== n.stderr, d = l ? i : o;
                    f.endEmitted ? n.nextTick(d) : h.once("end", d), e.on("unpipe", r);
                    var p = g(h);
                    return e.on("drain", p), e._events && e._events.error ? S(e._events.error) ? e._events.error.unshift(s) : e._events.error = [s, e._events.error] : e.on("error", s), e.once("close", a), e.once("finish", u), e.emit("pipe", h), f.flowing || (this.on("readable", v), f.flowing = !0, n.nextTick(function () {
                        m(h)
                    })), e
                }, i.prototype.unpipe = function (e) {
                    var t = this._readableState;
                    if (0 === t.pipesCount)return this;
                    if (1 === t.pipesCount)return e && e !== t.pipes ? this : (e || (e = t.pipes), t.pipes = null, t.pipesCount = 0, this.removeListener("readable", v), t.flowing = !1, e && e.emit("unpipe", this), this);
                    if (!e) {
                        var n = t.pipes, r = t.pipesCount;
                        t.pipes = null, t.pipesCount = 0, this.removeListener("readable", v), t.flowing = !1;
                        for (var i = 0; r > i; i++)n[i].emit("unpipe", this);
                        return this
                    }
                    var i = E(t.pipes, e);
                    return -1 === i ? this : (t.pipes.splice(i, 1), t.pipesCount -= 1, 1 === t.pipesCount && (t.pipes = t.pipes[0]), e.emit("unpipe", this), this)
                }, i.prototype.on = function (e, t) {
                    var n = k.prototype.on.call(this, e, t);
                    if ("data" !== e || this._readableState.flowing || b(this), "readable" === e && this.readable) {
                        var r = this._readableState;
                        r.readableListening || (r.readableListening = !0, r.emittedReadable = !1, r.needReadable = !0, r.reading ? r.length && f(this, r) : this.read(0))
                    }
                    return n
                }, i.prototype.addListener = i.prototype.on, i.prototype.resume = function () {
                    b(this), this.read(0), this.emit("resume")
                }, i.prototype.pause = function () {
                    b(this, !0), this.emit("pause")
                }, i.prototype.wrap = function (e) {
                    var t = this._readableState, n = !1, r = this;
                    e.on("end", function () {
                        if (t.decoder && !t.ended) {
                            var e = t.decoder.end();
                            e && e.length && r.push(e)
                        }
                        r.push(null)
                    }), e.on("data", function (i) {
                        if (t.decoder && (i = t.decoder.write(i)), i && (t.objectMode || i.length)) {
                            var o = r.push(i);
                            o || (n = !0, e.pause())
                        }
                    });
                    for (var i in e)"function" == typeof e[i] && "undefined" == typeof this[i] && (this[i] = function (t) {
                        return function () {
                            return e[t].apply(e, arguments)
                        }
                    }(i));
                    var o = ["error", "close", "destroy", "pause", "resume"];
                    return _(o, function (t) {
                        e.on(t, r.emit.bind(r, t))
                    }), r._read = function () {
                        n && (n = !1, e.resume())
                    }, r
                }, i._fromList = y
            }).call(this, e("_process"))
        }, {
            _process: 6,
            buffer: 1,
            "core-util-is": 13,
            events: 4,
            inherits: 25,
            isarray: 5,
            stream: 19,
            "string_decoder/": 14
        }],
        11: [function (e, t) {
            function n(e, t) {
                this.afterTransform = function (e, n) {
                    return r(t, e, n)
                }, this.needTransform = !1, this.transforming = !1, this.writecb = null, this.writechunk = null
            }

            function r(e, t, n) {
                var r = e._transformState;
                r.transforming = !1;
                var i = r.writecb;
                if (!i)return e.emit("error", new Error("no writecb in Transform class"));
                r.writechunk = null, r.writecb = null, null !== n && void 0 !== n && e.push(n), i && i(t);
                var o = e._readableState;
                o.reading = !1, (o.needReadable || o.length < o.highWaterMark) && e._read(o.highWaterMark)
            }

            function i(e) {
                if (!(this instanceof i))return new i(e);
                s.call(this, e);
                var t = (this._transformState = new n(e, this), this);
                this._readableState.needReadable = !0, this._readableState.sync = !1, this.once("finish", function () {
                    "function" == typeof this._flush ? this._flush(function (e) {
                        o(t, e)
                    }) : o(t)
                })
            }

            function o(e, t) {
                if (t)return e.emit("error", t);
                var n = e._writableState, r = (e._readableState, e._transformState);
                if (n.length)throw new Error("calling transform done when ws.length != 0");
                if (r.transforming)throw new Error("calling transform done when still transforming");
                return e.push(null)
            }

            t.exports = i;
            var s = e("./_stream_duplex"), a = e("core-util-is");
            a.inherits = e("inherits"), a.inherits(i, s), i.prototype.push = function (e, t) {
                return this._transformState.needTransform = !1, s.prototype.push.call(this, e, t)
            }, i.prototype._transform = function () {
                throw new Error("not implemented")
            }, i.prototype._write = function (e, t, n) {
                var r = this._transformState;
                if (r.writecb = n, r.writechunk = e, r.writeencoding = t, !r.transforming) {
                    var i = this._readableState;
                    (r.needTransform || i.needReadable || i.length < i.highWaterMark) && this._read(i.highWaterMark)
                }
            }, i.prototype._read = function () {
                var e = this._transformState;
                null !== e.writechunk && e.writecb && !e.transforming ? (e.transforming = !0, this._transform(e.writechunk, e.writeencoding, e.afterTransform)) : e.needTransform = !0
            }
        }, {"./_stream_duplex": 8, "core-util-is": 13, inherits: 25}],
        12: [function (e, t) {
            (function (n) {
                function r(e, t, n) {
                    this.chunk = e, this.encoding = t, this.callback = n
                }

                function i(e, t) {
                    e = e || {};
                    var n = e.highWaterMark;
                    this.highWaterMark = n || 0 === n ? n : 16384, this.objectMode = !!e.objectMode, this.highWaterMark = ~~this.highWaterMark, this.needDrain = !1, this.ending = !1, this.ended = !1, this.finished = !1;
                    var r = e.decodeStrings === !1;
                    this.decodeStrings = !r, this.defaultEncoding = e.defaultEncoding || "utf8", this.length = 0, this.writing = !1, this.sync = !0, this.bufferProcessing = !1, this.onwrite = function (e) {
                        d(t, e)
                    }, this.writecb = null, this.writelen = 0, this.buffer = [], this.errorEmitted = !1
                }

                function o(t) {
                    var n = e("./_stream_duplex");
                    return this instanceof o || this instanceof n ? (this._writableState = new i(t, this), this.writable = !0, void E.call(this)) : new o(t)
                }

                function s(e, t, r) {
                    var i = new Error("write after end");
                    e.emit("error", i), n.nextTick(function () {
                        r(i)
                    })
                }

                function a(e, t, r, i) {
                    var o = !0;
                    if (!w.isBuffer(r) && "string" != typeof r && null !== r && void 0 !== r && !t.objectMode) {
                        var s = new TypeError("Invalid non-string/buffer chunk");
                        e.emit("error", s), n.nextTick(function () {
                            i(s)
                        }), o = !1
                    }
                    return o
                }

                function u(e, t, n) {
                    return e.objectMode || e.decodeStrings === !1 || "string" != typeof t || (t = new w(t, n)), t
                }

                function c(e, t, n, i, o) {
                    n = u(t, n, i), w.isBuffer(n) && (i = "buffer");
                    var s = t.objectMode ? 1 : n.length;
                    t.length += s;
                    var a = t.length < t.highWaterMark;
                    return a || (t.needDrain = !0), t.writing ? t.buffer.push(new r(n, i, o)) : h(e, t, s, n, i, o), a
                }

                function h(e, t, n, r, i, o) {
                    t.writelen = n, t.writecb = o, t.writing = !0, t.sync = !0, e._write(r, i, t.onwrite), t.sync = !1
                }

                function f(e, t, r, i, o) {
                    r ? n.nextTick(function () {
                        o(i)
                    }) : o(i), e._writableState.errorEmitted = !0, e.emit("error", i)
                }

                function l(e) {
                    e.writing = !1, e.writecb = null, e.length -= e.writelen, e.writelen = 0
                }

                function d(e, t) {
                    var r = e._writableState, i = r.sync, o = r.writecb;
                    if (l(r), t)f(e, r, i, t, o); else {
                        var s = v(e, r);
                        s || r.bufferProcessing || !r.buffer.length || m(e, r), i ? n.nextTick(function () {
                            p(e, r, s, o)
                        }) : p(e, r, s, o)
                    }
                }

                function p(e, t, n, r) {
                    n || g(e, t), r(), n && b(e, t)
                }

                function g(e, t) {
                    0 === t.length && t.needDrain && (t.needDrain = !1, e.emit("drain"))
                }

                function m(e, t) {
                    t.bufferProcessing = !0;
                    for (var n = 0; n < t.buffer.length; n++) {
                        var r = t.buffer[n], i = r.chunk, o = r.encoding, s = r.callback, a = t.objectMode ? 1 : i.length;
                        if (h(e, t, a, i, o, s), t.writing) {
                            n++;
                            break
                        }
                    }
                    t.bufferProcessing = !1, n < t.buffer.length ? t.buffer = t.buffer.slice(n) : t.buffer.length = 0
                }

                function v(e, t) {
                    return t.ending && 0 === t.length && !t.finished && !t.writing
                }

                function b(e, t) {
                    var n = v(e, t);
                    return n && (t.finished = !0, e.emit("finish")), n
                }

                function y(e, t, r) {
                    t.ending = !0, b(e, t), r && (t.finished ? n.nextTick(r) : e.once("finish", r)), t.ended = !0
                }

                t.exports = o;
                var w = e("buffer").Buffer;
                o.WritableState = i;
                var _ = e("core-util-is");
                _.inherits = e("inherits");
                var E = e("stream");
                _.inherits(o, E), o.prototype.pipe = function () {
                    this.emit("error", new Error("Cannot pipe. Not readable."))
                }, o.prototype.write = function (e, t, n) {
                    var r = this._writableState, i = !1;
                    return "function" == typeof t && (n = t, t = null), w.isBuffer(e) ? t = "buffer" : t || (t = r.defaultEncoding), "function" != typeof n && (n = function () {
                    }), r.ended ? s(this, r, n) : a(this, r, e, n) && (i = c(this, r, e, t, n)), i
                }, o.prototype._write = function (e, t, n) {
                    n(new Error("not implemented"))
                }, o.prototype.end = function (e, t, n) {
                    var r = this._writableState;
                    "function" == typeof e ? (n = e, e = null, t = null) : "function" == typeof t && (n = t, t = null), "undefined" != typeof e && null !== e && this.write(e, t), r.ending || r.finished || y(this, r, n)
                }
            }).call(this, e("_process"))
        }, {"./_stream_duplex": 8, _process: 6, buffer: 1, "core-util-is": 13, inherits: 25, stream: 19}],
        13: [function (e, t, n) {
            (function (e) {
                function t(e) {
                    return Array.isArray(e)
                }

                function r(e) {
                    return "boolean" == typeof e
                }

                function i(e) {
                    return null === e
                }

                function o(e) {
                    return null == e
                }

                function s(e) {
                    return "number" == typeof e
                }

                function a(e) {
                    return "string" == typeof e
                }

                function u(e) {
                    return "symbol" == typeof e
                }

                function c(e) {
                    return void 0 === e
                }

                function h(e) {
                    return f(e) && "[object RegExp]" === v(e)
                }

                function f(e) {
                    return "object" == typeof e && null !== e
                }

                function l(e) {
                    return f(e) && "[object Date]" === v(e)
                }

                function d(e) {
                    return f(e) && ("[object Error]" === v(e) || e instanceof Error)
                }

                function p(e) {
                    return "function" == typeof e
                }

                function g(e) {
                    return null === e || "boolean" == typeof e || "number" == typeof e || "string" == typeof e || "symbol" == typeof e || "undefined" == typeof e
                }

                function m(t) {
                    return e.isBuffer(t)
                }

                function v(e) {
                    return Object.prototype.toString.call(e)
                }

                n.isArray = t, n.isBoolean = r, n.isNull = i, n.isNullOrUndefined = o, n.isNumber = s, n.isString = a, n.isSymbol = u, n.isUndefined = c, n.isRegExp = h, n.isObject = f, n.isDate = l, n.isError = d, n.isFunction = p, n.isPrimitive = g, n.isBuffer = m
            }).call(this, e("buffer").Buffer)
        }, {buffer: 1}],
        14: [function (e, t, n) {
            function r(e) {
                if (e && !u(e))throw new Error("Unknown encoding: " + e)
            }

            function i(e) {
                return e.toString(this.encoding)
            }

            function o(e) {
                var t = this.charReceived = e.length % 2;
                return this.charLength = t ? 2 : 0, t
            }

            function s(e) {
                var t = this.charReceived = e.length % 3;
                return this.charLength = t ? 3 : 0, t
            }

            var a = e("buffer").Buffer, u = a.isEncoding || function (e) {
                    switch (e && e.toLowerCase()) {
                        case"hex":
                        case"utf8":
                        case"utf-8":
                        case"ascii":
                        case"binary":
                        case"base64":
                        case"ucs2":
                        case"ucs-2":
                        case"utf16le":
                        case"utf-16le":
                        case"raw":
                            return !0;
                        default:
                            return !1
                    }
                }, c = n.StringDecoder = function (e) {
                switch (this.encoding = (e || "utf8").toLowerCase().replace(/[-_]/, ""), r(e), this.encoding) {
                    case"utf8":
                        this.surrogateSize = 3;
                        break;
                    case"ucs2":
                    case"utf16le":
                        this.surrogateSize = 2, this.detectIncompleteChar = o;
                        break;
                    case"base64":
                        this.surrogateSize = 3, this.detectIncompleteChar = s;
                        break;
                    default:
                        return void(this.write = i)
                }
                this.charBuffer = new a(6), this.charReceived = 0, this.charLength = 0
            };
            c.prototype.write = function (e) {
                for (var t = "", n = 0; this.charLength;) {
                    var r = e.length >= this.charLength - this.charReceived ? this.charLength - this.charReceived : e.length;
                    if (e.copy(this.charBuffer, this.charReceived, n, r), this.charReceived += r - n, n = r, this.charReceived < this.charLength)return "";
                    t = this.charBuffer.slice(0, this.charLength).toString(this.encoding);
                    var i = t.charCodeAt(t.length - 1);
                    if (!(i >= 55296 && 56319 >= i)) {
                        if (this.charReceived = this.charLength = 0, r == e.length)return t;
                        e = e.slice(r, e.length);
                        break
                    }
                    this.charLength += this.surrogateSize, t = ""
                }
                var o = this.detectIncompleteChar(e), s = e.length;
                this.charLength && (e.copy(this.charBuffer, 0, e.length - o, s), this.charReceived = o, s -= o), t += e.toString(this.encoding, 0, s);
                var s = t.length - 1, i = t.charCodeAt(s);
                if (i >= 55296 && 56319 >= i) {
                    var a = this.surrogateSize;
                    return this.charLength += a, this.charReceived += a, this.charBuffer.copy(this.charBuffer, a, 0, a), this.charBuffer.write(t.charAt(t.length - 1), this.encoding), t.substring(0, s)
                }
                return t
            }, c.prototype.detectIncompleteChar = function (e) {
                for (var t = e.length >= 3 ? 3 : e.length; t > 0; t--) {
                    var n = e[e.length - t];
                    if (1 == t && n >> 5 == 6) {
                        this.charLength = 2;
                        break
                    }
                    if (2 >= t && n >> 4 == 14) {
                        this.charLength = 3;
                        break
                    }
                    if (3 >= t && n >> 3 == 30) {
                        this.charLength = 4;
                        break
                    }
                }
                return t
            }, c.prototype.end = function (e) {
                var t = "";
                if (e && e.length && (t = this.write(e)), this.charReceived) {
                    var n = this.charReceived, r = this.charBuffer, i = this.encoding;
                    t += r.slice(0, n).toString(i)
                }
                return t
            }
        }, {buffer: 1}],
        15: [function (e, t) {
            t.exports = e("./lib/_stream_passthrough.js")
        }, {"./lib/_stream_passthrough.js": 9}],
        16: [function (e, t, n) {
            n = t.exports = e("./lib/_stream_readable.js"), n.Readable = n, n.Writable = e("./lib/_stream_writable.js"), n.Duplex = e("./lib/_stream_duplex.js"), n.Transform = e("./lib/_stream_transform.js"), n.PassThrough = e("./lib/_stream_passthrough.js")
        }, {
            "./lib/_stream_duplex.js": 8,
            "./lib/_stream_passthrough.js": 9,
            "./lib/_stream_readable.js": 10,
            "./lib/_stream_transform.js": 11,
            "./lib/_stream_writable.js": 12
        }],
        17: [function (e, t) {
            t.exports = e("./lib/_stream_transform.js")
        }, {"./lib/_stream_transform.js": 11}],
        18: [function (e, t) {
            t.exports = e("./lib/_stream_writable.js")
        }, {"./lib/_stream_writable.js": 12}],
        19: [function (e, t) {
            function n() {
                r.call(this)
            }

            t.exports = n;
            var r = e("events").EventEmitter, i = e("inherits");
            i(n, r), n.Readable = e("readable-stream/readable.js"), n.Writable = e("readable-stream/writable.js"), n.Duplex = e("readable-stream/duplex.js"), n.Transform = e("readable-stream/transform.js"), n.PassThrough = e("readable-stream/passthrough.js"), n.Stream = n, n.prototype.pipe = function (e, t) {
                function n(t) {
                    e.writable && !1 === e.write(t) && c.pause && c.pause()
                }

                function i() {
                    c.readable && c.resume && c.resume()
                }

                function o() {
                    h || (h = !0, e.end())
                }

                function s() {
                    h || (h = !0, "function" == typeof e.destroy && e.destroy())
                }

                function a(e) {
                    if (u(), 0 === r.listenerCount(this, "error"))throw e
                }

                function u() {
                    c.removeListener("data", n), e.removeListener("drain", i), c.removeListener("end", o), c.removeListener("close", s), c.removeListener("error", a), e.removeListener("error", a), c.removeListener("end", u), c.removeListener("close", u), e.removeListener("close", u)
                }

                var c = this;
                c.on("data", n), e.on("drain", i), e._isStdio || t && t.end === !1 || (c.on("end", o), c.on("close", s));
                var h = !1;
                return c.on("error", a), e.on("error", a), c.on("end", u), c.on("close", u), e.on("close", u), e.emit("pipe", c), e
            }
        }, {
            events: 4,
            inherits: 25,
            "readable-stream/duplex.js": 7,
            "readable-stream/passthrough.js": 15,
            "readable-stream/readable.js": 16,
            "readable-stream/transform.js": 17,
            "readable-stream/writable.js": 18
        }],
        20: [function (e, t, n) {
            function r() {
                return "WebkitAppearance" in document.documentElement.style || window.console && (console.firebug || console.exception && console.table) || navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31
            }

            function i() {
                var e = arguments, t = this.useColors;
                if (e[0] = (t ? "%c" : "") + this.namespace + (t ? " %c" : " ") + e[0] + (t ? "%c " : " ") + "+" + n.humanize(this.diff), !t)return e;
                var r = "color: " + this.color;
                e = [e[0], r, "color: inherit"].concat(Array.prototype.slice.call(e, 1));
                var i = 0, o = 0;
                return e[0].replace(/%[a-z%]/g, function (e) {
                    "%%" !== e && (i++, "%c" === e && (o = i))
                }), e.splice(o, 0, r), e
            }

            function o() {
                return "object" == typeof console && "function" == typeof console.log && Function.prototype.apply.call(console.log, console, arguments)
            }

            function s(e) {
                try {
                    null == e ? localStorage.removeItem("debug") : localStorage.debug = e
                } catch (t) {
                }
            }

            function a() {
                var e;
                try {
                    e = localStorage.debug
                } catch (t) {
                }
                return e
            }

            n = t.exports = e("./debug"), n.log = o, n.formatArgs = i, n.save = s, n.load = a, n.useColors = r, n.colors = ["lightseagreen", "forestgreen", "goldenrod", "dodgerblue", "darkorchid", "crimson"], n.formatters.j = function (e) {
                return JSON.stringify(e)
            }, n.enable(a())
        }, {"./debug": 21}],
        21: [function (e, t, n) {
            function r() {
                return n.colors[h++ % n.colors.length]
            }

            function i(e) {
                function t() {
                }

                function i() {
                    var e = i, t = +new Date, o = t - (c || t);
                    e.diff = o, e.prev = c, e.curr = t, c = t, null == e.useColors && (e.useColors = n.useColors()), null == e.color && e.useColors && (e.color = r());
                    var s = Array.prototype.slice.call(arguments);
                    s[0] = n.coerce(s[0]), "string" != typeof s[0] && (s = ["%o"].concat(s));
                    var a = 0;
                    s[0] = s[0].replace(/%([a-z%])/g, function (t, r) {
                        if ("%%" === t)return t;
                        a++;
                        var i = n.formatters[r];
                        if ("function" == typeof i) {
                            var o = s[a];
                            t = i.call(e, o), s.splice(a, 1), a--
                        }
                        return t
                    }), "function" == typeof n.formatArgs && (s = n.formatArgs.apply(e, s));
                    var u = i.log || n.log || console.log.bind(console);
                    u.apply(e, s)
                }

                t.enabled = !1, i.enabled = !0;
                var o = n.enabled(e) ? i : t;
                return o.namespace = e, o
            }

            function o(e) {
                n.save(e);
                for (var t = (e || "").split(/[\s,]+/), r = t.length, i = 0; r > i; i++)t[i] && (e = t[i].replace(/\*/g, ".*?"), "-" === e[0] ? n.skips.push(new RegExp("^" + e.substr(1) + "$")) : n.names.push(new RegExp("^" + e + "$")))
            }

            function s() {
                n.enable("")
            }

            function a(e) {
                var t, r;
                for (t = 0, r = n.skips.length; r > t; t++)if (n.skips[t].test(e))return !1;
                for (t = 0, r = n.names.length; r > t; t++)if (n.names[t].test(e))return !0;
                return !1
            }

            function u(e) {
                return e instanceof Error ? e.stack || e.message : e
            }

            n = t.exports = i, n.coerce = u, n.disable = s, n.enable = o, n.enabled = a, n.humanize = e("ms"), n.names = [], n.skips = [], n.formatters = {};
            var c, h = 0
        }, {ms: 22}],
        22: [function (e, t) {
            function n(e) {
                var t = /^((?:\d+)?\.?\d+) *(ms|seconds?|s|minutes?|m|hours?|h|days?|d|years?|y)?$/i.exec(e);
                if (t) {
                    var n = parseFloat(t[1]), r = (t[2] || "ms").toLowerCase();
                    switch (r) {
                        case"years":
                        case"year":
                        case"y":
                            return n * h;
                        case"days":
                        case"day":
                        case"d":
                            return n * c;
                        case"hours":
                        case"hour":
                        case"h":
                            return n * u;
                        case"minutes":
                        case"minute":
                        case"m":
                            return n * a;
                        case"seconds":
                        case"second":
                        case"s":
                            return n * s;
                        case"ms":
                            return n
                    }
                }
            }

            function r(e) {
                return e >= c ? Math.round(e / c) + "d" : e >= u ? Math.round(e / u) + "h" : e >= a ? Math.round(e / a) + "m" : e >= s ? Math.round(e / s) + "s" : e + "ms"
            }

            function i(e) {
                return o(e, c, "day") || o(e, u, "hour") || o(e, a, "minute") || o(e, s, "second") || e + " ms"
            }

            function o(e, t, n) {
                return t > e ? void 0 : 1.5 * t > e ? Math.floor(e / t) + " " + n : Math.ceil(e / t) + " " + n + "s"
            }

            var s = 1e3, a = 60 * s, u = 60 * a, c = 24 * u, h = 365.25 * c;
            t.exports = function (e, t) {
                return t = t || {}, "string" == typeof e ? n(e) : t.long ? i(e) : r(e)
            }
        }, {}],
        23: [function (e, t) {
            t.exports = function (e) {
                for (var t, n = [].slice.call(arguments, 1), r = 0, i = n.length; i > r; r++) {
                    t = n[r];
                    for (var o in t)e[o] = t[o]
                }
                return e
            }
        }, {}],
        24: [function (e, t) {
            var n = t.exports = function (e, t) {
                if (t || (t = 16), void 0 === e && (e = 128), 0 >= e)return "0";
                for (var r = Math.log(Math.pow(2, e)) / Math.log(t), i = 2; 1 / 0 === r; i *= 2)r = Math.log(Math.pow(2, e / i)) / Math.log(t) * i;
                for (var o = r - Math.floor(r), s = "", i = 0; i < Math.floor(r); i++) {
                    var a = Math.floor(Math.random() * t).toString(t);
                    s = a + s
                }
                if (o) {
                    var u = Math.pow(t, o), a = Math.floor(Math.random() * u).toString(t);
                    s = a + s
                }
                var c = parseInt(s, t);
                return 1 / 0 !== c && c >= Math.pow(2, e) ? n(e, t) : s
            };
            n.rack = function (e, t, r) {
                var i = function (i) {
                    var s = 0;
                    do {
                        if (s++ > 10) {
                            if (!r)throw new Error("too many ID collisions, use more bits");
                            e += r
                        }
                        var a = n(e, t)
                    } while (Object.hasOwnProperty.call(o, a));
                    return o[a] = i, a
                }, o = i.hats = {};
                return i.get = function (e) {
                    return i.hats[e]
                }, i.set = function (e, t) {
                    return i.hats[e] = t, i
                }, i.bits = e || 128, i.base = t || 16, i
            }
        }, {}],
        25: [function (e, t) {
            t.exports = "function" == typeof Object.create ? function (e, t) {
                e.super_ = t, e.prototype = Object.create(t.prototype, {
                    constructor: {
                        value: e,
                        enumerable: !1,
                        writable: !0,
                        configurable: !0
                    }
                })
            } : function (e, t) {
                e.super_ = t;
                var n = function () {
                };
                n.prototype = t.prototype, e.prototype = new n, e.prototype.constructor = e
            }
        }, {}],
        26: [function (e, t) {
            function n(e) {
                return r(e) || i(e)
            }

            function r(e) {
                return e instanceof Int8Array || e instanceof Int16Array || e instanceof Int32Array || e instanceof Uint8Array || e instanceof Uint16Array || e instanceof Uint32Array || e instanceof Float32Array || e instanceof Float64Array
            }

            function i(e) {
                return s[o.call(e)]
            }

            t.exports = n, n.strict = r, n.loose = i;
            var o = Object.prototype.toString, s = {
                "[object Int8Array]": !0,
                "[object Int16Array]": !0,
                "[object Int32Array]": !0,
                "[object Uint8Array]": !0,
                "[object Uint16Array]": !0,
                "[object Uint32Array]": !0,
                "[object Float32Array]": !0,
                "[object Float64Array]": !0
            }
        }, {}],
        27: [function (e, t) {
            function n(e) {
                var t = function () {
                    return t.called ? t.value : (t.called = !0, t.value = e.apply(this, arguments))
                };
                return t.called = !1, t
            }

            t.exports = n, n.proto = n(function () {
                Object.defineProperty(Function.prototype, "once", {
                    value: function () {
                        return n(this)
                    }, configurable: !0
                })
            })
        }, {}],
        28: [function (e, t) {
            (function (e) {
                t.exports = function (t) {
                    return "function" == typeof e._augment && e._useTypedArrays ? e._augment(t) : new e(t)
                }
            }).call(this, e("buffer").Buffer)
        }, {buffer: 1}]
    }, {}, [])("./")
});
// SIMPLEPEER*****************************





var guid = (function() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return function() {
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    };
})();

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

var mediaOptions = {
    audio: true,
    video: {
        mandatory: {
            minWidth: 1280,
            minHeight: 720
        }
    }
};

$(function() {
    var $messages = $('#messages'),
        name = $('#chat').data().userName;

    var currentUser = {
        name: name,
        id: guid(),
        stream: undefined
    };

    navigator.getUserMedia(mediaOptions, function(stream) {
        currentUser.stream = stream;
        var video = $('#localVideo')[0];
        video.src = window.URL.createObjectURL(stream);

        start();
    }, function() {});


    function start() {
        var pusher = new Pusher($('#chat').data().apiKey, {
            cluster: 'eu',
            encrypted: true,
            authEndpoint: '/users/video/auth',
            auth: {
                params: currentUser
            }
        });

        var channel = pusher.subscribe('presence-chat');
        var peers = {};

        function lookForPeers() {
            for (var userId in channel.members.members) {
                if (userId != currentUser.id) {
                    var member = channel.members.members[userId];

                    peers[userId] = initiateConnection(userId, member.name)
                }
            }
        }

        channel.bind('pusher:subscription_succeeded', lookForPeers);

        function gotRemoteVideo(userId, userName, stream) {
            var video = $("<video autoplay data-user-id='" + userId + "'/>");
            video[0].src = window.URL.createObjectURL(stream);
            // $('#remoteVideos').append(video);

            var preview = $("<li data-user-id='" + userId + "'>");
            preview.append("<video autoplay/>");
            preview.append("<div class='name'>" + userName + "</div></li>")
            preview.find('video')[0].src = window.URL.createObjectURL(stream);

            $('#allVideos').append(preview);
        }

        function appendMessage(name, message) {
            $messages.append('<dt>' + name + '</dt>');
            $messages.append('<dd>' + message + '</dd>');
        }

        function close(userId, name) {
            var peer = peers[userId];
            if (peer) {
                peer.destroy();
                peers[userId] = undefined;
            }
            $("[data-user-id='" + userId + "']").remove();
            appendMessage(name, '<em>Disconnected</em>');
        }

        function setupPeer(peerUserId, peerUserName, initiator) {
            var peer = new SimplePeer({ initiator: initiator, stream: currentUser.stream, trickle: false });

            peer.on('signal', function (data) {
                channel.trigger('client-signal-' + peerUserId, {
                    userId: currentUser.id, userName: currentUser.name, data: data
                });
            });

            peer.on('stream', function(stream) { gotRemoteVideo(peerUserId, peerUserName, stream) });
            peer.on('close', function() { close(peerUserId, peerUserName) });
            $(window).on('beforeunload', function() { close(peerUserId, peerUserName) });

            peer.on('message', function (data) {
                if (data == '__SPEAKING__') {
                    $('#remoteVideos video').hide();
                    $("#remoteVideos video[data-user-id='" + peerUserId + "']").show();
                } else {
                    appendMessage(peerUserName, data);
                }
            });

            return peer;
        }

        function initiateConnection(peerUserId, peerUserName) {
            return setupPeer(peerUserId, peerUserName, true);
        };

        channel.bind('client-signal-' + currentUser.id, function(signal) {
            var peer = peers[signal.userId];

            if (peer === undefined) {
                peer = setupPeer(signal.userId, signal.userName, false);
            }

            peer.on('ready', function() {
                appendMessage(signal.userName, '<em>Connected</em>');
            });
            peer.signal(signal.data)
        });

        var speech = hark(currentUser.stream);

        speech.on('speaking', function() {
            for (var userId in peers) {
                var peer = peers[userId];
                peer.send('__SPEAKING__');
            }
        });

        $('#send-message').submit(function(e) {
            e.preventDefault();
            var $input = $(this).find('input'),
                message = $input.val();

            $input.val('');

            for (var userId in peers) {
                var peer = peers[userId];
                peer.send(message);
            }
            appendMessage(currentUser.name, message);
        });
    }
});