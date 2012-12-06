require('path')
module.exports = Subscription

function Subscription (context, callback, priority) {
    if ( typeof callback !== 'function' || typeof priority !== 'number' )
        throw 'Incorrect argument format'
    this.context = context
    this.callback = callback
    this.priority = priority
}

var proto = Subscription.prototype

proto.trigger = function (data) {
    return this.callback.call(this.context, data)
}
