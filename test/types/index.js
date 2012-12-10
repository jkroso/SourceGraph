module.exports = [
	{
		if: /\/package\.json$/,
		make: require('./package.json.js')
	},
	{
		if: /\/component\.json$/,
		make: require('./component.json.js')
	},
	{
		// Aliased component
		if: /\/components\/\w+$/,
		make: require('./javascript.js')
	},
	{
		if: /\.js$/,
		make: require('./javascript.js')
	},
	{
		if: /\.json$/,
		make: require('./json.js')
	},
	{
		if: /\.css$/,
		make: require('./css.js')
	},
	{
		if: /\.hbs$/,
		make: require('./handlebars.js')
	}
]