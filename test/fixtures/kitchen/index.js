var Subscription = require('./Subscription.js')
require('component-tip')
require('async')


exports = module.exports = Bus

function Bus (listeners) {
    // Using discriptor to prevent non-subTopic properties from being enumerable
    Object.defineProperty(this, '_listeners', {
        value : listeners && Object.prototype.toString.call(listeners) === '[object Array]' ? listeners : [],
        writable : true
    })
}

var proto = Bus.prototype

exports.mixin = function (target) {
    Bus.call(target)
    Object.keys(proto).forEach(function (key) {
        if ( !target.hasOwnProperty(key) ) {
            Object.defineProperty(target, key, { 
                value: proto[key], 
                writable:true,
                configurable:true 
            })
        }
    })
    return target
}

/**
 * Iterate over a list of listeners invoking each one
 * @param  {Array}   topics should be an array of listener arrays from the topics objects you wish to invoke
 * @param  {Any}     data   whatever you want passed to each of the subscribers
 * @return {Boolean}        true if no listeners prevented propagation
 */
exports.invokeList = invokeList
function invokeList (topics, data) {
    var len = topics.length, i, listeners
    while ( len-- ) {
        listeners = topics[len]
        i = listeners.length
        if ( i > 0 ) {
            do {
                // Returning false from a handler will prevent any further subscriptions from being notified
                if ( listeners[--i].trigger(data) === false ) {
                    return false
                }
            } while ( i )
        }
    }
    return true
}

function insertListener (node, subscriptionData) {
    var listeners = node._listeners.slice(),
        priority = subscriptionData.priority,
        added = false
    
    for ( var i = 0, len = listeners.length; i < len; i++ ) {
        if ( listeners[i].priority >= priority ) {
            listeners.splice(i, 0, subscriptionData)
            added = true
            break
        }
    }
    if ( !added )
        listeners.push(subscriptionData)
    
    node._listeners = listeners
}

function removeListener (node, callback) {
    var check
    switch ( typeof callback ) {
        case 'function':
            check = function (listenerData) {
                return listenerData.callback !== callback
            }
            break
        case 'string':
            check = function (listenerData) {
                return listenerData.callback.name !== callback
            }
            break
        case 'object':
            check = function (listenerData) {
                return listenerData !== callback
            }
            break
        default:
            // if the user didn't pass a callback, all listeners will be removed
            check = function () {
                return false
            }
    }
    node._listeners = node._listeners.filter(check)
}

// Recursive collect with the ability to fork and combine
exports.branchingCollect = branchingCollect
function branchingCollect (node, directive) {
    var i = 0,
        len = directive.length,
        direction,
        key,
        result = [node._listeners]
    while ( i < len ) {
        direction = directive[i++]
        key = direction[0]
        if ( key in node ) {
            result = result.concat(branchingCollect(node[key], direction.slice(1)))
        }
    }
    return result
}

// Takes an list of directions to follow and collects all listeners along the way
exports.collect = collect
function collect (node, directions) {
    var result = [node._listeners],
        len = directions.length,
        i = 0
    while ( i < len ) {
        node = node[directions[i++]]
        if ( node )
            result.push(node._listeners)
        else
            break
    }
    return result
}

// Retieves a a sub-topic from the descending tree
proto.get = function (directions, useforce) {
    if ( ! directions )
        return this
    directions = directions.split('.')
    var topic = this,
        edge,
        len = directions.length,
        i = 0
    
    if ( len ) {
        do {
            edge = directions[i++]
            if ( topic[edge] instanceof Bus )
                topic = topic[edge]
            else if ( topic[edge] )
                throw 'namespace clash: '+edge
            else if ( useforce )
                topic = topic[edge] = new Bus
            else
                break
        } while ( i < len )
    }
    return topic
}

/**
 * If any callback returns false we immediately exit otherwise we simply return true to indicate that all callbacks were fired without interference
 * @param  {String} topic   the event type
 * @param  {Any}    data    any data you want passed to the callbacks
 * @return {Boolean}
 */
proto.publish = function (topic, data) {
    if ( typeof topic === 'string' ) {
        topic = collect(this, topic.split('.'))
    } else {
        data = topic
        topic = [this._listeners]
    }
    return invokeList(topic, data)
}

//  _Method_ __on__
//  
//  +   _optional_ __string__ `topics` a ' ' separate list of topics In the format `lvl1.lvl2.lvl3.etc`
//  +   _optional_ __object__ `context`
//  +   __function__ `callback` the function to handle events. Should take one argument, `data`
//  +   _optional_ __number__ `priority` 1 will trigger before 2 etc  
//  
// returns `listenerObject`
proto.on = function (topics, context, callback, priority) {
    switch ( arguments.length ) {  
        case 3:
            if (typeof callback === 'number') {
                priority = callback
                callback = context
                context = window
            } else
                priority = 0
            break
        case 2:
            callback = context
            priority = 0
            if ( typeof topics === 'string' ) {
                context = window
            } else {
                context = topics
                topics = ''
            }
            break
        case 1:
            callback = topics
            topics = ''
            context = window
            priority = 0
            break
        case 0:
            throw 'Insufficient arguments'
    }

    var listenerData = new Subscription(context, callback, priority)

    // Multiple subscriptions can be set at the same time, in fact it is recommended as they end up sharing memory this way. No need to throw error for incorrect topic since accessing `split` on a non-string will throw an error anyway
    topics.split(/\s+/).forEach(function (directions) {
        insertListener(this.get(directions, true), listenerData)
    },this)
    return listenerData
}

// Same api as on except as soon as one topic is triggered the listener will be removed from __all__ topics it was subscribed to in the `once` call
proto.once = function (topics, context, callback, priority) {
    switch ( arguments.length ) {  
        case 3:
            if (typeof callback === 'number') {
                priority = callback
                callback = context
                context = window
            } else
                priority = 0
            break
        case 2:
            callback = context
            context = window
            priority = 0
            break
        case 1:
            callback = topics
            topics = ''
            context = window
            priority = 0
            break
        case 0:
            throw 'Insufficient arguments'
    }
    var listenerData = new Subscription(context, callback, priority)
    listenerData._topics = []
    listenerData.trigger = function (data) {
        this._topics.forEach(function (topic) {
            removeListener(topic, this)
        }, this)
        return this.callback.call(this.context, data)
    }
    topics.split(/\s+/).forEach(function (directions) {
        var topicObject = this.get(directions, true)
        listenerData._topics.push(topicObject)
        insertListener(topicObject, listenerData)
    }, this)

    return listenerData
}

//  _Method_ __off__
//  
//  +   __String__ `topic` the event type  
//  +   _optional_ __function|subscriptionRef|string__ `callback`  
//    + If you do not pass a callback then all subscriptions will be removed from that topic
//    + If you pass a string then all subscriptions with a callback name matching that string will be remove
//    + If you pass a function then all subscriptions with that function will be removed
proto.off = function (topics, callback) {
    if (typeof topics !== 'string') {
        if ( !callback )
            return removeListener(this, topics) // `topics` in this case being the `callback`
        else 
            throw 'Bad topic argument'
    }
    if ( arguments.length ) {
        topics.split(/\s+/).forEach(function (topic) {
            topic = this.get(topic, false)
            if ( topic )
                removeListener(topic, callback)
        }, this)
    // Clear everything
    } else {
        Object.keys(this).forEach(function (key) {
            // Check that it isn't some special property
            if ( this[key] instanceof Bus ) {
                delete this[key]
            }
        }, this)
        this._listeners = []
    }
}