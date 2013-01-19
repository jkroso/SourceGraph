module.exports = {
	Buffer:{
		// No such thing as a browser buffer
		isBuffer: function () { return false }
	}
}