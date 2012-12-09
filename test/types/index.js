module.exports = [
	{
		re: /\/package\.json$/,
		constructor: require('./package.json.js')
	},
	{
		re: /\/component\.json$/,
		constructor: require('./component.json.js')
	},
	{
		// Aliased component
		re: /\/components\/\w+$/,
		constructor: require('./javascript.js')
	},
	{
		re: /\.js$/,
		constructor: require('./javascript.js')
	},
	{
		re: /\.json$/,
		constructor: require('./json.js')
	},
	{
		re: /\.css$/,
		constructor: require('./css.js')
	},
	{
		re: /\.hbs$/,
		constructor: require('./handlebars.js')
	}
]