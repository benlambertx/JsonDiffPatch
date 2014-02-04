
var expect = require("expect.js");
var jsondiffpatch = require("../src/main.js");
var DiffPatcher = jsondiffpatch.DiffPatcher;

var isArray = (typeof Array.isArray == 'function') ?
    // use native function
    Array.isArray :
    // use instanceof operator
    function(a) {
        return typeof a == 'object' && a instanceof Array;
    };

var dateReviver = function(key, value){
    var a;
    if (typeof value === 'string') {
        a = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)(Z|([+\-])(\d{2}):(\d{2}))$/.exec(value);
        if (a) {
            return new Date(Date.UTC(+a[1], +a[2] - 1, +a[3], +a[4], +a[5], +a[6]));
        }
    }
    return value;
};

var deepEqual = function(obj1, obj2) {
    if (obj1 === obj2) {
        return true;
    }
    if (obj1 === null || obj2 == null) return false;
    if ((typeof obj1 === 'object') && (typeof obj2 === 'object')) {
        if (obj1 instanceof Date) {
            if (!(obj2 instanceof Date)) return false;
            return obj1.toString() === obj2.toString();
        }
        if (isArray(obj1)) {
            if (!isArray(obj2)) return false;
            if (obj1.length !== obj2.length) return false;
            var length = obj1.length;
            for (var i = 0; i < length; i++) {
                if (!deepEqual(obj1[i], obj2[i])) return false;
            }
            return true;
        } else {
            if (isArray(obj2)) return false;
        }
        for (var name in obj2) {
            if (typeof obj1[name] === 'undefined') return false;
        }
        for (var name in obj1) {
            if (!deepEqual(obj1[name], obj2[name])) return false;
        }
        return true;
    }
    return false;
};

expect.Assertion.prototype.deepEqual = function(obj) {
    this.assert(
        deepEqual(this.obj, obj),
        function(){
            return 'expected ' + JSON.stringify(this.obj) + ' to be ' + JSON.stringify(obj);
        },
        function(){
            return 'expected ' + JSON.stringify(this.obj) + ' not to be ' + JSON.stringify(obj);
        });
    return this;
};

var valueDescription = function(value) {
    if (value === null) {
        return 'null';
    }
    if (typeof value == 'boolean') {
        return value.toString();
    }
    if (value instanceof Date) {
        return "Date";
    }
    if (isArray(value)) {
        return "array";
    }
    if (typeof value == 'string') {
        if (value.length >= 60) {
            return "large text"
        }
    }
    return typeof value;
};

var clone = function(obj) {
    if (typeof obj == 'undefined') {
        return undefined;
    }
    return JSON.parse(JSON.stringify(obj), dateReviver);
}

describe('DiffPatcher', function(){
	before(function(){
		this.instance = new DiffPatcher();
	});
    var examples = require('./examples/diffpatch');
    Object.keys(examples).forEach(function(groupName){
        var group = examples[groupName];
        describe(groupName, function(){
            group.forEach(function(example){
                if (!example) return;
                var name = example.name || valueDescription(example.left) + ' -> ' + valueDescription(example.right);
                describe(name, function(){
                    if (example.error) {
                        it('diff should fail with: ' + example.error, function(){
                            var instance = this.instance;
                            expect(function(){
                                var delta = instance.diff(example.left, example.right);
                            }).to.throwException(example.error);
                        });
                        return;
                    }
                    it('can diff', function(){
                        var delta = this.instance.diff(example.left, example.right);
                        expect(delta).to.be.deepEqual(example.delta);
                    });
                    it('can diff backwards', function(){
                        var reverse = this.instance.diff(example.right, example.left);
                        expect(reverse).to.be.deepEqual(example.reverse);
                    });
                    it('can patch', function(){
                        var right = this.instance.patch(clone(example.left), example.delta);
                        expect(right).to.be.deepEqual(example.right);
                    });
                    it('can reverse delta', function(){
                        var reverse = this.instance.reverse(example.delta);
                        if (example.exactReverse !== false) {
                            expect(reverse).to.be.deepEqual(example.reverse);
                        } else {
                            // reversed delta and the swapped-diff delta are not always equal,
                            // to verify they're equivalent, patch and compare the results
                            expect(this.instance.patch(clone(example.right), reverse)).to.be.deepEqual(example.left);
                            reverse = this.instance.diff(example.right, example.left);
                            expect(this.instance.patch(clone(example.right), reverse)).to.be.deepEqual(example.left);
                        }
                    });
                    it('can unpatch', function(){
                        var left = this.instance.unpatch(clone(example.right), example.delta);
                        expect(left).to.be.deepEqual(example.left);
                    });
                });
            });
        });
    });
})