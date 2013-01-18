var winner = require('../src')

describe('this isn\'t intended to work', function () {
	it('should compare using >', function () {
		winner([1,2,3]).should.equal(3)
		winner(['a', 'b', 'c']).should.equal('c')
		winner([new Date(1), new Date(2), new Date(3)]).getTime().should.equal(new Date(3).getTime())
	})
	it('should return undefined for an empty array', function () {
		should.not.exist(winner([]))
	})
})

describe('with comparitors', function () {
	it('should return the item not the value of the comparitor', function () {
		winner([{a:1}, {a:2}, {a:3}], function (item) {
			return item.a
		}).should.deep.equal({a:3})
	})
})
