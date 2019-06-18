(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  for (var i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(
      uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)
    ))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],2:[function(require,module,exports){
(function (Buffer){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this,require("buffer").Buffer)
},{"base64-js":1,"buffer":2,"ieee754":3}],3:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],4:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 *
 *
 * @export
 * @abstract
 * @class PdfObject
 */
class PdfObject {
    constructor() {
        /**
         *
         *
         * @private
         * @type {string}
         * @memberof PdfObject
         */
        this._compiled = '';
        /**
         *
         *
         * @private
         * @type {number}
         * @memberof PdfObject
         */
        this._byteLength = 0;
    }
    get precompiled() {
        return this._compiled;
    }
    /**
     *
     *
     * @readonly
     * @type {number}
     * @memberof PdfObject
     */
    get ByteLength() {
        let utf8Encode = new TextEncoder();
        this._compiled = this.compile().join('\n') + '\n';
        this._byteLength = utf8Encode.encode(this._compiled).length;
        return this._byteLength;
    }
    /**
     *
     *
     * @returns {string[]}
     * @memberof PdfObject
     */
    compile() {
        throw 'don\'t call the abstract compile';
    }
    /**
     *
     *
     * @returns {string[]}
     * @memberof PdfObject
     */
    startObject() {
        return [`${this.Id} ${this.Generation} obj`, '<<'];
    }
    /**
     *
     *
     * @returns {string[]}
     * @memberof PdfObject
     */
    endObject() {
        return ['>>', 'endobj'];
    }
    /**
     *
     *
     * @returns {string}
     * @memberof PdfObject
     */
    compileType() {
        return `/Type /${this.Type}`;
    }
}
exports.PdfObject = PdfObject;

},{}],5:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 *
 *
 * @export
 * @enum {number}
 */
var PdfObjectType;
(function (PdfObjectType) {
    /**
     *
     */
    PdfObjectType["Page"] = "Page";
    /**
     *
     */
    PdfObjectType["Pages"] = "Pages";
    /**
     *
     */
    PdfObjectType["Catalog"] = "Catalog";
    /**
     *
     */
    PdfObjectType["Metadata"] = "Metadata";
    /**
     *
     */
    PdfObjectType["Font"] = "Font";
    /**
     *
     */
    PdfObjectType["FontDescriptor"] = "FontDescriptor";
    /**
     *
     */
    PdfObjectType["FontWidths"] = "FontWidths";
    /**
     *
     */
    PdfObjectType["FontEncoding"] = "FontEncoding";
    /**
     *
     */
    PdfObjectType["FontFile"] = "FontFile";
    /**
     *
     */
    PdfObjectType["EmbeddedFile"] = "EmbeddedFile";
    /**
     *
     */
    PdfObjectType["Filespec"] = "Filespec";
    /**
     *
     */
    PdfObjectType["Sig"] = "Sig";
})(PdfObjectType = exports.PdfObjectType || (exports.PdfObjectType = {}));

},{}],6:[function(require,module,exports){
"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(require("../types/catalog"));
__export(require("../types/page"));
__export(require("../types/pages"));
__export(require("../types/metadata"));

},{"../types/catalog":17,"../types/metadata":25,"../types/page":27,"../types/pages":28}],7:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ControlCharacters {
}
/**
 *
 *
 * @static
 * @memberof ControlCharacters
 */
ControlCharacters.nl = '\x0a';
/**
 *
 *
 * @static
 * @memberof ControlCharacters
 */
ControlCharacters.nul = '\x00';
/**
 *
 *
 * @static
 * @memberof ControlCharacters
 */
ControlCharacters.bel = '\x07';
/**
 *
 *
 * @static
 * @memberof ControlCharacters
 */
ControlCharacters.bs = '\x08';
/**
 *
 *
 * @static
 * @memberof ControlCharacters
 */
ControlCharacters.ht = '\x09';
/**
 *
 *
 * @static
 * @memberof ControlCharacters
 */
ControlCharacters.np = '\x0c';
/**
 *
 *
 * @static
 * @memberof ControlCharacters
 */
ControlCharacters.cr = '\x0d';
/**
 *
 *
 * @static
 * @memberof ControlCharacters
 */
ControlCharacters.sp = '\x20';
/**
 *
 *
 * @static
 * @memberof ControlCharacters
 */
ControlCharacters.EOL = ControlCharacters.nl;
exports.ControlCharacters = ControlCharacters;

},{}],8:[function(require,module,exports){
module.exports={"Subtype":"TrueType","BaseFont":"DiverdaSansCom-Medium","FirstChar":"0","LastChar":"561","Widths":[512,0,228,293,339,571,548,785,638,179,283,283,479,536,243,359,241,384,527,527,527,527,527,527,527,527,527,527,271,272,623,547,623,473,871,652,580,683,704,535,510,706,685,271,299,622,497,826,684,776,548,783,598,534,522,670,651,938,638,612,606,275,383,276,582,465,524,501,544,483,561,514,330,551,545,257,271,496,266,798,545,546,561,550,376,401,363,545,482,743,523,493,476,330,234,330,537,660,243,508,443,954,547,556,542,1115,534,297,929,609,243,243,443,443,461,465,930,550,826,401,299,854,476,612,228,294,499,549,629,612,234,491,559,559,398,488,627,359,559,523,361,547,365,328,543,549,593,270,503,267,445,489,685,731,714,456,652,652,652,652,652,652,895,683,535,535,535,535,271,271,271,271,725,684,776,776,776,776,776,470,781,670,670,670,670,612,549,565,501,501,501,501,501,501,793,483,514,514,514,514,257,257,257,257,547,545,546,546,546,546,546,535,549,545,545,545,545,493,561,493,500,652,501,652,501,652,501,683,483,683,483,683,483,683,483,704,645,725,577,535,514,535,514,535,514,535,514,535,514,706,551,706,551,706,551,706,551,685,545,685,561,271,257,271,257,271,257,271,257,541,520,299,271,622,496,497,266,497,266,497,327,497,345,518,337,684,545,684,545,684,545,549,776,546,776,546,776,546,598,376,598,376,598,376,534,401,534,401,534,401,522,363,522,375,522,382,670,545,670,545,670,545,670,545,670,545,670,545,938,743,612,493,609,476,609,476,534,401,522,363,271,525,399,523,452,472,480,610,670,782,549,660,155,495,782,661,558,670,771,628,487,155,270,685,797,366,541,547,626,626,632,293,449,686,574,446,507,486,546,571,450,435,563,562,255,269,513,413,660,560,617,448,622,484,439,428,554,518,738,520,494,491,507,507,507,507,507,507,507,507,507,713,546,546,546,546,546,571,576,576,450,450,450,450,450,450,450,450,450,563,563,563,563,562,562,255,255,255,255,255,255,255,255,269,513,413,413,413,413,433,560,560,560,560,617,617,617,617,617,617,617,617,620,737,484,484,484,439,439,439,439,439,877,428,428,428,448,554,554,554,554,554,554,554,554,554,554,738,494,494,494,491,491,491,690,848,486,293,437,553,546,475,446,502,398,995,517,322,457,427,504,433,503,412,506,487,523,321,459,420,481,423,476,393,461,476,642,870,562,869,823,631,650,699,681,663,672,636,624,626,717,611,351,406,406,524,543,542,525,550,559,523,523,472,610,452,512,634,562,589,853,881],"FontDescriptor":{"Type":"FontDescriptor","FontName":"DiverdaSansCom-Medium","FontFamily":"Diverda Sans Com Medium","FontStretch":"Normal","FontWeight":500,"Flags":25,"FontBBox":[-150,-224,1071,920],"ItalicAngle":0,"Ascent":910,"Descent":-220,"CapHeight":680,"XHeight":440,"StemV":120,"AvgWidth":430,"MaxWidth":1115,"FontFile2":{"Length":207816,"Length1":117770,"Stream":"H4sIAAAAAAAACux9CWBU1fX3PW8me2aSSWZJJjOT2SfLZJ3sK1lIQgJhCwiIKIqIsoiorVVUtK4UrVq3platUUstVbQaIVjBuqMobnEBBJWKWimCllqFme9373szSUiC+Lffv1/7MeGc+959y733nHPPOffcex+MGGNGIDU7pXnquNY/P2fPY5JRz5gptrV5bAvj1xkt4ne1Tpo4NeG66zJxfgVjpc2tU6c1Zt+3ciljZS8wZr1j/LjOievv+fZWxrrm4Z7Y8V1T2/55/pqNjE3D81LZxKkFxdde27aHsRPuxftOmd48Ycb+T7YHGJuhZiyh77TFc5dGBVwrGDttE2PRzaf96Dw7e0T1NmNnqXn585eesbh4wrnzcW7B+089Y9FP5o+9+JcmxhbimX3LF8xbfMFjzz6xmtGsQ4wVP7rg9Lnzdo297DZG163F82ULkBFzIMqC809w7l6w+LwLLj1liZfR9YmMxb6w8PRlS84ru/ljRre+yVhHyqKzT5tb9sHhSYw+wP3q+YvnXrBU3S7ZGH08Cc/bl8xdfHrhvuwVOAcNMtOXnn3ueTWPrZrGpKhVjCXXLF12+tI7S14/wCQD6MPaZVqO8OP58WweexCEnnveEhbLnCyqoaXDznKax06zs+LO8c12VjVl4gQ7a+yagvx2xkIh+X0iJSWVlFSlpGoljWLRvHXMK7Bf4GKBKwSuE7hZqcvRMX+rJNJYRoFHeBnsLPY+202d0iFVmeoO1YPq5eoHYrJipsSeF7csoTlRSixJnJ94e+KdiS9r70yKTVqWtD25JXmtzqzz6+p0k3Sn6s7T3al7QXcgxZL6N71dP0X/hMFruMGw2VhovNV4yHSq6TzTVabbTc+lXZH2SPrS9DvNsy3vZc5wXOJY7XjdccjpdU5yXui6wPWAZ7nnwSx/1j1Zu7I7s1dl92a/nH0wx57TnfNMbl3uo/4c/915xrxV+VL+Bfl/K5hXcE/BrkJb4ezC7sJ3ioxFXUU3FW0t1hZXFD8S8AfuD6xBC5NDvczMyoArAJWhbaw69DCbEdrNZoYOsBNDe9nZoT52EfLWA97F+bbQXsL9hPupLbSNxoUOUHvoYepA/hTkXRfqp+tDO+mG0DO0B+knSD8FfBZ6hi1k2tAlKPMS5gq9wJpQ2liU1AJoBYwDTESpkwCTcTwF6VSkXUinhT5lJyCdjfTHgAsBd+AdvwbcCbgLcDfgN4An8N4/AZ4EbARsAjwFeBrvegbwLOA5wPOALXjnK0hfBWwFvAZ4HfAW8vsBbwPeAezAe9/HO3Yi3YX0A6QfIt2Nez8GfAL4DPA54AvAAcBXgIOArwHfAA4BgqHdxAA2UM0OcAJcAA/yfIBsQC7O8wAFgKLQpxQAlAJqcV4PaAA0AcYCWgETcG0iYDLggtAWugrpTUh/AbgZcAvgVsBtgNsBvwR0A57Dfc8DXgC8CNgMeAnwMmAL6KuFHOyNyEGY95zfnNfXgffXA24IvQY+bwOfXwOfXwOfX2PprAi0KQs9AKnaCKl6DVLVi7e8D2naAGnqZQ/i+kOAtYCHAY8A1iP/XdyzLfQ+ufFGLyALgPdA2h6AtL0GSetF6e9D0h5AvywDtThUAKaAugHI10zI10zIVx/kqxdy1QdZ6oOs9EFW+iArfZCVPshKH2SlD7LSC1nphaz0QlZ6ISu9kJVeyEkf5KQPctIHOemDjPRBRvogI32QkT7ISB9kog8y0QuZ6INM9EIm+iATveB/H/jfB/73gf994H8f+NsH/vaBv33g0RrwZw34swb8WQP+rAF/1oA/a8CfNeDPGvBnDUtA+7aBgrtBwb2g4DZQjlOJU2Qb2rwNFNkLimxD27exu9D2X7KkUA/a380sSK0AF+hfhDc04XgsoBXQIfpXD/rVGvSrbvSr1eByD/jTg77VDVptBK02glYbQauNoNVG0GojeLYbPNsNnu0Gz3aDZ7tBvx7Qrwf06wH9ekC/HtCvB32tBzTsAQ17QMMe0LCHvYByXwRsBrwk+l0PaNoDmvaApj2gaQ/63Wr0u9Xod6vR71ZDHnogDz2g9UbQuge03gha94DWG0HrHvS/HvS/HvS/HvS/HtC+B7TvAe17QPse0L6HoiGxsYB4gBuS4kGeV/S3HsgX73M96HNr0OfWoM+tQZ/rRp/rRp/rRp9bjT63Gn1uNfrcavS51ehzq9ELeiCHPehz3eBnLy0PvUCXAlYArgJcC1gJWAW4IbQR/O4Fv3vB717wuxf87gW/e8HvXvC7F/zupXtx732A+wG/BawG/A7wAOD3gDWAhwF/BDwKeAzQC3gcsA6wHtAHeA7wPOAFwIuAzYCXAC8DtgC2Al4DvA54A/Am4C1AP+BtAHQdvQ+ArqNdAOg6+hDwEWA34C+AjwGfoF2fAj4DL+IhabshObshObshObshObshObshObvBvd3g3G5wbTdrg5xeDTndAjm9GnLaDzntx9O9kf7aEdon+mwXpPoE6I4ZSE9Eegeu/xpwJ+AuwN2A3wCOtQ+/gPe+CNgMeAkwUp9+C+X0A94GvAN4F7ANsAPvk/t6r9LXe0ft69GhfZC3fZC3fUP6fS56ah6gAFALXVYPaAA0AcYCWgEdKKseFOoDdfpAnb2gzl5QZxuo0xfRZjJl9oIysm6+A+e/BtzJ9QDgbsBvAE/g3j8BngRsBGwCPAU4Fu32Ft7bD3gb8M6A/gcltoESfaDENlCiD5TYBkr0fafWG9r6vWj9XrR+L1q/F63fi9bv5XaFnSd8hCToIe4nWKCjrAAXoAl5rYCO0E5QoRv+wWvwD7j+6gUltoAKa0CFNaDCGlBhDaiwBlRYAyp0gwrdoEI3qNANKnSDCt2gQjeo0A0qdIMK3ZCPnZCPnZCPnZCPnaBKN6jSDap0gyrdoEo3qNILqvSCKr2gSi+osQbU6AY11oAa3aDGGlCjG9ToBjW6QY1uUKMb1OiGXOyEXOyEXOwEZbpBmW5QhuuYXlCjF9ToBTV6QY1eUKMXeqUHeqUf+mQL9Ek/9Ek/9Ek/dEkPdEkPdEkPdEkPdEkPdEkPdEkPdEkPdEkPdEk/dEk/dEk/dEk/dEk/dEk/dEk/dEk/dEk/9MQW6Ikt0BNboCe2QE9sgZ7YAj2xBXpiC/REP/REP/REP/REP/REP/REP/REP/REP/REP/REP/REP/REP/REP/REP/REP/REP/REP/REPysARx9QevwD4OI+WKJ98Pr2gZv74PXx3r4PnNwHTu0Dp/aBU/vAqX3g1D5wah+syT5wax+4tQ/c2gdu8d67D9zZB+7sA3f2gTv7wIl94MI+cGAfLMM+WIZ9sAz7YBn2wTPbx/4G+AJwAPAV4CDga8A3gEOAIHosE712H7izD9zZxxJR+w2o+YZj1nD8Cd7WLXjiAJ44gCcO4IkDeOIAnjiAJ7hHeQBPHMATB8QTco93id68F0/sxRN78cRePLEXT/CetxdP7MUTe+G5L4F1S4D93sCmo5Znoxf+OLQBtmsDbNcG2K4NVI4WVAIm45hT93jP+m/rWf97I7fjJR0vaWhJw0df/6qcY/cl/713Hten/2369Pvb4e//xH+jLvjfK+n/9ZjU8VJ+eBTvWHK+X2zsP3sEcryt/51tPR6xPR6x/fdFbI9L33Hp+/dJ37X/I+kLS97/Tak7Vin7IRJ2rJJ1NGkaTYq4BP2/Kj1vfT9p+Y+JBPzfuPP/71mg7x9DPx6NOR6NOe7THPdp/n0+jZUuDB2kSwBXAa4B/Cy0H60/SNeF3qHrQztAhXfoDpz/GnAn4C7A3YA/AB4EPAR4DvA84AXAi4DNgJcALwO2APbgPZ/gPZ8CPgu9w5JAe17CQbx9P2h8EDQ+CBofBI0PgsYHQeODoPFB0PggaHwQT+/H0/vx9H6WMazO14U+R1334217/gV13Y/S9qC0PShtzw+sazye3oOn9uCpPXhqD57ag6f24Kk9eGoPntqDp/awqEgZRz7PS92P5/fj+f14fj+e34/n9+P5/Xh+P56X7zx4LPVjNtz5zjAa3oS8XwBuBtwCuBVwG+B2wC8B3T9cDkQdd6CkHShpB0ragZJ2oKQdKGkHStqBknagpB2ROu5HHfejjvtRx/3HWMf9qON+1HE/6rgfddyPOu5HHfejjvtRx/2o437UcT/quB913I867kcd96OO+/9NPeJ4qcdLPV7qf06pP8wqHH/6+NP/W0//J9jc/x9L5vtYXovgs1g6c7EslsfyWRErZiWsjJWzClbJqlkXm8FmshPZEnY2u4jdwX7N7sSo8W72G/Yge4itZQ+zR9hjrJc9ztax9exdto3tYDvZB6SjVDKQidLJTV7KohzKJT/lUT4VUBlVUBXVUB2NoUZqphZqo3HUTh00hS6gi+indBVdTdfQz2gVXUfX0w10E/2CbqZb6Fa6jW6nX1I3/YbuoR56jp4njFdoM71EL9MW2kOf0Kf0mURSgrKH6vOoOcP2UI0Re6jmiD1Uy8Ueqm6xh+oJsTcqEU/GMA1LBVUymYf5QZEKVsf3QomrEt6kZXpmZnbmBc0CoFM9G6tcVbE4lsQMLIM5mA/0LGFVbAxrUa6qUaNkZmQW1CWLFbBSULiBtYqrWtQ3iiUwHTMxK/iRzXJZIThRwxpZm/J8NCCFpTEbc7Mc8Kqc1bImNo612/GjJ+fOXXQePSPwywK/KfB2gXcL/PlpxeeeRl8J/A3HEhM4WuBEgVNOm3vu6VKawG6BCwWuEbhN4K55i848QzpF4AUCLxX4AoFXCHzNvKVLzpBuEPhWge8Q+B6BVwv84Pxlc0+THhV4k8AvC/yOwLsF/gIvmysd4liVJnCFwF0CLxP4+kVnn7ZIdfPZS85frOoW+G6B7xd4jcCPCLzu7GXzlqieFPgZgTcLvFXgfoG3n71syWLVhwJ/IvDfBP5K4G84VrNzF5+2VB0tsFZgo8A2gb0C5597/tJz1WUCjxG4XeAugecIvEDsnOP75yRlP92xpny/3XdhNeQxHlKV+D8+TkRf4GXqIdXHnhLS78Jq9JRkyHvKDzxORI8yoVeko09moG9Z0T8y0TsduKYd9ZoTfezoz2qO8uzRnyTkhrkq9lx+J9YeA1Z9J5b4vs5jTGOQqgQNU/8HRz42CZbhFLaALWUXsBXsGnYDux12YTVswjq2iW1l77Bd7BP2NTGKpWRKIzusQCE0/xho+0k0g06hBbQU+n4FNP0NsjzH3Cm3JXaNfE4V8jmVKedVkXyRSl1KOl1JZ8ipSjlXKdfV8UqaGDnnVIhSJ6ot6nz1GHX4PuV59WwlvUO57251r3qz+n31ASX/oMw19SE5jWpU0k4lnaWk85V0qZJeqKRXKOn1Snq7kt6jpGuUtFdJNynpZiXdJdcj8WX5PPF1OU3ayii5BLJIyWXyblzJj+NC+oRJyP85nUvn0fn0I0ktRUnRUowUK8VJ8VKClChp6MfgxU/oQtjf5XQxXUKX0mV0OWzxFXSlYo+vpZURm/xzWOUb6Us6SP+kt+hV+pz201f0d/oHfU0H6J0hFvtXdDfdS/fR/bSa/kiP0mP0OGz3M4Os9yu0g96nnfQB7Pd2+kyx8XfQr+kuulPY+gfo9/Q7WkO/pT/QQ/QgraWH6RHqpXXUR1/QBnqC/kQb6UnaRE/Rn+lZelrxCLbSa/Q6vUFvUj+9R+/SNtpFH9JHtJv+Qh/DX/iU/kp76W1cuww0KmYS5HEFjrJwtF4cedmKEel1JLVWHAO9ZEp99oOo86+kzeugzjHQBjLkDu0CLfLZbHiLi9jiIZ7gPayH3cvuY/ez36L//449wH7P1rA/DPIQHx3kI/bBjxQ+IvuI/YXtYZ+yv7K9bB/bz75kf2f/YP9k37LDLEREKoqiGIojDSUN8iczyEqZ5Ij4lfnwKwupmEpG9CvbaTx1Qt9MYZK2C3ovF3+U7Aym4bwZPE7AuQotsyTzXuMUe9pVOEoDZCl21i1yogG2QTlSsj7pK+Sph+SxJPTNpK8jeVLSAaaCrsMfjr+AdUiB9uQ2crD14OepI14ZKU9KegZl3cKuZz8X+lGd9OeklwF/Vkr1iFxV0pqk3qQ1Sp5XyVuddE/So0fcd3PS9UkPHJF3T9KFSasieVJSNzTMVexWAZR0O/RiCvSMFx5qFTxjbsXuAXV9/Ig0OPKLvEXhPPZnHLWKq1ocjRd5P5HztJtlXYWc04V9SUYJLeE8qQh5bawTecWRvEKR14E8WyQvH2/jOYmRnALk4DntN5GcPOS0IeeTI5/S9g976plITrJcY+0jkRwdctBq7d2RnCTktCPn+khOCnImIGd5JIe3HJZJuxRpPLg6hFZhumhnwbOwYXRQDM+/BVZ2FpuH0dcF7HK2Stznwn2T/pePJM0udk3YekCWf3wU3fedlkLyQwMOthY/RBu+8+/Qh2gt78+keZ/dBT0zB7bgCrT2VtT9AZTUh7duxrvew/MfSwxWQyvpJbNkl7ySXyqWaqRGqU3qlLqkWdKp0gJpiXSedKG0QrpKWiXdJN0u3SndKz0grZV6pT7pSekdabv0ofSJ9DfpK+kbFVNFqxJVKao0lU3lVuWoClVlqhpVo6pN1anqUs1SnaKar1qkWqa6QHWJ6grVStUNqltVd6juUa1WPah6VNWn2qR6TvWy6nXVO6r3VbtVn6m+UB1UHVJL6li1Vq1Xm9V2tVftVxerK9R16mZ1u3qSerp6tvpU9QL1EvV56gvVK9RXqVepb1Lfrr5Tfa/6AfVaeEZPqP+sfkH9ivpN9XvqXeqP1Z+rD6i/Vh+KguMUFRuVGJUcpY9Ki7JE2aPcUVlR/qjCqJKoiqiaqDFRzWJMHCeiC0vZOexUyPpCyPrV7LajXImC738tO5edRwuYSlKzFPoGvSsKmvIW+hZH0ehb1xN8MykGmvPndBh3xTIjBZHGMROFkMazNDjnKimBpUvwnaVEZpYkpBqWIUGP0wXQdBJxbTd6PVS4yyXu+wnX9HQh15R0EbSiRMuh9yS6mHE/4hKM5SW6FCN2NXrKepYLqyPB3/ADX86gk+inDHqIrmDQPXQldKoKJRehbImuZtwnuYYFgK9lJcArWSnwz1gZ8CpWDnwdqwC+nlUC/xz6WII/XQ18IzSIRG/BYkv0KtfF9DksNwnNYzhKuwiUlOgm2HiJfgE7L9HNsPUS3QJ7L9GtsPkS3Qa7L9GvuNanu2H/JboXPoBE98EPkOh++AISrYY/INEf4RNI9Cj8Aokeg28g0ePwDyTqgY8g0TPwEyR6Dr6CRM/DX5DoBfgMEr0Iv0GizfAdJHoF/oNEO+BDSPQ+/AiJdsKXkOgD+BMSfNv1wNvhV0j0GXwLiW6HfyHRL+FjSNQNP0OiO+BrSPRr+BsS3QWfQ6I74XdI9Bv4HhLdA/9Dogfgg0j0e/ghEv0OvohEa+CPSPRb+CQS/QF+iUQPwTeR6EH4JxKtZSHghwmjPPR5LjO9FAW8jmKA+yiO+5LwLiToHGh56B3YCOge2A7oH07hjWQAfpJMwJsoHfgpgnWH9rACP0uZwE+TA/gl4vL1MnHJ2kJcprZSDvBrxOXmdeKS9AYVAr9JXF76iUvKe8Rl5F3i0rGNuFzsIi4RH1Id8Ec0Bng3NQL/hbgv9DG1AO+hNuBPqR34rzQeeC91Ar9Nk8Q7p0A+UoSMhCWJ4J0Q/BOCh8JHvgQvheCnHOt9UkzNYO8ibjNLgG+xkr3ODlAKzaIXpGSpEFrxY8irfphtPBO96hSUlBI+gjZQjqAbxBFyUsJH4av0Tfgq1yDho/BVePxqjJCTUVM7yitEDxvDfsk9OdTgdpEalfPr5RT6RuRDy4hzaCFxDs2jgv3nb+pWnutW7us+xuv/qnr8d1Lvv7NVpPoM9yTCRoyP3Bsj7k2RU9RKpKjTD73ONVgJlTL+1bBl8Pd4v80Qvj8fX0TjvtgRxyEO1gQveCyo3gqvehz83/HweDvZRHBhMpvCprIuNg0e7wliDmEWOxGjx7nsNFDzx/D9L2QXs0vYpewy9PpfsQ3sCfYn9iTbyDaxpzBaeJo9w55lz7Hn2QvsRbaZvcReZlvYK+xVtpW9Bs3wJnuL9bO32TvsXfYe28beZ7vYh2w3+5h9wj5jn7O/sS/YAfYVO8i+Zt+wQyyIxkmkpmiKpXjSUjI0i56MlEZmspCN7OQkD/kom3IpjwqoiAJUSuVUSdVUS/XUQE00llppHHXQBJpIk2kqdYkIXwfxEceKESnkgl/ggT/gg7xkw/7ngp98lqUA0sNnWgKw6KWR2ZYqWO0aZXx90Q8aYf8rx9d+jLCPaXyNvyb+HTpIwWwx4pmt8Pk/jrO8D0AXyHFV2YIR2sZbKHoGrmlYvOC+C/k8LYLE87uSRSRWh/51JnLVSk/iI/V4jNhvYYniWY3oZalKpFzF9ZPoh8RHFXhKeLLwaPk1+K2SPDoWXi10CD8Wfi38W37sQulNovxoHOeKsw6lPm2idrl8jKt4fLKnF/b7wh7fNZGerkO/Hl1qR5ZZuVfLkrsMsju4Z/8QOd7w75Bk6hLcI9RZLWbzRu7ZRaxxmP7rOAYNKPcJLhE3QB7+N/tG4r9I731D39IhOkxBCqFLkCRJqpEipKBggqAdZBXyzJ86LO6LYbsCpYHyQGGguHheoCRQjLMS/BUFynBehLMinitfs/9H/pi7say5sbipMVBR2FQ4tqKkpbCsqLiwuKm0tKGlOVBSUlFRXtHAmFT8FIELdOKYCUR/SKdn4Op7vSc9dNKVwN7HeyHbJ1fS7yG0BHZFg5nil0dDfi45efJxCRxTflaSb7bgnZB4okL+0DPPhK9HV3EcCwGgF2kG5XYCpdJVtxH5H8WFAgs6xmg/nZycNeoN/CeFKxv5FY94nwV/cvUBs6PxoETSCE8rvzzxJ34pw0qkQaRJBWSBuFKWfG57VCmHbFePOWERWs1/ccVaX1r4ES86xvBiCwqGnMbFFSs/PIlf8sj1LBMvjPyM6CUi32OLk2/Ippvn95+6jOgOov5LP38WVH+HYgNxlbgWjZ4IlUb5hTrdoPY8BRVXVczn7+hB+opFMbX0hLQS56vkFGPkYvR7KPxoVTRPVCsYe2gSs7cz5ce/yMtnNr9VS73BV9gLquvZdjuDluaGaJ20Gp6tnQmPkMnV5RdSoj5mX8eGYBtiQkFoxDjgeIETWDxwIksIHYZNSwTWMg1wEtMCJ7Ok0CHYk2TgFKYDTmUpwHqBDSw19C10qgHYxIzAacwEnA78DXRsGnAGSwe2MDOwlWWE/glP3wKcyazAdmYDdrBMYCfw19DKdmA3cwB7mBPYy1yhf8CSuYGzmAc4m3mBc1gWcC7wQVi3bOA8lgOcz3KBC5g/9HdYuzzgIoGLWT5wgBUAl7DC0FewgUXAZawYuJwFgCtYSehL2MRS4CpWBlwtcA0rB65lFaEDrI5VAtezauAxAjewmtB+2JJa4CZWB9ws8FhWD9zCxoS+gH1pAG5jjcDjWBNwO2sO7YO94fu3x4sd3BPEHu5O1gY8kY0L/Q02qB14MusAnsLGA08F3gubNAF4GusEns4mAp/AJvF9UWxy6HPYqSnAs9hU4BNZF/Bs4L+yk9g04DlsOvDJ7ATgU9jM0Gew/RyfymYBn8ZOBJ7HZgOfzk4KfcrmsznAZ7CTgRewU4DPZHNDn8BXOBV4ocCL2GnAi9k84CXs9NAe+CbzgZeyM4DPYQuAl7EzQx+zc9lZwOcJfD5bBPwjthj4x2xJ6C/wZc4G/onAF7KlwBexc0K72XK2DPhidi7wJew84EvZ+cAr2I9CH8FL+THw5ewC4J8KfAX7SehDdiW7EPgqdhHw1Ww58DXsYuBr2SWhD9hKdinwz9gK4FXsMuDr2OWhXbDrPwX+ObsC+AZ2JfCNAt/ErgrtZL9gVwPfzK4BvoVdC3wrWxl6Hx7Yz4BvZ6uAf8muA+5m14d2oF9yfAf7OfCv2Q3Ad7Ibge9iN4W2w6P6BfBv2M3A97BbgHvYraFt8LBuA76P3Q58P/sl8G9ZN/Bq9qvQe/C67gB+QODfs18D851c78ILuwv4QXY38EPsN8Br2T3AD7Oe0DvwzO4F/qPAj7L7gB9jvw29DV9tNfDj7HfA6wRezx4A7mO/D/XDf1sD/AT7A/Cf2IPAT7KHQm/B31kLvIk9DPwUewT4zwI/zf4YehM+0KPAz7LHgJ9jvcDPs8dDb8AnWgf8IlsPvJn1Ab/ENgC/zJ4IvQ4/6U/Ar7AngV9lG4G3Ar8Gv2lTiPtOTwG/wf4M/CZ7Gvgt9kxoK7ypZ4HfZs+F+IqF54HfZS+EXoV3xfE29iLwdrYZeAd7KfQKPK6XgXeyLcC72CvAH7BXgT9kW0Nb4Ke+Bsy/iLwFHusbwB+zN0Mvw3d9C/gTgT9l/cCfsbeB/8reCb0Ev+1d4L3sPeC/sW3A+9j20Gb4cjuA97P3gQ8I/CXbCfwV2xV6ER7wh8AH2UfA/xD4a7Y79AK84r8Af8M+Bv6W7QE+xD4BPsw+DT3Pguwz4BD7K/BxnX5cpx/X6cd1+nGd/t+j0+X1KwLUWUz+PxosfP0KhgOJLJq+EOsav2Sj/c8TQ38YQWA0EKVEhsIrQzWwCOHVl8MjI0eusfz+EdBaaNR6aNKG/2GE5SRotJOhyZiIOfWg1/wBsr4O0voEZHUTJPUpSOWzkEkeaXkRMsgjLVsgYa9Avl6HdPVDkniUZT70AI9k/RS66iZI/kpokB9BB1xBZ6N3PkqL2HW0lM6BvrmR5tEZNJ9OpsV8FotOhfS/ib5+MbuGFrLTaAmdLiJtp0Nz3YG+/jA05E/4HLaIwvFo3Bu0DLJ5EZ0C7buQXSDlSwXQsb8Q8bozoSPuh7b4LfSAHDVbzSNmkh99m0fLHqNEaOLz2c/oBAzjZ7Kb6USaRdMwPrSACj8CLaNAYw3aEqJcKqdxIo5zMs2lH9MldJOUIZVLz0svStukHaqbVb9TPaHaZNfbzXab3Wn32gvtVfZm+xpHqsPp8DrynZIz2pnkTHEanGanzZnrbHOe4jzds3nXlF1Xf5D6IX2o+TDwkeajnK9D36pDISFvdnY3McqnShqvxNdOpQtQbhrKfQ7lviNtj5Sbak+zW+x2UW7lCOXqUG56pNx5KJft6vqAodzED4s/Yh/ZUS4LhUJfhT4MbQ/tCG0LvQfNxqCnGLQOC74WqghZkV4XvJSxwy8cfvTwPYfv2nWKLPC76ndVMvaBZedjuzp3du2q2VW689SdJ+88Yef0nV07J+/s3Nm407szaWfittWOcx3L7N/YNXZV5s7M1EyKy4vJG9arFgwC/lsi8KJBd8zDtUXDcr/vj8vSWbCYF4G+E6iTJsLyXsgWQALOJ3nvxqlCzuZBos+ALPOZ/uOycVw2RpMNPfTtQs6dUCGLp3VMI63ma9DXMebvWMfiJs14mOj6mesodOU61mxdD8ugOnlO3jpGfrt97JnNa+kUnEh+ZOQ4cKTy21vWqjwtU2a4ZtpX2leOm7fS3mJfMHfeWrVHpLhw+sqZBfa1bOqMM4G7ZjjWjpmZETk8febMKrxHzd+jFu9ZORNvOEt5w1niDXjBYdwU5e+wr1V5J82YPGPtiuaMtWOaZ2Y4HPaxazdNmrF2U3OGY+ZM3BUdqSnSi89MU+ocgzpH5+AgVn7LVLwDr5i5cqV85nKs3bRyZcZKtEM5X0fsyIwxSgYazl+g8oxdRysmiUsrXI4MnuFyuByo1sxmFBXn75g6Yywq5piZx5hYyc3Db6/A9rpgN3PZlD4kOUyV2wfjmiTSbL7cNHcdy05ex/K2c8aMnYGzgoz1uKSqm7mBcePvYercDWKhRQqO+N3r8RwdKiwqLw0YCqikvI7K61SlJV6XMzrGV0eBYqNBHx2DP4NJ59AR4P2KUkkTY9Ql6+PVeZmZedHFMe1lZS3pXk909MbgPHolyM5vajpfV5GuseqSTKm6OHeRPxDb1tBaYy91OVL1JeukMw/fJt1xuBhNEk2bgJHTO5CoBDRm3AYIj3Az0CqxfUqXUrmOJRas55Nkh8ItS+QtS2RxdTOVDMYzGG/qengnvEkmp7e0pExugSqgc/3Cmp1ttWZlTT3zTE0WPwBIjwXT5Dp46Qnyow4qeDatbOhLB0pR8wz1oAyJZ0gsJpIRzTOieUZhUWogxlUO8M7XjL/5dE2HtPrzzz/H3fkoMAVlZcAr+lW4rFj+YOygVw9ropFnGHkTlQwzzzDL7BUenWCvPAfI2RsDYYjfKqdapGqkyUhVSFOQMqR6JU1T8i3KfdatEApXaUBAIEaAwSXAVQ5IBbpm1jzdrHkZ0zNOAcw8NXXWPOt021zbtPdT5qZsb7qqaRN+SLZv306ZV13F6azCCP4xOix9AZ+vBL7dbzbwxWtwHHnFc8X2GH7kFUTiTeBVS1CqaESaq1SVp3YlLVKuVyD1Iq3l8m8qWMf8BcOEQ8nI5Rm5SgY6QQIkpg/+p5+ZIG598D3lI0hRvspXblOZSvPRLeok3k9sZIrJJ5/BpjLotVKMwVVe4vUZ6kilN5pKtfSPnLFlvsT6WIuvyOpsKnFkBprdlcUzbfUJ5VmecdVuS+n4wsrbSrNzA3sLvc6SREq1upLqNJa0FOmfWmdhY763zp+uqq6O8liqdPaol7SuotbirLYKd1R9MK9I/5eYKrrNm5fcG5XF9wf6Qx9Kf5HWgIRW+Nel8JFv2sCXUPHJAFCSTywbxFG9WHrNj4pwVCmoWwRqNXFq2cOUiueEiR8kdDaeYRuU4eQZTlno+ELlGvHOFEX88AaQMw3kxJ04KhNdMdWZL3Hqic6olXzFZbKKMeiNZCJfVOSyTTry+ovOypy0tJwqx7jpppwqt9eakeW1uOjSuuD5NXS/s0pcdLqrs02mnGqX12LO8lrdNNOcV+v21uWlz+70gJrV5WWBuqryyhJKcx+e5dSFr6bl1fmGXOcySiwv9KU0X7oco457N/Blmwotq3BUIPSSFjk+oZe00EsW6KU+iJCWWYTwmHC1SlytAn3LIZXlBfLxmO1smERuEMsJ0kUJDhw5RQkJSB3iHVw8/Qo917FivM2BtGSrfF6GbhomX3lpPilUNsXI5LNJJoNTK/GDgCCqz1XqMLhsxMlMeRVzmr1Gb5E5I9/or8suHWMsNZX5suP0dpM7kKk1+kptTZ3qqNNI3yypbHVzNJaySSXOmnybSkqoL7SV+owWQ7mvwJviNOuoyeguMHtKXclTTrIUGpqaUnymspNbczg9oVvZKqFbPaNq1gFFKutNrjOhLwU/CkNnkyTdCmE2bIBwytaBcV3LX8T7KNpdVm7SollG0+b2SSc0VRQHCspuPPGNsy5+pjOncf1ZZ/R2ybxND53N/ireZR14F5fadSyJcycG79Twd9YRJ1c5J1V0THpZQaC4oumESe1ndfWecdb6xpzOZy4+640T5XcWUzP9QXoQjDx1gzAmOsHDOKQMPFTeGh/uYym8qSm87X2Mby1OEVITFTmKixxpIkc65aiwiEzlphiDKcbnivGVl/rKTVBJlEqXmy6bUjOVJldPWmFaIbVJXvKPzZMW+5cu9S+hvLF+ukapKyuij+kDCFi9bGlZRM+qIFNxSKO2Mrm26oIBuyJbh2hF1cYq1gHaEBbB4PrgoYem49/uCWvXTvijXE7oGoyqL0Y7Gwdb9KSIRecl6bcrXNQO19T8Xi2LlpXwgCmHwoVfUn6BLSvL5nXFpmYaS42uaI3PZvMV21LdPn+G1lScEm7rbiolvl9Eg7E6iVlMdS7ky2FwFJMqeJiKJsh1/ZJtxKg+gfkH6irXUDNCjx3JwbiAOxe27GwNXAzuZmTz9yaFXqcfS4/hdWl8ZXLBMNnn3CQfeScHP5kkPWY/XGsX4lMQ+pI+kC6DPHlYF2waHvQVyLYtCgyI4udCXtdDb0jQDFHQEY5B3tFg7cKXJdkUHq/nC28PDWiMAYVbh/N8SdEZFJM/scphrZgUKJhU5bBVTi42+zI0mgyfuaQ02eLVeDqXnzD+wml5vknLp029cHLWuPSqU9vGzq21LP9p29xqeafrCUBPSueBplUb4Nbw5U0DfXaQpRH0ZML8qnAaLWQjlksiF7GAzgcpD+gCBsdPltJC79oJZwU3tNLT1FH9k8Nv8P1DuXj2NdDKwsvRR3inB31sEd5l8LIyZHokiWVR/J6MZE4/Tg8SnV32eVUyUaJjVBBtB5mS7dl53kB8a4LNX+3zNBRZnCn3fxOcRYvSa1ye4iyrJ9VtTUnxVWcVtmUEv6ZxeP1Y8O9J1CnA5si+jEHIfjxSr2hfPKxGkeBc6YgWwSGWRHOLwJePJUW4FyPo5OfBtnC/4BpKqHZwr3SQ664K8zZG+CnR71eMTfdqS32FY9PymnKdNXnm3Jzs/NiWeGtOpbewKUefmpmlTyv0pp2v0Sc1JKTUNTj9GQlNFJeW684p8qe59B6LLi27PDO9wJMRJamMvgr3nCWy7xwLHnwKXsehn83hDmhYq8QoWoUNckSFlo30BcXrFa3WRFSNBvepleeit3JrCAkSLfY4iEsDVI4OzijZg5+Q69TZsxdT968eo43Ba1ofo0/3cvnrAA+eQp1crHkD3GwJuoS/ORNv9IxIc3kpenh8lBqheVy4r3O1w2ktd5UCghZBFRQq7yrr0MelxidVOCx+W3J6ToW9S0feP8c0ehoKM1x1UzSmRIydElOMvhKbI8+iIYkKW39v9DfllU2tgAPBalDfdyEzLmitH61jARCoBBCI9Pn1fEvIIdkLNvKruJK5XfY2MkGb9dxTGVUDyB42X16fI2TRhNQc8S/cR2gFI3dwXXAcYgJ8DHiEVxYjdIS+cnJpelrlnNaiZp0/3pudE7AmkKRr8mTWB+yZZW05efnZJe4SDBWzNUVTltS0rphbadVVJ6b5qlszzZkpBVPqK6ZXZ7bNaK0f77JIhdPqPZxvY4HeBd+ioLSGDrqGDHPQZx2lDpWL2qDFb/74PMk34fAqPr4oi9CxHO9avoFvlFH8tzQcVUf8t0DEf2uI+G8NwtZm4640cTUbVzPFVYtC5XWsdVQfri4iM0PpOeCXyYrFILtfYaXr06o4QVPDOkhQN6qisxiuW44+Ozc9b4zPU19gDriqmzIrOgstWeZEkzvfaHYb4+PS84rtubnoyqlWu8ZT2Wh1lWVb46S0cQX28mxTirfCE6g3SNbOsdktJdbmlMxsU0Z2ZlpCUobNbUrweS00RZfj8xQW2vX29FTelytAvzdBv0yM0JatY/mQtAJABmyNS8gf78fcOciH/KXiOLWA0y6VZQgZzB1FBvkGjyzBBTsjpS8OaDROe/sRGq3cpYUIDhk3qJAbtlLG7UWtyV5tsat5jCQlNTodjVzqxuUsWJRedbLdFUiMMWY5CvzFGlNCU0Lq3FPMdlOgq66kq8Z+1/UTLptTSiavtfyEWvuU1s5W3u4G+ACv0LOoiomdMNgL4G5PkuIZGZQ0PSIDii8XM2ocArck82H8sIjEoOOrhcuQk2NV0ogTQS1ZNuFYZDG5jtewV1HHFPSNczbwcQe0Fq+jUdGzlmRuNwEF3HsyivGInGvnNY54Wem8kukj1hoXUd9UUfPo7bITlj6KEzakDcIhc8amZJpK4JCpwk05wjGjtkiLuH+mkyokHnExKDYhpkB2hGVlX17qMUUZomKKaU9m8Kd0cebuiVsbHlX1jeFyym6lv9IlIl5jGuTdbWBRioHH8/DzMNxxVNAfgxM47Gr/hNvncpRbGylXrZSLwQdTy+V6Sj3lKLicLgpeaaNPgmmT+1SPNmyd+IZs7xyhr+hhqReyksNOH5AVbrclYTmOjFxliZ7Dx23+iOQMG1gPlxxbMo/3DJOckjq1oojzyacwRG0l1y4R08rOnmZyZ7lNpf7CWm2KO7Xq+nnzTK5sl2lRYpYsVlkUm1Xp93j8Nl9WtjMhNX7xieM95Tlud46lWbQvL1ShqpUWsA42m/1xA/RaWIPOwpFdHPHtzSWipWl8+6VoaRLaNyfSPg9vjmeQjOl5hn5QEGbAK1My2nhGm6wwmiLxLG6+KiMO23ihMNLw3HhRqB55BYJaHhxNG9G9dUGpDNUmJpUYKwYifm94jAxtjWGkiqepsgnkMYrNM247u7528W0ndl5zemVOY1eONxAt6WryM6v8Gb6202r87Z4iIq0OvpExb+LC+raLZhUXz7poXMkJLXhNec/vDHajVp0bm26yV+SmZ71Qt+TmE7puObshMGv5uHGLx7k99owcg78hr/zMKUVJ2uBTUQnqZKO7bkpB7Rnt2RVzLmkZe9Gc8lQo76K6saTWpJriKVYV5aydWljFw2eJYNoKjK9jIJHt3zXCVh0ZqhTkjlWChn1iTMzkkWaAXD5HjItULhVZuij50tbgP9pPpBvnS2dKqw/P2LiRokkX3CfiehNRhzTUwQAByWY/5/HmcDRPjSO38m636GJ9YJ98xKVgPZcmMDCLezRbZTnKPdLKxo0gRxtQEsFSya/OZNkRiTAKieAGxicHoMJqSwna5VK5YL03iQypwq/BwcR3lp2WlGZP0Wc7jY7a6WU733MWZWqbqhfPqS8rqZ4nrZ7ZYc5zZ8RIMenZVb7i8QHzhFRnfkZzGdHfqa6uPKeU6HXuw+SEvpRWQj/4WBP3ueTeE27PsAjbYN3Lg2eGSN0zh0kz/DLVgLDykIeKVky6ZGZB5ckXNZZMrPHrJsZmZJW7i6dU2R3VU4qb5phbDYV1kzWVc1e0zrxyhj853aGr11iMSe6WBc0188dlB3Iq03JsOtHvOQ9vBQ8TYRvm8vAy5w5S8INxb5yfc498Ozd5klLJtOEWf6BtCTwjQdZpmki7TGGeyN0TzDDK/TCJdBPfm79quqfk1JUnbH2+ZV6d1Vx9ythTpdWVJ11QP/WyGQUTydV8ekNgTmsO0eG/g9aoM30s5g6mce8wPPLgVjtm66j1Ghh8DtgLuW6SqCXnQ6xcS9gPEeNAOpGuD374zTfkC0L+O1/u/GKSHGfgddiJOsSxju9Rh8FDn+F1GChZ55pINwR3HT68FIW+0hmUv+rBZewKyFg2W7yO5RTwkDbSQRGCXDHSkX0XHh8wC45xJekcxLF/qTSWBnSQx2vbVpxSXj334qayiTW5KVOjjFm1ufmTa13O2q6iqkbNUk1e/WRN4Yk/nTrryhm5OrM9qS4mPT3V07qgsX5+m88QfzC4Oz7NkCTTVZojeHslt6M8MIc0Io3ruck/JI8Wo7bzIQI/i8E1En7Qsc/iDGjCEeSDDzli5bhRAGO4gM4F7Jq4lAqWLg2+BqYEPybz4Rk0JrhJrjPbJGKdBRsYKbJwDDpZvN018ZxzuGZlFPpL6CK2He/RsSw5ih8/6D1Kt4rj1YuJjIgGRQNQS3SsRntxgl5lMdptS+MdtVfGR7VL8YX10jmHH/NP4aMtRXaleaLPLx6or0zB+O9BwRieETOIggM9v0/4aEyo/XjlSLQ2QIE4chEX8KUSWc8JvkotNwf3SwpJg2/B52sLrhvoY++jnlGs9BjoOjBkjPQm8A49eCllBjmJV/OvmXDH/0u8M4n96F8iK0qGlmdow02PVpoeFznSKEe8UuLPpVL+Fl/8iLT2x/nLbNLahscl00wQIpm+gGx9FUzkoPDrJNEnrh6pT8i9gWtoVURDxx1NQ3+f9o3UHN4IHpLRKYykRmnWvOAj0izUXUNfHp4h0eEQeMD11fvQV/xLcbAtWQV8dC3b/LDGyh4W03Qdm6aSw5qyvrJ9R4BT1lZ0xaQVswpLT7qkvXPFrOLSky4dVzyl2sEtJk+dNVM0VaeuGDvx8pNKSuZc3tl52ZySCZ7WMxpq57dne9vOaOCKSraXdEishMjgWtiCNlgLOPXlMRefcuXxhUTRnmgRfeVHnFvmrdy+jsoVDc/QDAQsEyK2If1I26lzpYYbF2OY+FZjV2FKWmBS+cKlr1hzLJoEs98BcXGWNTnsLVW+4DY6L8XuN5ty7Cn0KRN8WSvtAl8yWYB1yzGnUiW6FOZLqeBLuM59MAlRSuwoKZm7+GFuFcjcyhh1LnHYNOzABLbcOLtw7vkmWLscJ0VezogM5Y4cNz/DGLtq/OVzymrmLm9oXD63Ore6Th+bX1mZkp4ybtbJ/tIplVZ79ZRAAawRj8kFTrp84rQrZhXknHDVieMWt+dES+pETQKNUxnSUidktc2vGzO/zesYu6Cl6YwWt+IfNQmdbGbXyA21KD5RuPdZkuVhcwLaEB2Jr8kSzS1xtDCpR+mPyqz/AI2SeUay3P3EZzgjb00bKgoxXI9waQi7s2+M6SrSm3wl1rd/tqly6fNl9SU1s6XV9kCD3VNbaI8JPktFULnLa2qKqok+4J506EvaB1koZyi8Aq2p5BHI7bx4Xv8KtM20lU+t8xnJgTZYeA0to/TMBNEzLRFPnDOST6grQy/1CL6EWkxOqgvaK7MS6qMtOeXOtDynvrC1q7XQWdnuyxpT6IhvitJn5qTrfbaUovYT2ots1TM0BptTOybOmqFPguBnFXucReOqcxtyjUmm9PjK6NQUTYIh0+DJczoCnbU546ucsl2JF2tr+NipgbthQ+2KYp5HVo5SsjxxIYeqo7aCFWJyVefa8jQdfHqpNKuz8/D9vIw26L7pKMPE5q1jaQU8/oJ0UGQ3VtA3nUfUFGqzoQUO1EDHM3SjEFsz0Fe4ByBP+sq+AI0vPKk9b6k9v8zYOWt2XscpmoyqOY20KVjor3IlTWqnV4KN406uMClfF5UuFjQZ8z+xGwNmImzhyKW95EXphTnBv3XA9n4lJcLFEXvjmar7+9rfYetkvsP+xisGKyZypFGOIvYXf7L9TV5xk3TLzBulm+dun3KrdOtU2LAE+jsH2OD9wSQxMcCks1BnDVsUrjPx8mhQjaJ4RtSgDBXPUA2KhQz4/sO6fR9ai6GHqGmCcoSaqgKmQHlAJfsK37678hbVL8987e8rH1Y9cgadQm1ffBF8KXgdmYKfKvybLsYjXQOzMX1iIVmMPB99jPUeqOZArURdBMl0rm/3XrVWemjuX5fSGFogfLZfBf8k96tM1KFK1CFSnkKFkV7PB0u8Lrw3xSaHJ1ip1FHqID7yokuCr9HO4J205PBfpBlS5+HfS5PlctpDy9m30FmQ1cFjL5YcHh1EjeDFjjLg4oMtQPvDU6Y8LPXWHq6vkcuIC71OSyPzuKqCYfTDs+UUEzeJTJOkW5RpXD6Fh7ptFnVr3oDSRIAxV7YBct3k+TE2TNTlcKZ8tzpSPxOcLAyxXGlTpjzySJv0VO2h5+RyCsggmaQH8YBXiaNGZlkH2twna7ew3MtyNOnlM34urZonPRg8g+owssRQInQevRbqHTZnLrjwWrCgvVEu8x4phs4S45yj0MQUc0/xrVZpTvv5fq5ms2BfHqdnIRt+9sQ6llcgzy/kDfI1+KyCOTLXIMeyZe8iR+TwZWspyHEpS9Us8Eesij8SpqOyTi5mZDfjyJkJHvnyKVF0HokKD3dlX8Qa8UX4jLsbJbr54hDhjZTVkzJpHl4qqXPxOKOPD4W1FCNCjE9llueknzZjQazBZfHkJzSkdzbOPH2BJKU2WfOrEvVZ+pIytybFXe5pGCepkgyujCR7Wr4zq2tacHetJb8jxzyDSFK5vI5cOfY8BjT8B2TKgGH8KtChgNdIpkfYmtgj42B78gAN3TjWKd71qNZFUUMjTwwkJnMzz6kSh3ssET/EqFgdr8/rg7EZecrQRpRc0GFxpC+UjK3Z7tZyp6tuWqCspSbgq9BF+TUpCRqddE3wTUumuXxadcmMBnfTrIkTJ7ss+9UGLm/ZaPfTkB0Pj6mljRxTG7naQ6MY1lGiGNGDQ2pJhV11bldtV5Gzwm9PaFQnmd1pVQ1JmQWOwoCmJs7qr9Y46qaXlU2vtmuNFm1JnDFVM32is9pv9pj8SZnpyTKveJ33gldGiPPTMp88CifC8u7BcfL2cARUs1Uez/EIaFjS+TFfpKlXjs1bh6/3SOLNTRpuE2OOdBtG6gID4yY+MRrPbBHGmkQe/zK7shZyUABdDPki0s5D5XxS7u/5HWVWR+V4f0GbVlrIxbzV6KlMTazMqxgzVuNrmF5Q3FXrdBop+3B7tS2nw+ntS8ue0Tb+hAi9toHHNnD50qOte5EpoJO96mR5jhZt5BGvrZzGxyAXfFEA90AGL4yRKeEcJiFWcshzBVw4UmWBppSy6TUYKU4uaJxSoAtubC635ViSVQ3R5ryGQElZYWm0xl0/vbh0Wo0jb+xUT2LTVK3BEJudYLcayFbYWB9A6RYI9gzIRzr72QYQ+8i1WCYxwxpuSxyvetzRlh4rgfGBjDSekTbUW+XuT1pkCRZ3NuWeIS8sMMlebGDIMoBoK4kw5CnNzXpvwJ5dpMuItaXa0xcvXkjnNZ/sr/XokuOaohM91mXNwVWCj176CHx0sHz2W3n+uLCAr1YIjxYTt8qxC09klIy7ksNrG4aOLpRZomE8jBp9yDRE2JVJZi4eMm+5lOuYU558SObr48PqS1neUUtHTBbp9NGqwVJO8W1zzCW6Jn9Gvj1FSh5TljuuzOZuOrmq5kTXOfNzyxKiHb62tpr3/I6yNGeitcg71uxz1JwAfVFjT00Izlq6kIz+tEMUO2Ni2yzIQTMY8wHkII39Qh4b8Mh7+rA4J5cJlRKPT9wur4eXI3XG0SN1A+vRR6OWiWeY5IxoZe5XduFTI5E6RaXrXDrF4OlczVDk40oyK3PNi6J0mea8Gu1CqTf4jDU/2VOXH9xO6amwZX5zcItit4Cfkvj345J4pF6jeEN93CdlGlnlDIno6o6cAYo5UvIji1vU4eisK3XQPGnHwoVlGV6v2eLx0Lpgm6R1Z2T4fBkZbl6fUH/IzV5FfZIgWyfzNT/hmdt4/h+9RFZpaSIjM+v2I6KvI0mkvIxoQKvERBYPDQrMRg+uZWFmYYJeSk/NSlvYliqq6/Vuj1e3SLGBEvooWHL6adJnAxWXZWUPZCWR/fj7x2sHqnyM8dqoUSK35YGYVGh/A6RAvfHMN3ZesVbNuT/7/keC37z9Nq9nY+hL4ZfreBw89gh7PczvGNDLipXhdDLK5pgetueYExZq9AlJlBLv1aTlVDikrMNPmx3R0ljxPzmAJtL70DcFbMsATTZwH1LMO8q6NU1wV6UYMz5D72YuwWdOuzxF3xaNLnXDepKiZmJG7Ekiw8UzXIMy8nlGfpjKJhEi4lUxKcEineJirWM5W8U6aKXnmQLKgj7eA4X9sdERvZGklLF+a26mPkaKy3DlpPlrvMmLHHmukniJFkUnW0zukviFtK42MzdRb0lOyjCAkNWu4DYy55W7TLH62OAu9Fm3Fa0Kviz7+EIvga7/Or10FGoeRS/1iS9fyhQKa6jB1BlGCWO7rJiiU+zmvEotml03SC+5zcm5lrBe4j7HP9HGVPBp7ug+Go9LmyKRzszhcemRVwANeBWWUeLSZYPX3eoKp9W73fXTCoun1bnc9V1FZU3Jtjxb5ZiUzDx4nNNKS6bXOh0108tKp9c6mqdNctXmmU8c76rJSxdtaQ4VSrFoixFm9tmh/tPIHOPeVMJ2mVfhtVzc3UuI9Au+4ikhMnvIc5zfg6cGnmEYZKoHBzNVuBItFo2F/cxk0TVlHluP5HF4HYdBiXCK5YkYVnB+69uL/O2ltszyDr+/1SQt3BZorakyemyGaF0NrauwZNurp5UWTW/wODJCpJ00tW2G1pCeuNGaKctAVqiQPhQyYOdjKkcB3+Uir9cJywDfa6GN+Om6rbz3y/64SfHHbUeTCSUkFTWqkPAV/ozpI1HvDMVwDHJC4IEd4W1/McjvOAt+SEZueUK0k7semgF34/C1pE7LHnekv3G2WEc2/0gbkvw9uDvYzeIs00QcB41iMnTK+v0wG8MOpdJNteU5dl9cINZqyshN4Lopo0AfNzUu2WUOvsr1jxl9cxnqmcvj0XwzF48Y+LZz0nIu+JPDnJDHvKOO/wcTW/YFjREJG7KEWj3U7w3Horc0T08vT6zNthQ6iiuLHba8srTyFlN5fK7d6nUW1xQ7rfk1mmxrqd5tzUzPNKZmFvjchdbEDFNxsiFDbzTr9fZAlq/cxRdzm9CmcVI1ZH7pBqYdssqQj9i14ZnruILRyH7UwS7ng1o0kfvYfDzJxEhJaSpcWzj35WJBQ8S+7h3b0tFx1sUXG216a1RqYqGmY8b7ze2VP21+vzgrXtUGE4t687jDDsKYgt041BYMjWGbB8WwZe1hgE4xwvqnDorQfLcpTeUZqSOOV8O79YyKohrqMWCQFh6Z7rBU5FkW52anum2mKD4YNXRotJ66QnIHPynOSUhN01BRsK3eWsBEsI3Re2jf8Jh3zOhe1NFi3ipXzPKLpMtnvDgW3udWKgy2MaUcaSfKGR7zPko5SqB0mAz8K2LeMcvPkpZ1LJQWz3xk3BJpWTtq+yb5BbSRLfgh49+JZRTku74HdsYqcb6BGimx42MKcRcWlftEODvGBEbFuF5Yc8WZ0rKT733umoula077sH/Vqqf//rvfyT5IAsaSH6NsM2sJl60YkaMMfAcc8vAKY/5flR25Z6K8jG93VoLZWtWlDk98SlRGmjE9Lj42JpFevvgqafms3XEmW/Z7sapxqli9IU2vs0r0TPApqj+805idmSrX0Qz0J9RxeKx7ZHKMHOt2lTrkLSdJ79Dlf/9n8CRaKrUEb6Jxynqf5VQMfzqfzeLL3mR/mlseeUsvt0B5os9xe5QtoqN9cGmixKK4IzRjXHjvJovEPdMi9qaW+Jr0OhXSOqmaDGL8r8y44sCIrN2pPrtea+Rbgoxag8Ob0lmSpjdYrHFxVqten1ZyRZIt19JjKXQaVKp0d17avZl5GZrKHMdvMnMtSZIkJWbkOe+251bK+zRy2V0SD907h67rCOs/ZbAXFV4i09HVJW04tFSJr5N9ME0osqs9Sqza5wsm5EWBuq1hj1SmjjVi5xQ3MxJ1l2liUoKGoEkpREUQA4aXU8WbS6VyVIhvr9SqBHVcaSCB3mqLi7NZDCBBZ4rPbgiTSJ+ZlXpFZa79bmdeRiLan2TJzfyNI6dSk5GXeW9anjtdpTI4C0GxXFuSvG9tM+2hOXACcpk8wk2NrGyWhzE8hhOlLKRMZfFyx5aHCEoMk8cvuKUtjkuzeYxpxYHidJs9MTvKkJmdllFUVGzO8MWTlGTPSNGn6+0mf7zdZjSkGRx884sz9KV0HuhaxO46Yp37USLFyizwyLE2/o1q2dDxIHJ8ZF18eiTInqK4PuuYbau8DDQaxy4IsTtyVaUE+LhJy41EbVzlAb77EwknQMTFcMQ4tGQwOWJcfLJZGDq669I79ePNuURjLYHEks55NZ1n2BrTmwIdM5KowBLczT9wGpPxcbQlrz67pFlf7pmn+dmKptQ4fVxT5ewGV4mnwuGdM7kpJiXB0JTTGrD4TGOcPlkH/D+w3zH0Sehs+qdYE9g4Uo8PrxSTd5VpIn3fKtiRjPo5tsqxF9fWQXqSL4XmHwEYTN0kHhGEzhznLNJmRjuTU9OT49WVp59jiDb5qnPdZSk5sZZkpyMmbeEFZdEGb92NmtiWqPgksyOFSluWOsYE7DpNbWxcufvSluCr9rpCm/DDQUO6VtDQw342dPwij1jktUyDqcpHMJbtvIk83wkBNMr6jlPYMer+/yHuhaKDZQbIyyvSt/KXaRWTOYwd9fRdDHouMysrU94OMRK/pBH4p2LzQl+qpot9qCao7iWDdxYYcJQU2WOQIXjHxycj7WUbbUA9OBwcbrQ8z2DbOnSLgWOU49/xHQa27GwyiK0GOTlkPHLLypHA+4YndAcFxZq18d+553jYTOjoG5BTIxuQda5tvb2L8Y+6Jzz11ISgxBSbeQe07Wow+kcb+GzBEeUyxefWKbNkPNXweqQcsTsx7rs+sME/mMH9bZUSz2bCKitbpAe2SYt9izsfw2+JQGd1fsir+2HnK3J9r5ZUdLv0B+h5izKnGjXavKov5uprr3GdfoaUe/nlWS0tTIRR/aEP1QXSGjGydrAAq2eT2UnsVXn/Y5yoO6eC/K2B2sj3IPh/cFcujk7E0VhxNAFH00QbJ6AtJw/Zszksuqg4nyN9I0LJGMMzxgx8NKJKFGKMEFIbiXvxj0aUiCM+vGvfKi9Fm7JV/oDCjK3ylumjfVBi9EtRo1+SMvgHJUrclVkGU06Fo7XLlFXl9GbYXF5LJq0amu2xyNnXuCqzjIPutmTybGkN/8QEnWT217g8Nf60WR2e2ty0yrKySvyVVARnpefVuNzImhm+UFFWWVpSUTlKfigkr8tSLZa8rJQvK5OM62V5yYfn+TU9Dnnhc/BHyor4lEI9mWKgs2+omjmz6tNXsu/7bZZY83dAtRR2wgwr+vDAyNo/KN7B5+QN22Xf0qBEN2Qv0zc8zjFs3eJRlvwNRPU2KP8blLzhd/DUuzxba1QsfcaoM3NG06DF+XJsRBfetGOT6LrJV8wurjjlsnZzQzrNC+45eBAjv1vMjVZ9XnJiIKV0Wp3DVT9NWzl3Rdvkn84ujovqfLlz3+To2M7oaEkbFetpnd/AFwAy8X+tO2GgalWLmZfVqAQPvlDsPj3HnpKegEmtk9efxCkOWhxTRZyWFN5/EoeP6OW1wImy+yY0rEtoW+6sxFwIRWvzOp15JQZXtDTZlwmLkenpKNUaA6nhsjeh7MdBx47v8DlGjror/TZmqPOROsy2/YQbM48rbMyk3CybLSvArVcerFdAJ2w3PUfXCjo4eByVx89cStxMXoEgr0geTBmXqJ0cW+yDhOnDqzgSxULaDaKN0RGVrVN8QjFHeSSxTKNSDzWO2jz45AhS0pGE5W3ZhLY8LvyQ+36gH3IEoZUMB89wDI8kDPBG2aIZFw7qsIiHIsfBUxUPZRSejeChHMHF576DqdKRTCZ4lffRz+hv6LMJYWtdACN3REx7D/+4gDmvxums8ZuhBe8DOAfnMfl/kd1Nr43wbQ6dss5IfJpDvk91zyj3qe45NCd832VSKt0nrQLJfIou5AspdMpiS11k1BEVWbCSqtSZh/5M8oQvtwWXJRqdhhRrepo2NaMg1pWTmpmRkZRilhypHltKgiYhRZ/sr0zUJqalCFlJJ78qVqzx0rMVQ1aQRit1SC7g/ubQ0exRljMO7O0YvsSUx1SjxeZYLgrhoxTlaGABKgUyKJDqSiD+7+ol5FjcQrGd8+e1m1qS5+acrqmWLi8pCT5AK4OfkTH4I76JT2zkg54TMVfpl7A107itoWkvyLqmCN308HBbMxDn4LbGB8+k6MQTq2+8sfG392W/8iquZMOnLaBnYavqWCvfTVo1ZD9+seIISHBW5J35xcree74+thWtbi2Q9zeP2z5qdH1Y9HCY1cniGVmy1aln8oceeGFMjJ35NoTwMKhgq2xrysVZ49ah9kaZjOALQiK7RVXK9tKhczke5QMKlFA4tcblqplaWHZihpTRVVo2sSQ9+IzW4reavRnJ6pZos78ut2K6VbKeWFbWkGzzWytrdZm59LY6v9zkMierIxM/+W6v313bVaizl2eZNHpTvDfRaTPme735zdMmOWvyM+SpoPeKGlIwyOe85HEpwcvZMi//KdsysT5UdTLyq4U/kbZXngeZECpk74g98ElswmBrpo3obO0R3+EbFrtUPICowYOMofqaz2T8QtmqPOlMeja8K3lLsIJeUObkHqc3JK77c9nZcj0ShZxYh/jwMYqnzdfVWxUDwdNs7sPnKD1v5NnugQ8jcic+st+aWxb5I1IG/rm3MvG1N3mfga5OxXkdY3B9XVwUKMwdX2FfdlJVZrHXHNuqSky1phodJq26ISYjq8xRRZfGdrXUzopvUzurusoWnhdbU6NKSTMnFsSkpGhVwT9J2pTU2Nx4S4ZRVSt2N/P/QawXzfuJvF+UIvMx3B8zi3m44Xu/hgZeIvsIJfGwJaI6+PRdiqL7ZK9KSpY/oseJx5eTZYhP7ZSOvO6H+1aV01paPFVt7rzpGeXxBb6ywuuuIxasn/xxy4KayYX6TFupztxSe3bLx5MF/9rZ+VKuNE18g2PqwE6CiuSBFW6VyfJ6ILey3kP+uokS94stkMdg5gL++Q55jCCPFrKF7vf4uLr28k8DyV/+gt6Rp5egf+QPdpl8R2zrpoMN1kq3u8raUNKgx6+xpCmj1umqtjSUjEk1GFIbzjB4iy3WYq8BqdWC9HxxX0Npg6XahfsaSxpSDfx8jAXP1WQ0PmEJeIxGT8BiLeIPFcl6Mrz2Op3dPnxNF49IMmWS8ztWdw3zpAdG7yONRfmbw8u6YpSYMB+Vpiij0vBnHo2DR6VK6HtgbPrtbbfddtYmsaZ70yIcL32mqbJJIpdY2r1DwskznL8doT+wu6QFYp2IZ/AMIi9BvTUsucq3FSTuIyhLqzu68PvV36QNn8nzrivoWem3Ypy6XB5zyt8qrFa+18NDgwY2QbTKqqwL60MPsTK/sHxNuKtaXG3C1YC4WhHJmxqxGMp4VIzj4yLxBGdk8ZdJ3pRCgzellA/6mN6Q2cAY+fMt4nstka+3fOqrL3DElya3FqY4M5Jz6tvrc4wOn85T5KmoN1dPs5Vrqr2e8twxHWNy9TZXkj0vs7QtzuxPtBZ6tHazzpFftEJrNCeWp7vj9Va9w2tJc1fkW/yZqWp9c152mV3jtBXpM90Oq9Oc7qsuMGdlGqJTmnN8tblGaoJiTbWYDBopLtVmTMs08I8zXCDpqBf+EI8ljR2662SwDyvP4RmUmW0mR2oHmJmo+NwpW4f4mNGBQcfrzF6P2exx32f28NQj6Vxms9ttNrvCKY9tedlBKU56V+z/G8smyHMTKvC6hn9wQhm3pItv2PJZ9dbtbIP4X4IHvgFhY/JnLMMfkilm8nchoA++Y7df+ZEfNooemPyktOIZjV5v44ziIjktymottdlKW7Oy20pstpK2Qnupz2jKKrXmFCV54zIzPDl5Lps7xqstP+gZMzNQMqPB42mYURKYOcaTlVk2Lje3vSwzs6w9N3dcWWap0VfmcFd49Rlau1ZXU1hcYdZY9Xax745m02zofDts3KrRx+B8LXxcZOydPWT1QVxyeA28fGxTYmnuEec2HBFi8hXv3sgsR6IYWPAArEMZSihr25UlFuJTYkYruUrDyw/khe33pvsd+vbmDqsnyZgcL1XHG2059rrJMyixMNWaFV/qc5tpttaSbSkqVKuz3QlardquMaXE1zVt9eis1Zm6GknKMBl4ODOfmelx4VsmQBTkxicMj2YMNeaDwhuRIMeMGVV5N1bPmlUthzpelQMeQi+XsXOkClqBMlwb+I4vZTqCm8IYOboljy6UtYQOHVzpMkmaEZxOK4L7n2TH/j1B9RBZL2dj2MkD0s6/wpo1RNqzksN6rQhXZL1WHPmmSj3qV7pV7hONI/eJ75Z/VXgYaBJr9spF3CuXDCPJfklmZglkX+4DJaf4cxJ1+thpDeO15Sfo9akproMQ9kBgJhf6mYEAhF8W+g4u9B1C6Glmvl2XnpIgrbjoorstySmGqfL4zE0rpbNGpN1lFBf8h3RWi9wvbqd66Q+Cdv+HvTeBk+Oo7se7e+6jZ7pnuqdnuqfnvndnZ+/ZU6uVtNpDh2VZkmX5kI1vywYMMWdskBEGgzGGOAT/whHsBHMJQkiIsA0JEI4EQjYkDsQ4Dnc4Y2OThMu7v/eqqnt6dmeFOf7/z+f//6TL1s6+rq2pevWtV6+qXr136De7J9xhlvNqcPyXMOvPiQ5QHjEzVBfIxNLxYCCejsvwMxg3+DerlRHTUhTMkYo6ISXNiGgmpUjSjEbgJ/GjxbX47wtpYu+6QO1d3ew+D9VcRYlZevhbTu9FW20uU29GcYfPTeLV6P3vfz863nzpXj68//d+b/+bCE4N/mJ+XvgATJRT6JnMwnqc7FFsOEUPWN65UiSPRM5OCZ9wfnNIAJD0eOqT/9NIYlRKRPx82xs3G+bEUjK87/a1RwQ+mk8MhyTJa4SNRHR4wuyLXDBJx16OP8KnhT8FgB96EDU+h6VtiVnaPgDYp79Z59gjdk3ZZknXGRaeftgL+Y1eEHlmHqbaNbf8vvx+a0wuB8qano5oWblSNeSIEvaNeOOZqj46XYuHdS2qlof4I3pkIBRLazElIAwLiXQ8GhRFtxFKxsN9lWLJJQiBWEZN1w0R23calnnPAz3ml9yFOv0HA+8Whm/ac5jYVq4P8l/jYfrl/rzb00pqFWdqy9qQR22K3TEWbcsnXPFEgWcS/Lno2GfatBrbZKrMtEjPRj2z19GYZTuBocI55tk4Tm4QkpN4dl/GsrZhxnm7bvCrZbMyGkaDm9hY02j4hWfzZ9YeVyumPGAQi5tCQwo9hvfW1t9Bzmdkbj9V+HGbJAYttW5TI2I7FqWcxLQUukNor+46Ix432brGeB6t5uTit+s7Bw1zbLnJhy659BL+3FTfTHFgV1P9xU+Fv3t6nGB0B0b94a8BZmV7+IDt6EW43+XwemY00I1847Gama7X02aNlPXq9Xn+uetfBzW1Ti3LcfXKUYslV5fjO9xDSnSbpRC3RHiA3Wbu9yPCk7lxJRYuJgKqFMpEJC0QixSSxbZWbv6VGGz6w+6gFIpHPO6G4M5XkoUEsRjgL+U+Tu7w9m/aldpwxvYA3Wal/Ur9rRavFYaKJ3YeFfby5YGD1AeHwPWBzvJG4sMhi7I5x45Ycw7ZnJc22sqaz0g261vI5s4JzWPoezU9NF+u7hg00kM7ytXhgb7y6Ah/kT6wvVKda6ZSzblqdftAampmYnBhZnJ4B9Z5CHSLB7fSLTZZ6bBlmGM7y7mpdeqCC6bvuotubdXoBhc2gauuf114ITl3C8FyJcU93BnRaAtH/T9YmNbZGslta+BhqXMLJs72M8JkrYYjzk0s59Dlmduyodv6JG7TbiJrYWd4O71npYhtF4pi62ooXQ5IrAIxUgHbHRieuzF48MU2m4XG0A3rk3h4pgrDAJnz+Rvf+d4DIyOH+ZU99ChMWKIYWnv8p38zds6Pn0vPupFn9zGe1XCXHWf5Bpvdu/mDXo1ybIXyAMawIDcyccagn35DjlSRUKUcMTkaGsPJkSpxckFstBwc8NizjHN+JPZb35tb+53pNOPG3RFNNyQ14hdgvszAfLmohfe9GubLLt48GM2rSSMkyTh7ajB7ZvoiR3lY3YCM/LpwN8ydLtAk52Hl9H3qWU3jLJ/+E2yHTuNqbIfuAVCo6W90TUy1yOlVugOzYxXXzRo3R3i4i32ieRbPfs7LXPqdhZfOc94F4OUEqWbI1mnKbKhjFQWuTL54Ab54hlVuG6kcfWOd9G4xudts73h160YlrNDXbppODY52z/ixSFz08sNsyg/LasCa9Pe+8z3nInD37GVnuAfPpgXE9FiI7+gBaz+10C1whfUK/wGyj1rnLqMaGPWa2NlRrdo7qlXmIWbLOdxEgtm9o4obnbb649xbVSLuztqW0La5Z/mRH1uuIZPFejE53mzOxHaZx3dfeRVxFXk9/ymYu+p1mMO+X5voKxQbZrVVrFTHRi9eKY/XC8V6uo77xsTPoOsWoQIKN+4bxxW6n0zpN9t0JHfop2y6+h9O+jGbrv3UST9u05M/c9LfbNNR62J+p137if+IOHcrvWVEHeX42S5HSOph0f6MPEdQG6mwbXa3lYM4nMIty1recRoNACzyctHF382/f+075OT5hm9efzn/IeEMcx330EO8F+/cQ/sa6/PoLxDah065vNzdN9F2E992hN9Vyu8vO+k323TlESf9lE1XP+akH7fpyc9SOh5tP07Kx8vlPiG+fg6hYy2+S8qndGV9B6GjciOT8ildXe9D+vp3gV4l5VN6cn2C9E8G/nkv9A+eCb+q+0zYmg2xl/AcOMjOTs+wu/f4Kd3DMwIjsAvPrm4DoSgzdadOE6jdAG5+mmzzM8uMhuRengdJz12xe/e/Xu3wPzhn6jOXLlz+1rfyk/v4Qi8nhA/v+67FY+FigulBiukw5THxe0V4PET7cMlJv9mmK/NO+imbrpad9GM2XRt30o/b9OQ4sw3g5vk/5j9EXDN3bIkCRPthuk0bd02qvuGTJydOvmIc/r315ItO3jpx8uXjt7588uRJOk831x8n/qEMQMsw945uz+TWyX5/160iNNjRHqU31K3dKtwBCbCbdy32ie32u1vdo6/Ty11Gp7bzgSIgIUKnOuZVCIukNGoRys4F6IYfOxKwFvpVPsPHqVtXjR/g+Vduv6F/pX+51hi98JY9c89p7hrcVWmMXfKy5ZGD07nC2nvNfc3WwZmiIvGHzP3hcnFf3/7Wixb23XrJWLW43FxuvnBx/8mLR/dWlq7afv6OtTflikIDPYTVDuX46/Os74j/H4KBNsVAzEm/2aYropN+yqar/+2kH7fpSbfzPO9m+zxP+RmVjzjunybjL8W9uJc/T+s+GK4u/ewemKWJ+m1/ZTw5LtpSijrHoswMSx8kh1hJdi9X7Yw3a/cJfZU9+6ap/S0lObRv/PnP+crQ6PDgc4V3vS4/tjOf2TlZvvc/Z9pDM/xjdK38lJAADM7gKcGUfb8Tt7n72Y6m5Y24DD/9BBzlliVRttk7CZs80EwjYbqnT2JqbkSN9dvMYGCcNcRtnQUUN90eattu3OXirmedKMyPZOJmwYxnW+1WVm9O5eaWEv3h4f5yNTvQHsgm82Ux6K8N1ton+J9dcLmcHykUmnktaSiqnkgURmqVyXIsn2hLmXLGyGlKplXJ1bOGHC7Lldbo2NPkzJ74VRHeBf2/k8wfO75LcUHp99v0ux530k/b9Gt+5KTfYdNv+l5v+qlvO+kftej8BVEqM+rQX0+C/rONW+LO4/71DHcI8HQY/j/kWCkehs81kBI7SR9hjC9cLe4mv1F/Fw9Ah9e4neyA/gx3HlDPs307MKcuZ7Gp2WQFMIGECYpU9ANO3b4ss3023bZBmyCXKVCuoAMg6upubpUa+exkm7H7VzvX86Y36KS/zEygPVYsgPwps11H32pxZgAtZfKvaLW0vBpyrQQzjfHS4DmakNozPLpvOLX2OTHdlzGrybBrtzfV2NbXPpjmkxdONWYiB2+o8g/7E7VcspiKusR4abxUGCvFogOjYUn21CNpVSzncuXitvOGpGy7noyomp8YDgxWSsMLNf3ISqH/X+P1vBrP1RO0X+vr8+hrBfp1geojgkV/iv8KwdkixRnnpN9v0+/6byf9tE2/5idO+h02/dSTlI6W/j/A8vkwLf9WSse4pF/D8gndx921/hyid4DayAexfEa/Zv15hP4NoOexfEY/tX6Co74On+J/KoDCwY1xPzvDjbdoZK5xByrbEo2qEbHjPSAqhxy+h/AukYcbIjOZwnJRn4hDJH+W2Ug+AEI3S6KE4YklzbfZKn8rk5aN7ln6bfcs9IQgzjaO6H3dBKuD9Sllf9LZpzNbxPkYGeBxuqTaAF1F2XYszIwyPnJktpib3N+sTMuCsjN7Zd9Vx1Yuvmzo6uGdddmcOjI9uUPKNTPZgWwUfor52SNj40dmc4YyuJQcq43srO8eLA5Vzz1y8cjwRbvru47tyc8OpPWB2WJ+pmmQ/qX+LxAPB6jccXdw8lOCt3MpHrxO+v02/S6Xk37apl/DO+l32PSb1nvTT61R+YUxsr7Ff4vYwRjc9MZoEHF2zpZadewLdjw/0EA2EXYy09krrMKywLl3yIf1akU3KpUf40b+I+yXobJulPAcdX3PrdZHKlO/y/+C/xzUpwiy6a5OZI4BqePjqUU0L+suNz3fo/FL8kznok5fKD4bHT3Mze6kxFqb8GepXXlQsWK22lUitAajnV3tAjhVfYk42cXTIAsvVXalh6oDuolX3WsrZquvpenl7UeGxhdDf51tTezyBz4e6RNVZaQ6mNk/iLZPmjZaHzGXm2i0u+vwgXL+7/L83gv3avXYqpzEviT3UwlWzqdYYX1P6ffb9Ls4J/20Tb+mi36HTT/1c0on9xBJORfScv6L6ljkzj3x8fRbvXOPP7VVarxjbt4dOIt/l196554jG0O6fedet+/c5yxPyT3u3DMlh05zu04IyjK5cp8ZX+lvriSEEyfkmaJ961748NrfdV+6XzGz1rV7Jz/vsPl56nvOtf64vdZPuZy6xnW2DvLaXzjzX2rn10PO/Hfausn51l7C+pzwKoITzO/jj/GTXJDkn+MfJnPeTkrnXkXoxJc/0a3LVLee6ciOTxI8LHThiuY/ZedX8878p+3816w5819u5zf3OfO/wcrPH204899g5080nfnvsfMf9nD2uvRNJH+F5v+5nV/4Q8BthcPLIz4hw7+f+//Vmv3228++Zqe+P4Q68CDD9XE/3NoGI7mlfza0plFWO37ZdPbOssrAz4XVju2GxRt2xnaW+Z+Zf/d2WYj3JqL20UnFVg1ocLkYEyGWcwrLd/8DRI/KbvbkNua4R3V2j2633XZiZmZrr26X7zh1asea1O3Yzd5/Grf3n1JfdeqB19l64GtdNmYh/6V2fv0bzvx3Wvn58wVn/svt/OZ/OvO/wc5/tMrygwyoEBlQZWP9y2Ss19fH0P+cnf9Y01n+DXb5ib93ln+Pnf+wqzNGTxEZUKcyoGTlr/DfIDJgmcqAqDP/pXZ+fY8z/51Wfv78rDP/5XZ+84Az/xvs/Ed3WvlzGCuC5fcJWe4BR/5VK7+QO9aRGZeQ+jdo/dn+LNHTCH2F0ln87k6chij3dnowi/ZJ0qY5EG/Y9YrU0LlBR3cgfouRG+huBF4Et2I4qPkxFsOBH8urdhwH/u1r/yi86+1vp5Ec+DvH6blwEv75EbHT+mi3ZxinNLS87FO5gbohrmdDTG7iHReV+jOV0EprSwm56ZrIppBJWSRkN8rQ7ouRVEEz7MBqhnU1wL6G2MNr0qGZmRNvfOMmj278E/OvfOX8C3o5dYN11v8AbwyyJ0n3fbX1bYT+BNAVx/rrJrpeQ+dbvEjkAM2fWl8h+Z8GuhflAMv/2vXfZbrYHPcLMk776Hh8f5DQJ4H+X8Lrgb6H0u+ndETxZ8m4oOWb6+eTPsRcH+bPnDUmRy/vcszhwIkT6D8Ocb7+Uv4LxOetyl1DozBq7HZCN87Rthd9rUbOprltctrpdGtnHZnRKmyK7HHOjTd+qyu4B0YN6RHgww08LPGfZX73ssCXD3R871GfCcUtvPDh2rHIvCfoLaqF0tPZ5tY+0jY5a9wUdIppox6n7z5qdqQxLYAGdkdPAJXVzV794mfxpefw+Pe6Hm71ur0APp3Y0sseYvJb0NdVIuv6OXrWMU/o/wL8lMmewyGO7jm8mM0pOYyjAvmbRDZmn8Nk5noO/fUBfR+ltztzCt3/H+DoGctLCd1Ev3mEvp/Rp6zyMf4Jyw/lnEvL2bGeQz97LD/QHWdEnfyg33G/z/I/xV9M9D6aP/Pcnvn5o9yz1pss/3E7P9Jn18PMX85TxA/6BRvXx9yq4053b0nndHfO4TEb2azwsk/0rtbgUBtWlNDJGO8a1s5XDLQufu49g3+LEVzOlGf38K9b++yLZ97+sQNkjPugnvuJL9Xz8OzO6R8F5xeJyORnEEsEa0FvBVFj/aCtL83ypDoqVsc+Yv0K+iYcb115Yqn1QvRQKMRC1EPh8/unz+UPr01MXfLvlqNCxznRzfY5kZJwzK1kPUH3QO6y8gOuLib9Msjm7tfbuPoa0VUO0H5fdpZ/g11+wu8s/x4rP384RelDQP+W8AHo3wNuUv76fcLf2edK4/a5Umqxo/P8lOhsdM/ktaGOTvIY0WFofn2/M/+dVn7+/K5zsSvs/Gmuk3+N1JPmv1DptGsn4dso5zzzJL7MCN8OUb59rsO3nYRvNH/2OkqfB749h/DtEKV/yFn+DXb+xOec5d9j5ecP/xOl0zvZN9t3spXPUzq9P3e/dX+Ou+shZ/5Tdn71A878p+3819j55zEWh5Wfuztg5Z9Hn2h2/rs/TelBaC9H2jtO2zVN6Rq0d1mYBvoRSmdnTCTuBWkvzZ/4oJX/Kf75wvs5mh/xdkL4W64TJyPKnejE86Yn7SGmt4nPZLzTCxhB27iOW+24uKdajI9J/wiR/mPkSiNdnMjFZx/H0BrHjz/3OP/qL+7f/8WFtY/yO8n4T0G9LxWmYY77P/Q+YbdfNRerZ0Kiqzj8KWN9xQ1WhJt89vV2aNMx07UsAajZFJ52+tjq0C1Z926ssD22B7aOF7YuT2w/Wdh96BDxxXb77Q5vbBfvmCP+2OZ2XGx7ZOucBx6zzwM1NhY37mHd5HLmH7fzpzRn/uvs/K/tOoe81M6vm878d1r5+fMDzvxvtvMbXfk/aue/oOjMf4WdP/2RTv6fkjFH818YtfKP4d0qKz9/7KVW/jn+5/wZlh/Xc6fJeo7EFyFjbpLO4dytJD/xwUbG3AV0zD2fc5yjnrLPUdVvcY69qtP2XtU1bA+F+gS42fYJoLA9KXrvEmXARVQGfM+Z/3I7vyk787/Bys8fTVgyIOeUAUJ23pIBOacMELLeX0MGcDzxgfxJ4otubMsYc1s7Vdvs19jpy7jbhzH5Pu7FQpC/W7gH/jrqOPv3tnCcE3dwxRcvLAmLCzdOCvfs3v168jc7hRK/d4t7AzvtewM891IhwN8l3Am5shyGHO3cYrJ8PrrJOd/gEA+1HqEO4EYiPO+eWXHNeatmseyZE/YKgeWZfKmUn17hMMaFzBeEN+Adqo6O02UL7NQ+v26Uy4ZeqQhyGTfyDdy3F7hX8z/hDwgfJScJc50YYRgnytoRxjurIu7aP0rlVArtjaWu6zqJzrfZccSdxrE/6J+IGqVEoqxHJ/oThq5pepr/yXQtXjIkySjFa9MtU1NyOUVFr/dvXB/j969/nZOdts6sR7wtei/a6YiqPUIvTKGIerw6bijb8+mIGVOjQ5+r1tODcga+VuqPaBy5dxblvwd9jHcDTY76cBC6LgcKZLVKnIIWy/D/f1x7x14+eM0d+4R7XvOa13AcjWf7RgHnBC9Xc/qCYxb15FTCRRa4aJtFra8CfL6MgWrP4Xc+/RL+397teqfwkacX92MIZxIjhYx59Gn25jPccIvasQyz2cHH7FnkR2kYaJlZu9NPdkQNFoWE657UNvls6Cx2BpEwSOtLHTig950wvf+5Si/hhm3z0vbIGN46dgY5g9lhbJvLeRynqcXdr9DbzfT48Zct7XrpJW2z2TZuW89PNpJm++DYyKGZvN43mV1bFsTBhQvbe2+5cLh1wcsOTFy4MBgWlg8G6jsvnB64bP9wbemK6aljOxvBg3Rs/u99BBpT9SrCg3vOFv22E5vDiuZ2hoXL6GBjU3AGZsvk6rEd3s2KnrHFuqIz5G2VIcNTK89ZjL34e9cKM8+JKCFJcAfcoUqqPfGG6/gbFxd/gusPUJ7cwV17Hl97Pcj969a/zg8R2+tkb3tf+BqNrz6FVt3UFBYxInBT60/y7xb+kcvAqHxet8W2NYosmeYjbrpxF8ENvRYniEc7bulRauOeXaWL/sLmHRKiX+ERatkW4CnL2R9Zg9kunLw+O2iL12Xb3fDm7J6Z7LFEZTQzvuOC80U1FVaaWm77y0bHTTVRiOyav3S6dWitsaOVWpxbecvhO5K5uC+m9E/x1868eLzYHB3/X3nxy+SFwCVhrNwsnIRZrcA9qzsOkeWTmSNcQE/qxqN4iiywQCP51Q0ccVmBE7JkwivYkze21UUPJdWEw7Gl3ejqGHS5T33b7qtWnt2sGxPzewd233igr+/AjbsXnntu87Y9l1+xyE/9y+6de1J9M9XYyAUvWFh40fkjg+e/aKnvfYuL76NtwXHPw5oH7UJObm0XYtpxr6m869iGcN1DuNe+At3t6iebbRgeyHJyYu17dcwztE6naiPUFKNNLDPcaMHY7ji4+tnsgcF4dWa5WBytJH28Sx0+MOVduvFAI6hVpw8MJWolM+Sd7TNaJdWn1US+sW0pM3dkVItqekg1Rg5N5xb4vn0n5puXXHBgtrQkN/fNlEbj5clqbKBh/j81D2fXB4VvCvfDJPC7Z49f6+sZv3ariIyejQcAnt5iFLfHA45QjXgM8NrrhU9d/9y1J58jHNu37xf/4mr84l84tqYcZHH0to6Zx+6XkK/jGVydfn3LaBUex3/4C9c+KyTW3vPk2nf4e57+5I/5P9+39sG1F55HvwvvFv/FlneLX7F2M7lb/OvK7t/u/bYiVxP+EmRjAPDc80YZVfvoTQdX524ZKPn8CF90FYv3nxJ4//G19+04fS7/hu8I4tPP40k8ahcIzMuEp/i7yc3pRe7EGW4Jil+G/5cco3GZaMl0/I0xLwZox0k8GEzYvgKChK/YzAwDWJAtyfGuSW2VXi9Gob5ttduPlcbCbRADCOLkgY49GigsUe6YQmRc/1Cfbaha/2wlMzbQUBJ9AyOZ0kx/MtGYqwOlHlfrA6NGrJjNREKwyIhX+hr8fZX+gUosm8nK0Wwuf5nRP24UJuuakq3IsXJWUaoTpexEnx7PlGKxshlfkZJGKGCkYn3FzBDfzJX6Iom0KKa1KF3HfQ3Wp9dCf6S5Oeo/JuBYx23lks/hHBuXoWL3LcQxmUCAuksAcQOru53FsWBSyCXmF5ZqA4oRyMT9ihQ655GoZ1EIXSzMHjwSDe3wB33RVPzpMxcfJya5J/jv8u+AOaLNnQc9UyHzKnViyhOD3Y5P446f417ejR/g6pA/Tz61oYzK1h6Po3xPP8ijZ/GDXDmbj+SFHj6Sn2fRkk2n3+QJrsp/n/861HmOjQup1bEGo20NMX+HFI94QUVYpdvU9OSO+tpoj7RBQLU1H0zo8H8etJ7ixB2L/8RHDo4N7H3VwufXfnLh6PjBrx5evqJ/YvnwynOaO4gTTw5W+Ul2p25zFEgir3kWwc9a4o2AIOTHyppH9fja/C/W3PwPkmu38S9Jrazw5jnvm3uj621zPcr2t7olskNnwUiXflI2XlmvlsfKbSh8O//zNU+Af8nabUn+B2uJlZV3vs31xrn3nfNhOgfn4J+jJL57iGttKW07cd2xCW4WkBSdnbmKc3y16NNyv5hdX58tvfvPhPd8kD/EH1p779rp4z9+6sn/Iv6tnuK+zD9BzqlnnB4Tw7Yfv3DHv1W4F/e81saHLSJdsN74PerBqnbO5ZeLKC/xf/7ptY+hV/P1j/FvFga4JuB3Gv2fgbyCAYffioeU6BOiQlxgIMULb8aYtSbdr7QCs/VJVPvrY8dj+HOIvZ9YpfZms3gu188OJXtbQPchoc865+hnJoE4ydKYCkOMhm50+q2ofwMuDNisMWWT+MTiUTBU2bU7n1psj1aq6jbepSS0sQj/ufx4IxuYdsXNckIfbRip2pjZP7IgTfkaZnpyIJOoz1T6ry9kMoV35lOpfFiQtVSo7VPiUeGPg8niSCnTyseE4WFPNdryG55XhlKl0bI53p92tz9lFCN3eyp8NmWGX+jBMwxATN/6t4RXCH7gtsyZ0Lw23hMwbJ+3UduvEPI+b598tjjqLf4MN/ko027s+TSDjMpQxS1si6iKPaFUpM4tVepcK8OsdOm1RTqZWJafXe5pK531S9eLx0bWHmrJmcFifGlmZnl5RjcMPZPM8FdPL8eLQ5lpJKXTSBL8mad/nvlxvNgyp1YWZ6aWB8vNZq1VaZbXPr88lR4qKouzQKw0m9WBykCZTMYt0HEN/mnA4B9THwzUB1+b3aGgFs8l28ebQdZulvkAtW9uk7doHYVO8lpMK57t4YGaXgShPMswvR5LyzqCS9YJ17KstAzDM/4+4nC6h4ZIY46piNiQqrZfL2RftQiILFJjU14cOnc6L2X7DLOwd7E5KQ94jaxZTFcy9VRIzTfUyTm368APpwUhNXaumOjb3pdqlVMuITRcGtyRiDVDct7MVV1TslmKZxqp0PwurSRPTUXMWN++yTzKKeAjfxL4iGfpRzsn6PTMwYpoZ52bc/a5eaLr3DyHnMp1OEWPQ3LMmAvk5ug2N/MCULVNMd0mX3QKnrcomWJGqTYbQ5F26tyZwfl6LG7mzfgVY0wa/XO6YiiqoWj5fLJWrin5Ps0s48USpfSgJaWI7IXJgH+SfwqqH+Jme8RecG3Utu3AuW7myMMZWBgjepThny/t//sbRz46eojvXxB280+tia94xd/85V+ijrcXvu+DIIdxu6jA3UJ9mtPNTjd8MkmhuH3oZhbu9BPaw1i36fOStRqGFabNV6eJIarQdKzrnOXw0Qc/qbmrZXaIVaZbCSjLvGhciJiK8ir9UPSpe9995Ny8HjG1yLMOfeC9A9X+/oVt9VKxtIt/Ym6mOC564gCuPXsX+cFCX4nn3/pvfL2kF/lXUb27iWtLwEuVG6a6mTMO3sbloWrveGS3CFNrA5/EqR2avWxnsW/xkpHq7GApusenpKup/ERdU2uTpeGF6EKsMrhNbCxdMjr/rB15MWFEJ4KJWCg5uNiqLwynB4yxWCEVpfMv9IkQgT4JAosOdfsLs1ZmKbYyk+yVWcKxMmOuE2zeq2x9QacWwmeybQ0sHrbsN+W97917YkfmTa/+43uHdzVicm2+tcA/Ud1xdPjFp5aNwZ3V3LYhk+fX7qW8RNzcQebvXc5Y3/SMb8PZvl0PYcMdXuu8jiytiuwMLr+Xn/rnj3zkkbW/5p9Yetnim1fs73s1fF8A/ehs9X2dwC69vs/xLcW9/My/PPDAVfANJxe/yrDB/wKwUecupTtpfS26S2atc3CWLz/avd9AI7GVz7J39qsiCcQnYKk9cdlSvX/50tHatsGiuMclZ/oyuclGMtk/VSz3+68IFofmxNLOS2cRSxFVF9ueuBLRhxabfbuHjJDnLx/xxaSQzbdvk3460WuN74zy2csacOO90F9q42db9o2gZd8YsvqqL1wF//FPfOYza9LXv07rxH0I6vTL4szYZl97r76af2JNwvXV/6y/jfs4/K3MqVRr9NK/9ZFbE6AhOU2zcN85ICTleOKKeL6pm/1eGebrBv/Jtb39M2U5LHSw/F9QZhjtVXrF8XRy4BlG63TG6FQ7MTr3XuX67DXf+cmph1zAkI9//Ctr33/0UbsOr4I6eLhab5501G0rBj1eDoDRctXDa58C7hyj42QnyI5zoZwod9Gv0Hfdx+xdMbRQuffakau642rRyPWYLn3OS4QXnSheqQgvmbhFkKAGa+/nD65J/OG19+L/dhu/SbB4w9n3m1yb9pueYTt6VZtWFo8iXEWA0mXfEA5e8H3hINTwg/w5UMNja+9Et4cwN8zA+MfYk4d+ndiTG0d92h71yjMJNzm27bKFUnX3ZVMzly2Ua4uXTiwcTtQmi7uPJBuTYt/SJSOTly1UqwuXTU4eX6guXnFBffeIeeWx5u6hlD1n8G8F3oKSyF3UfbZpcddkJyacLbmoS0l6t3jDHoUtQ1NMb6fLZXvuoBeI45bDNpyah+YrktqYrS1d+ceKGfP7ZFPbxj+RrI4Y5lgj9QU+LmpmNGqoYf4eWufm+ieEeaK/tbhbaVzqIfh/0MHzIYnGGKcW/VT37WgNRbsn+mgLjM2rLdobFbs3cmRxhffzcvatvBy7N9XdQz7L37C9w0R6anL28t2V/pVLRkYuWenXy/0xsVAsRpLpmdnZ4p5zzlvMTTRSyfqkWN19fGL7s3YU8jueNd9aHi/5BZfP7+PnfHI0uHjN4aNXaq3FwebiYMruvy8SuaZzV9OGpNkpl9V/aTY6VPuWLnGeJFne96I99vLPbLx3RDs12d2VzBlh3NK39t4/PF+JykYpds8LT1WveGupr1Cf5Z9IVYeSRrOoef/9n/+ZV/n+SraP599MZWgB5s87oS+HuL2dM5oms7ulG3s0AiHq1b1HjU62M61+Cjm9wbq6YkKSadPpBvbLpelmLjjtRu2vMFIcnx0vGs2pbGa4mg5M+weL6Va5vb1d1gZ2iVLSCLd9CSVaLaYLerLU7s8P5aVwXA20ImlDT2VTqfJkX26yqdN2xeGfe6BffNxgl++uTSq4QBhrzRtux772fXfxt911Ff+upaW1o6TMZeDV16BMjVvp1u664zeijmfFb2Q7SHKvfRCxI19k6+iVTYB8rLw0WbwqkS1FpyaOFqdXRKVvYYhfWnt/upIMTvXzB9YeHF9syLStMpsHfdBFW8rcXtEV5RvvEN5w6AtLIFPfzF+zhvYSCoD6C2QeOsdRlr1T9VsMmqg891rh+qVrhROH37V8QrhuBSrxHv7I2rv580G4r6x9mLZNw7sDUB+Rm+fosbntN/8s0RHxyNRPdrZwyexne1xxFjGRrq8+/+6XXC/ccMm9H33Jy4STl/DcE3/0R/++9vhHP0q/NwL/fJX/EdVbfQw/WCxHTsu3rkvnq2EN6iJf6FKLf/PhF54UXnbBh6/6Nh/69KfX/uc7HJlqOP5viG5c66UJu21kbghxyKMpL5/9V/53137O+9aO8u8UltYuElbQTomsQ9FOjH8RsVPKszt7lP6QTS98x0n/hE0vfs9Jf4dNL3flv8+mV77mpD9s0+sRJ/0Wm179byf9Xpte+x9GX58TgvxTjI52aA+RtTHkF36P4DLOXU2tJ8NdfopQH5F6rGA24dS5xOjloKizuOEdixt0RlSGf/hpfv8X/uIvvrz2yXsPXMjvE17EFjunTn36M5+B+pO1KuHzSyifM7RdlP4Jm17UnfTTNr1UdtLvt+l9eyz6PK6FLTp3N7MDJGtPUs5LaTlsTVqCf+JEv8hyL+j2N+i8fYN7AXgXUbE1OBqtSF/tpV94bP2ic4GmE34I13YG21c1LV/pPVauhLXnNpub16/nnffYri9sWsLetuvu/w+36eqrt24T7T/+DjJuf5eO2/9w0h+y6YV/c9I/YdOLX3HST9v0ErO/XCH0+2x65YvO/Pfb9L6gk36LTa9+y0m/16bXLPr6HL/KP8HoOG5vJfajZH1O6nkLrWfexjfQ77fpffuc9Htteq1h0XO4zrfp2Rs69fk2Kf9ltPxAR6/+NjuneOVv6z7dr7Si7nFrzl5bgxhXrfX1KEy3z3oWLrH5erVKbFahBf9BsPBy5KWQX7+ZtJX68HjIpheYD4+fQFsDhAeUXly/kdAfB3qcyHBKL68/m9C/DvQcwQKlV9avI/RfAN1D+pzSq+w+zXb47a9JX72c9tXbKO/H1ue4H5E+J3T+2H1Beqdt/W3wvVifk6w+L2UYyaGeAvRbaR8udvrwVaRdr6AYv99B53/E6ItChnvN+tvbb2j/JyvrVaQs+jfZsvNvLDretVlY+zz0gQH0PyR6xN4H6WarbVDpYofadrSFX/l6DbnPApPEpWZt4apr++6Glf1LtbFxPv9PB8dvvGXFqtc3SRtfSdsY7tT3m2S8Unop4aS/w6aXvZzNw2+S9lG6dYeJrIMJZm6j8mPASX/IphdKTvonbHqx7KS/w6aX8076fTa9Yjrpt9j0astJv9em17rop216YxjHq4trrf9QmOXXoJ+q3DDegO3lI63Z5QUi4Fhv9vKXZsUHof4hSr18p9n+OqyRbXtIK3W56qjZHtJ+uasO4ny46rNcpBFvHe3Bg7nxvvF0trpw2fTAubnhgZF0prb70oniRE0N+n8YncrkJxua8v1wS0xrk/WJwpGhyUt3V9PaaGM0f3hk4tKF6q708GJfZjj6VDzFnzSGF5tjjR9HMhzbA3kvrOF00P9fT31noFFG1cEf9P3kjEVo2ivwUs9VHSM4Iw0G7cOACMezQKqd6IO9Yw5ujDRoq1N4Q54GGiTndpPbr9hVaiw/q51uxvjoP/z5n39p7fvxkURJ9qflPUcvFOu7j4/PXbaz6PcQZcvjXwzwJ1yeKy48djkbK18kGL+dYvyRzlj5IhkrlJ4d74ytLxIMUnqJ+eIia2FSzmtoOf/gpH/Cphf/3kk/bdNLX7Ho87imtujc3V+26DknXcgqdK6Ccly7yBr8cu5mepZNz1oB78zs4Sh8WiSf0ChkO2H5cejTK7eOXTuMhOGtluhnuNlVapi7d5WaHB5efabL9vxveXHP3w5Zs8Gp3+4+wK+wYwB9Q/YLSF++lvblKu2zOPTZPQRDlJ5Fue3YX4hi3HRx03xiRybYtPhAIzHPBj3TMl1xSdSNGg0bY0cZsk8/7jt2DPckjh276tH51y4tvXb+Uc65hyjBsL4Gz93xknvHYKuj6+DJsNNHoV+yvI8gJb3q3Lfe6GrE4GjsW6rY9HBJ2NlRvHJX7y3FeWtP8XVf7Gwp4p1z3Fchc9cddO5ia0dKf8imEzM8m/4Jm14MOunvsOnWnEnp99n0Slc5t9j0quKk32vTa6qT/rBNr/d16D8j2KH0hmTRx3C/yKLzx+YoneyxkPrfSet/grPuTvFfJe29i7b3SSf9Eza9+N9O+n02vcLW6GRfgZTzBlrOmpN+2qaXOCf9fpvel7N1aOEqsj8h4s4/TpZ4ghZx4Mpla83oKiXEbjNs3s3YpFT1PlikRzfOAz8ej5HYod+H8DgJD/7IoRKpn2uK1C/KvbC3jt+pn/xM6td7l2Bj/ahOEO4+AMWakkNQVld6vMNqi4c8UF/Qi/8POT9TuaVf5vtAdNS1RbeMbc9iG8/ZNh2e7b366jd1nZ8hx3qcoaE9143cl/lnE98GrY5fg17eDFiEH8vjAFrYdfsVuOzyy4eZ3cSH1j7GP79jICFw7fUr+NfA96DNxxy19PBs8J8Qtm0+0IKMxdJK2Xe40HAoR76Xed5Bp9xql7Nul6My3+gYc3SMPCb0A21Ww7cQW46KEVd1pVwxO2Ye1UqNf7nDtgNmTtCvPDA/D9OzuV52Orp9zcxjL/sCzP6eOmJCbTW7SverKqtU5teYqtRvq0rVIgYRbI9Q+0s2o/pGfEWvKSga/KSX7jDo1oXN83YMBOa04kSyGqjNHhwttBvZEKxGBmZ2hr6b/DLPf1p7d2jHfL0dGcycI6oDy2NjtbHqzqF0OJYMD2vpnSNjLlck4hbGZneko+Mppkt+TOCFAa4A/TRLdREP6R2UCS42w+EQyLHVMf5MsDmriDNIiGzHQHMctm4uYusmb+NZ/EcZw19B+3hj4oLZXGX+/MFmYayRi+wJDdab0+EFqdg/XmpO7JZzrUzY3Vy8cHj2kvmSa3hYIKfm8Ypn7aRnIDki51KSa4z/if+yQ5X5kbyHzs0T8M+fQX8Z3DU0Qmp3LMik5IwayHyg2teqJXvI0yt3um3/jj2Ghs+Co8VoP5NyhH50WFnRyI8gEiaWZ2aO7W/sSrT8uWK5fuONf79228ofTC3v35NSh0OpvsE9U3+A2zPr31+/hf8gsWUY4jphemiYD8PWvKn1Kwrh/Cq1fi2uOu+RzuHt6DZ1ospMjzHoUNEXcc3mSpGMJymZCf/IRVfHvfHCSKXQL1bdcTmaiARcsePXj3hihdFbg94pdyCf+0H7SGqoqomBEU8gmjTFg+2nkn15VH0w6go5E9bQ9kjdoP/gpjvHqWQsqxK7JY5nCLY9KPPeuWUkxhC8pD6IfUxXcUt09UJigTPuK45IjGxv347D+LfPf/7zz/39F50UXnb07oPw+arXDVeHv/ypT30ZfryOyr7/jR9nxY/zof2n60yX/ecCdy73kWdqA/ogdw58miafMPjEMmnbTsmKINnbLpQRnD6FfzVDUfpu+yrttN2r9MBy7+qva0Dq+S1YlvL7ZyzSNObKar+qselgTwNUAfroKf4R/lMkdtBlv0HsoF7uGKi5gzOQUE/DB4sdrqEDE9nsxIGh4QPtTAZ+jg+OjLSHxsTC7JHR0cPbCvlt8PPIbGHp0L69R87fs+cI3YPjnuJhSHPznTNZ5l/GXscye5lNYd1dvYMsvVrYUX/N/hP8Cj8wc3xtich/UNf5twCfMtwepx8L1LNy9vdsCnjNYoQQWMpdMULoTkZ7Q9gUsvdPw9X8eypVyqu5RNi16Ndrk9XS7IBeUK5+cO3Fj+h9RTMXTWj+crSUUaTiWLm6TXs+v4T11Ncr/Cmo5zDGLC5CPSUi+wLws0j9zLZoTN8z3KhdbzZ6evkUoPckwvZBZcdQ2GuPmjgRNXXI5bitkmB+STdGhunYU+DP97UX5LK5e3jywKHlfcWakkmEhWV/qjZRHdgOqla2qiQHK8n0+LmPpMK7ctsXdg7vFOYmGkPRRNJfkkuZeLIxkTMGq4ZHcCVrE6XW/naGyGFufZD/PuAC1xmv7Zy2UtnvWu3oHD6C7i3vBzvvkfXeE+nGkp+EfEe0UT9v9Heq1oggQ+o80emLaAzgG+ELa4/x1WsuuugG4Q/fyp9Zu3P3qsB9D/uxH/rxbqh/hjtO7VNDTHNw4o2ZcvTuN4Xdb6H9Jm3oN4lFn+70FtljbPG4+PBZ3fSR8d1yxVg06kZkZcdRldf+NDRWnh80ClO0Q5L18ezcmCDw04sfVpu7BsYPTWboPDgAcuXzwkmA4DB3qnvn1bm/irGmqdfjCPPKTSUMRShqRIkW3uDt9tO90aJHtu2JG6TBGvzUz+Jdm6kwPoc/XVsSkbvLvG/y4FgqOXXJ4tBOuT9QqTdGzBAvyDvL2bmRXHZ8qdEcqI+WRkVfoi4OHXz2zOLLL5s05elwsjq9mNWzsdbBuYkj09mlo4tze4tpYfAwcfuGGx2AyzuhXz2d2zSbMMfEVddVSWpC4iquP8mf/O7z+Ov3Pv0isseNfF4lfB6DSfJ3H8R7r2y9gFrqpH2HYMi+QzBn3yGgsaaqkCtpxzyifqnTtp/1hZ73CGDIczP25l/Jts/p3A2w/WHAUOcdRm4sMHPcvhcOvzw9cc6QphYaSr0/1dxey28bNIeL0zuy7f2D7ZFkuanqpUTAn2yO5GvVZq0vbubE8uQOszheNwNCcrmVa9c1uTxRHZlTBXP/Qn33qLlr54BRzyZDUSNT0kLVSpo/KDdLxeH+kpJLxSlGSzDG/hpkZZZrcq/oeO7GW9HUmgzlQ7BFfXlbe/4YuMUgQ7xv8w3j3iMxx0biGUeEQWR/zr5rXNvgt6VNHCXYgEX2uYBq2Qgm/nZwUS5HRko75gVBmi8U5kdzufHlxrXXpaYuyRWHRZ9az7f6hx9JhXaG48++FPSF0UPbRg/P5P7odftedcUUX6qm2xfM5Q8t7V9mOsBXib1jHu0dnb6FrbFaPKsOsHE86s/E3tHqfN49DPO+Pn6w3T6vbejj502OTrbHR9uiXiN79CPHl/obS8dHx44vNpaPXn7sykuPl3aO5sjROsc9SWyURnvO/T0tljZP968VFut37rmav5VvTV+GlsXWXuxbgCcZtNWxdhY2zved6Z2OCD/J45zeXVsEo3vMG5NC+Uoiq8L87tPrU7WDRyvKCz6/9sI1v5bOy7l+SU36itFSVj24o7Ggv4lfpvVCP2Av49dAelzT2dXHfQ6VuRkOt9D/O/3NOt0a6jmG87ZaHGMy9Ayzs6U+5GV2MNWJwt4d683r0FnoIPf+RXaoYgbrkYn6YCuYmxyc252v12uB3f5UfRJm9Krc6hvccZUYEKO++ZDRX41nE6EdfHUwXSqnStF8OpYoNhP17UHBt21y4XwYo+tr0OhPsf3CS57RPG6vCZx2T6LD/oIq/vh33tXOFD04VM53Tc2utZ/z0Ysuuugq4dZT1/On1j65eD3/7AeJjRX0wSmok4H3HTTmn4nusJk9OS3Zc1Sc7XV3REGXuyacgNt0AiaD/q927Y3XI5ON4f6xHVfIvPyhwOzh85JDK2JWBP5N1qoDguvnu198cK4yN6Bz7NyO/0vAbZEbRDsWtKEdZrazlkVh0zG30sUNRtaw5lg6H/dqhd9uRbprpk1vmGk1a4lkbTaRmdYKCuicaBM/a+8f0l5wXbpZTPqa/kat2K+HecGrmBVtz4V4H6YyVB0qDojDYmPh/IHbXxeMyr7xoJ6st7N+RQ4fPVzeNZrdPTndnCrprvMWyQYZx7+e2M5nNmj/XfsC1nT69I/52770fP5P9tBx74I54Sn+3cC/PEyk8zifNu35FKXAGBttHq5p7yrOkhkzANRZZkU8xqJ8lNknGvWIno/u3PJe3oSNi4KTj79sOuWd0ym1S/5Wc2lYn+krVuK1bX21marSyI63jZHlwf6RRKEWb9TEVKWll3J9ibTsU9KmmOqbyA5tlwR5rJHoLyViub5UbSjCa9vHi1ON5K7+SiKXiHqlejmaTUZ5TziTTlSCcjyA8cTpXFoGvv0pw93Lu3GHHlI0tupAaweNGyA8QeTlmf5HFWSUXSK8z2+h6yHu+khflDgaENQpsUSglDZKLJhJu12TkDV42151/mOmBdhr+EcqM+MuirzCbNNIDS61JvYNJp53QbEVHhisDzbEQCTinQukl/fj9Xq1Md9f2jmSre88OnD7639Y0oWDuycnmlMckw/CpcKHATpr3fFANvqm7iMtR80CI4QkbXtu3E1EyzDc56rbuz7sJtcmx8Sb/FJvcuPUIRSRUHSsXvqR0O8gVJBQ2ejuCO+LSYTLGrwM2Heh0RYfa1phN5qolXoDKH0sQECXzo0bmMzBojMaJvGTdPWePXKpXWmMRrMBXSlk3nPtzTdbzhZzCwvvuZb/nV3Hc1N9esy/wxeqGTei68XHmOPFPUcfW7uD2b+6KsD7Qe4nD5JgpnRvrGDfB0V5new6Vy2QXWfqXo1evB5gbUCJPvzolvzftNzf1CHsXrevh/EDIxSQUHAQWkhodbYMOBZGQGZhb9OrVqwY5DbeA2iu0j3GgVVEWzfXZadTcaqJwKfOXrJcvGplJT+xt2/iWsi0MppuN9M31JpKwUx4rwvV4zMTN910HTB+ZXBXv6LLa4+brWhpbhBdjo/3i4oeXvu8cLnHNzq5sovxf72EfpWhep+gFiN1ZinixD7e7U48ao15OhbK9lhIsNscvwHunSAmBObSydMb1dRPSY45/MGdVpDYW+A3L5OgrraDRYrcwuRydfJis6qsFEameW33nhxxuahUU+9H3C4PAfvM2HZZGZpcQceLxAvj6Aj/duQayk+QGa4ZIjOmuMcfRMnAkDvBWVFqcf4Z6kLuhAO5dJ7Bm4nVVaqnzvwmyK0hoeYgbBIUnZB8TpYiZEdtyI7aoY1KNnOpcEBBgVMCW9luBiw7daxUu9Ba7mgPGR74nmvv6W9flRESi7XyYrtQnD083Npj5FKhmjw7ftNN1/I/GF+cGalOxDxN7IbBhX7FkNe5dFZvH54ePTpfioVEWRjz+MYmEMHjx84559xi+kdu1ZIlA9AnJT5Mb4BV2M0vJ5YrDiwnpE6cxoRkxcujiNZsi+EC+dSJN7CJ98xMokNg4QU2xUPfFJKz0zudw5Aekl9wyJUYkebo/Mr6pLJPtOMMu+PwaKiwurG77OuMW0gV18ev/eevnvozVy9p8up3fmjtZ1/6klOCIN+/JPwb/0euW4hPE3onwoVira35vjTyJtM1unJTP8n3Dch3v+vmHvm+8aaBd7n8N+05TPI9LDyC8XdBaYva+VAVpnmrvodvf3Xxyqtcwq231nbvhvyfER7jv+664Sz+UD/D/KG6brD8oX5E+Cr/b65jIGOqHF0yi8x0AC/04KgIsgM/Oz4000jsaZAu7j8SThTUWCaVjMR1fsBfbMQzhiHJhvB4vGwCWkMxVeqfCkfCyRjKjQ8K3+Afdx1HX6jcQvcNImrTaJ0z4Q0i9VH7DNzLdTyxWpf/qI8b5+n7iOPzE3q5rOul0jv1cknXK2XhGyX81fE/5cMT/Cdd4z39ZX2ED679t2uc+IV9v/Ao/wnXpb+6X9j2zB5hzlMziyXvNn6f8OjSTL5Uzk3jPsbDwhf5t7reTHgx14sXlAuBR+k9QhfhCEfPh6iw9TK1knxr72Oeyf6Jif5m23LnaghfnK7VpvH/wbSm5LKqimfe0OxHhOe5rngG/lZ55m+Vf47lcNV1BTpc5bknoW9vdF1+Fj+3zlryQxiVzihDx1Sgf/B/yHc9/3fcD4V3QavGnZ51osyzDrNXde6SBHCXJAqSwcvODe2vINsYfPu9RqlkFLM+Oa0MKlmP0FfS08VmWs4Xa0lRGZBIW+9cz/H+9W+BWKk7v1fsfG+4Rb3aisB/p1db5vcBv+nTqWzOyORzhUE57bkjqydzlXR+phKSa2imxN0lSLxfWKXf0YnhLrIY7uyeHF1UeIm7xu6o7DjsfP+YzOb0TC5bGJB1j3BLNpnMlo3cFCxvKngyfq9g8NcJH+0hY+4dfpMpPG/PC6gsOg35nic81CPf6T8YeLew+wV7jpB8rxKS/JuFT2wpi16FsuhqYbsli14sZPm7hdOAonoPz1G9IvD08Np8evfuO6Gsk0KV/xPhHb+ejBpzyKiTREaZKKOMFoqorGFEY7ow3kNEceh7uMp/WLjv/wUZdQbkkg7y6U+IrIKhUC3q5GPR+skRPkzyrxFu6SmjThLf1bcsYL6XCiZ/l3Dvb+y72lymMmoFvufVgNkDwsO/FRkV30JG/aBbRKUFaYqKqKlWR0SRfinx3wNsoYxqP7PYThsiAvTyFn369ttvp/P4vdDvBeJTstTtz7pb2tgHHL2cdldtp91uqigLX4BiioDgPu4gnl00OFcfnldEyc86KJquvo3xcOr4XXW6h1DjqAdbagZG9xDq9t4VWha1+NE2CB+2d8tc/RCZBEnV5LzMw/+PTYwJoi8hS0rQ3cxmm95h38r4+O5Upez1/tXaFfwX1ribdu68SZ5IiaYc1eJyoDTUP+Jfml+cyY0V83Fl9Ixw7dN/ILzl6WGBxesCfVN4NeibBdCLf0F3DfAefGuDxjlI9hmpnZBp30DrxPpDG93iKj3Db269e7AprPsmPZQtmjbtHvQ+3yYEFux5g5YZgzwB++KDamuUuHOA61m0Ycux/Y7GBg1zo/WTTBI6n2ozIuiaRVh+1RfM4mRtRDECZsLMv+AF133kOr7o9vr7jZF51P2HF/rikmhGQjv9oXLmeaBt8r8D/5+5QjNFtziwjfrMQLtVXL8a3JnenhNcq9R7wsb1a6pr/ar9ZuvXTdp7x6Ks9/rVaTfWe9VK2MZYhStVdXsZ+KJdd/o6izm4Pk0AH9aWkDFsH2sb8KLO/W23HxwnL3DFiV7y6S4fvd+YthFJ9/aKv8IeVgkJpbNtmWyKvsbWqj2Y01nSo3lkdePixbEHhRfmnSBja8vJK80wCR8UrOrZRiporyuBZ62FftWQn36cxRHC6EL8w9ZKko1nV5DshQzz/IO4w7FpNwrGLvHC1r0bheMCT9zQlhPXm+iBDUf16NYr+q2ilnX4mEZC+mxL/E1GVJs2p3pvDkaZvkAbgQMZl4p0E4UuhAc2cJ5IVOtwwEYnG9gbxvXgeUZ6oTR5iVlT5kt6IycjaK994Dq+FJcH9M7Y1iKKTCAcTDWyDMR0hC8PV/x0gNN9lmdBn4xw2/kYPS2nfTJgW53F8fpMV58MkH1YKolHV+muNgaeR4/pO36TPmkgoeEgjCJh9GwS1ikJCGEACQM9L+ls7KSK3Un9q3TfcHCVogt3MaZ6dtLZBomzw7AfYdBAj1UGD+npxdL01YZz6IT8lcT4DIjlB67li3G5qZOuZFtjsG6Q09KGoeT2000B1okjJb8YTNWzKKc59OEgjAZCXk5wuTxevxd+uD0ueDz243J5PV5PwAuPx+OFHF43zOAenwd/8wNRcAkeN/wG/7swu1vwk79zuzxun8ftdglQNHwOADHkcfkxCzx+j8/t8ruhQDcWC6W53V74LsiJpbk8Avzu87m95PF7sUwBHvhyfKASpEpeWkuf23rvcT5uSF6a3Cx5fY73XkfCP4a2QAEuAeoiQMI2uOhbj48kqBcmN0nks7MIv8/rtt4hU6CZHvg+Lw+1hQ9eN+/y+lzIOGAIqwe2Fr7UTauIv/koB6waWk2xHvqrYD0em+i1Hp+VNdDJT5lEHq8fGka+2B2EbnIzPrlY8fAeG9J5XJ0y8C3UyO8PhglmvBQzpLcdX8Qwg10F3+rDX/0+KBXZ6AuQIl1e1jzschfCAurPmo89APwhmPF6wh5XwOsilQhg1YEmEB4K+BfQKC/htAdBBpUAbHgIQnwBH62Ly+Xz+fGBSsDjtTjv91jvuzDT6Ww7Qdc5uOhlCT652EObzMABiYHFTxIFnseRnIUHfAxgQHd5aEcCr3wCdoLPj+PL53czzNBh4MVecOHwAgbAL267SayGHgaHTpNoR9rVpThwPj4LYoHuV6xgqJHLTSsZ8rgYFjydT96AN+CnIxP/yGtDkg4yeAKBkOjjoB/ho4+IG8QMHcO0csjUoM/rB6Hi98OvnoAfSoXyfL4glEswQ7PT5ruIUMLaEr5gaT7IEgSi6HUFfbRfg96A2xX04G9QkAtHhwelBw42L/6BC/HsZ5gJ+i1G+f0BfKB/SKPYgAh4rPdd3POQ4Y3Jzzod8O5473ckqxNIkz2WOPG66VtkJCSoISSvI9mwQy75KXaQ7kII0HEFmMExBy8Flz+ArYMGI2+8Hiq8EaRO4e2QGXZtt8KM1yb6rMdvZQ12iR8vo/sD0DTyxe6wl8KBCGILM76gNwjc9bPCfA7cYeuA44FgOAKYcbsRAQKiBSUyqYOFGcgWAl5TzLiRNQEfYsbvB7IPhyLJDf1N5JALkQTNh5yIHsSMH5oWAmLE6w4RzHi9IV8QcA7gcCM3XSjGQPJgGfCHPoIZrz/g9xCpAl9kMSpAMQNDAR46FOAJ2oxkfPPakPJ3J3/AIXehVXbqYMaNDYIKUFDQt74ASQwT1nRH5qNOCgUodvAdnbSgbQGfX4DawgeU4/4gttcPkzKph1N4o7BD0Rdwoj5gAaEjecizATM+5xOwIBbqfsUK9gdRpBORSDDDxIOFHq8/5AsFKdux1jjtewlDiahCXgSDYtRPMRPyEx0CR5jPZ+EWRjYMzbDfF4DqB0Da+b2hQBAGPvzmD2PrPW4iyVD56MKMh4gnxIwvAL0QBmLU5w77qSwI+0KIGT/BDGAKRgeZSD0EM34Xip5AEGYw8oQJ74i8DQTxgaEAj98aDUGvxcgu7nnJ8MYUYIICIOd3cNGRUHvBhF/jtzHjczOwBEmiwqp7PuqkcJACkzbCg0z2A68CAg7cQBAxEwDRamOGdgSKaiyHiDMivB0yw8ZMZ4bpwozbR2dAH5uz8QlaWcNd4sfH6KC/uukXe0SqL/oQ3G4vRTtiJhyi4hwKC/gduCODzucPhaJyADADM044gNDxEzXIj1IJ30MvAdbEoD8I5YSC8CuwJgx5oW7BCPQcMDbgI5BEoQCNcCOSUDuGgYejx+2BweX3RYEo+92RAMITRI4fQC4CmuAboRD4x+uDGQe7BIoJuP0o+EIgjcgjEuAjZkLBMD5QCXgQARRTPuu93/lgG4I0sU4PBUOBzvsQS5iDaADAABTGAR+ZhKDr/R769zA8MFHgMZHlwX+D/k6KhCh28B3OadjnwKuggGgKAu4FdzDsId3hRt6QYezDevuZ8PYx4e2oIT6BgI0d9spWiYkA9rFM9AlZWUXrFSuLQQeQ4iMd7I0CdlHYAoT8bjpX4Hu/GKYjE7o3hNO+zU8C/UBYlGIBDpXSgBiAKRwnXDcR4VblgpANwBECZodCbuChGAoHROivUDAKxTLMYPdBGS7o7DCZPADQRA4BZgIh6AkJiLGAJxqkmIkGRK8nAmiC+RUKgRaj0AT5HQCNO0Aw4w8BNmjdoTeQCE84RDADlYAnGGAAEG1GBpwPQop2p4UOgBwh0xQKdJKFGWiGGzACFSCg8NC3gTBJIN8gOZHjLCIapl+G7whm4NtDYiAkQG0DIXgpuEOil0hKD8WMLbx93cK7089WUzqSJ2CxgmLGJgatJ0xnbRiXnfz4sIJDEZCUREZ7JfhEJ2jUHBE5gLFgJBARg0HCX/iBItyPPENWg9AEnouiHA8CZkB8ikHUOxEzPiaXICeM7EDIHw0FwsDscBgmSX8kLCJmAEVSCFsPMML8MJGQ5nvEAE4qMDH7RSgFEAiYCfgRM/GARwpSWSAFIj4LMyC+QGhBbb1YBmImCMssGNuAjRB5ogSHKIbDYREfGzP0Ef0WI7sxAzWj3RlmggIgF3RwsZOC1kIIvybkJ5OQFxFM38OAwsQwQ+ciRI7PiRlJZJjxYSN8hMmIGRfBjBgCKRyO4KojFPL4w8B/GC5+GBUwqkAABomEwW9yyAzSboRDZ+Yhj73ypmAKOp6QaGEm6iPd3WESlckMM1BNOYAzpY+MefIJpU8oEoxGQjA0CefDiBlaCcJPAFEwEo0nQhwIJuwYwAx0F4guKpjwP+glGJpyOCQC9kTRAzyUxGgwCn8qhmPQq4CZEDYKet5Lmg+iBAqGrw8GcO4CzARFGLkxICaC3lgYMQMiJyj5vXIg7EYtPOwGWIPMA87hdA5/Dzq/PyBGIgEiVcKyiBVCzETEKD6BKCIHqkb5FA1Y753cgzpB4SSJrNPFcCTUeS92UshaNgBsPWFcmHkQEkEvfQ8iFROoh5Cc052jiGAswqQRvMM5DfsceCW6oLYhEXDv8ohR4C00yBsACAF7ifD2MOGNE36ITPh2DSMUBiFb3gToILJVYgom0rvWEwkw8SvjuA/ZT4RBRwI5CMMNmhAPoijE6SYQpHMFwCMshWSJDk0sDKd9WgngZxjEJYgKWU2GOdCisGMAOsEQymTra6DzPNDcYDwSjkQBVRFYLwfliBSWYJxHIgqUC4MxjI0KhlF3wkW0hPXHhgRRDoFWEIqAsIrDtyVDXkWkeqwSlv3eWBBAGITqefAvYCIF5QtmXfjFEwIsRaLRYIQ88QjWBqfuaETCJyghWQyLtJ5y0GKkVXMySgAsoQhNQZqikWi4w8VomCZ4H7Y25gD60EYiUFD/8dG/B0ZiAvkGKeRIkVAnKRLFDtJhqYlDSQReRVxQ23BEQjkekYG3yLUgQAjYS4U3zHCW8A4T4d2pYYjBoSN5yGOvvEM2UbSeKFFEiCpg58dHYjCMgaQMA2hCfhXwHyAjK4gjIYToCYqxcEwWI1HkLxQGOmeA1gH4KcIgCIdjsaQhcrCEiojxKGgaYRFHGGKMVgAkHIwQVYpIshiWJfg1rEhxMQ7lSZIGIx4kWyQEuSH5MXvYi0gCMQ5jOiYCCLx+UfKEQwkgGqIvEaX9mhCVoE8NRT3wjdGoF14Gw6DjION8ohiBYqCfYrEQQYikSrQuPp8sxfEJxZGMVSNPnPyLmBKdDzZQ6kpyVI7QymKSRZokSFQB9HlJk6EsSGQ2k8hbMU4STPWQmFwhgou+pkmLAQChm/EdCiBgdBR4JbnDcXgdj4bdPikObUSuhSQAYlgEqRcBVTUcBOENEA4x4W0/MmkHdF9HWpC+tJdRVNASqFgPFkCyqmSmsh9WsKyAlihi5YJJmPuhmiCGw6KfjDCARzQhqkpUkpG/0agc9dPi8cG2RcWIqhqZKAdrwmhUlWGpI0ZwhEUAZlEywqGXorKYjEmxOAz3uM8vi4mYGgUQRWKxlAwoCvokaBR0XwTKAGUdYAEPiLKoqEDrQMJHY95IWAdiJuJPSdBOYFYqmgj5NVEGREVl2QsiJSTGQAzABADFSKC/hcW4ogCm8UnGaF18PiWm4iOqSJajEpVDqmi9Z3yLkH+xgTGaRJrissL+hIivaCdZOmY04vdBT0E7EBKRQCyKKaqSBPINklN00dc0pRQKP3yH8gmGnQS8irmhttGYCnLcF08EoR9k2R+OQ92gn8NhZFokFIvKABD4LYJMc9SQPJJko4gSbJWYgIkQZetR6KwSDic7+fFRaMfHNZDnwBuQrgbM/VBNqKqIn2BGCYVFORnVEnIsjvyV5bgMMIoQhgJWpTCASNKSZk7iQB2WJS0OemcEQOANQS0J1yVYIQNcIingtSJFFcUfiEWSiiZpcjQajxtQMMhhWcT8UjQoSSCv/BqKAJgcpEgCvgckvBQHYZUGYi4aMGIAKxQ5UjIcSEVivkAExIkPZpxwJB7EMkCXlGR/1C9GFMAGkSpxXcEycY5WFQ2fiIbkmCRTdmgRi5GS84lAKygilAhLcVWWolZSpE6yNuakaMAPCIV2gEgBBNO3kkaSHMLEprQQprjUSUaCAhTf+eEf6PpYXJPiHqitFIeXHr+igeSE3giICuGajOLaB5njEkAaRKAEyIxE7H5WSTug72xpQVtmr7yJoCXEmPWodFYRxZT1iglrCkMlBZISeAMy2oyiggcfABKgYCGMxEg8JaWSMRivcYSNGgP1CzCL/0Vh6EnA85SeK8YAM6GYnFJAp4/ChOsPQyVJTWU5EFBiSjStxhIaoCoRAB7qiVQMQCSragYKBr0oHpWh82ISlOEPSAGQPrEYSv5oEvoHlEZZ9UuRLMC2KAczccAl8CQT08WgEVV8ASmmKD5osSgpUACI5iCAHNdVUkLTokSqqGaC1iUQ0BIpfKIpJCuxGGVHKmphKsYGG/kJDYRpDVMiSpOmajGoLEtajKaEnIhZ629ZDgYAI9AOECkAEHgHCUQqpngYE5vSwphUuZMySZi2AaD4LgD/QDMVNRVTPVJKjakpRfL4E3pYhvYqgQhACFgcQ3ENTANJBIAGtMTkpOxAvUYbE4vZkofiwlpFBcikTYiK9SRRzuKT7uQnwpoWmTCAtyCiQcHKySBlYGQBhPATkctRNR0zdEVNJNQEFKYpMLvROsgyDL2YEosb6XwpxsESKh7TVdA7pRjM4SLJEkPOw8iOqZKZiGvAbE0LBFXJ0PSYrsTkhJpVofUiYkaOSXE5RJof0GMg2AAzMSkFzQddMJbwy1HATKwUC2YVvx8HUDZmiMG0pPjhG1XFTzCjhglmoBjFLwdQBmrRBHkyGjYaMZPUdHwAuPAAnClCdAJwghnnA2Nfpn2uMUGhqck4towmCzOQ4hZmYoAZlWImhJih72M6SUoYE53mCGZgou6kbIoKpRjDDABZSeixhAdqG0ukVMCMpsNsC2gPRhOEa/EoTPj+gAwQUuiETzBjzzNJ0g4QqbbkoYLXxoxsA6mDGZSw+Jjwf3QTZrQ0zK7AG4B2HmQmyGI5AgOIfAKtSlLNuGmoqgb8hYomFZhhCRoADpICU2w8njbLDYXzh0DvyWi+YCiGIIiA/GD/BYOaosn5ZCKlK3E9FQQeZlOmYiaUeCpZTGoJmNMTcjwOekY8DAiCRbSpKKoCCo4Sw7kLlpBKMhCXikBsKKGCFsC5Ry4o2WgoG9MAUTDbBAA30ZgmKnHQgaCYRADmqVjKMOQkefIpZAZqe0bKxEc2UdpoSoKy0ES2xvG94nxAssaTJIFkJElPGiq0iiVdoSmlpFRre0GJhYKAkSAkAEc8nMK3imKSlIhgUqKYcCEQj9DXNBUNCjB8FwSBA5jQgFdJb8xMqilTi3kDKRN4C3NrSNZVOR5TYKZU1QBkTqoaQBjEIpnw49ajk3ZA39koooLXWkUFCZgkJGnWY8SY+M3jtKbaj0Gho2dhZQG8kePRMshMnFWj8Vgclwegk0mxZE7NZ7SkDvxNQmEaTKEECQAWWZMVTU3kco1WgguGI0ktb/jDYUWDOVxKEJCheAqHdU1XykbSzCTUjBkSdbVo5rV8KpFIG1VDT8FiJKkkVE1JJiLAi5AKsAABAZOVpmTxvkAwoqWDarwGrWklwlU9GAReKFWtKIslRQ+GVZAcQVVLyqoeTcLsAesPLRVWQ3HVzGbiBnkqJtYI1b2MmcdHyafh0bUkZUdesd4zviXIvyq8NkgyWadnjEwyYT8ZjSZTM5PWukRLiCFdVaEdakQFgJj4VtPyJMFUD4mKLpjqpISU1jqpmtVVhCC+wzkNWK2n81rap+bhdU5XfGEzH9WgvUY4bibjoJuB1EvCVyfkdFIHgMRiWiKb6HSzmiHtgFFjo4gOInsZRSbtGJJ068niaMGnjCLKhpKWZfN8CSSlpqFm10iIgFvQzlWFfJIhKUY5WS4ahmmm04auZ3QQhwnCUJDrejxhJFPF8sBokguKkp4qmbBYTqRAHmMdUpDgCYfNlJmoZfRsLqXlcmHgYSVbSpXSqWQ20wflgpQ21KSWSujJaCoVCmvhciqlp0DypxIFkEOgKKYyIU3pB+JoKtKXDoVw4PSlKrFILZEGRKXMdAj4GEtkZD0JSgMUY0AxipYr5NUMeepZFCuo7uWzJXwSpSw86ZRO2VFK0LqGwynno8FriopsgqZcJm+kklbKpeykk5UGLH9TWiQMGIEKaIDfpJRNYUqVSErLmKjISsIskozR1zT1FQAaiXQC34WTsSQMujTwKuPTSsC/opnwhXNlOYWSUlRzBoj/lK4qOnx1Mp7R06C1KUoqCUzrPHnSDt0wbBRRXNjLKAImBUlp9pgFnLXxqaOI6nCjQIvMVROikkrBMI8NJKOA27gWTybIJwWm0ESmptcqZiYH/IWK5tMS4BRETkpPJhNpNWnqRrU2PGFwoahsGtVsIBJJGrgixToYpHKimDWyWn8+XSgaerEQiWZT9ULVqGYMvZBv5bIZkM+mpqeMZFqX00Y4khKrhpFOw2RlJMt6CrgnG3kxlRg00saEER3IAC4BtK10XYn2JbOAKCObDSfTaSWZi6X1mBGTDCMjpsREslAuaUSq5JsFlDY4R5cKVXyS1QI8WcOk7KglaV1hPeZ8UulUKk9SIUlTMVcyDd1KxTRNBaOQhuWmCMtO0dCjEcAIVABEiqzL8A4SiFRMmTgmQ8EE+k1cj9PXNLXK2VQmmUniuwgIHJAPWeBV3p+qAv+q2aRfLNRiBrQ3F00UTNDmDVNLwLAD4Z1PA6STCTWtl3UH6kukHdB3NoooMOxllI44SiApaz1lGD5EjPZbr+hTpkUWG8kozBGgbSgjOih4KUxJ/JQE7UVL5vrSffVcvljIFwA3pSwoSujVEKS6nsxqRi5t9vWPz5hcWIplzb5iMCrpJoBABbRSzKaj0UKmkGoVs+WKma6Uo1LBaJYbmUbOTJeKI4V8HtaG2VTaMPVMOpYxodMifaaZySgJxdRrIN1AXTRLESM5ksmYM6Y0nAdcAm6HM82ENKDnw5KRKeRFI5NR9UI8k1YySgxAHjUiSb1craaK5BksoxKDU3e13MAn1UBpk8/kKDj6yChDTGVM+pCfRsYwiiSVdZoqxWrWTFupkqGpbJYzuCGFm0xmWooCRiKQQB9Lx+AdpEzDxJRTMJkJTGkFkloyO2mkljfyel7Hd1EQODA286VGpuQ3GqVMqVHQ/dFyn2Jm/i97fwIeVXX/8eP3TCDsEJYQAiFM9oVMMgnbZViEJOyoMKBsKg7JhAxmc5KwjXXBFq1Fa7Mn36xgW7e6tSrjgmiRHQUXhGIIUQshtYrUvdb8znnNTBbUtt/v8/yf5/97nl/G+75n7tzzOe/zOef9OZ87JxE52wNGRRlHyckwblRQaOhgeXNkaNio8NHyXYh0WtdPDJ2RE2GU78cTeH1PUbKm/AlSl8J8P7FSPtyapJa10M6fWI/JqMTRAaNCx6rMbpKMmUEho8aMlFNiqIrKcm0dHZEUmpQQHhEdFRkpicaEDZfRUi5UoaEhIcFho8aGhxoTzZbUcdqgoSPCxiVG9Q8ICBmnVvFx40JD1ZQNHRcQEGmMHJMSHRYbNy40LjZgaORYc6zJaIoYFxoTPTkqMkKu6eFjQscaQ8JChxuNQwLGDkk0GsOMI4MCjSHjQ8eGyERxXPTgsaOnGI3jUscNnRwxeLCMYWMmG81BQ5NDIgcNHWuMjBw81mgMCokMNIYGGgNHGI3h0szokNj4uNHR/EyMVWxUXhcfa1I/Y0wq2kQawz0zJDFEOUXNKaPnZxw4Nmzs2GhesSGeV1xUfJjslfcVZ/S8Yo2xYb7vbMaNGxoQKeenfA2X+c+IWPWp0WjiFTFSvcYFqVdoYOjI0JExxq7X5PGRY1XYUp8FyBVx9JiQiBiTMbrfWFO0McYUGdIvIDYxcJzsb9TQ0XFhY8aGGMNGB0vZBYSOijZGjpYLfrAxVDltrO8njn7IidCZrXjmhe8pStZUeYS6KdL3M17Kh4gyQS1rxs4fqWUVCWKT5fwwGkNGjw2yhA4fPUrmHqPklJClkFEhQWNCoiaEpZijouNio2PktImPGCHnqVxPjMbQ0DERo8dFhYUnT0hbHKENGREUHTVp/MDhw42Rcg0fLaUd7lH4sGHxUfFGS0JMYlJkeFLisBHxYVMSJ0ZNjI2MMCVcNT4uTj6BxoyLCI80RoePjIoaOixs2KSoqOgouVhFGVMi5OQJGBmZEBAeOisqKnJx5IiZcQEBaj7OjJoyZoTFGDdkRFhUfFxAeFT0mLD4UdERo6KCgyKjYoeFDwsNS0w2j0vgZ3qicobK65ITJ6qfcRPVzImLYokKD59kVKjSwSjPTyQYFh0WnsAr0eh5JY1PjokM972SojyvxKjEaN/zd2TEiGHxYWGyH2Ejw4IighLVp1FRE3nFBqtX5Bj1ihgVERwx2hTV9boqJS5MTUH12TAZ3aSf40wToxL6h01MiDJNjA/rPyxxUnCkipQjxiXGyPgaFR06Njp66LDwkIToOBW8x0ZFJEeEhYX7fsz0IzompjNaeETke4qSNdVyoC7FeX/ik5Va1M80FW+jOn+SPdMtcWrYiLFRUcbQ8DFpEYGhIeFjw0PCwyICx8llxyjT1vGWaMuU+ISkxATT+Ph4c5wMhxGRkRFRURERxrjQiPjomKnTFi2L1YaODB4fN908KHBkZKx82BsbGxsbI1/yv8DApLikiNnJ4ydMio2eNGHEyKSomRMscdNMsTEpyXPNiabAsYEJETHRcZHxMcFxcSMCo0ZMl7zjQkLHxEXqcqbKdDE2ZXh02Hx5cVnsyLmJw4eHhUVEzI2bGTpyVmTi0JFRcXIqSj+GRiWNiY8ZEzdGmkkYES3n0oQpk8KT+UmbIBnFqrxu8gSL+omYliJ/EuPiPS6cFqnCjkoHvY6LBaPio6KTeU2I9LwmmSePp2u8JsV5XhPiJsTz9C2fKeNiRo5IiooaIV/BUaNjgieoT+PiLLxMIeoVG6peMr8JiRmbEtf1mqvL6RWZGKk+GxETGhMeEZmYMi0uZWDUtJT4FEtS1MARE6aPiYtLSkoaGT4hITw6Mm58eFh8/PAR0eNS4hPDkyLDjPExU2LkJPH9TKIf48eP75xFLM3xvqcoWVP+GNWlRO9P0hS1aqufVDl5vPernymeqTNxVuTIsLi4yLDo0IUxoyLGRRujx0VHqZJcUcZGRJpnx8+emZQ8cUJKijkpaXLi6NDQmLi4mLj4mJiIxPBYc3zCrFT+flceZWW3lawdMv0LLdhP/dMa2ssLJq5S572T+zV2bOgw9kryq1J/f8sfJnn+jlbze6AjUjvYa438fEOvJCx1+zGk+G7VPpK3R2lXi2VatGGalmiI1Mb5DdUSDLdrJu2PWrQYo5nlESxatBTDKC1F+4eWItbL82fyfKc2xDBES5LHCnmMl8ccefSVxyJ5TPe+nywPXQzRZosAbbYhX9qJ0HR5niJOa2F+6zWTYYc20JCuXWt4TIs37JXnIO1a8b08vybf/0GWh8hjfMdfDXny/Jl2rZ9Fm2d4XJ77ys8j5XmIPF8v7x+pjTP01/ob6rX5hl9pg/0e1QJkP4YbMrXBhpu0cWK4tlDcofUTI7RRhrlakjghPTFQ2ym+0GINRm2W+FCLMyTLw6DFiYVaiCFGlsO0dCHkZ0M6TopLstxfS/UL1dLVdUM496cborVYsVl+9htttLhFC5KfzRIfaH0MF+QxQBso/q4NEO/LzxZq8Vq7tkieRxmCpR/KtHD8+V1Hm3hRS/F7QcuUvokyJMj+hGr39Fojx0H2ScRpiX5N8prNcz91XvQex7RU1Q+/nbIv0dpd0jfB8BivJftdL/sh21X9Z5yj5Tj/Q3KO0qYairWFXFd8/ib7n6Rtlof6t2DiRZucB4XaZDXO6prsw13CIduX4yZytTFivmY0jNP+IO2kG5ZKPw6WHL7S7hUDtOHiZW28uKgly3GLMZyRx2H5+UEtnDH+kcPvDjlf1LgHecbdd8gxj5ZHlDw06fuLhne1UN+YX3mIk9J3g+Q8UuPe/VDjHiXtTZJjI8f4xw6/YOmjDz1j3v2QYx4pjxAhOr6Rx4ey7/GdY37lEST9FMVcmdX9UOOu5gfj/7kcH9lf5tqVZ9l/OPzUWWniF/KsfDCb9q6F5386K/3E/Juz1BZ9UudkbZT081eyr5ekz/3k+V/yPEv6YKo8L5DnRYax8r6+8prUotIDelSakJqUuhjrPadynuc9r9JSDf5aH7FUauFxb3tXnqPkXFValr688qx0rbTlPc/ufK90Ief5D85S/2hQnTd5z7drwcwHNS7/5ZnYofQr5xDjKLWHlnznK9rDH4O0LeLXWprUi0vsk3HllNTEOa3EsE5qq17O9cEyVirNlMk48D8dG8SnmoVr5TIeJMr+qnv8ZAwrkhq+IHWu7pHakuMT4TdWzoW8jlY5BhOJn05tCsdmzUj8flVq7AkZg2dKve2Rxz9lnDuvLZY+NMm4vli8Jo8/yvcT5PsUbbHWId8P6vjKIOS5Tl4vk7zN8uzQTGKvPOfJ80fys+dlfx+XMTReWyDHcajhA22EnANB4hPpl79Jfah2/sNhOCQPxePKQ/IyzNIi1QG/nsfCK6/Bvfsh++HtyzhN/ftR6t8gVf/eqPq3RdW/I6r+zdAObVL3fvY4ntbG0Ofuh+z/vz1y5Hi1en3jO5SPrjj8cj1+6zyUT5UP/5tD+hj/+g7lZ+9heEZb7LdEtinHlnF/Vs6BOC1C+VOckfF5T8ffxJfaMBXH/T6U86G3jMepMmYf0gLFY3Jd+FrG06e1BBmvE0WtNkh8K88X5BgMkPfNlvPuiOT6kBzf1o7vxe9lm+9Lu7+U43hMjtH7cm3apoX4ZUkeKfJsl8cUWd6kvWe4T/vQ8KL2ruER7YChUnMbGrWnDbfJc4H2hJyn7xqOCc2QoV0Wa7UcUaE9II8H1drLOiLXOqUdtX6xDsn1Bg1J/SjtKC2pfMWw1dOu4WrZ7nXyuJV/i1bmNosGa2LgnWZNGzBG04K1gI7ntAhtMqiDUzvOSJzW8bTElR0fSVzVcVnimo6/S8zveEGii0/d4Gmun1EosCOwI+YrO2KBqisWqjvFIu6x8un9HSclPtDRIvHBjn0SL1Buo3wRbJcYqw3uuF1iABjRcVBimrQcq82R3GK1ueA8cAF4rWwxVlsCLuWKlfIyysspX9dxUeIKyjdQ3gRuBWtppQ6sBxvARrAJfAkOL4N7wFfAveCr4J9pcR/4OrgfPAAeo/U3KL8JHgdPgG+B73LPSfA98BTYDIeztNJC+RzlVsofUP4IC+fBNrAd/Bi8BF4GPwe/BL8GvwW/A79XKDQwVLUujGA4GAFG8WkMGAeO57oJTAKTlW/FBHASOIPrV4GzwTRwDjgPvJo7rwWXgps7jkncTrmEcilYBpaDFWAlWAVWgzXgfuoeAA+Ch8DD4BHwKHhMokmq4O8SlQpMqMDEnDcx503McBNz2yRn9RmJD4APdpyQeIFyG+WLYLvERC1ZXk+UuntUot7xisSpXJ8m1ZEoWzkrMb9D/Y8TXFx5gvufBJ8CnwafAd3cc5paZxSKSHVdRIOxIG1JbSqcr9qSqpS1JHN1v1VeT5Z8PtKShQd10CoxRWpwlcQAMEJGgBSpweckzqO8FKwF68B6sAFsBJvAl6j1MrgHfAXcC74K7uPO18H94AHwDfBN8Dh4AnwLbAbPYqGF8jnKrZQ/oHyJ8mXwc/BL8GuFcg4rjAHjwM0dj0ssAUvBMrAcrAArwSqwGqyROFF68oxE5cOJcmT/LnEaV1ygW6HgHulnhfPVPXJEVNkqcbL0ebXEIR27JAZ01EgMoTwWjJBzZrKcRR9JTOPKHHAeuEjOyclyXFR5ueQzWUY8ZWFFx8MSV3F9DbiJ67VYqwPrwQawEWwCn6CtJ8GnwKfBZ8CXsPYyuAd8BdwLvgr+GdwHvg7uBw+AB+F8CDwMHgHf4NM3wePgCfAt8F16dBJ8DzwFnubTM2Az/M9SbqF8jnIr5Q8ofwSeB9vAdvASeBn8HPwS/Fqh8FcMRV+wPxipvCHnkvo0mnIM5VjKcZTHqxGRsVFhEpisRkHGRoWTwBmqFzI2KpwNpoFzwHngAqwtApdSa7Oc55PFbXIVmCzuAO8Et4O/BO8Dd4APKg/IGa5qlYJlYDlYAVaCVWA1WAM+hIXfgr8Dfw8+DD4CPgo+Bj4OPg3+EfwT+Cz4HPg8uBt0gy+A+8ED4EHwEHgYPAIeBY+Bx8ET4Fvg2+A74LvgSfA9sBk8C7aA58BW8APwQ/Aj8K/gebANH14E2yVOkdr8SGItWAfWgw1gI9gENoMtYKtEXar+HolD5DqlS9WrcojMlHSpeoUR0vM6sVcn9upS6Z9KXEp5uYwbutT4CYkrKa+hXMv9dWA92AA2gk3gS+DL4B7wFXAv+Cq4j1ZeB/eDB8CDcDgEHgaPgG/w6ZvgcfAE+Bb4LtxOgu+Bp8DT4BmwmXbPgi3gObAV/AC8hLXL4Ofgl6CK6rpUqGQiFaqwPxjF9RgwDhyvfCX1qDAJnKFal+pTOBtMA+eA88BFEqfK8XpBYgAYImP4VDlSCiOknalypNT1eeBScDnXV3DPShkxppJRTJVjpK7XgfVgA9gINoEvYeFlcA/4CrgXfBXcB74O7gcPgG+Ab4LHwRPgW+C7cDgJvgeeAk+DZ8BmOJzl/hbK5yi3Uv6A8iXwMvg5+CWoxmIqnp+K56fi+al4fiqen4rnp0rPy7ak5xXOBtPAOeA8UOVa03gumCaVUiMxgHKIjKXTpP8VRoBpfDoPXCSfL6ZpSylb5dhNk08EqrxCzqJpciyOSaylVh1YDzaAjWAT+BK1Xgb3gK+Ae8FXwX3g6+B+8AB4EA6HwMPgEfANPn0TPA6eAN8C34XhSfA98BTYDJ+z3NNC+RzlVsofUL4EXgY/B78Ev1Yo1SFbl+pQ2B+M4noMGAfOUG3JEVE4G0wD54DzwM1yDZom152TErcrT8q1RpXvA3eAJdxTCpaB5WAFWAlWgdVgDfgQdX8L/g78Pfgw+Aj4KPgY+Di4Hw4HwIPgIfAweAQ8Ch4Dj1PrBPgW+Db4DvgueBJ8D2wGz4It4DmwFfwA/BD8CPwreF7icjlvH5WoIvxyOW9VOU3GpeUyf1M4F5wHLgCXgsvAl8CXwT3gK+Be8FXwz+A+8HVwP3gAfAN8EzwOngDfAs+C58APwI/A82Ab2A5+DH4CXgIvg5+DX4Jfg9+C34HfK5TPkgqjwBgwTuJK6ZkXJQaAag1dyRq6kjV0JWvoStbQlayhK1lDV7KGrmQNXckaukraOSYxAFTPp6ukHYV1YD3YADaCTWAz2AK2SlxDbF9DbF8j7fxdYi1YB9aDDWAj2AQ2gy1gq8Q8LU/O5HyZgb8o8XrZ03z5ZHdG4iZ1ReZ+CieAk8Ap6h4xFVzKFTX6LiKei4jnIuK5iHguIp6LiOci4rmIeC4inouI5yLiuYh4LiKei4jnIuK5iHguIp6LiOci4rmIeC4inouI5yLiuYh4LiKei4jnIuK5iHguIp6LiOci4rmIeC4inouI5yLiuYh4LiKei4jnIuK5iHguIp6LiOci4rmIeC4inouI5yLiuYh4LiKei4jnIuK5iHguIp6LiOci4rmIeC4inouI5yLiuYh4LiKei4jnIuK5iHguIp6LiOci4rmIeC4inouI5yLiuYh4LiKei4jnIuK5iHguIp6LiOci4rmIeC4inouI5yLiuYh4LiKei4jnIuK5iHguIp6LiOci4rmIeC4inouI5yLiuYh4LiKei4jnIuK5iHguIp6LiOci4rmIeC4inouI5yLiuYh4LiKei4jnIuK5iHguIp6LiOci4rmIeLV8u1jLt4u1fLtYy7eLtXy7WMv3KrVkQbV8u1jLt4u1fLtYSwZSSwZSy7eLtXy7WMu3i7V891LLt4u1ZAW1fLtYy7eLtXy7WMu3i7V8u1jLt4u1fLtYy7eLdXCrg1sd3OrgVge3OrjVwa0ObnVwq4NbHdzq4FYHtzq41cGtDm51cKuDWx3c6uBWB7c6uNXBrQ5udXCrg1s93OrhVg+3erjVw60ebvVwq4dbPdzq4VYPt3q41cOtHm71cKuHWz3c6uFWD7d6uNXDrR5u9XCrh1s93Orh1gC3Brg1wK0Bbg1wa4BbA9wa4NYAtwa4NcCtAW4NcGuAWwPcGuDWALcGuDXArQFuDXBrgFsD3Brg1gC3Brg1wq0Rbo1wa4RbI9wa4dYIt0a4NcKtEW6NcGuEWyPcGuHWCLdGuDXCrRFujXBrhFsj3Brh1gi3Rrg1wq0Rbk1wa4JbE9ya4NYEtya4NcGtCW5NcGuCWxPcmuDWBLcmuDXBrQluTXBrglsT3Jrg1gS3Jrg1wa0Jbk1wa4LbE3z794TwoA6qb/+e5PqTwoM6qK4/xfWnhAd1UF1/mutPCw/qoLr+DNefER7UQXX9Wdb6Z1nrn2Wtf5a1/lnW+mdZ659lrX+Wtf5Z1vpnWeufo+5z1H2Ous9R9znqPkfd56j7HHWfo+5z1H2eus9T93nqPk/d56n7PHWfp+7z1H2eus9Tdzd1d1N3N3V3U3c3dXdTdzd1d1N3N3V3U9fNOu5mHXezjrtZx92s427WcTfruJt13M067mYdd7OOu1nH3azjbtZxN+u4m3XczTruZh13s467WcfdrONu1nE367ibddzNOu5mHXezjrtZx92s427WcTfruJt13M067mYdd7OOu1nH3azjbtZxN+u4m3XczTruZh13s467WcfdrONu1nE367ibddzNOu5mHXezjrtZx92s427WcTfruJt13M067mYdd7OOu1nH3azjbtZxN+u4m3XczTruZh13s467WcfdrONu1nE367ibddzNOu5mHXezjrtZx92s427WcTfruJt13M067mYdd7OOu1nH3azjbtZxN+u4m3XczTruZh13s467WcfdrONu1nE367ibddzNOu5mHXezjrtZx92s427WcTfruJt13M067mYdd7OOu1nH3azjbtZxN+u4m3XczTruZh13s467WcdPkw+fJh8+TT58mnz4NPnwafLh0+TDp8mHT5MPnyYfPk0+fJp8+Ax2zmDnDHbOYOcMds5g5wx2zmDnDHbOYOcMds5gp5lY2kwsbSaWNhNLm4mlzcTSZmJpM7G0mVjaTCxtJpY2E0ubiaXNxNJmYmkzsbSZWNpMLG0mljYTS5uJpc3E0mZiaTOxtJlY2kwsbYFbC9xa4NYCtxa4tcCtBW4tcGuBWwvcWuDWArcWuLXArQVuLXBrgVsL3Frg1gK3Fri1wK0Fbi1wa4FbC9xa4dYKt1a4tcKtFW6tcGuFWyvcWuHWCrdWuLXCrRVurXBrhVsr3Frh1gq3Vri1wq0Vbq1wa4VbK9xa4daquImhaq9NouQgcQ3l0+AZhcq+xEWU7+84I/EB8MGOExIvUG6jfBFslzhc7bVJnNzxqES94xWJU7k+reM5iWs6zkrM73hRoosrT3D/k+BT4NPgM6Cbe05T64xCtdcmMRqMBWlL7bVJnK/aUnttEhdxv1VeD4RVIKwCYRUIq0BYBcIqEFaBsAqEVSCsAmEVCKtAWAXCKhBWgbAKhFUgrAJhFQirQFgFwioQVoGwCoRVEKyCYBUEqyBYBcEqCFZBsAqCVRCsgmAVBKsgWAXBKghWQbAKglUQrIJgFQSrIFgFwSoIVkGwCoJVEKyCYRUMq2BYBcMqGFbBsAqGVTCsgmEVDKtgWAXDKhhWwbAKhlUwrIJhFQyrYFgFwyoYVsGwCoZVMKyCYRWp8hkRKTyogzKfEdFcjxYe1EF1PZbrscKDOqiux6u9Qok65alybservUKJLtCtUHCP2iuUOF/do/YKJVoljlffKUkc0nFMYgDltI5PJc4B54LzwAXgUnAZ+BL4MrgHfAXcC74K/hncB74O7gcPgG+Ab4LHwRPgW+BZ8Bz4AfgReB5sA9vBj8FPwEvgZfBz8Evwa/Bb8Dvwe4XqOyWJUWAMGCcxAd8m4NsEfJuAbxPwbQK+TcC3Cfg2Ad8m4NsEfGvCtyZ8a8K3JnxrwrcmfGvCtyZ8a8K3JnxrwrcmfGvCtyZ8a8K3JnxrwrcmfGvCtyZ8a8K3JnxrwrcmfGvCtyZ8a8K3JnxrwrcmfGvCtyZ8a8K3JnxrwrcmfGvCtyZ8a8K3JnxrwrcmfGvCtyZ8a8K3JnxrwreJ+DYR3ybi20R8m4hvE/FtIr5NxLeJ+DYR3ybi2yR8m4Rvk/BtEr5NwrdJ+DYJ3ybh2yR8m4Rvk/BtEr5NwrdJ+DYJ3ybh2yR8m4Rvk/BtEr5NwrdJ+DYJ3ybh2yR8m4Rvk/BtEr5NwrdJ+DYJ3ybh2yR8m4Rvk/BtEr5NwrdJ+DYJ3ybh2yR8m4Rvk/BtEr5NwrdJ+DYJ37L7L9j9F+z+C3b/Bbv/gt1/we6/YPdfsPsv2P0X7P4Ldv8Fu/+C3X/B7r9g91+w+y/Y/Rfs/gt2/wW7/4Ldf8Huv2D3X7D7L9j9F+z+C3b/Bbv/gt1/we6/YPdfsPsv2P0X7P4Ldv8Fu/+C3X/B7r9g91+w+y/Y/Rfs/gt2/wW7/4Ldf8Huv2D3X7D7L9j9F+z+C3b/Bbv/gt1/we6/YPdfsPsv2P0X7P4Ldv8Fu/+C3X/B7r9g91+w+y/Y/Rfs/gt2/wW7/4Ldf8Huv2D3X7D7L9j9F+z+C3b/Bbv/gt1/we6/YPdfsPsv2P0X7P4Ldv8Fu/+C3X/B7r9g91+w+y/Y/Rfs/gt2/wW7/4Ldf8Huv2D3X7D7L9j9F+z+C3b/Bbv/gt1/we6/YPdfsPsv2P0X7P4Ldv8Fu/+C3X/B7r9g91+w+y/Y/Rfs/gt2/wW7/4Ldf8Huv2D3X7D7L9j9F+z+C3b/Bbv/gt1/we6/YPdfsPsv2P0X7P4Ldv8Fu/+C3X/B7r9g91+w+y/Y/Rfs/gt2/wW7/4Ldf8Huv2D3X7D7L9j9F+z+C3b/Bbv/gt1/we6/YPdfsPsv2P0X7P4Ldv8Fu/+C3X/B7r/QUa6OcnWUq6NcHeXqKFdHuTrK1VGujnJ1lKujXB3l6ihXR7k6ytVRro5ydZSro1wd5eooV0e5OsrVUa6OcnWUq6NcHeXqKFdHuTrK1VGujnJ1lKujXB3l6ihXR7k6ytVRro5ydZSro1wd5eooV0e5OsrVUa6OcnWUq6NcHeXqKFdHuTrK1VGujnJ1lKujXB3l6ihXR7k6ytVRro5ydZSro1wd5eooV0e5OsrVUa6OcnWUq6NcHeXqKFdHuTrK1VGujnJ1lKujXB3l6ihXR7k6ytVRro5ydZSro1wd5eooV0e5OsrVUa6OcnWUq6NcHeXqKFdHuTrK1VGujnJ1lKujXB3l6ihXR7k6ytVRro5ydZSro1wd5eooV0e5OsrVUa6OcnWUq6NcHeXqKFdHuTrK1VGujnJ1lKujXB3l6ihXR7k6ytVRro5ydZSro1wd5eooV0e5OsrVUa6OcnWUq6NcHeXqKFdHuTrK1VGujnJ1lKujXB3l6ihXR7kWlGtBuRaUa0G5FpRrQbkWlGtBuRaUa0G5FpRrQbkWlGtBsxY0a0GtFtRqQa0W1GpBrRbUakGtFtRqQa0W1GpBrRbUakGtFtRqQa0W1GpBrRbUakGtFtRqQa0W1GpBrRZUaUGVFlRpQZUWVGlBlRZUaUGVFlRpQZUW9GhBjxb0aEGPFvRoQY8W9GhBjxb0aEGPFvRoQY8W9GhBjxb0aEGDFjRoQYMWNGhBgxY0aEGDFjRoQYMWNGhBcRYUZ0FxFhRnQXEWFGdBcRZUZkFlFlRmQWUWVGZBZRb0ZUFZFpRlQVkWlGVBWRaUZUFZFpRlQVkWlGVBWRaUZUFZFpRlQVkWlGVBWRaUZUFZFpRlQVkWlGVBWRaUZUFZFpRlQVkWlGVBWRaUZUFZFpRlQVkWlGVBWRaUZUFZFpRlQU0WFGRBQRYUZEFBFhRkQUEWFGRBQRYUZEFBFhQ0XX0TLrEWrAPrwQawEWwCm8EWsFXiTOrOpO5M6s6k7kzqzqTuTOrOpO5M6s6k7izqzqLuLOrOou4s6s6i7izqzqLuLOrOom4qdVOpm0rdVOqmUjeVuqnUTaVuKnVTqZtO3XTqplM3nbrp1E2nbjp106mbTt106s6l7lzqzqXuXOrOpe5c6s6l7lzqzqXuXOrOV9+aSgwAQ+ST1Hz1m2YSI+ST1Hz1m2YS54FLweVcX8E9K6W+5vN92nz1m2YS68B6sAFsBJvAl7DwMrgHfAXcC74K7gNfB/eDB8A3wDfB4+AJ8C3wXTicBN8DT4GnwTNgMxzOcn8L5XOUWyl/QPkSeBn8HPwS/Fqh+k0ziTFgHDhe1VW/aSYxCZyh2lK/aSZxNpgGzgHngeqbxgXq90kkBoAR0pML1O+TSKwD68EGsBFsApvBFrBV4kK17yNxiFwLFqp9H/V3szKCLVT7PhIjwDQ+nQcu6miRuJSyteOExGWUV8hos1Dt+0ispVYdWA82gI1gE/gStV4G94CvgHvBV8F94OvgfvAAeBAOh8DD4BHwDT59EzwOngDfAt+F4UnwPfAU2Ayfs9zTQvkc5VbKH1C+BF4GPwe/BL9WqPZ9JPYF+4NRXI8B48AZqi217yNxNpgGzgHngZvlirBQ7ftI3K48qfZ9JN4H7gBLuKcULAPLwQqwEqwCq8Ea8CHq/hb8Hfh78GHwEfBR8DHwcXA/HA6AB8FD4GHwCHgUPAYep9YJ8C3wbfAd8F3wJPge2AyeBVvAc2Ar+AH4IfgR+FfwvMRFRJ5FRJ5Far9GYi1YB9aDDWAj2AQ2gy1gq0Qr+ZWV/MpKfmUlv7KSX1nJr6zkV1byKyv5lZX8ykp+ZSW/spJfWXkyspJlWcmyrDwZWcm1rORaVnItK7mWlVzLSq5lJdeykmtZybWs5FpWci0ruZaVXMtKrmUl17KSa1nJtazkWlZyLSu5lpVcy0quZSXXsvJkZOXJyMqTkZUnIys5mJUczEoOZiUHs5KDWcnBrORgVnIwKzmYlRzMypORlUzMSiZmJROzkolZycSsZGJWMjErmZiVTMxKJmYlE7OSiVnJxKxkYlYyMStPRlaejKxkZVayMitZmZWszEpWZiUrs5KVWcnKrGRlVrIyK09GVp6MrDwZWcnTrORpVvI0K3malTzNSp5mJU+z8mRk5cnISs5mJWezkrNZydms5GxWcjYrT0ZWMjcrT0ZW8jcr+ZuV/M1K/mYlf7OSv1nJ36zkb1byNyv5m5X8zUr+ZiV/s5K/WcnfrORvVvI3K/mblfzNSv5mJX+zkr9Zyd+s5G9W8jcr+ZuV/M1K/mYlf7OSv1nJ36zkb1byNyv5m5X8zUr+ZiV/s5K/WXkysvJkZCWXs/JkZOXJyEpeZyWvs5LXWcnrrOR1VvI6K3mdlbzOSl5nJa+zktdZeTKy8mS0WWzt+FLi7eB28F7wVx2fSdxB+f6OUxIf6GiW+CDlWq7XgfVgA9gI/gF8AnwS3A8eAA+Ch8DD4BHwKHgMvEBbbbR1EWyXqH4370uJ94MPSobqN/FUuRQsA8vBCrASrAKrwRqwjboXwXaJd+OHu/HD3fjhbvxwt2zrY4kPcM+DHRck1nK9DqwHG8BG8A/gE+CT4H7wAHgQPAQeBo+AR8Fj4AXaaqOti2C7xO30fTt9307ft9P37fR9O33fTt+30/ft9H07fd9O37fT9+30fTt9307f75GWL0gsAUvBMrAcrAArwSqwGqyReC987oXPvVi+F8v3YvlX0rLCErAULAPLwQqwEqwCq8EaiTvo7w76uIM+7qCPO+jjDvq4gz7uoI876OMO+ni/rHtK4lbKt4PbwXvBEj4tBcvAcrACrASrwGqwBqylbh1YDzaAjeAfwCfAJ8H94AHwIHgIPAweAY+CatwfkJybJZaApWAZWA5WgJVgFVgN1kh8kP4+KPv7mcTbwe3gvWAJn5aCZWA5WAFWglVgNVgD1lK3DqwHG8BG8A/gE+CT4H7wAHgQPAQeBo+AR8FjEksYnRJGp4TRKWF0Sog8JUSeEiJPCZGnhMhTwiiUMAoljEIJo1DCKJQwCiWMQgmjUMIolDAKJYxCCaNQwiiUMAoljEIJo1BC5Ckh8pQQeUqIPKWwLYVtKWxLYVsK21LYlsK2FLalsC2FbSlsS2FbCttS2JbCthS2pbAthW0pbEthWwrbUtiWwrYUtqWwLYVtKWxLYVsK2zLYlsG2DLZlsC2DbRlsy2BbBtsy2JbBtgy2ZbAtg20ZbMtgWwbbMtiWwbYMtmWwLYNtGWzLYFsG2zLYlsG2DLZlsC2DbTlsy2FbDtty2JbDthy25bAth205bMthWw7bctiWw7YctuWwLYdtOWzLYVsO23LYlsO2HLblsC2HbTlsy2FbDtty2JbDtgK2FbCtgG0FbCtgWwHbCthWwLYCthWwrYBtBWwrYFsB2wrYVsC2ArYVsK2AbQVsK2BbAdsK2FbAtgK2FbCtgG0FbCtgWwnbSthWwrYStpWwrYRtJWwrYVsJ20rYVsK2EraVsK2EbSVsK2FbCdtK2FbCthK2lbCthG0lbCthWwnbSthWwrYStpWwrYJtFWyrYFsF2yrYVsG2CrZVsK2CbRVsq2BbBdsq2FbBtgq2VbCtgm0VbKtgWwXbKthWwbYKtlWwrYJtFWyrYFsF2yrYVsO2GrbVsK2GbTVsq2FbDdtq2FbDthq21bCthm01bKthWw3bathWw7YattWwrYZtNWyrYVsN22rYVsO2GrbVsK2GbTVsa2BbA9sa2NbAtga2NbCtgW0NbGtgWwPbGtjWwLYGtjWwrYFtDWxrYFsD2xrY1sC2BrY1sK2BbQ1sa2BbA9sa2NbAtga2Taz+TWQXTWQXTWQCTWQCTWQCTWQCTWQCTWQCTWQCTWQCTWQCTeQkTeQkTeQkO7G8E8s7sbwTyzuxvBPLO7G8E8s7sbwTyzuxvBPLO7G8E8s7sbwLy7uwvAvLu7C8C8u7sLwLy7uwvAvLu7C8C8u7sLwLy7uwvAvL+7G8H8v7sbwfy/uxvB/L+7G8H8v7sbwfy/uxvB/L+7G8H8v7sXwAywewfADLB7B8AMsHsHwAywewfADLB7B8AMsHsHwAywewfADLB7F8EMsHsXwQywexfBDLB7F8EMsHsXwQywexfBDLB7F8EMsHsXwIy4ewfAjLh7B8CMuHsHwIy4ewfAjLh7B8CMuHsHwIy4ewfAjLh7F8GMuHsXwYy4exfBjLh7F8GMuHsXwYy4exfBjLh7F8GMuHsXwEy0ewfATLR7B8BMtHsHwEy0ewfATLR7B8BMtHsHwEy0ewfATLR7F8FMtHsXwUy0exfBTLR7F8FMtHsXwUy0exfBTLR7F8FMtHsXwMy8ewfAzLx7B8DMvHsHwMy8ewfAzLx7B8DMvHsHwMy8ewfAzLF8h1L5DrXiDXvUCue4Fc9wK57gVy3QvkuhfIdS+Q67aR67aR67aR67aR67aR67aR67aR67aR67aR67aR67aR67aR67aR67aR67aR67aR67aR67aR67aR67aR67aR67aR67aR67aR67aR67aR67aR67aR67aR67aR616E80U4X4TzRThfhPNFOF+E80U4X4TzRThfhPNFOF+E80U4X4TzRThfhPNFOF+E80U4X4TzRThfhPNFOF+E80U4X4TzRThfhPNFOLfDuR3O7XBuh3M7nNvh3A7ndji3w7kdzu1wbodzO5zb4dwO53Y4t8O5Hc7tcG6Hczuc2+HcDud2OLfDuR3O7XBuh3M7nNsVZ4PQAjpOGAYo5P/qWcDrGa1NZBkGG3b73ex3p9/v/I73iu61uldtr6d6vd/r696rez/Q+5T/Ev8a/8t9Nvap6Du57zP9evXL6Xdfv4f7HeyvDwgYYB1wauDEgQ8MPD6o/6DbBp0c9O3gxMHbBj8+xH/IuiFHAxID9g2dOPSJoeeG6cNyhu0fPmr46uEPDN87/P0RASMmj1g4IjPQP3Bb4Psji0Z+HLQy6NKodaMeDfYPXh384Ojpo58YM2LMUyGxIbeFnB+bOvaZsedDZ4XeHnp8nGFc3rgd47426sa3wkaEFYV9Hn5zeG345xEjIrXIgZGxka9FvhE1MMoatTs6PXpD9O3RJdFvxEyOSY25KTYkNjZ2onxtjr0UtzLuZPz8+Jzxo8evG9+eUJCwM2FfwinTOtNG018SRyXenHg8sT0pJ+mZpFPm0eZ0c735ePKG5O9TTk1In7Bkwg0TsicUTbhzwo4JlyZ8N7HvxBETjRMTJuoT0ycumXjDxLcmnp3YPvHLSYZJgyeNnjRz0rlJH0/6enKvyQGTQybfOSVgSsiU2CkTp8yasnjKSl3X0/Ul+g16tl6k36nv0Kv0h6YWTL1t6r1Ty6Y2Tn186m6LwVJiqbc8annO8prljWkbpm2Ur23THphWM+13056Ztmfa4Wknp30w7ZNp3073nz5seuj0+OmTpz8+4+YZOTM2z/j5jAdn1M54eMafZuydcXTGqRkfzbg047uZfWeOmGmcmTBTn5k+c8nMPVctvmrlVZlXFVx121X3XlV2VeNV+2aFznph1v5Zb806O6t91pezDbMHzx49O3p2yuyZsxfOLpl9fvbl2d+n9k8dmRqemphqSZ2bak29KXVD6sbUbakPpNak/i71mdQ9qYdTT6Z+kPpJ6rdp/mnD0kLT4tMmp6WmlaQPTB+VHpluTp+ePj99efrN6Tnpm9N/nv5gem36w+l/St+bfjT9VPpH6ZfSv5vTd86IOcY5CXMy59w+p2TOS3POzo2de/3czXN3zkuZ96f5sfPT57+wYOGCpxZOX5i18KWFlxf5LwpfNH/RxsUBi29Y/M7VI65Ovdp59UNXn73mwWvDr92/xLwke8nZpSlLf770paUfW1dad1r3WtuXJSxbsqx+2cfLFy//3XUJ1+247uvrw6/Pu77s+vdXjFqxcEXRijtX7FhRteKhFU+teGnFwRXvrDi3cuLKWSsXr1y5MnNlwcrbVp5ftWTVDauyVxWtunPVjlVVqx5a9dSql1YdXPXOqnOrPl719errV69bnbd66+rtq0tW169+dPVzq19b/cbqv6xuW/35Gm3NrDWL16xck7mmYM1ta+5dU7amcc3ja3av2bfm+A15N3xyw7c3+t847MbQG+NvnHxj6o3X3BRwU8hNsTfl3fTGTX+56fxNl2/6fm3/tSPXhq9NXGtZO3etde1Nazes3bh229oH1tasbb859eYdN++1hdrKbF+us657OKN/xoOZ6zJfy/zSvtD+RlZi1gPrR69PXX8uOzN7b/YnDovjGcd3GxZuOLyh/ZbtOQNzDufelxeddyn/8fy9+e/kf1zgX5BacF9BfcHBWwffar7VeusDt+699bLT3znameJc6Sxzvu+8VDi68ObCBwt3F8UWtRcXbAzY+JdNezz/5z1Dipap9dGu13p5/x/D/eU1TaxTIN8ZxXbf/3tYHPfUAAPkO0/ZoPmLc96ynxYvznvLvbQgQ4C33FsbZojxlv21QMNUb7mPVm64xlvuqw0yfOgt99MGGC75+Ph9bPintzxAC/K/4C0P1KL8v/eWB2vj+kR4y8O0oD6pkono1U8SauyzylsWWmL/b7xlgzZ4QIy37KctHzDJW+6lJQ74pbfcW4sc8Ly37K/FDzjjLfcR8QN7e8t9tdGDkrzlftrIQQu85f59Tg1a6y0P0BIDp3jLA7WFgXZveVCfrYFPesuDtZlj47zlAM04dr23PFQbOPaetPyCLU7H+uwi4yPGFLN5ktGkTpONix15+UVbCuzGebnr5icYN23alJjjvZSYkZ+baJydk2OkYqHRaS+0OzfaMxONy7Mdhcas/LwiY2F+VtEmm9NuzLVtMcp6xnV2eV+BMz+zOMOemWDMzc90ZDlUKdNRmJGTX2jPNOY7jUVOW15hlt3plG83OYqy84uLjEXZdqN9c4FspdC4yekoKrLnGW0F0tRGW44xP6sn1URjumOj3ZlpM0omNmUv055rc96ibpxvd2Tac9bZnevtTmO6szjjllxbYUa2I08anD0vQTaSkVNcKKvnbDHmODLseYpUUbYzv3h99pUOseVl0jW6td5RWGRXlB15xgy7s8gmzxuKnY7CTEdGkSM/r9DrGVU/y5ZhV9zypfMcebIHNmfRpnwPwXRbnsOeY1xsy9uqatiNmfZCx/o8X0Oyy0X2jKJ/246v98ukH41p+blX2zMdxbk9yFuuvMfoucmiBv4nPrve7iyUDRiTE5PN04zdblT3ydtMntv+/9L3PWp3c3GPrsJ4vT0/117kdGQYs2y5DslEEveNmRy9bFuRUU1pm5z6WU67XYJ0UL4zz5ZrzytKNC7b5JBT1DNmqpddTRnzC4ocuY6tkmaPVrPklM+1bXbkFucac2RX1jlyHEVbEo0LZF+kipy2Qjn98+UteZKL1IFT6cbuzOtiJaWZ7cjIls7eou4svLXYbt9qRzPK/w7lAjnJpB/zZEXVYG4h3cpW/SjItq2zF0nXeaqqznnoF3q87LEtpawkJ4WXWwAfu7w1x+FtZpMjsyi702aGrcBRJBvMscvbndJMj/465XxwyHORs9iuDKkaclYXSGbqlO9kxHy2rPmy450sPYrYbMq2e6KO0ovHdkyhMSPb5rRlqBYZoZz8TZ4OKDMy0MiIYs9TYyjtbLLLzmQUq4CV4O20916nw5a3vjjH5jTac+xqSD3GZBtbjBk5dpszUc7EWzy9zs13qs7m5DjWO20F0k3dJoqXfoEcvYRuHAuLnPm3yI/tm7PlQBd1G2E1seQElJ4pcKipvG6LtL/RS8FnTbKWAiywSWdNM2bmb8rrNKhIZtttGx3SjdJWnrG4wPdZonFJfmGhY12OXYVMKSybx8Nq4imrPTWQJzWYqUL2ettWqUzvXJDekYHXLie9PNsyZYUiR6Ejbz1GsmyF2dJiQue98prNKYWtIlWxU84ET8wvklRS7Rm24kK76pFDdizZ3Dk0agpmOjY6MuW8ktS35CgvOmWjDPUVk0hJNacwX+k1Pz/TmCVdqZik5TvlBLIV2Y0LMqVFqSO5COUUe2JAdlFRgSUp6cpl7CcuJ6klzKfjwp+6yRumfiJiamlavnzI2qI5NYe2XsvWijSj9og8UjSzfE2SJVPnu8mytFjelyfrFMk6BZpdXpmn5WrrtPlagixv4pWo5VxxV6KWId/lyrNRmy0/zZHnrhYLeWeXZ7s8b5SYyZ3L5acOPs2StfPgVihLWbK0SbNRxyit2mQrRm97RsnF7rVXIDFf2iqWrSubCdytrjikDUfntUxayZCs8uGQKa/ly7pGac8prefJq1lwc3o/3SRrFEl2+dJ2Efdl06pd20yrqi+F3OfkziJ5JU++t/FIq1htlOUc2sn6t15VfkiXn26k/UxZy+j1ia2TX6b8LBd/3NJpcb685uCTHDzilL6206d0icojt1BH9Tub1j0MZ8uWE7w9UR4plnd4Ws/By2pkM7jX5ynVdyeeUKP5n2aI8mZmt1HrGq319KsIlh7LDhhlcKVI3u95v0G25OTeTLgUScyHT88542s/S9bMoBXP9XzvzFPWPGNgw/4mPunyYDpcHfRc9Uq929rZhp15Y8c76+HVs0eeUVa9yQD/r/25cuyXeeejEeXmyvPVWHdIK7maFT8WS8aqTz89Epb/pV1LZwT439W7njsLvT0yasnqf7As7UzrFlN6WvTZ81gz9bD2/+ngv503P932j8/qnx7VLh8rv6kxseNt1aIRbeXKsscnHo9fqbtCr29sREpf1LZ5V4Es3tu9Jc8MUjrMw7KdqJ8Io01wKbxCd76x/LFeGVnblF8Ux61eb/50X7O8UV+NyWZqFcMnxzsq6+ipgx4qTgu84+JZm5zMIs9qkO+1kuf1i2d9cHauP3Z6+GO+8qyi2fg32zuzt3TaLNRulZyUv7biM9+645v/js5ZYPOusWo+5nlb9PUw1xsHs7pZUPcXMErrGGHPrOveqm/kunu/sMdc7s7bs0r7Vj3PCpjLaPj6YvdazfGOTReXTShWvfshzwzWUAc6yPGOTZFXLR42Pz2+Tm98cHjfFxEB7J2MfG14YneB12e+d/moz6exK3lZmbs2b397+rL7mrFZxrRsYlJX7uNbb7rzjuGTDKw4mR2+PnZpSOUrm3qMQFHnyqQynCxvDMnr1KGHzyZmkGfuFndmXAlXjHRPu0rx6l3X6mJEbfZOlXZn5unHFlpQ96jrid6YeEuPsc7Fr76RzWE2rKfHBd7Z9OMRpaf3C7za++H4e/xYSA/yabvQG9WzvYou+gkN+yKWwxsH1airmeeLyuvoXy65XE8vXMnN42vPClhAzxS7aYyTGsG8H2Ho82Q23ttIbHN28lI1iqWdK+spHy8hiy2kdzlebaus07Ni2XrMYV/E83H9d+tAnncdzNR8Wfd6eWz1rpk944Jn7ngyYLs30tu8/cr0tlCEZx3MqS4mWdyX7eWY8CN2Pfcp/3hWbF+OVczo5XQq1pP3F3m9kspdNtZxe+cYObwjpnKSH6rGFwUz8YoDi54WCpmTOZ1z0entaZeq/30k8q2qOTzP+NbXfFgbeTYp6uaTNM6eCGSjv2rtyfRy9KxHniejHJ5HuvKAbGJjgczfkuTrPz2d/e/uTup8KrtyPS7UrtGuVf+bXG2uPNJkLqXK18qrRolziQPq+hx5ZZlET7ZllaU5Mt9TV5drg7T+HKtYwYzM+o3ekVvXmQV1ZV4/lfP/8HnR7n128+gp06toNVM8WUxXHvLTWVTX82E+eVGXPd+T4Y+1nOnN7Jxos7jzuWCdN0vI6zYzr2zbE8d6Zp0exfs81fXk88OWu7I4z3NnMWuTLzoUYq3oJ9vu+TR6nfzMM/OVzS0/GB/PrOyZvRZ1zvJCLGZonifwjB/0yUhc8eSEvphq9K4IntnuiRe+dlU8+bG8p6cSPXc7iZrd9V/0H32W480efWPl6UmXPd9TYyFz0seiS7tdd/oivYeB8qRvbl/5DUaG9zsZ3yz7sXnz77h7ctOsHx0dX07qySMLe6wGnqcPG/Gqp5+dPzJOnjHO9Xq4wLvOez5Tljxr1qZuq8t/M9I+xh5N2r0RtPt3Ll32fthvnxbmYc/euSL8NPeuHEeNiw01X/ndVIZ3xV3nzW08/fKw8uQI/zlW9mTwY0w966Tdq7+tXN9Km77RKAbt3lnkYX0N82Gr97NCr9+yvXMky7t+eeosg7mnblFnvPq/Ml/SOTMKvM/HaqbGYMf3nGFD6f/o9pzkeYrN86rZSC7ZM/8q8trxrGQ5zPHuyspkfuQQeR3Y9zz1ZXqzrfxOxp6ZqeZPMZaUd7d2tlZIJlvkvebpu9M7rxxe//3fvfPv1o6e88nXd1+O75tVFm9UV71LlO+M2nj1TxZpsTJXiVP/xJA2RUuRVydqujxM8kiWpf/tGt6T/3/6dqf7tzHse/PT8awk8iM/hhTu8dN6ab01f62P1lfrJ7s0QBsouzZYG6IFaEO1YdpwbYQWqI3UgrRRWrA2WhujhWhjtVBtnGw2TAvXIrRILUqLllMiVnY8XrohQXY3UZI3yy6naBNk1ydJh0yR3Z8qOz5Nm67N0GZqV2mzZGKRKqmny6RirhyA+TIsLtQWycG5mhRlibZUph3LpJOv067XVmgrZUhera3RbtBu1G7S1mo3azZh0PZpv9Ne1x7Ttmmvaae0/dpH2h7tKe289pz2vPYn7VntHu0Z7Y/aaW2H9lftFe1p7YL2ovDTdmk/136hvaxVaG3adu0B7VdanfaI9pDopd0nemt3a6XaZSmM+7VK7V7hr53VPtPqtUe1L7TPtS+1ndoftEPaAe0JOUUytAely49Ixx/UDmtvake1Y9ob2kUpsbe149oJ7Ukpg0vab7ST2jvau3L4/6b9XfultoEHrVw5vHnq/6Ysw30BiZkS1UY5JdrlA9BWORlc2s+029T/EVe7Q7tdu1O7S/tY+0R7QfQRfUU/0V8MEAPFIO1f2vdisBgiAsRQrUNoYpgYLkaIQDFSBIlRIliMFmNEiBgrQsU4YRRh2tfaNyJcRIhIESWiRYyIFXEiXowXCcIkEkWSMGvviWSRIiaIiWKSmCymCF1MFRYxTUwXM8RM7QPtQ3GVmCVmi1SRJtLFHDFXzBPzxQKxUCwSi8XV4hpxrVgilgqrWCaWi+u0f2rfievFCrFSrBKrxRpxg7hR3CTWipuFTawTGSJT2EWWWC+yhUNsELeIHJEr8kS+KBC3CqcoFEVaqyjWzmjva83aOa1FbBSbxGbtf7SXxBatQWzVqoRLq9GqtU/FbeJn2m+1Eq1W+732a61MK9fc4nZxh7hT3CW2ibvFz8UvxHZxj7hX/FLcJ34ldoj7xQPi1+JB8RtRIkpFmSgXFaJSVIlqUSP+R9SKOlEvGkSjaBI7xS7xkPit+J34vXhYPCIeFY+Jx8UfxBPiSfGUeFo8I/4o/iSeFc+J58Vu4RYviBfFS+JlsUe8IvaKV8Vr4s9in3hd7BcHxEFxSBwWR8RRcUy8Id4Ux8UJ8ZZ4W7wj3hUnxXvilDgt/iLOiPdFszgrWsQ50So+EB+Kj8RfxXlxQbSJi6Jd/E18LP4uPhGfikviM3FZ/EN8Lr4QX4qvxNfiG/Gt+Kf4TvxLfC86DJpBGAwGP0MvQ2+Dv6GPoa+hn6G/YYBhoGGQYbBhiCHAMNQwzDDcMMIQaBhpCDKMMgQbRhvGGEIMYw2hhnEGoyHMEG6IMEQaogzRhhhDrCHOEG8Yb0gwmAyJhiSD2ZBsSDFMMEw0TDJMNkwx6Npe7VXDVIOl15xiZ36f4jyH2Tzb7D2n++faMpz5eYML7E5HfmaGPY/d996JecU5OX1mez7sY/Oc/Wevc9o32v1tnPrMzl+fn2e/pY/Ncx6QluFwZhTnZuXYNw/I6Cr3T8vML7JlKNP9MzqL/ukZNmUy03NKl/ZtRfKdOvWZ423X7m13jqddO6f+c7rs2TuLfeZ42dg9Z/85HsN2TgPmdeO2vhu3eV221ncWB87LyM/NtXnfrO/2ZsD8bnayu8q95q+zOXtlS/BfUOTIybT7Ozj1WeDticN7XuBl6fCc+y/obNSwYKHBsWHAwm4NbOgqD1zUndIt3d74L7ZlFBfZ/XM4DVzc/b6cHvd5HJLDqddi2XCvHAn+13jq53nqX9O9fl73+td46ud5HJpnK8hXm9IF2fY+13o7l+8drms9w5XPadC12cV5623O4twcW3HRoPzu7/ytnradnrat3dt2dm/b6mnb6Tkt89Qq5DRgWTePFXbz2PLu1oq6W1vuMVPk8cRyNXRFauiu8wxdsWforvP2qtjbq+s8vSrm1Ps6pyNvfe9ihYOu69HD4u7v+lznHfBir0hWdGO7qVt5Vbfylq6y/2pPX7dy6r+6a7pu7Zquy7r3tLDbG0Sekjzbe07tK+vk2AsLN3gupE3lPGHqRM95tvd9alo/W5bDMTk5RZ/az15YJCdvkYwJ6facIpu6IyUleZL3LD/fnJFjy00szOiXmZ+TY3PKUn8ZTFTzsjjQlivfFNryMuWbAbcWK2v5ebLcy6ZgnYIMBerzXnYFWQrWK8hW4FCwQcEtCnIUqOZ6YSVfQYGCWxWo1nsVKlCN9ypWsFHBJgWbFWxRsFXxta132jbaKeFdWRps63I9HzAV6EemQwbGQocy3temhl111BsYuZV5wUXPUMtibxvmMzrNZ/Q0n8EMlKVBXYFR+UkWMh3SmXjVd08/T3CUJX97kXJNP3tnB+ydLdh7tmD31R5o79aBQfbuzfW3d/XC3tkLe2cvBq/vYXPQ+u6V+6331RjSPVCqatk9qvVR0VFVcHSydnSydvRk7eh0u6Mb6/6OTp6DHD064OjiuqGHpSG39OTUL8fXZL8cn2eG5PS8p4+KitxRmGMrxNF5nbXyOkcjz8dxSN4VbeR3djC/s4P5PTuY39nB/O4dzO8aiHyfWwN6REw+8vHqnU8rTl8rQ5xXMHF2si3sZFLYk0mh7xYZOzsn3ZDCnoYGrbc7c6WG1+Uomv2KOl1XdIXrijxj3LcoO99Ju8WdvijuZFDck0Fxpy+Ku/uiuMsXxT5f9C32Ci+g+Aqn9C/umgKbetrf0tnwlh4fDNzSrbl+WzuHeGunKLd2n2S9sxygCkC9HRtQEaFP/e6W8oUvuHnf91HZljr7RK1+rzHHQ79fVk6+7ImS8hZ7HvPDmZllz3XkOfJgKmOm+mVZb9zst9UuTeXnFef2lX30FIo2ea70L8p22j3X+mXlFzu9JcdG732Fjs2e+wqlC/M8RX4Ny3MjDapSH9qQhPJh4K/sM5DKuuwFttXZwUj4K7vyc49VWfDYlDd4u+CXtbZIHtny2CCPdfK4pZ9nMmTYCvp5vC1Lg7uNifrA43xV8kwLWRrYOU7yTX/vtFB3eKaFLPVlWshCQI9pIS8M6hrCLuu2nKIB3SbukO6TWH7W1zdn+/rmxKAeE6evb4L09c3cAd1nUue87eubtn28s3bIFZN2YPf5pRbUufrcudJRWb3lsdYB5uzW5HP8C5p8mNQM48UL/Kq9LOyRhYnykzBtlDZc6ztePmoL+ag+Sz7mR3ouvMD3CX3GSwPGOT9zjEr3/ja+4Hff5THysjyP8HwDMbLdvG3kef9+8dvnb/9qkOhjaNw28j156W2DEMn9zH38e48f7GcYbbb59x/vL3qJbVMMolfjMvNSc0K3KyE7Q+8M0abzulY+knt2Wux8WzNTvcxh5n5eU721XiM2vHjkmh0Jk7au/0ddzmtffXzLxp+1NDRuG1po3ua3Tx6mRj/1rBQw75Xg8pb7rXPTvjqTO39Q8kPmQZ1ERe/emvmuXyUPkHb9ruvlP9ywenZyoHm4etN3+MAVdqW6PGOarcCePMI8TF3uM3xAerFznS1vo4x29uQh0pq82n+4//Js26Yie/JY8xh1YcDwEZ4LxjT1G5JZ3t+1TB5nHqs+9hs+0vvxckeubEXmOep3KNNmm0ODBpknJKeYJ5r5WR00KFm9nZAyYdLUSVNXm5d1I3vdsuQgc6Cn/cHXy0ewZfzS5YK8jMTk8eY4T0Phvg9oyrjM19Yyu3OjQ/2Cqmx0mwjv7hXRW/PbJoZo8np/wzYhtEcOP/PQ0WPGJ/v/7JeP31N86U/XfNby6pBX1tte3pUZ8pcXvzk84bGfm3+58vYdZ25pnlw/5JUTH2++vOl3t+dPf6X0yUEvZH+eU3b4Zavpsfkzvnju3RvXjjE0fJt0S+hDX+2q+d3og4bWOxZbPxx888ezQm53Dzp71YE/tdzz8tqtG5IT/arvGv7wPOMbyYWDVpiObZ44oXxY9TD32eykR89/+Np9O+L//Kuwe7JevnvlivziV6Y/Gn3PjYcDAqc3/Lx9+av98/Z9//rCZnefoZXht52ZGXMidPPHDcmHPjsfHnxm3x/npdWMXtsY+uBHN33xyW2f/eyxdeLXX1w94Ozx8OsfLj/2xL0bn/jkhUH/+Ojq043/zG58YsS0P97z6osGPzntd911xnzXKfNE/75yxvbu3UeIXrHmaHOk771ZbB/l/e3Q/IzCgsSN0u/ql0bVr4cyd8YOF6KjV1+zvzwZhGaera6N62Ux6+bJjRMbU7abvdUznDk9aid55kr3qZI2O1HexUwdG9VroLm/j4VfX/NgdXGIaquXVIC/ZCjfD+0lZ+ZDweYg3/z2Gz5w+bLZcqLppmTTpAlXqMLvrru0hbd8077ytfSQ5F9uqR5f8cq2x8XJkMXHnrpvZV5L37hdNx08XDr8Qi/roE/nxSRp+lMfHSq9puad8HWBX101JezaguQ7P/uVfs8f29oqte/fvK7imsi3Hom5ZusTz9tm/yP+jQuHTt/U/OL4X8x8tu7Z060rOvb86fXbv3hzYP2lyu/Hvz3NOmaMHvPVVQulhjvM2wwXvDoedHH8pXdOxd07KqV3v5tqNt57pY7/f6KMH8rRrHeX44r/stEks8nTaPR/anQZv2f8HyX5zJLY+c1vZ2/9+aj0rOIbb9+3uyEjumNGWu1tQ/WAqOsKTxfHOP51jdt4w9v9v2kcE//3664Ps50KPfPRSxNuOfBp864p9gfGlA58blnoDbdlTVrb+74532+8pmXZnTvvMtY9ce8NO/t+9VfzN5+ET1mc2v+Nlv3j9p287uJdVz1r3ZXwqNh6eeej90/6vuH8jRt6N8y45cNXKvZ+f/Tmb2Zd6NOY/re7lub9Nv7yc/cFxP791+/7N25fUuNa2HeQeezhgPpbvrq48olej8yqfia27dcjH5/+4bL8RW9Pqns2P3PsHysSXpxxYcvfcrd+M/J89B+e/LR62fOzEsp3b3n0+3esj8UV3Z768dTQnRtGnl/1YmT2Ke3OtIB77rzFK8nD5rsO/B8lObBTkgazZp7gEWOCOd4c2xjdGLk9/KfEWFRYaMqwIb+RyE+Z+DcK9N/7Xylw4pUKVKN8z+aCv1xjFcY157Yc2mbe9y93cMXLv9H+/PKxY/s/H3yq45ur905YZx76+hdFY94pObu21jj86dvm7Fly7O4Ldwbd/fuY0vXD5/7z8O6q2X5H/2fpmt6/uuPh/H+MWTImMvGy4/6c8K9ePDyy/O8Di/Zmbzr9t+p197xa+ODXvyzaGvHYripX5dNf/Tru1qsTi8fMn/2XS88OMi4/uamxcluG41/93rzvUvGL/f7n9DdDr4uusaXs2Wp4yrV9z84//yo8YfOJSRtfKim84Rv3+cWB/SOOfvTWOxMTF8wKnD7k5q2R+3+b9WnFmwV/m3nh80G3v3/itl0bb3W8WnvtPPOksKd3Pjl63fTxpx94NL6P69SoP97g+qDut/nfT//lH8zberXKMHDIGwJCnr6vT+NTb/3D4Zz70PPLa3b/YCn/038pR+8yPGD4yC45OosLi4zX2Pn7q+Rp5qmeG1KW271/JKP+WMFWZFTTotD7FwA95oWzwGaMzYgzT0xOlGkN4xvVaT1NPnQVGicY0/Iz7UhcaT7FbJ7oCzKTzRPMKV1BZop66wsydz3UrVvpc3xJR9/h/vPthYX2vG65Saot0zg/P3ddsXN98kjzCHo/YlCPP3pKnmme7unbpHTHev4+Z0F6J0GT8WqHzEDVX+wZl/n+bO96W44jkwTGuDHFZ9fvCrvmuxqujFh33S/H5JcGuZYcuPTngft+cfL74xnRdy24IfPwwF1nthaPdFffcefTp5tzk8+HfPnFxrLdHat2LRh+6On40uPFAW/1zvKbtu2ZLVvGW7aL4r0f5piuf3FS+WulMYMvhfy94uHrho0qv2PJPdsCVr731F9M5VvW771Qn/GzxWOzVv3V8NUf12fE5z0ddfxv08Zl12V9MfOun3nCxTZxhwygLnw5dji67yHVPneaZ3niwFQ5ApMaJzQmb0/yxoG0ZWkTTGrETD+ICJ0fERTSlQVjrxlmNYcG3Lx9vtj+9RzRJ8hPhRZfkDCIkSH/bib92MruZy7uFugc5vX/ZaC7qvMuw/YJP+iNzWH7id7wUYZci8YpLhG9RplH3jmi7xdL2/75/YwZmZNvy35zzeaHW9yvTzEP9e/n6WeqJCb92CtAhsauxH6MJ+nRpJd/LMhZLm25fuTg1K9fHfvgx2/fs2/+CtFw1aJrI+ueveHP9X+dGPDyY1W7b3/j/SVbHNU5xvuO3RzbMe2j21Z/1/TZ87/9ICu3flLbZ+P7/OvL3zj973Ob0r4blXdVtGn6vV/96uHoYxcqLTPvucFlCP70+0dK7v3VsFOvvf7FNb8VO37u/5xp4dYbb36wonjJ1D3P9nrmpW8ffcHZ2LtyXUTqv164q/CRYZfrP3vpsz/XnH9z9Ox7P/1F5HtXrX7t7w/9ds2tD3766qs/u/sfMdsHvNJuvnl57xccGdd8sPBydknujEevTjuxYfU0W9KlvcM//HpM21v/uC/o6W96nxRVl18ZPv3N47817X/2HyfOPfnErY0pEcHJZ+/3W/dU2d/23fDMaRnkXpFHrDfIzf5N0+qpm1veXGDP0scuLn7tyiC39r+McXICe2Se6NP2kuJ1OY4M4xKnI9fm3NLzycQ4u1h97eIo2kI4mmiekjy56xFEvZ3UGY7+3xll/1NGteelT166/dO7/3ZuyrX/9AvQ9/R9a8fP6r4tuSN44Gu3fJJq3XH27ZD5w6PaX83Y+s1S+ydvPzrti0tlteP/eTnrnci/fPVFQ17w1MkvHd+1sW9oeExkjv6bmA9+vuCJMfc1/StqW0KAue3Wx2LbNi1c+tnHx76+tPyd/L0f5vb/9elTmfdnPGO6JubLXwz+PvfDuOoPfjHvNtP2O9pW/PoP61+bkPKb4cbvHokYUZP72s8Xbczu9e6tCTeGfXvvoOh/jTP9ZvwFcd3Vl3MnxW77f3b/ZnbMtms3VzX+jT/bvCt57gWlPyutnTI39Vlt3bNlHn/ckVc6Td0af4M5pt3dyqhw8edSiecH3gUWmD/cxuoR5JFv8erwi5xql5bdsCJyATBE5mDtsFCnZDOElLBALQbAdtYCpTYFXC2tguREY3CRKgspDEEVD6wwZEIqFtE7POjFEQMjuMkPbIEpGSgskTOQMZQykICkHUFwkjF2hjXDTIwhlvGxiLFgL+saGyClYaVB+cLkJYk0z45NAgW7nsgK3NQ02WZxqpr5zK79WLpq66zEd3hVh/5KCX3jsOStp+OEmXM696zXkz1VofxTRpK//nXGHqObHRb37thf7txiv7Fp2sclUbve6qldvlfDmMfAxbCEbZKgB6fDTxmJynRllQe7rz4MWCf9le/uA73Gsw2Lc4L8J5aGdu1S+nTplWNph35yaK1cSNTUyFM3TRoPxMd9q9pq2MTyHFiEPWZiZDRoPDlESwgs7UvYyNWCJsYSYOLjhFZpGoyG7MzAopiBAdi+uY9U0/EYNl4waDy7oHF9Q+MarBsry6ELtFMYIJvjSqDL8SuhC6LS4cttIctVEQucQEsVYcvWksBLuCBL/xELnkBbSEOQFu2Vghdvoy7DTGXA3JpXzKC3ULJBHMfWVgNJeHLjZDbkQR7CM5BB4nEb8hkgy4oCZeEaWQ35QY1cQ0MjYO/Z0NDAMMpAGSHLYgjMbQmyl3kCLE5PV2A67/dXI75Gb50PrwE3UoHN0tiw3zZBo6UpPveRzttZoZqKE6UX/m29b3gpve6kS+/LBUfuxNncWm2SI/JoTdP3rka2zyvYuUuO8MvyL17dFfwztjSng2OhbqVfh9HH+0bzrk+rvT5BcGebgrzXho/Nzl1sZbo19opPpVSWXpRc7rRQ+mHb0umHf357e6pP4Mvys0933tquoHp4YROwCdPE+BvhdDbDJsY3QKEXoKSfTpNBCCxDHzxsHBAHMAELgAWRwNIMKYoQYcbOiCMODC2BcWAUBWzZIcWBEIuA55m5ratelX3kb2B9/4SDURetwmRpYmSQFTnEICZ0vLliM/fXN5fn3JumG87H/jzLxfZG5HHV3pjZLk9WzHFVO3rlF/tUiS8bktYc6za/VuD7ZGrTlY7bhQLn1ohadCxbX3cg93uFbL7JU8tNhiGFEYtj11b/e1+VKXdHJPTbn1mJc5M2qHbxWLI0/3vzbsW/D/HHZ+Y92Wz17tNstXDHoqt1UdkvPivO3PXxydKO9aLi3SlML28+CWqqueaoxt50wOLYSemGeBH9PLnn60Xnmneo6//fp8j934Nnhd7u34IX/ld+E1nppvLfWfLe+4V/Vv4LCBbgifY4u/m+75bQq6abrjyfsuOC/J5lG3U5/c20JzPJ2Dcf/Whh4bI32mHS6oenur56MzA45imkFhXlFynkJyeXgg8nAZbXoP3z4INPihTKM1LzQBvdgbEH3hkPkgoN8tFTCMhJTQQWXqCt/onJkKNMiiuLS1JzFRJTQLM3xSVFiSX5RXoKNgX6dgqeaQqV+aXg/fy4VCoUQE0E1iPZCjaJChlFqWm2sJGL9Hy9XFhfDrKRvRyYr7P17YHdtmxPF1sLI3NjQyW7jNSiVBv9RDvQEQxpmXlA35SWQE40SEyCnLiSWQzxsB4Apk6oXhYuAgA="}}}
},{}],9:[function(require,module,exports){
module.exports={"Subtype":"TrueType","BaseFont":"Times-Roman","FirstChar":"0","LastChar":"398","Widths":[250,0,250,250,333,408,500,500,833,778,180,333,333,500,564,250,333,250,278,500,500,500,500,500,500,500,500,500,500,278,278,564,564,564,444,921,722,667,667,722,611,556,722,722,333,389,722,611,889,722,722,556,722,667,556,611,722,722,944,722,722,611,333,278,333,469,500,333,444,500,444,500,444,333,500,500,278,278,500,278,778,500,500,500,500,333,389,278,500,500,722,500,500,444,480,200,480,541,722,722,667,611,722,722,722,444,444,444,444,444,444,444,444,444,444,444,278,278,278,278,500,500,500,500,500,500,500,500,500,500,500,400,500,500,500,350,453,500,760,760,980,333,333,250,889,722,250,564,250,250,500,500,250,250,250,250,250,276,310,250,667,500,444,333,250,250,500,250,250,500,500,1000,722,722,722,889,722,500,1000,444,444,333,333,250,250,500,722,167,500,333,333,556,556,500,250,250,444,1000,722,611,722,611,611,333,333,333,333,722,722,250,250,722,722,722,278,333,333,333,333,333,333,333,333,333,333,611,278,556,389,250,250,250,722,500,250,250,556,500,250,250,250,250,250,750,250,250,250,250,250,250,250,250,250,250,250,250,250,500,250,500,500,500,350,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250,250],"FontDescriptor":{"Type":"FontDescriptor","FontName":"Times-Roman","FontFamily":"Times-Roman","FontStretch":"Normal","FontWeight":5,"Flags":9,"FontBBox":[-168,-218,1000,897],"ItalicAngle":0,"Ascent":804,"Descent":-195,"CapHeight":0,"XHeight":0,"StemV":108,"AvgWidth":401,"MaxWidth":1000,"FontFile2":{"Length":87944,"Length1":60004,"Stream":"H4sIAAAAAAAACty9B5gjV5UvXvdWDlKpVKVSzi2pc5Barc6t7p6cPTnZEzzjnLCNIwZsL8Em2GDCYsBmWYNtwDCwCxj2kUwwLF6WtAvvGbz73p8My+MzcVmP+p17qySVetr2zIA/9vvb3XarlOqe+DvnnnMugxiG8TMvZ1jm8NYdQ+Udial3Myj3K7i65fzLj1x1gSH3MkxjE8PwLz//umszn91z6VXw3C/gN3DBVRde/uEKvh3+fgZ+11142Y0XHNly3fkMg1YxzMmDFx0/cuzogcU7GcQ+Ac+PXQQXhJOcwSCOg8ddF11+7Q3nPx2+DR53M4xQv/T41VdM/f3sNQxSLoLHH7zsyvOPINt+CYOMCHn+8iM3XMV9C7+DQeG98P7MFUcuP/6VXZm74PENDIPPu+rKa67dx7+3yqDodxlGNq+6+vhVj6KlV8B6yP1y6DH8FvYnv04xzMf/xyff/2nmBNOfGTqBC5U7Hw0w55/A+atO4NWZE1wBftYfOXaivm3vCbaQn4xn92VPoPxCZm94Gv4+gRYD7p8DJ1D/ZwcYzNy29Hvml/hvmSDTzeyKoBNMHcfRPMdczmiMwDB9IxH4tjprdeN5Dv2GyTImXCSvCpJXXcLIcH9M36MMfM9cHTEnUO+jDHOCm6tzghZk4eFwOFcsFYvV0bFK2Q5ZgigI+VoertCLo9Ux57olsh/nZN5np+1wJqZzIiv4ZKwIoobD8VQED8gIc3YonM7YdphF6BOX2Vt6R88zWZGL9Q90SUGlcRuQktmMPog2wnrSzBxzLlnPCQbucyczxvTSG3cf2oziLK6Oh1FdQOlMdo6HZ37NBNwFwSvnmk/QVQXICgXF7h0eIxeGzTysYbRYpWurjZUr5XLYpiu0hJAgiLXnef62ENw7hg/0YxZjjtVCioBh3Q8/y3X0IX/J5kSua14LWhgh1jK0+S64YJd09OxPAU14kOtf4bcwCWDfqyKojqPwqwL/0M+ZSIsQQsC0whG+LvqjsWQqKwA1xhmd8cHTdVHV4ol0RqgLmBdkhafPwadSSumEUj6fn76fvlejBDMIwbhgyGbpQ5ZKBSdKVCpQKC+CHJDfaoX+VkT6C9crJfitoe9cnp5MvzI7mb302tAV18Hfr0hNpo5cbB278xWhV1pIr30X/qm9svaP8E/tlfAPA7agf+lh9BX8HabCzDNbmY+1JGAT2IqptgRsYtYzebIytlzB9IrurqcuS0awr3+0Oi/VBSud6eklq80yYkvyqX7oQM1YU4T6gZ6L5GqC6YEXwofgKlyynEtpxqB0WiB0wlsRpUYPJY7Yv8i6tCLEsdJVhzh5qh6lEMi6IzKhfJWqUalase2K0VSdWrXivCYcEg14ODZWHaUvK1UFomkhiz6JHtbVsZQ/quVqdk/P1VtzIxuiminqxs41q67gdhzIGSUr3B/8Gznuj3SPFES/mC/1yjKXjithDf1mYlzlBfRbKxtILlZ3b1b27Amqgsrdvnkzihf2r8c8ruwR6nOswPNm4Ip/bvweCYI2MjxQi3Iyd82PxLShJ6RkvyUFJIZjZpZ+zXL4AeDGfuYq5pXMZ1o8CjNHmNu9PLoeDEzrYRiUdsH77B4m1zRQ9EoCTNgWSvz9iF4oMNNwsfWOCDNKhb2OrwLmvJIwJ8McYF7UfkWCuYW5kPIqR3jlmrNuqvjM4OTUFscSXEiZhfAtDrNQHpUotfOURfkW05pXqP4TMxcuU3YAB8vkSq2GbPj/qMsz+pPPkfc5rKsUOj/K/Zywh7XOB8EH5PFNjZcNo3PBYmCjvysWUxAYAoQwFkXr/PVySE0MC0L4ijWZlIroP1q+a3Te5mWu1Ng8cYQnl1g2a/GY50SfmBg1ZDWbRF+Xw75IN88Hj61bU2VZ8/o1vp4ZU9cRy8WTQ5tMUepO4QdObsVXYPhH0jkOPoZnRV0z+0ILV3CcNlML5Iz6JbpCv1XWMxYncahxP3rlNviDV3jBJ0kBDm6c0zf3R4bNnuwI2HpxsGIUgmtfvHNUi2irX5xGGwfzc34hqOqx/WOhnmBhGLS9d+nXmHiv85nrmDuY9xHbtsnh/Rgo3e2U2XegljQt0gvXORf2McfgVU0PB24Arq0GKetqy0MGrMQrqZU4ej6u4yPkJaZrJ1rvKYPIdHldxpGj59/iCMp6IjkgafRBF5EadvhC7Jg/ITcCfHR4TX68chH2CI9XtBwBqNWKHVLlyAf5AGoBXCNQrfAW/bxi+1NCpmMPmi8CYQvhxxGK94diil8EiVEScdY2QrVUvhAASdKNYHCyu3shqlmiZGqpvfO+TKA0v6ZXs9WiqnMsRljeuFA7Z1W3FlHji0XJUhRTEuWuxHdPfmZT1Vg3mhqLqrYi2yB/92DMW6qUMsKloUx6CL0vhLhgYcCMKuDpAsUuPqoHkxGT5bGC85ady1rkswKy3QVisrhm5kBK0oVwcsDSbJ+oi8Pb5iYmVocFjR+7eEiJB/RswMjoSR3bv5vaYfd1be+1uk3BL4fmh9FNqqnER8Oc4TPHCsXB7iHCxGH0QeYVFCssepBCCxoQ3IPS+FRUQK62IQGr2Ph08MDxs/Dr9C6XtqJhsJdJpu65S7HpfYgcJkEOl54mYklvEtHbYpLOTYaJ3FFTNoy8piMsFttmh9wyKsmKrQ5vFQxj1aymmEp4wFIMqTBw+7X4gYAcVPrf8fbSdXOTV3YHeJ9kDITViFq95cJbv7savjkJd5mkdzniucsY9YYtEw336AM/TO7RR1XDjyhCLHldV812jaRLveKz3tWHAwD7+t9Obmrqym5DaN7U2EsuuvU7qwntViMJnQAOv505RrEtG3g7wbGXgvITUtW56QsuZOts5hWYuvQpEAXP7aK3M0NgWMjtXkj47hfEdGZ6ZvuO4xfc9opX+ih1hyite6qOCDj62UFVx/A7C2oZeu8TjvqGQrWm9noviy06uNaA+HaXfzaFzcQ25PLNjwRYUCq1bIrXdKxORsKTaVUOynrSF8uDBPo0NSD6C90glhKHObD+migo2KeDVku8IIl6VA3ENF4TWImTfLYVmilJybFQJGH7NVMR/ZKWMEWZ5wTiaVgzQJyKJfO8jFDIFkHKOVnQDYlTRPqZ6GVhg+cDIYmXWF5k+WAEy7yoSqK/PwK2xp8s+cEbSIZiBODVfpmTWSURMLqsKCeF1EBK5niE2YA/Ak4mEOFMH88FwsGgTxEN2R+VOLE4oIMVI1pGtAtZQTAKgYLFy7yk6wJmEdyJEQRPo4mcwBL5gIgK2+iPEOuABahzrCCydR5JssaBPCwAdGZciMeznKpxENTICgtP1eE6TwVDJNqFJSrHJqAxwK+A1QDP/ufCk0/CD0p973sL8EO+bXzpGubzzHGAKataOlICENOhIwB5EsTcuD5o6Q9gjnL0qxTyVYLoC9g5vlNtHNCwHGy0ZGiHzCtcMSrziGexxEOYFUjEA2BhBNCkRDGsx+XXQSDFJis+UXTAARsKx2Lgyjle6i5lpkK+IKVXiXkMJRECFDdIfC1GdRawHNz071zjQ2gFdAZnySKXTkDEvmET6FIt/e53CM3NwUvXLP2W+Sh47SBTbVGiM+J04ssrW/Hl88aUt3AK77ezdjhrEzFSwdeEQ5FsLmyFBYwZtPT7pafBbj8A914m985RFIC63TuEbyVfQpQZVkRVG1HWYspaxObNCkr/YNUPFwHtbMEfIe+KwCd+Dz4xwowwR1vrOAyr6GtjiMNgU4LNQIF88YgTFTBM1As8C7B6ss4ojQuYyIgTFxToPWiOeD0bsAytBAgJlvzjuUdAT0U5eOTQoSNBWRQV88i541VVZLEoj01OjCmgpaJaHccPoNs2F9cmk2u6tt5229auNcnk2uLm26Lo4rnBHXZka9/8ZZfO922L2DsG5y4G/l0JwnAnrDzGbCBLCsEvj6jFt4C+7cWy0RiRDn/LNVnU7JuonSfgEcSMHFlfBQKaqgFxDUHBuTwsqloLGwBiQtnr+itICwHAFEL5v5dK441f6ChUQ1+C0MMfRqJfP4BPPlQI+12dRk+Cze9nDns8UXKZlq2He6ehLS5QQaaXutyIViTWnjOtpMOEmCe3QYWCBdtG7rggZqttajvInShl2QPLxIrtYDr0ZK1x00fm5zlenZ2pTgR4iQuFLpsWVGHVi4aT/pj60P/1hVQ1ovvuuEP71Oq/GtcSerY2kVMsWbhwr4AO7xw7VDBS6ocAXwvxKEfW2gcS+CFY6w7mYk+km6Q8cB+uYYrMqo6ljwPIVdovKDCzELWSZWc8QU+YMkppBqtk0UOzjpMrUTdT7Vix1+J0eiwio+W2DyTyObos4snl34ZWHcW1au9EUA1wemhNMZgNzC74JaGvrMb9iaH7r5OSul0wFFZgFRBkXTIK9sI8KypywgZtN4opQRPRBl9oy2rE4q7ZLtsfk/jFNT6BH04G0mr3qgwP4GH9wiU3Y463wwGdRQIHllAJ7huDeEUphYJZFZCnyBPNBl1E3wX5VsES30g9A9j9OusLYEpg+gIaAYiI2nC9abnqoGOqpgcEYmDgqR8zJClBMijN6xzmhaYLcaRNoqSWUTtLQowTES/qS7JVVDEqeSPPVtB3L9jc+DGa7L/g7/Evf/Xj+oMP1tGnGotoZ+MD5MMyIA0fwx+CKOZYSxrWgJR3NzVyAjRy1Wqyhq00f+ORgRz1OY8yNSr6aNC1P+PUHE0A913ASwTBzDmCIHYitXaE2hnmuszO0ZzF8Fi1RjQCXhgmdqz00V6jKziwKyP7Bb/65uunFsH5GMFIVwCY4U8YvMr3b7hmFWB3lkOXf8MIShjJReyTvoDX7gIXppZKAO0jk8PH7szEWYAPPlMD7VT8CEm7t+8+GASPRmJS+OeXSJNB04V98BHAwhxQ69v4A2B7h5iXtOi1D+jQ3ybMPtCeaJN8CSdw9HsiwCHC5F6gcdJrzHsgiHBALuMxHBSUJxzfYlM29yAPKhebatQR77NCrp0PKFNnjz6Nr787Al7KSvv9mdC2iyTF3L9n71/9+KNPAJCzewKib/f40Oz4NvyBgHX3dsVSNEPg+cuPm6Px8o573vnXPxca3wJ66LrYO/DSa7ft2vxSsiBr6Q/oc/gtIMvrieVGOs2LoUdgtVrTs/t17Fr69SQv7XpmRKy4z69zdGmYLo11lhYCv5l3lleq1bLoc9+e/9L/LHQDWwWjL4Cuxm8JnLwa70SRsGTI8oX9oCzjwJdPgU0bABXZzVzusWtZZtJr10LMZpcLA4g+P9qEIC1GBJltXr7UQFXJLQepxm1zNK5E77dG77fmAPhni6+93hdkudbJGIrNTwmwRcEKjYfDgZ54sl8PBg9PyIa0a/9EDoLic+oiRqJs7Dpn32H+HYJPtHILM0Nzft2cHdrUHwskFTB0ke6xyUqFQ28sVqN6zop1m+Hh7MJmGaNdE6Pztqjxk7tLSlDxd5ldkwfHwZY9KKiiOVeZ3Dk9Gu0O2sPZXxSnbZ8l8IpgTpd7VtVyLEG/mEkt/Qx9FSidZGYcOtfZ9AymmCVG3GhbCfrAr3dSNgw2o/WCXgBAfte/kxxnH/L4kALyOE4nKG1C19qy5IZLbORxqJYX1jjsqU6xe67OdaUwjo4nFFPeco6P41505ODLvvEZNIRFpTY1PsQizEm1KREixIyGkSLYlm/HUGWPwtoxiCL2jOop/7HXvf2W+3+noRtLxnxXede548ABPWsMbwPoqEugIJLpAyqdA1j1s+gfQZYKzF6CdtI0g34qYi04iDXRuUXShrAJmjuIurmD5wW0hnDKpVd3YtznRLzoQgQXIs6FCIHAsJZtEIE8CWspgPm/2hODpCk6agHxMjWB3pAk6oYkdTzuLGoIDGNHjJKmaxyia+wvO2tsRSxm+tkilhXCFfPUhV/aGcFEiqYmBWj4Ei9F/DE52UmKzmgmlAhHeIgJebm7mJkJaQaLfnoKbRCTWPoDjsCfIjMKXOYh9BE5J4xBz3iDBL7DqLdyK4VQoVoI8TyONOANjT3o4elVP5r90arPfY5oGnMDxJm3gcWUmbURsuHE8YLMA64QJQAD6A/tL6izkoxdYFGHIFOg+UeWhFQYeXADfGEWsAH5D7YbEvoD+f3kwsKXFxZOXQ3Y7DqPIbzl6Gq4pqEk1rq9GqG9mlqhUOVDfDWBHoalPNPgpj/3Oboccp+rwFPcR/cML2Be5/Gce6h5reMLkLujYlKzsSy+cx9W4N/Vy4zKRjD6K+4uLnjuciN1pAPnnKYa1fKjbl6lVmvnR0dbgN2TTFlBJL1PtX/+o3OnUjQQAuDISYAQEBI0TgD+Vkd5mU8MigLgUVEDUBMMpKz1/VpYlXSpa17nZVaVJEG0FEET/GElGBalzi3ODwh+0ewKBMLcPAJ3nDetks7JXM9qhPhsSPIJgHMk0w/GXA0Wo9OLKgtWj88E4fOMYtKXChhZXQ6IgZQ/Md1L+Hbt0tNsD/DtKPNikitvaX/A6yXXMJeBcnu2Svd58qGAWKi5v9Kj/cA3HzhqjzOoglx4cugbKBpqIc2DLm6YpUhzrn6BAy2dhOBux1lw1Fmgg06UFT7VRbSvDI+4+S4II05JgISH7VCtQrlsLQ+Oc67nJiLBjralwb2ET2hDF069+YMZRfmfb7rz0xwXOLA20aVIEDEH1EBfjPgHS7VyPp+9q56Ky2S7RVk9T7ZcAuZwXeVYQYi8/opr3vuu26a2F8AoXWuF1YSeHi3EZEuNDojrU+Hca3fFRyPvfvyhl+nZwPzlYb9iAlQVDdlns6wgj46Z46nKzngAk+xZqcFDuC5gLXSgpif9Rj64/qZHHrz0kXAAomC0Np1VFXvv7EBJlu0jG4HbOrD8MfxuZgxQ00UU0Y2BDckCA/HfkSKEprkZn4TLhsPXGjXzdZ5NZcc4CFXSGdaz5fEoM0iZNOTx6AqD2VQ6k+0ak92QpWqPtcO7UpYQ1dWyMkkClcdaalgzK05OI1yosCx+bCnRy4EIgxbgnsYfBxEsO6JLuvAlLQaeWeJJFpL/uvWfsi5qsVDD/vG115imiZSEEJDA4AsKd+TFdO9JsIIYB03RL0V1OSgHUhr6xckv2wkloKL/i8zGf5CgzAD6nAN4NwvyutmzC3k12DVPBHCckSBABqII+epYbTNfxylEL+co5qeBAW7uNyIaahNFoQChAGoSoSYRI4f0QEvkBl5kj5i+Zpzm91pvMgF8Rdoa4uQW3fhBYHB21QZncylCLV80VmSd3GPWa6pCLXuWdbIqxZLZkm3CnlwxDzpghGq2VyVyeSFHFMNAEXs8OXmknNQT6vwFsh46dqTxkblsbvZL2T69aPWtnS2BpEfraw7J3XZieOOAP+EDi8TLnC7i201wb9razeMTfkFikX/rVm0wmp8wUb6KPlVLs40v/CHpw5w8tXp2QkPgpP0/AvsoKuXKqkkJSBVUHQ/2NL4RYvAac8TDmwC1PFRwq2PYJXuPN+HRCxTMeDdrari9485zQ9UxJ07JUNxvouaGe2vntcMMtLbi8k3z49m+DePLwublB7W4L1YJgR2O97/1vMk9KSMqB7PZ7AVrpIB49ae+dWt2EjyFhP2SqLEhGX1+yyUsJ8ThDVzy0iP3v7YrpEUkA5fCkRKS7//QQx9WBFFBHOvT0P8GPQaNxI+AnFoQx7/eky31UchVZ+3uZkx2HEKiVvZNcWTSBB8qOeLFmhb2SGDrJQV4SaHjJQUS81ISyjT+l5QC683YmVbUm7ErlojwNeXNNKxTDG1gIp2aRP6/f1KS4g99sPGDT0e6rO0DMxf0jHadfyivmTg/CpKR4iz0noci1cTO1+ANDS4WEALhG2+Zu24wU4zocNcQhuJdQIl+5sNNHJ5BtDIgRXWxztldBdbFToQYzaQMSaA6xFDdzJcLpkywA7ToA17hgo4CvMagl8LIlSebloq03lQARjjmMEkVNOUoqErlC2LtINc2jxxmu9lmqrBFrDARtxLZ9KGpEIgkQ3l3Y4dQroZ3DZz8wXCpewibbFSd3PGqgHHvQl4Oh+XS7L2Fq847mE08/LCJk5PoU5NxzrproQjOKPZ91FMhePcnUznE/iGj1jYhxqVaDqhWYP6WeIGuAohL3iGbW/HCCak0kC3gkI0nnsMhW6hJNovGNE6iN+7QwKIbkIQDLpXSVPYcSqrIFT2F0ilP6dTl0ImmgHkzFItz7SCBk1XNoVOTEOHQsxKsFkL/FpYGx99QrDZ+Mp5ukenVpu8Nsz1i+MezacQ+OZEBF4ALM+gjLRqp4e+j0jj6iZMrw18E67KBeYun/qSXZkKJza3jBUQjYZGZb9uWq8FYN6t+2J7epv1JQsREVHH9BqDtus4qAfclU24RUB8lRb9DiiQlRb6nt8y1q4DwFGpWCOTJipvYs7UBeKoZyntKR6gMlUlGwjXz1Qr+IjjVdD6XiK/O+6IaIIepK3u6+z5+f3E8FEprrE+U/NiWwpwqRA7sMHvs6WN3XQuCVN6ZHQRssYSOBhFrj35ZMBU1CNEzZuXh/v5Ljr70G8RSYZbzqehbasQ3uEmUwne+9tX3ZeJ/OxljEbE0QAj8aaqzb4tQ4alzBigplbSYgzY4vVhiWybM3zJhnBKy2TqnWmHWY8iInNZx0cErOjVcdS6V7WXrfDrT1895LJxrviRJUa2QHRbbJkxGBLP09vVLy8wYgSogeK2/jZYgwmP6tzkXzYwjeyKNhpz/pyYbP5uLNr5B/m/i3nH0EWLITD5b/dxjzb8aq8sFLkie/cLXyF9EOMh/pqhdP0Qoo6MVSAAm2qNMzvKDaLklb5tptcNMB01ruZlurylYz+ZnUU+tr6/W+E7LNVsmm5hurJ5KYXqPytLTJEcH3NtHEWR/03Ych+/NNW+yG7mBgQnBRNEr9U5egeTYyP0Vu3uaWJ/AezHtlMIY1nLxXpZD9tw7sscysSE5WZDJZrOCIWAKxEIgk4hVtGAoM4PSkzlAj68/Z3vAx/tJ/O+PKJzEa1YsAB5aC8ZL6OujWcKW1DisEBaBvwUr3MRcS/L8QwuLLMmT0yUOkiS5I4p4ZhYEjJ2e2+QVsDofS5arAJQTlVHWNZRxplWCIQM2np6Zndsk0VXHKV62YolkvlwZrVK8jMiycm6G1N3srwyT2pEREDtAzGNeMC0ut4tUXMeaOyronQiiTRRM+ILdqU//NNFn6SmDeITGPwOU7opnbAgfjYxySSwz2fjRVLpUQYnJ3N/ux+kCYDYTcDcvppP/8MdMv19WgvBYDGhDMQhdzJxySegfqnnWY1AJ/Z54w/4IkN5SkOtndgMlI8wVbsYBwBWlI9fcACUu1O8IiltYyoYjIFL28sIqv+NjJPqiVorZDke4tvxwkl93S0kdoaau0+tmUbHSW5p90TV90eGTPyLuFMXwW0wuMdXoTquFo+iDbRfq3D97CO6/xNzWvH+9ef/+lvdLk0skHZpyRYPPdxVLXB3nvGsAqxWJs3VBMYLRGE+fkEgyo7kWEeXI2wS6GpnKBSivEYxEY3HZu6Ymt/Ms/Esf51vrq5hmhT001F0abvxkKoMb/v/EpdrPJ7pL41/68fcfh5Xy8SlQ5aTLtcdOPo5zjRdtGQG3yPadg946mWCthoj+k6x96bf487D2IsnnOO4v6yxUpFja8eq2c0kFZOVqvuyipqUfwPp0qhHJVKHI1dlEF/bSg1gtJ8gkrA+0KSGhRDLVVSiK7f0lQZJ1I8g3nSDxaUYeeVfvuLtqBVUcQuDPg9gPDBiNdQ4FAmGIhfX3o5fhgcrPgRAI8YVdJ3+Nuxo3tZb/yaAt8ECANNqyqwgC4OwIYVItpIHdOuqJOWRPPQY8TNAdvXbeqgA406aLJIhUc0TX51pmgUbMtmfDm9N8aSq3fK6d0GhGzTnixfOOF0cXv/ozT9x88xOfefWO265fK6gC/Ky9/rYd/o+/6xH4510f70J3v+e+14EllF9333vuZtxYIQV8zEHU/05PrMDTxFqdD+W7IK53hPi4R4hpfJrzxqcdQW3Fa9NLrjaAK8cx5y0Rukf2KDNAwQ3vCVh5wJ4VR2mjdPGRWLwdr3qwTQ6Wvgz2hY1TMzYBJF10X8gn+fnM8a1yQJIDctdk4ydzoWTtk/5UQOuP5sbnivFhv22SMHTXoa5RQ/XzaZKY++h4FnjP9Y6hj4xm+ErjGQAykja3MDetSqwcdSRgCyZ7Tz3MNPMijwSEaaVo6+EwBXOuQZtu4mFPg0ECSEYjErLFx7iKIDKtCgi2dxq7QQPxhMkK9YR8KEeLuYASXqTn3X9yf5DQFJJyU2zwp3hVEH38sY9PDRlFc+ooEZ2rV1vdJmupmEMaCNnB1Y0PuELkitT9QVRbrHG6lnvDDR/44COPvOzejKJiwfYhDqsmn+hGbJrI1/0P3H33A/eDrBEqkczJPSBlXUyVebdHymI0b1Ln+UIRnGKn9aRSZjWJYVKP0LpQgAtlr4wVnU1zTlK7AAFip+iqnYaKeUG06bQZWGW2HXZJDJZkRe0S3ZwUe4rn9CZLKEVDdqek4Xv+5pfjqenGz2cimSqyQqOxySNzxXCf/2tGKd2YMAcjtf2TuUifr9sG1zmKv1gpgKFlewj+S/IW4gRtw9a5hYCisM+EohhP/Q6BuE1tmBpXRdZvk6X0Arr6OcQgewj2aKWbwhR1tNKv/mb1Rp3bsHsP6wZbjBvUu/QqU2kji2eaJUuufRWkDdt27+HbZRx8Mu+EG8OoFTfk8ivlwd2QwrJC+VLlWYo3aHVHuTMcQZ+xo2CPjYPrQOkKMxvKiq3OXYSQcuHhxLBpplRdR3YqLJh6ZOvsxDTL8uqqTUpQHpu/chHeEe4NBpOy309yniH8wL9wCj9xCA0ODi4kRU0snLdZ9AmTh1VeUE1SUv5tvS/cNVMvYQ77ImpsckBQ+ezm+q6diBhMTSIVtkDrZrYvwtztifdUurXteHaxaRQ9mxQ6kD/QlF4/4EPJtFh3x190NmYiuJVLaIqnSjPbmh7wZLYFiLFMi2+LKFhGlsIZupFDfTzdJHdjXeLt0Bca31sVG9s+bUQEPCpEAtM7xrJzpmnivhr6LRrcjt73vu0DqIFGC3QHyw/+i+zgD1IsSxFMj+OyOVoDQioY3CzHccCpRhPB2OGBQQCxoUi/V81a6bQckKnlr2VQlHCkf2BQatsv8BwezOJJznfGHC1r7jrtz012sUrg0puvuDDo47ITKA4ghlfX7praYSu+nupPwHGLfVsbz4RnMxPn7ax0zQfRRCug+lxwINK/vj9vTM4gfesASxBcAFDMJ2i0cqgVrRDMgR8mTX/N1ZLuHlhtwOztNCoJzx6Tu9SAETTdIJGU6XDNMh26VGI5AJU5mtCE8USLTLOzDh9/IpLSBJ/4lP47f0jxJSykgHqU0hHjrfeQ/UwMhqE/+U+wXBaeTwRPfh0XkiVVl5EFGFwLq5PFxofQlUiXQZYlXUj7EVktv/Rb9gFY7UHmErrag9hhN3s/LKlZ8iP29M4vHDgo1IXuvvrifr5jxRPUWoQ91sKHunt6++rzC4v7DxzUPFjbH4my3oU7P/lWBTnb/tMlSCXUsimUJiUPocQOQlEHlgM4xz5QSKvBgqlFtXCfqfv6wphFoZJ+rx7oiyAOpScCoib4c6nf5tKkUB5+7740K/kFfyYO2q6JZjag/tUtrACOvScKtuFLRIRiyeFjo7nVuflbZ0rXTEMEVD1eaOwfunmel/nd9/YGU1oyCnEv9llgaXiFg+9s3IFi282kAoENsAChgOXrSjY+gHaIQUUJSgkdxI1Ex2BTPks5cEuERjtOSh//HXi30aa4rV134CCI25r1+73iBtpWroJrs5qBY5Bm2B5lttKc9cw27JXDNWvXrQeGSK6/Iw4uaIVIECk6TLFaIaS7oUKCx7FlwaMnuR1ubcQ0i9WHgQFZl2VhL1PwoxBCRzWrL/vGz6pBWc9FGt9hRTad9cmAKgSNO3Q9hNeYZxV9KPnTQEQ1erreeXl1IqKEfMCgwVIhX+59kRHuJj7hlxSMc5xY7P5o45eBsOTXAJIhhJWQCFQVWMUQXvcmQRFYkfPH5IgKz4IVH+x/7F2bZhWWA3ZgKazPrp28M5Tx28AeQk5wpvgzwIcJ5hrCB7kdeUqt0ls+lR6fAD4kM7UOPtC8ixuTam64aZ1qCZKpdKY2PiF5VELzhJ+E+h6IUW0RdcRrGOzlpP0MOK3oxPCbuhYbX9sQv31izBJJ4UkEKJXJcSwQ9U138XLO4kTuSUo5trD+fz9WyyOgWe/Ehz67Y5pslxArIVu8JoLwfv//iKZiaQ5dZDdfHiEWgkBVUpKIN8EzbNOnkdULDoD104p2J1JjnUsGLUp4lNGoofA5hsJPcT0v6AFPvRfPck7ee7hQgRAcEYJY1gi4sxDKOsgKz4YjJ59AH/3+JaNKzML+xjaEDk8GEDpxQsdH0PYRULT36yfvR1ur8P3k/vcuHUN9NEO2rRmVBp1KL7HlvIjWsYimwyKE2S2e0mAz4vpvt+SLZ5CbEqM3KFhNv1QJ5Y1KCPXtt4OkpYmz7N3f+ha+BQUUXuZOHuF8ompE2TLECMvqyJtURd3tZoFmHTly68i9BXFsxcyz8uIPV/3ALSNHEHMcY35LV7k1ghzyS84qjWbNMlmNi6cjsB4af5FFu3IegS8O0lXShiTOrxtONQT1t6PU3xJMUa0Y+WquY4230xXid7FkhSj6zNeicEcR1INIzlZkxptYCb0X1ouad8M262PgicvdhZN1otY6zbxJVsoeXPXR6Y+uuusu+MTLG/egbOPfyKcs3Y5+s/RRt4ugXduCfu1qZfNLCAnnSYed8xXD4PhBnn7T0NBvbimXSXYZ/RfzNH4PE2JqTh06hSxPufC42cMVIh/yPlq32Y7AJL/btVXqqBooUy19uvtezLGiD7GsTyO96Jp2D/qvIxwSgxqSeUEBjVPvIbFQYel36JPoq8wW5mLm1Z568yJF8XW8GkgV27rtYo5eXUUD5Tre02xB3E3NfjuXEGFmacLFLaz6CbPNbRNwt2fGmXXe8gmy+9Kql+BRYN1+F1Ge0j3otg62NnpdP2CRHqLQir0j7mYU/DSbidu7oi2Agz6ZHtT4gKTZmJP52EK+e2FmKj5fzJiA0sGe2wUQNRQ1AyaPsCgG1s1smyJFj7bfIhV2b4+UAhOxYoJXBEHjBZmFt+jiQqyogXgls6QJDhzVaD3hi+mzpTwPDgVHQ4DweZklFaxRQ+ElTrbVWF+9qKd8j4W7FBGhyTfIATk1YaGuPngHhzFpHEKKTTYjGBY49m38PkCJa0imr1W9lKHVpXXeHBhcw1H0SFkWXFZU6gc07NltrkPUW2c81S6jNAPuxqiuE3GMD6eohmMyi9QijDolp8YojcBypL7A2XI2Ku2Kequj2sXsbPJoVzGJq9UsFoB8ONhlBruCPMY+JTjetWsPjyTFvvSILxfMTuzMmr6IOFMDOiNuelay1VAXHsOinUAGpwi8JqDGN3nSFPTSjbzKWyPRicM8JyaDyPeMYfEcu6bPyOmCT6hfynJSJgEaGAVqvgPkf4rZ7KnUrbZrhtx8SMBbVLQe5JhzDRaBO/YQbouxW07nLfrxNhC4EWqz2qdUGi5Wi53VO+j1/u7zZ7SYr7LrZZtgHVJQtoo+RedFIRwmcC4kkDotJNgFJR2ID+yfG6tH3yHvXstxgQsPXXOzhDDmdEkMSKolGVEc9mMeh8HghiXZ2Lh698XjRZCjOKz85yBHs8wu5n5ifcqoLmq5/Fx9l0AlZ4TGTS2LsKlZSN4SpAEqKnU8C2/ejua9leUu1RIgo+QV25uQpuzAzlY1aW6NQ7kRKmHF/oFhrh2X8Ugxt7cMguhUkpeq+VOKbt3eRI8Y0r4bCOyHyyS8L1WLFLK0CubKDp1/LgWAVig+lgLULHKBWr82HOuavnlnrNcCc6BmWUCGHC6u7+K1AukPB7fDvpWfzAF2h4CoMLN5EFQ8UxEmAxwPCi2bCjsDsNxISH7r4L6jb/L74fl3EvGUQz508ivJJBr40fAIfJCya8+FhwSUjQMniAw+BDKYgUj3sKfzwVomhQWQQhoHs7k+7I5nyLRGmtCXrHZbVl3JxN2OfRU7BXN5nWDB27xdqLR2Y9FfB9iQFd0+s+OinZVgPrD2iNT4iri+Tw7KgzOW7OcbX/kaKQ8sDPZMaA+I6kA0W33xJRdcYYnirqPoivNUjLsjakh+o2jIqcrIAqnSBwl5GUjdMPOKCHKcpNOVstPtSvEqne0sl9cDQ8OknMvnZ+mSm9hXbmINPyO4y6Y1MzKCl5I3OXiXDkBg7Shu04ITJLk5x8O7TVGtdFTNUyUdbSqoRfbvUfWmyOrGM+Xs9u2s7Nu4rXeSNkTrpoxlO5iJsOhm9Fim8aWhHuzXUXISTWUCU5mhLfmYaWEEUoCRP1yKCH7hGlLFlVgqon8F3u9lrmVex3yhxf0ZJk3LtlomSWRupWu+FrnSsQ+slEfV+pmj9PnXIVdfX8ysbUKRPQSK7HUqY3Z7+2YSzGbmVe2HEeZmGkK4D7fCy4+3H44zh2iW81FmMyEyv2P3nldxbpcNIWn/8Svc6R9g4rx5OJoc9w6GIMK2QtFq0SlSGnX+Xr6PWguhpvOgKCBX6pwMcGqBJI1b0L/uAM8tz3QZGR9HZwTIYA59gqjxvAhu3i/cOlxWRf7oZHw0tOn4dBGCFzMZm+sf2V6GAFo1ZV/CCMS1zY3XYiwvrtl7ZHEcHkZzASkg6yGBY8cQN1hNpQQeC5LS20Viol70V4AK9a7seF0XiLHGIngnUfTzPgU8Os92Wf6YNLkpKEsT3bmZGJgO2yI7wsVxa7FvwxaVGBtWFgUOlRo5MEVWFl5H4lEw7aBxwTgpKEQnRE0Y258x/RFRHohkRllnLgDETejHoGNTzJsjyBnlIjrdjaNOOTbn7+llSYMjvegjlTQdhj1Hd4FbbB90xo7wrGFNETUMmqzH2JOqSsbba0cseTyb6/aUEZGdZCNoWlNSs8hyjNZ3EKEIeXcFV0ASbThHzDb68bcL6a4eezydLny3JwyogZhuFJ9IirrI49j6gdqoLGArQ6Y/6DobnXx8ZDze9aupKIQVXLyGvkusMdgjFuLTxjcL/WOZULf2pWpcRM7+E3MSKEd6qu5woqMhJxIvuvsh4XarqN0sc3AJdYzJ0/Ib96HC6NSBkl2mOhtPdDaS2tT96SHHJuVp3JMsDnXUP8TiiXb9gxt1A8FaxKGEMz0Gy/WJgaFMkIykAPG1ipZZMjl79D9mAUXaZjiZDJthQJQ6ik/+tBACcQrwfhBMETfeWc6zfnwDq/CalQrZSUuDgBwQ59I/LBWZx4AqfWCRbneoMutQpersmDhBbN/KgPMYGA3PjoAf/vU0a5BiNNuNcAlF/IZDkTKlSH91lm0njVimz+m+MVxa5ESXHECLphFpZvNdS8GeSp7LKXHA34s+qbSlxK8/kpu0IVQCXAWOA0uGVtSMTmoNoJuBVmA7DDWu40Zt722JRMDCpgrvUvTNs/g9y6mGyCLRfwLV1jGvIZUZ1vwC63qrneCxxWUq15SVYrNHr+A0I/Dl6hjAeb4yunYd1yFBBWqEs2T3vr2PxKt+3a3fo0KkIZJlG5tevWbtOtWRpVYOO98iXpi2JlVazS0k+ZlrVXSAclbssmtXS3miiGTKFQRIGSOQVPxCYUs3h/0FMGCBjF/VgpknJJ+Y2rQ9+bbilPW/TCC2IGnynTgVtX6mQ/AUyqP/LxtHDihqHMZqzoBYKEHGOUhkcwWxA5tjj42EiQNFSBR53feJj2aCWHfqsYAP7wMsejBCR1S11NFcpo6EplJTZ9lItFP/HGpJndTiUTjSWRnqyFgLUgItQv3ZQFKQeZCf7q3dXKbvFzpO9KCnWgs6+f7+CKad3GBNwDR9lTnCPEzudS9RkiOOkuxxMz2r4PoW5/4XaTsgkYA6nnQuFZiJU2I3Z9vGTgMAPMdB1H4awNWFytoNB87j60J53fqD5/L05cMA4lsjziRR9dvp+jmii7hhwb6h4XJl7br1Gw4cPPc8jYZznXYmHGqFct4uaQi6R6jDDYdpwXyFGqhmT3Xborc6pUJGM2lb3e3YpoCQX5sTY322njZGypJg+cKzhZlhOovDiMSehJAlE0WR4Z6q0ZP+91wuVYr36369N/ZUqnvXyW4bNDUog9puNNOqKI1mREsJJrcM+ePaP0HILHO+CIeILHH2wLfhYX4iH/uvSRuBSFkj/2ukZqqKgRs/Lvrhill2uYV+CNyaJHkQkpmo416HDWm3qnKEMHDSYeDwCmG1Mzktily3aThFC1xxtMbWuUJ1zPGaeaarbe8EkpgbcLbV6IAlKV8ogsLWxBWY0ckP1yd2ELpdY7LNpTIbHiQjZURfWLOHkrKlJEciha8n8tl+ezgZL307H9//B4eYgl8ig622qiHFCLGcMr/qB10JFugVnfjmQCWZaPwkFqWQtp9kIZIQs/wregJ0LOepNdkHiNbTLLMPHGmz9xY8jgs5GTeJlGteCLRKi6hPdHE6LStiA26vdidUrJjN3W6nDYYY+98efRkvBC/ad+Sma48ZEPtmahtWD60FyzMzjp5AN19u5INzF736+MHXNtYizCpb95z72i1bQjOZsf1kPfxSieLwYWYDsdeeCUC0eUIMFEsj5Q0CCMCwIwD6s+RVWnXX4+7WdyuzMu5mxsjOP83X99I5G652cqo/zLYL+9nieMvXeePaUEsPvYkVWnntMH5ZiqVdWCtu1GJgtDiR7VrXJQAElsyp7sWjmPVfuBeCIIAAubGny9ZOUfANJ5RUINrLKdroiGTIdom9HX07GUeGEvOj9aS7NJi65pgv7tt0i6xwmviO4XjQ4LIZ9I3fCX5RjwqKsW2bVE3lp1hWyljOrJES+gnISwlocpMzv6TOG909q5zEIustUdoJRq1V2ZNtSgn2ZmDqQM24S03NoabP3eZlCTVFBuFsaUhoFy66E6Rqjh0vtxQn75kz1M4msJ4mKytke/KGo6Mj6KIxkbNjrMT9YjzLA0w3ainRJy4eufW8SD4gB1UTcWJ3/8wGPDOvxnyCyoUlhB7OsNzJ92csEQJAA3cVPymofCAGwcFlL7robknkFKHxna+JYV8od+EBAK+LV3E82EA1ZiKy/09mYG4F+ZxjbiVowixXWJDFuWWQi4zSWmaOYsglmOFaMffCMbjglMZNILcr1s+MMbW2beJVI5Z0vGONBnhj4xPss5mlythynFXytKSEWnt2xFNscmyTIQYLplkI8jjebws+MZawgr6gBGvnVQEeK0GB44aKv+JlLhXe+UcKVg3eJwq6iPZ1dwsYJ6NmVBURhzn4EtHWRF3492oIjBQWwgVi0ytgpQ4C1Q6SuaGtvErMWxI/A4KzjtLhICKTF+fbozSJcI06F8q0hsyb597iRbEmxFpOz85+Sjlxy84DnItjSUVgpthfmeKbnTodqSjiQ0+tWxnOjcAPvGhYEAn86lTpZanuVh09mtIDk2nMonROxEAUPqBdBuTM9a7ulYJSIKPrURUAlcRh5AuwAqdVqoIq2F2JyOTgWoSkxTkjAfhN4AWSnVY5NLluBMXJDAsppMgBcY7sZ5d7x2YljAVAdRBDoXdoMV9uHGEum40UfLnofA3kujgLrBNoMxy6A2jpAz6E8QKQ8QidRjI8wrrFdyTt0xxQwY6UMYSXsbg3y+NSuAw+wu7I8MTiqS4ADifa4yic2gaTZHTayYBauNlbWTXa+witHxDYUGXpOMahmBGROAH7jJksLLM4VoU4Gwu2pgQksrFr+Xl8nGR2/o9kKlYOnCVczPTiykY0SDL0WPBpSlAGF6qlTFG4hsThsOp/Q48x005FbgW5kx52ug3qDsgIN0GG3STD2DTuGNRR59IjZda9lPKO6hiHuNTZH0xRNJFMD4+U+Xa5h4BEJVDk2ylUkj/1tmNUW5u5HRUuTuFHK4daQf8W6w+pER/uAzcR6VOUiC8+kLch+nkjqblOhPstUQ5V79O7SfsjKvsln8RBOL6jT1I5n8jxyvjYyR4L641PCpbmj1oBwYr+IplBwcbD8TRZpbn0NPo+0Gqc2U2rQcax06iI/hGI0GxU5FPp2jjdBB/rzEBQmVDpLne+MlYbVzzFiZLRnFjplLx4SvVPLfdwp9GGPeUv6PuBoMSr4sslkAAOcZIk90VAQuxuTU3qXwgmSFwIPxfIYS1cTJivQY/pWPPLUaPx2VASoIYZilw0AW63ciAS9qGAjhWT5Vm4wPJ4KTKZmjgWNHRE4CcTWnoafwyocIDkgZ2q1j6y5/03pNrOJYKI+vpn5w4IdaF3YKa+n3cJgduE0BHu7esfGJ6Znavv3H/AT4mhU3mQQ+Fk3jFElTZB2jiCVlnkwPKQVFyJPbUWpua5lG/2JdOyAJdgwxA+4qmbFY1ESHfKCktTWRBuiweuArBAMlgAz+VXCQov6OrfG8lyEiLJAz5TUsKBr8Ir7SRCirxtP7xOECMG0PYxnVNkeHHjwbBFP4Azgv/xKwueYoMhtMcfEhWZ0FUL2TdvMvLGl4tDPl3GARJJ+iwyjjMa/penEI+NFAT3EOc79XRUNw87urnLHXeM/olGkm7BYu/adWyd7+5bs94JvXs8Q0OW/p3Z5uy4cdbOPQDwzV27HaE03M3sHiqUhe7evpE6qYBR3L00Ui2vGqa1c9fuPfudrmNPcYtNdQ58pVWujHlLXPJUTTuqMeiklurw6EizUyrkacRwoi2nfgYNnrMVU3PMcshUwVq9Acy9TwCrdvV5wbDKayLm2X8mDSamoZGUvo8fsIMqyOl9VlYVZLzj5clu31fCBhlEgda/5GZWJDsjvMKpIonSWZazrPfeHY3ymNJd0aRsECivWlI9LyFNRsAgFCBjMK7/Qn8Agi5wJyrP8ojW/RXRk1TqX0x1/wB2ImBgBrMsAj4GzpuWD/CTU/sPgCmY3r3Pawrcl+2AKMvfVggfqkxMTk0v7Ni9b/8BzVMN14OWmQZxpa3kDt/rzslZrgYty9HSBIdf6EmIq3iFvxcMZ2phMJMHAcYsb5ocyT8JcoAP5TVNMzWE5AB3NcnF+fivcQqvR2iuF6NrtpDdJtWGIA29itgW4td9jYvNrL64kDDADWHSAIfIRjErjCRjfYLQR0pwghnl97LGsiyNg7EKqAhzEguw8pmnALsaKd7vp1YHgDR6N9A/wmyMILdS1MmqkNEITlBjNKfMkXDNMbp0OhTP8c3BSU5ZKGYDBtfsGHXqaIQQraNpDZJ7t7/xKqTcORrjURC43fj1net6ybjn4KtepaM3o/4CmRdwnd64FPUMA+no5MZjSxvRefhBcJN7CIIIhCNk0qUopTm6O7I8GlPc0tjWwzidpE1KgUiRh+rpZ2AjTh8XnW5KfR+dSEgbF0PNIBuAwyeyo6PZvZurxczUVKZY3by358NDo35/Zfjv9pYV39Tog2MzfuSfqT44OqWp5f1wz4tLTzOvoJU21eZel1MQsuAttqF9Bu2aZ641wRFiv4qRX1xY8OOPnNwCn3cb0OAl+CGgwW464YWs3iEFpQHTbHxtLTrhzeMrQBAnQorTb0wgjyLoriLAWp2lu1mFsVrVBQlVIAUqNWmQnZzMEhrgxIdHKn7/6PCH95VVbWr0odFZH6vNVB+uTGkaolToZj6GfocWAfO0ZmWCYqPmpgPZd6b391pYgCd3UAevT6BNc7zY8qCiVO5QUK+a1tA3u0Cc7Fp/uDcEgCwynk8XQcFQF8ktTQyHhiK8TIIrwK/hPiPRHSAefLFMgHPZr5ChjKFeUu5XcS9w2HHxqkEvk8lhdDoFu0CnU2wGL3KjkxefdJpuV9E46r/9yIoVkuO1Uy+d1WALMiLaDlqplGXaQL7HOx+e5dgLHGBlkma3QsmQjySrOh+2+XIr5ctaZj/NNazMhtbmTgTYNUjZdcZ8YYdW4ReCMeZomwXtMW2tzc/8WbGka6K3Z2qqp2/8/EiSTDdmhWQkWQTEepbMSHbDp/VMTnUvopgu+HgAEXq8GI+XCBhNLPXQ6Rf94LJv9XQizYBv7qxpkD2girbc0tYaMrHevbKbJrFb5fx1mid3m7XYwWMOA3bTfP7IwaPnd0wvqG92WtVqFZHmHpyzWtrlZTXbQ1VnaGvpbIdpILknHwV0xCtCaQBNzsbyGrhbPw8cMLlIzg6DiAJ9RXT+mQ/dOP98MpmnKwf/SZUFUuOdJhOvsRkzgmCZeFw8k6EcTqkF3sXeCPxZYB6L0HEB7jSlAbe36f+/4ylQnupcuWNqm3gaQysa/9B9j+YXscD6fACrVNAX9t7Tm2SBi29SAQQrAq+AGwEghg8TLpC+VXY7RPEHmC9SD8IFE0kyUW09M+rS6XSbWUnLqttsf4lbZUVoqjqbRLZ7dMh/k47XUqUj6uxw7K0djuVu/TnbZL+ZxKKg9BZ9tiIbSphTOPDxlg2URklAXcpQTyBrRAAC8zLHq4CaiJ8/vd7a/6FAZF/iOFbiNUSwQFAF+4p4n5AckmUVlJH8YF+QkwXig2gfLmAD0odbZlaTqv4TFOdQbNDjKZD9yzXnnp7rf7YW3jc9p3d/lgZf/MzzeG/W6QADyg0y8xCH/7VDt3mHbuM0/+/IJRX+faAgIXrpv3mnWOH0YNbz9ZM1rOek+pm1m938vLygleH4PbQy/GXMQ39SbXidvfRlThH71d4jkc6yWvwyCr2uvsFTdPuXqB1nV3QjL0hF+dEV/M4LV2WObj3VV71Q8nDDn0EeXvrfQx5WbsV4QeRBXaG/44WUh1M7R5ry8G4qDy9i3vsnyAM50MyN+a9kLvuTxeFK6hWv+gt3loA0iPla5YXh/4HcTTfmXjJ7ywvJ8wsvfPBBgmYcPl9B+fwS5i7mEyRacA8lO87c7q1SPhvW304/jaZ2r6KHFf1pzL+KMv/2vzDzTxNdvRCi8S/PCRJeQIH5/GkiipdSSbrPM7H0LMSGvfQ+XGf/ip57dQn86xyC2Lwyzvy191jEsxSlS2jEeelrXn8f9xc2JWcTLL0gwrX2bIKsF07mMHeGkZkjgV+iEkhOXPyuE3Nfc/0dJB7IMuczl7fFpq+zcPmscI5j2grwsdd7k1y3M9f8yeJ5PUU9l9/xl0bBz5OqfEHk8IFnSWW+gObtp8+V7Ywu9dAuwn7mIs9ZLGvAP6bbfN7EHKXbAs+b/Gw158wwB9sP18OnOdW8MzTzuXjQk3pm8YizZXQmic7an9CjeO/p5Tp/cxadjM+X61w6s05H1umvg8glAyo9z9zV4s83IOD3DPjvaLirswPzToQy6p2mffYteM5+weikpwntzBvyaiuHnGfSpndwhVDyNFr3Hj81JHwOyv4AaKA8L2Un/zyUrf95KLti8HYmlP3KCkHZ6VD2lOCqSdd3U7pWmJeu1BPa2jetg1UY/HPQkfbgkk/9E8hYaEY9Z0I4FHXDmdOhFg1LOJdCV1AKzTLnkDludbzRocjlsEKn+HXcuXAYPPnK4kidObxv/pQ+pbOnI21dgs/9U+h4mgHEmVA5/JyBwWmQHsnPg/Bp/xzKgT0IMwNOlXew3Z9jtPtz6mx0wDEBGXpUwCkdcyFUZ+1wZ8eO4XQHBBw1p2caspmi5xQVniRsV2yYa/XKrWg+Pe1ybyedcvtXsJCedrka63TKof9aYUdn6T9pB6FDATqL1G5OPvkpE3InTz4fUYpnS5T+syPKSpZvOVEed4ybRk7ZbRq3FYlyijXDS78CqSiBNQsDvrnh2aSCbvQ1Cz9iZ7d+Oo+8uWF4mstHrsVavmAUdo3SiqukVohd+j2sLANWiExen3l2iaetQ7jmWJkU03V2q0vR1Y2c0erYU8ryV7Ijy9ceJbAq5BiHEBiHL3XaihUogmdOyzb8EKL/SeZK5uvOzg7Zm0Q1iMWcvcnTbbmqs9NXQvS/a7cT/U8xC27071wZhw9caJP4z9CZNUUzAdMHD13J/fk7tdDZRPen396FymcTs595UxgunFEszjodZGApSQfZeMckm2frISMs7hp3bGQfLRo4866yAjWRfSNn12O28pbPc3SeDazgS56nGw39bKXdl05q3eNM3Kcr/S7DeEsdT498I2dJvtqfRL6VXc1zkK++0hyr5yPfCnjaod67KfV6mZefVr9iT9MddTuHNJwxrejYEafE+KxIRd3ScxDnbtdBPS9Bmpl8hwpXUCpUmXXMGzx0SJyeDJFx0e7RIsfARA+dFWHoiAj4oLNTwdNCxs9Btnc9Jw5+HmLi/ufNcjtUfiml8h5yasjzE5Xt2gP+bGbW8Wd5dxJ388o4hDe9Z0VoOlaC71q1dg93dkJ4Nq7pOUj/krNxRc/HkcvPyO9gpysLLOk0s92JGk+zL4swZHa7Yz5XA9ojoeGfpVNrjtrU1RvxC9C3tXK+6My6uRp/XMGJnWGLF/rHFfJHnbz4OwcT0tPpnmrNWzkL5mz8czLnnBeOOezKKaczY87bVvCQZ8ybU2M2lzPvBs6sIqeVNTmDRsHqnxFn6nix6UgXmLk/H2MWqBNZRC8IX5wc1plxYr3rjs+Y+k4s6VL8CqD4VuaoZxLYTqC4M2dvK3LVYx9I+BkyYTciDc7UbS+Sw8//XGxY9B57+ue1XaeXAjtDW/aq5/T+Z8g7rD0PGkDM1NKl6JP4byHm3dviKAMh61STMWQCzFGnzLbf7Vmjdc+KP5zvX7V5x76j8glnxhoxRNUp70zeK2g1Ip93GwycDbn2PIPcCjs7zW6EjqM5BCHU3M+DixXbM/zO+WSn3dB5pYiEEEJBFbxAwOA4lCj4RE2QgirmWc00NdL1F5R4WfCV0sRXYJZLmMEER/rFRTVd8gkyv/zVgib6CgnEcUYAOOez0ZtvXntrj2YKRjkeGzawzLM8y3IIm7ZpsWToPM+CrRocNchX64qZSJiKTj7GGB0ELwOfyvKIBaaaGHEsvJmXsTEci5cNuO2ue3bcTLzPBHoF2kPPy4l65i6WOktyS6BDp5bkmm5C4ZSSXNoURzINhEtOfa5zRKcpnFKQ6x7h++XpHTumyW//9HR/38xMH3olci5M78ijhb7++fn+PtIyVl26Dn0WL4LsrPfc7yZmDUmNtG9w6Wm46Y7DXMa8I17XM2Emy7Tm5/NobKbuwMMShYfZXqdfmh7YYrXHObBekNfaOSSmctmxZ7UKa3pPp0b3DKV6WBQxrJiKEDoO4E421eJkXPCJvvy588B/TuJHcpVcv2bI168TdVGL+vvz/3SNEjLUiJatZfN48VVqb5jlsBmzw5jFjacAibBsOisFFXHrbjIUD935lsBILD/rv+ImlQzXv6WRRoss6U/csL68I0mr7f+Afgb8vo55LfMRDy7fz5zfJs9OUNVz2g/DzB3LRj/sYILeDF4C3nExkQZ+w8YXX0c6hdatd47YWHaC4hjzSio0r21i9utpFopAjPak3YupxOxE7TQTnx24/rXOzO9QPmxZ8ONs7IpNZnj1mDClqf2tJhUyPmIUBM75ASBfrXgPYrRcJlebR6N0DKeoITcuGKVHJORcoUV7byIjInxDWyP5fl0nYzv8Oq+J9lRXcW0WLK3ZR0bz2YXRHrLprpJ9Xk2+7FI6wfDarbOLKGUm1aAq+7lSt0SGpwKMuaXxOysmCqC5UT9gmVAsEkAvHogLMstJRIlDk6tCfsunWYjju8Ng8O1IIQyfZ+dwIlXodhrxiZnHPIqdu4gGWJlTwsZNV4+TzeRoojtCzmcJcSwaTARzipHwB0sR1LgfrJkcgFvgJTBsVsACWVmzdBl6H8jKi5m3Mk+0ZOUwKH6izdQxps87L3MM4oKL2w+PQ/i3sf2wAjH3653ADr8Y0Ze/ZFnXqgmGxz3JFr/V8QmCtybOZF7jLbczmQvo6BKyy0TCPrC1nhyXE+YR8SJStHrjnoupFNHWsnK41ukFvNUf1dHi8vEk9BU54rTFZnXAsnF7rgRaHcUfpdYxO97CEG/A2HpRfs3cGJnkrppyLLOnNrw5GjMtDmPScpDNp3ISx3Ic55Pv6KpOToIBID/RvKoqq9dPnZMyydDOMAcCKYChJwc0ZOKFIYTFhd3BlGqZN3Eyb2ZodQD4ZXskCjKZ6DP8etG0e3UUq6xFrGRIkWphbqrab2cCMtyLFhREifWbMdJXJ5mKYkhXpbf2D21CyM4HjFxoaOtEXzSGDeIKfYZAok6wQ4AffD1FUePtiQV/Uo+NRi4gvdnpZLygO99vFUSEC1l/NhjM+wPkxLIS83k0hr4BnqgcQc1+KkSAmeAVELgiU2dEQnmmNdPIYUaRshKNbR0f34q2TsB/No5vIw+2jjN46edLF6DH8FuYGJMjtbrOaR/0vO4FsGf0kG8WxXCdF+OJHEcvM96ThDYBmGztmZKThKKxhNND4XNH2eWaTWBxN91uw6uw05zcbAR7lEl7Z4XSk4VExq/Dhwmux2wfam0aTu+Q4zgLrRMF80aeNRxh+uW9c9Fj5x6+ConkHNN7JxemJ+tj+OXP/Mhme8fRMLr0vPP3IdIAcfKD5S7OZmONB9E+fu7Ykc0cPTXw93SS+mFPJmwn6OmA1xtYzK72w8PgOWlwiQ+h1jDH85YNc0wAjNvrZnAOHe7c0ZE8tn4vtfV+z36OgEqThw7zzoaOXR6hHSSeXYTW2ejOA2/VFs3E0CkEy1SvpdYdmm3kNYTjaQgcN+5QbXVwc2pISxj+rNG/Hknnbiz1yjwXM00ycwCrek84pIl+nld4PaH5DL8K2hAujXZ1dUkC+wYdYWsIXWPUUkNbMasszvfMJMA2gyaIwR2bBFWYuyiqywHBjkf1EOkt9e2fHambqp/jBCyCzvCKKBCYJldm1i7mQkaKP/k9kq8sLj2Nv+nis+3MQeafHd1w5XYMKOoxvgsgoHupH67s2HmQq+P1jnCXqYlsWWizU6PATTtoj3YMsQcOYleEd9Bru5DbtmXSeejk0hxIdd/MrLNjNO3FWb0uUnyUWU/NcXpvM0tO+Bxw+MxSAbeRR3EdG1xq4UHgX6HqgnDXVobygpOCo4MX6SDc1tzF4dEq+XU8d5i0PBI2l/A3v3jXGx5//A13fbH2nhtuevChG69/b6P+4f61A7kJQRP8CaUOHtYa7BmWyVS4d8ODmCyRmWYv6itkepM9aMPdX/7yXXd99at3oRs/9vEbb/jYx244oaP+oVJN3SLrkpGUwIix2q5pdD5GCT+L6BgQfwKhpxE8JucbPYQq3X05clqLw8kHKCe3OPkElx9OTrTOJ2Zmt3D0mg42as5reNbRMXmtdzipTrfv1JWF3k5ZMIFXq70PN9JSjhafHCFw6ynZmTnPYUWc5ouyp5gi5HF57jAct5TOrIhN7LW8tmO4PGLTYCqUb8MqitnQS+/6osMdhzHvueHNgYAsEe+giYHeyO6XcFzg+MF8r0lyl6piICSMVNcsILRqU3lcxw+gr951F+VOD3JYc9PHGi9dI9GxXXQc2sFLtJivuo+UNLKqsBpCr+Tw4fVbLxzNAbZJAUs+Bb6gAgpDT6KPwe8woeMa4I+T02cROTCHAmDsHjK3A7mIeDsoA/EX1b3YrZ1Zw4wyG1zgco7zrq3MNpdNQtAKnbOdr4v26MZNe/YKlCOGo3WCnC/OzvN1QeoqAEpxIY9TVGPQE70C8G7yxnO279lLJ5QiNu/ZTaVdpabpTuywnN56OvvGmVgLypFn88hY8SnnyLpqNkQbhvHb3ozN3O1ZUy7aN977rguzYZnow/sAe8Yk/NdqYxd9/H7yWB5Jp0QL7bPEZLqMGFR+Mpckp1ons3+046HGV1HVwolYA8iY1IEppoVYPQ6Y5aeNJ9BtjX/suJ4E8IJqqDuB9u6Nd9OTg85F/4Vm6LkwrZkZzFOOG1l+KozkPb2mfSrMSnnfV6y0GblSFQsTBA89ha8AZFBg1jnZv4LThZlwC6Dc7srDRBmb6hhtni98DHioMe0O1ShykedpJHSCz93k+Px1Box7DvJOiOxOkukPO3ZiV3C9rc2mI6auHHJaLM7WucHde5yj3VUKAuiqdtDRvfOkiXo7mdsLgr97H3ZnRxQAHQx6tcOEF51DXzQ+hetc98Skg396nHHO9NN4553b3dE6vuZBtAVqH91e3+ZbC0yKvrVZZGY4fmS7cyQLf84OT+yupNLdPb3jE5NTziHMTh88rfSmrfC1UN6iQ3ppK3zNmcdDjpyuuZMwXYDe9C3kaRPsXHswdDbEVwB+scNhadPRPSAtonbljgEuFOKT9TdYI5umV6dkU4n0N7DRmzqRn7D9isk9DihCM2Ul5PstcmK0/kE8evIz97PvwPL6NLFZqvFD1F9FP4M/S1Pol8UAhGs9WsZCD5mYS1bftuq6iKaB0CJ62hovSskY+iGJ8zArskEj9Lqn0ETjcfAmuaUT+AR+ChBtHmzSeZ7JE1xn3/VI80TFVoBuev1MgUm6Zsh0To/o85SXskqylSNxJZemQVwcVquIqIXDEGpum7n0xW/cW53/zKtH9he3jhwam3vi5qF93etGbm88kdxQ2nFb1G78HRqNTCYlXaTN1hEbP3Vb/x3nvevjkeg1r+m7c98jj0Silz3WmM5n7n7PmgsKjcPoC/EUj2iT9aoLC8S+gxrY6I+wYoNkHckxtBpb5wWf33CQvUiPSqMd0ZIcMDgyfFZnaY6ed2txsHOwFb3WBK8dw4kqIAtZs1oJARIBeQErnEJ/aEhPLjxJfxbQwfvuW3jXuxYYtPRVopb0jHpyzgy3et16ti6IihqJ8vNOB0VzkgQXmZyCO42mJ6adc+rDDjzg9Po8qKdvYdFRCb/jkjhl9Rq4LK1d51yWm4eabjr1UNMwYaNqR6LpHB0GprSL58lRppu45sgWqgrVSrUE/3Fj0xIZuzaSy7V2RpeN+RJy7uw1kQxGpxQhea/zf1ONffCD4oN3HwpEVX8qhH5Nc9DpOMciFl93FRgClk2HEdmexJ/vGo8dfON7xUceKfSRiSy9E3Pdm/zdj8R7/YZhmUjXhYAMwv6973EkwhQDAWSZUrn88W7/pu71E1nqN7qWiphBjwHGuoLOvdkCdNjs7BgwZEJUH9kxcTvq94Eg1Fv+xBkxUQACWq59pxfqtFi2tbPMzy9s3uIYHIuOGxD9WefMj+bITTq0LtTO9o9WS4Knk6B1CnQ7gzA2RqM8J/NPTY5RQR9EWDOASHLIr1qqL6Hn00C60KoCXNPShp7SSMAA6i9qZjxugiNAnLC3byA5pPMSmOvHGvcKPlGPYh9QKiRIwmACvB0qDhHbEbeRL+oDOxUfi+YHB/P2cBSeDPVa6HWNr/WMxgKCwqNtRGg5dAfyQwSyjjlEzt1tjeefAeNRpeRcADJvOIQpBpqnGyutubKbPZuTTidPAVCp5+ythDs1tvV8GTCT0+mzj1BbY5BiL4C6bN52SD3hjIYmtqg41Zpo2dnj46b83Dafzh6fJjtGR09p8CHdPcs7e8iYY7+VkjhVkPz/r70vAY+jOBaumtnZ+97Vrm6tVtrVfR8rybIl2ZYt2ZYPHb4wtq6VLSxLRoexuW+ccAQIITwwhADhChBDjAMEAiGEQCAkAQLGdhw/cvETkkcI4SUEa//qntndkSzj4/HywvdFdvf29HT3dFdVX9XVVQzQ9nxGqEn5Jfm2DKfTwZRksRscDpvFxtb6VZVlBTqRtn8Gq7S1ItfjpE2FqBfZDo9G7SecXj0KGqeLslk8QqbPn+ugXUiGk4qw6IiqaVAx2m1GpnKVMQ2zPUa3ftTp1Gsy2xyZVk+SPG+IqGUaJBlmtISZUtpRMCmLHpV8vKi+cbOAG8VUmYr0y1LcoGbw+2jOlYUnkqbbzdTY7H5xJlkJ9SUn2Upp1q2NHYJgap3XsHxpq5SRL2p0mT52Cyk7L0jr9ZY5Bqchf8GK2lldPgxkmv3OjArUZOXWLuO7o4+E7fgSnA5nw064WcWLKFSz+7ppU3ouJ7qzozZ+1sdtcsUMbPUr7Jc2VG6XNcnyS+K5OwXGWuaEdw7f4MZyNcJaZbZr4t08sLDtYo1qvnNxLUsqCXb1xbKjOQyMpRxjVeumcSk8U0wJeAMx/dqS6jQwFNVdXiV/JiFUoWZNC0NmR67b3+gsqrTpjDQK6VJm5RRXGTRiUUlKSyFiYjAln60rBJeXqMvkXN9YWO4QGHvR6MxJmttg0Wtx8mOhaEVeS9Kkg5CVkaKz6S1eg9Gk1YhaTM23B5J+d7cgaH1Z+dlaUbhZyg85060pDp2NKUFJSC1IMTj1BaEka7rTkWEpKUlMoVGcqYoTNeyOmoUoW5PgKalPZNahDBbJqG8IeousaE40Nw3V5vr1ToMzTWQbPq1ZI9pt1pzkKpPD4C7KfMqQYkspKk61JhtleaJr8Q0hB1JoDRlSnfusYRySOHWsoRXNVFuMzH5WsXq08Smm1zida9BTLG90jXwkt9h9ompNo2Bt2rJGVGvCVE55lBkRH20qruSCP0klnqZAa1HFeH9yqac2p+frtrwULgfkdu/9mj03sWShVieZDULOeWnhZi7YYzSefVXGpsZ1VxkMw49PvuL2chGf0lW+yf/CUrtr6VJ3vc8VsLN+nx4J4nZ8lch3AC6QdyYdsopuVBu2qqCOoFrubSH67lbDyh2zSi8MyP3kDOpOp6uhlcxvgzwGnRxaa7sHZGiVxC90uCpiW/8YByDhKDtU6rOxKTr7p/LmlP+ho2bHihcczH6UpNELqeyynFkj6VBTVSkZpNRinZbd7zDT0Oi0p7tbC81ek96mz26ySQbRpNdrdW4j4/Z4jU6vjsZZjS3Z5/VkeCySQYNBvVXnyrbbPVKDoEFbltOdY9MYNHnNiFJmgt6iJcLVu6xEzCZnMKl+nonW34Lkc1KBjmCaJd3myGRaXO3p1tT6/AepamKix+PL8CZ4aaPGcNUTCcJP8DXaxeZCq4wrPgBvIehGVfKwfSxnbX9I2JOvR+RGEeLhY7liK0mT6pdVfblipsOU640MTK4Z4HatxSAYtTqz4E1JT0Qs0k5rf/JQ4tL8ivUuik4uLMrWO414wePTm4Ggi8zjp4YdTOo2NjLP5pYNY4/tah11nbRstU7riiFYxvlcpWXtHeyQsLhEbJIl+VSHhIlEs1ENRGwY5olVcrdLlsmbkKDKoIEuaybmk0xosUm9KkpdWSGVbc5jHPyEcLdxu85EBCclLWsJ5NuNkknjcLEjdZM+L0uLaCOio423MGLcLFitrtY5vnytgGlOi4PN3zSoWfVlmYbz8asZlaty0kPJF1+fl+ZgNj3dDh2Rr57+d9cR/T5oTbelz06zZ9hac6tWZbjY2UySheshNFEaUS9d3ccpKR98+AJ+jaA4AkMyJY3IcmLdyp0t5XrFIcboU0XgbazfR7s6u+vVx2IvAItie8Miy/rbG5pbZIGWAj4a5nb3yaYO4j2ztFx90KpTnWOpIRk97zrFfPkZ3hWFGi6CQl1dE/Qy+9hZOr3HbPJwSXwNGq1aSZqdT+ATkyz2lGdOOsevU5ytBUz9sAa1krbaJ4iYXGw0pVitKSaJ6WQWrMn0ojFIg4GYYLZS3znpHISzQsLZj+M4Y/hQ+Fig6OgaiUbU8ME5GkE4q+EpOM76kOGN46xAsW9ewMcDBUWKOfM4CksDscFY0fsfG2KnKn2Pr0dkVIROMR8aYyhgSw41DkzmOA50mhmxdsJZDqW4TxptJ5uDrTdGIn8Vt0Mf5/3VqGz7bKGltFY9pWYoagqUR1n+TNZEWCI0ap2uQLCGbfBHFB5h1CSZ1ux0JWUEgoXlNdwkmVe1OlQmyMwTirpbY5SsnkyPN9NjlWjL1vbpzyZBkLwJiZl+r9urZVrpj/3E4CBrkt3BNckuj+r35Zvi39Do74PPgX7fme9bnJLy2F/OIGd6iopj8ZUZbmjI0G7n0B5RQxtnQe3nA9qndJHrlJCBSaciSH+qen5XnIyAvahov2zn2i87VePH/5mqy1NTn3MMzZc7TwXyx1CIKc4+Gciyvc/H4oRwC7TSbmYP4++1tE4/2XBE1V56CdZcvavGkJIqNoqL1wr8YEOvnNMpOOiMC6K2xE8mFqq5VIytGjW1lSe/z+DTs2K4LHqyvZALc2ikOU0tK7TKBShCky7Dl1dSs0qrOpDQJiTIMmWyXl4ZIVNPJGTTnoRC5X900uXCbBWBBHRErQ0qR7HiAq9+SWdFseum+QRej0fjSmQWYOvDaSnnEm2nzvInFk7eYfKaaIdEvUrUi2aPaet9j++U0jy0OXUEXbhgclDInr1xVefmhiz5XMJo/QN6Gqmb4LvZRTpkhns/9FsYSrSVc/Fe5H937nrybsacQrx68my8StBq/HV7t1/wQH0um0XSIx8Jj3D78itokXOrPK51ykdnxQoTRjnnLlFLizHu7HT2YSNUKbydXEL+Co5RZmO9no+OHd3RQ6lU2o4Uq/mKqdCisHe41XUpt37FWjV7x94ynb1zLEsY6s1DzpT+cpTmHy6OUMFEE+Jsm3tMtOLxLplTNsdlTrellJpMXvOcAYPFtXKpY04mM59kkBxVBeYcj696EjU6U1XIV+4w2KTJer3LkFIoaPTloVlFNHyVlj1zO+ZmZ/t1GuE6rcGuL2wpKUnyGx16QTSfsdlZ7ytbbknWO020W3Vl6oz2JYvQUZNe1OpzG106zEBRY5o711Pvq9kw2EUvipeck4KYNSsvyeEzcF7Ci7QlZWcoxYolHvk4BP+iMBrkzatGYEflnO8mm+ApZcciVfjhpPnjsjK5HPGdGcoRPzyRcsR3Pklk5QhQQJ3sNuEu6ngr2CmKQiVXQoOaaK4kkvHHH3OgVP02h2jAHz1oyc1bIcoLa/gLfTKVk1U+yi+aNJE/KtWTzcM1y1ql7YoRDU5FGk9Ds6jMo9TztZCbl7+CL8Bd3ql609Wn0FP4haETTXgLMxwTTKItJ+0u9RJRiT01xU4LW63b6EgNem0phneOn0S4y0Url7QKi04nd13R401OZkcHkj43J3NWgsUp4vGTcAmK3XidcCfHxhdV2Fislly5kqDtUYN/MZfTjj36o3JjfGOqAJ6wkaoAnu1Wa2XApyrXL5DvVmOQZpjAOCZKXTlTxbxm0Okl70NDJ5qwNgpVJnN/HMAfOwk+7BKOD/jjJmGT3BiBYJL3g60quE8j+zidR5lJURrfzaNU9K3kmUbb0YUGp2wRcoWTIutffzakSDVcRrXfz+lsg6q108jKH5c/lBsXo6FY46bQj9IehXgUWbQTJp0zPht0y9q+g3hAGIbTYBgukvWKXoTsYnCTLIY/S0FYnXxcaeW2oI5hH4rJVDcK58jSJ72wKd76z8xkVC8H14TabM7/vv2oE9Md/hlbmZq88tPvSH/WRqiOo4ycywgKT4tzCdlLYAN8JSq/bJMVvDsVxrEhKtbDlrnOKXuLDgjKSycpPaOmlpsQDKl3hvLxoFUWGTArfCb39PNAA7cwGKqp1ccZTxqz1SbGjmPZUQCXTuPmKKoUNJf6y5hyeJXlNq9CDSeBY+FpWtAm1ZbekD1v8pVFKZfUVrtpIYvIoOzzs8Nw8YYvSQa/m3B+YNJzPF3x1CsDrf/5bCiLidTk137rmY56PeNBuWhH7pbMOurlv3xb5zK6zXg8ZfEYWR35ABdzS1flsm1fzsf7i7KW4WauOAAV4RFl6y0bvSqlZRdW4OLJOWX4w2LhriNLhUcoX+RdqBOMwlrIhjLoiI1+c6ceas2loTGuQUkok5fJFrVWxUYoUM4R+C0JjStQxvGVI59shXJCXuXeklc5+vLqcpTTrxxUy3p6el2eREdveXdSUyDY5Okt7XZ4PI7u0l5PUzAwz9tdjo6Grq6Gho6OhqHuRJ6mr7TbTml6SnsTG4OBpqQN5b3OxERHTzlO4Nr62aedNrue2chqAB9tHxmvtEneIUxhZsfl/6fxrUWdohqIM61l/WOnzLJu+CcwkllnK6W2WqNtPYorrG7rFH5vVLsa73RKw0+Z1YvWfwb/lbWWKE8wCPfDUnbjjFn+bhSq5fmtQJEgYQI5bXLUXC6jw9fnQlo6v4ob+YiJ9aiPiCQukCOnaNTMbVsqW8tVluua8gWtFF0mi0RZaVNZGp/5TSAw0y21lMmoCPGwKU2SIVvKtRqVlJUzY5Vcq5GrqmLqIBTnnGi1XmW37mV3fqJXM6JGeBj/hf93RA0/VzmyMpo1WwbL2hKsjgQDzROm9NT0IhMNFgYRbzV6TK5sG01bacGD5S5TkuixGZzGxHy9q/xgIH0+3uEbPjszx+ZxWQjQ9mSfS9SJnpZyvrygsc/oNDp85sl/VDLlRIK/CA2pCcxU6OR3MvIEqy25EpvZWORTsFFNwObrjVRslIKhmk5ZlW+KIimR20ErjCoZJzlQOWUmaQWHbBI+akg7lSabhXxqEUIdnRoqL6eqWjMFJ/6CYsJJZmGRjJMMxVZ0FCcsQ6ito1PGCRd7lvTJKQs1u2Pm4PUZmf6CwqLiKFrUq4tyWUsvE2qu8KrQEIW9h8lk0WOgKrZULQ2WxYyby3IaId/CWr8n35LoMxutTBJdchuZXKZLIyUUvJmc92RuxmGaaLLSmrGL5nGt5PUa0JCQQJP8k4ScDT0uq07PLnQgdSmNHo/cm5XOFEMlFOOyyQfz3UxnlJg0B+t8VzOxDNFrQWvChjqa0phaXxO3A1oX2cjvSr/M1vb8poV8UY7dV10VXeY9RbFXyPP0N2QOF1/5rZKjMvkGLGoQWGu74tobd33jqedflkH7MJ+DHtojD5rVfNDsjl7FmHrh2Z2gvvNMj/EL0uXKYtivGj/dUwbVuDiM6mw2KptVrrqMrVzbiK69Kz+by9v4xLR71ZLGbrWd6F1tp+uE7mqLot1hsUla4X9y/xuf8aouaFMCR0lyQq7dXuD1FjiooGNe/K44+uJ3xTEvfjNGYJ4nudRmz3GnVjmYvOUpXyhnY/oCeB4exSpaYgaPOh1TFiKcBxs9+CoNaY86uzpv6tnUj2gVLiXKB1CJ7ABKgKLIGN5OS1nGY7jof4vHUKFoP438DYx806yIAxGO7R5/aUV1bcNi+ZDuRPeHFSeasOUzYS1czSYC9VYzQbXV9PGt5vFTsCsnkT+KbwvPclkVpk/2CrgP/hCDuhcKaQZXyRU2q1XFepltA/XbVD4wxd6G4QYO7PtQeb+TWydQi4ecBXeqZY+ugc3qxwu5HvBGTULeHJpHchtWRGVH5OOSlugttVSaWmRRxp18eXjmffJIdye329betfKsy6+4WbbbliGbAy9v6eiU4jecpuCrvLxiGseDITVwognZsj7KR+Yj60y8kmkb5FAI1SpB+EIivo6TvyF4S8tWV0lmyZhiSy4cmUsd2ZxdbTeZUpMLZ9n1huxkXH+8FJP3T7aX4CW0ERKs5SFayRk8KTRMaGzts3U+pzcoaV09Ta4kdrHXlh90+6zuQl/hpJeIJymtoNGqkdhBKLt9oDPSuKHJLrGaTbgIG4p6LzAzs+Xm2aHF52tTcFFheo09tbglP6nIUVKcdrwE+JUjhcIVAtXHniIZ9C6LLdPesElrtMyus6bZqtdaDTQOWRJ0elOODyff1RqlBH9XpT3T5uN61GnE02tEncbUFMicbY2fYW/jp6pzp52qNn5OTlUVbTyndlBapCjlOeWjall3XtRe5jYaByrhTdlqhGg0MUuN86GC73JP0mLmUfYwP2dGNKNakk7AbOZOBQknailThvl0CYxNx7Tk+69DrDPfuzsl0t06w2W9U6bimTSKyhQ9lyi6AdrhNZV2omp2t/rk6NkZ5Z6dQYRp+TzS84mpmzoRI7Etn8p6O8FOsOm49xzVFnyfT+S3eqJjEhyitekpjEmfK4TNrD7vBBC0bwZRphMdmmbQlOekgWU24cFNQBhW3dbNUlZntqhcRZi2/jGF4EZUTPO6aMWmB+VWKrtCzOOiV+647gCNnrAaF3yR0Olyx7V+TzU9mpA58xjkbMzMmoN5oYKC0OSbYzONLZhVhU+FMmiPI6bWTzbPShecwk9n1NpoohbPpbnQTQvOrTIXhXPsQkRNSf8nbY4uEqa0Ekujk/+MTYvOMgx/s2gcdNN2qY7ZMGmUTE5XGU0dtlx+A7ebuoNVpm0d6g3uhBwtj01XuDss2T+3uY4TGqumAONTx6SZACQ6jjsCyZCTKZ/TQX6Ul5ugqCf859P+TGPCFEAcnkmQcUYCmUFKUZZt28Fl26r+FWTbjmGD9hjCa5kz9PtjGWt+YqY1g9z+bbz9Of8K7Y9Z2TxGi3cpQ8AxWxld38uWp3dAMcyHKxgtz4/OdYegRJnr/tXNTM+8+DyuWekrZqCKkzMmXTuTDgkZotsIotVwubzz9Mg7z8pjmu0WUyuEfx2A5kS3OMcD4ZMKlZ0k1GaivcvikILfQNnnxMD5zEux41LehzOMxScJw6MtEyMbieAIvkxL3rXHtkHEIXIy5ldO0OLKdFsqMxhLYXU04T9wrnAH6JiGF7YaV1ZQEJ8mtVG9yRJfyz8GEh8ntTKGogPf3KgVANkmDQIKLlwsnE+9bEl0fMZWik+JbpaxUmgUk1NkZfPAGcRMoYwcU0NUqIvTiISZ2ZWy9slTkqIuPhVxaeH8k5GLJlgKWQTLNUfLaoZmlrGsicpYupiMpQlDky8Ka6qrKXEyfowVwk2QDCG5Hyris464+TqOkxpa86igpEWj3ZEsTQUTV8pVWRaK9RX0pKHOYKkLVXWl6UOloTwronCTKd+bUbFoGWdNl1TUZKPIz423CUbYxzXwlMs1ma5uJybdNEXVjnIx9ejF4LZP16ND8JiHETQKz8ty+7GZPZPKjwrO8WmbW0CLH3RkyFO5qFa/FYjdqLfIQh8ZQkzz5KdYCp13DKOeQt8xTW8iVEbyUKL6FEKjSiOuOSoAqJJhn8HQ5lQ5lJOyndl7YvYvj2fLEoTIERoJdnBdTwUwO9Zjz4XsqLYntnkmEqOBp4Bdp5qm8kmrtyamZ0vH1vpUMWNsYIZJf9eJ6YeaYU+I0Bg5Df7OWXJlKu1u3mmqEWuoZ8kKLuwc8A4Z8F7tlFPTUMXU04TQb92uWr+vAFFKMGl0mmLG43Z5LW4fu1vfak8rycsleNvTTKJOELQaY7rDleA0C3JPio+0s6eNtGJ01hQ1Wp1GYVzcE2MUygMgf6fctM2pIBrBuefNOde/42y/cMc992zcyPRI0nCyUriR2n4e02+TkJgkNmp0MicmTCOF6lxwGkPFjgrb0kUTkXUq/yRVqQa//cz4LGwSsvE9kdXuEKewT1LV7JMqmoyqYtN1QihBF2WZCCtLj/yuNGfVqtwSTK7Iv+WWnDlnjhUkPfQQY358s6qs+jDjf7g0qbMe2lC2/uMMU6CXncuzQ09RuJ+6PtMqo0lkF0o0kt4gNsl3nafOqVZF6QZf6ou+zKlzKtc9ICYmy3MqV8ojmZ00Jqnn2AxfpmqOlZuTxa+EMMkGmmmpTfJsm1CYuXSpPU1rkIgmcpflatrafAXv2YTUvN9VFla9lJmC6DAkWHDy46rCysmDhYmCld8njnyAf6C16SrYAF+I0WuY2iJbeF4XVbBhjekJ0CxauUpWjn8/tWQ+3/nHopj+Qb16fCnnG2BFxEMeX6JzhX7R8pWrZOntPN7ctKz8cpnCvFnKtKqSFJx6asZmXBqaiBJj02xMiCCmTyCqkzd6ppYTpdynPUk0vTjWtdBwFJi9qNzoMTVsor68sTu11OVKN9ls6En3al22xGVzautFUTLNX2J0GqqbRuYxxcn5TmeawWoVBcQES7QT3PULjVGq3YDFxcVz03RmXWB9m86ires2SVqTi4mQvG4r8GbPbsyhkcKSaEquK9KapMy2xq5OZLs0s57Wffgq70kC5EQ+wvXUV9fRvPagSqtLMjTFoTub5poWBU2NwlpZ+0N0odsoVMoR5VG13Y1Sd09fv4apbOXd+3RYDypxqqXKAkjhfc5SZHPW8osyuqWdp8mUeTqnVF7SbtnIJzs/9QULK2ZJ0atNylJQrTh5OvpK/WX0nxKVanVZVRWqtRJXzD31WDSKP68risBZNntdBptE/DTQMRFc8xCB1Z/fnK936u0+my3JhKjT0wRvsYtajbmiivbBnuzUxLrihYj6eQ2OVJPZqZW4okiTJktBIta1lGGKgxloTjAa7LoG+kRCeX71HD2TyaD/GhF3mZMt/hoUNJmZiQGLP6kpRHgMztFqNFp+tIFfwE0KFpmijgdpPEyEUrhPJSEhyeJVmtTiEhpAHO4EUdm+2KMTHS3dhERUcYFiyw6mZ1heqQuo9DHkopCNkjuppJT2PM7kFFnvuotvh2I52WRvUjojcmVfiQWa+I4nxmpwVWXGkJUZ0wLGNLhxdV5qlR5Mciqhwo7WPQf0+pR7H5r8TW1GR0d6HS6/PjHb3V40eyCvMrtvQ5b5euESF37j3sSq1M4rXUJW5U8Ln6W9zORvC/+YbNfavTvOa9hW7Asm2t4mqDG7UW8KD/HzGLWFMhcn5NhjLV+OxZX9v6Poy4wJC2QopzcNUfG0Is6UVVQvawLB6qh+UwYNmqbMMjSSuGBlUYOi2Y6Jx/KVDxeLVdNxXJhSkbIUj7YchdZzMnekz8vOL2zL2JB5Wv08PRMyN2/u7zlnvN+WYrVlONiVOUNZlo6rhlkdKmnR6qz1tUJDU3pjQpqUqEl0V6SXVly/1JxkIdI77auXb+i9RqvVeu2ioNPkrfAfeV22BDU+0daWMNsXOk2hvHSivHyYA19XUZ5XlrXUuYI5BYVztLHTD/vUE1kLqs4/mM1fhdJcylUE5bFEOTkX849WM8dlVcVZc4T4cYfGaLaopmumbS5f0TaXOZWJyeTwPHG5Lq5yPcgOPLyiw3MUBWLu5DsNCWkhTAhlLx+/NsGit0q+8DKDXW+wG7Lr1lvT7ebCJH9NQzCl1Opx0Z8mvxofqfRJtJn21dCwjbh+ZXalw2SVMphqmYqaTAG/O/mJIIh6c8PchnpaAuqT2HwpRXLwDYHZQl8KN6m0oKRzQ5sE1/yCquqlWr635C+c07YpzAin6k5pDXV6lVpmH9RDNgd5WVQTrYv2oSUcoikqKXynrPXSaHKoDHGK+fWcZr0OeXmurBL4QiHLqzKAGt++sv4sS0m6EqYJnMR2tYtNmTTyiVrBme1yZjslWq1b9G7ahPQKonXj6oQsh86q81d/UO7u1GktpanGdHtSPuG6skzvMHhyxEuEZzyp6NDQStmsFSbfEiSb3pk+1m9JsSw5z2DUmHW7SlOcTjHThz//SGvV2ZK0Rsfy5fqq9KxZoqj3uZkus8gHwrtcrr4AWuG2o+z1NQoL4gLFzZzIY+MoI/HIB0SWKqUNjTQUODntlrQS7RYjnwILZXOoQraSi5JlKRqS1SrRmuVrfqJm3nxpd0xDMsGFJpyYHD9NVVVTIJmjNlChi5oPCcTlUrnu6qwpXBRhtXwZ4PrAkd5gAW0EM1N9BeakhMU15Yt8LoNDt3KH1c2EVB1HPnyaCDchTZCY9IvVs82alipfITjycJd3c16LR2vRuXx5abbmsrpyf63H5NB1aoy0SdD+PDERBQNjzAh6m6RPDImT93nNwmd49/N/W6u/+k+uN4Bb3ltgMjktICqvUQBFN67qj6n70Ehand5Ak4DFarM7nC434wkmJaekspsumf6s7EAwJzcvn8kel5SWlVcwi7dMwWz97DkNjU1z581vZtLiixYvaVu6bPmK9o7OrpWrVq9Ze9q609dv6O6B3r7+8MDGTYNnbB7aMjyy9czRsfGJbWdt33H2Oeeed/4FF1508SWXXnb5FTu/8MUrr7r6Grj2OvgywI1f5bW79Ta4/et33AlwN8B9939TfODBh761++FHvr3n0b0Ajz/x3Sef+t7Tz3z/WXjuh8//6IUXf/zSyz955ac/g1dfe/0Xb7y57639Bw7+8tCvDoNGM0DtfAIuJJjXwfkQQR06MAUzsAzrcD62YBeehmE8E8/H64UnhB8JLwoHxS+LN4l3ineL94kPi4+Kz4jPic/73L5kX7rP7wv6Sn11vnrfBb47ffdk+jO/knmvX/Br/Ta/05/gT/Zn+PP8Bf4Wf48/nCVk2bMyAxAQAuaAPeAOJAZSA9mBwkBloD4wFLgwcGlgZ+CqwJcDtwceCDwSeCLwZOC5wEuBt4L1wcbg3GB3sC84ENz8vhCJ8J317WwKxURMx1Ksxdm4EJfjalyPw7id1/15qvu+KXXfQ3X/AdXd5fP6Un0+XvdaVd2vnVL3JH+6Uvdufz+vu+8YdV8eq/u1U+r+48C+YF2s7uHgGe9DJBL5tUJvxZG3yKfFmczFkv8i7kka+idp5j5yzpGzPvnoyBnkuo+s/+TAkRVHlkdTHb7s8FcOX3r4p4evPtxxeOBXZwD8avzQjYfuOHTloYOH7mYpDv310JmHNtBv6SE4ZD+EBzceHDh4+sG1B1cd7Dy44uCig/MO1h+sOug/8MCB+w7cfeDOA7cfCB8468DYgaEDmw/0AxxYsf/j/f+9/6P9b+1/c/8b+1+T+wc8htvwQt5ZLlfc9bgL76Cl5F4e+z3ZHf2Hj+AefOLod/jIlKfd0Wd8aKZSjv+HZx8VMwSMt3EnXAqXwZNwI/weLodr4Eq4Fe6Du1ADX6Q+oKee9mf4AK6Gr8JONMAv4X24jba2H8Jf4K9wBzwAL8Dz8CD0Qh9cS7uxH9Nq6UfwIrwCL8HL8BN4BwbgVfgp/Awego3wX3Ad/AJeg9dhE7wL78EX4AwYhM208hqCYbgdRuBM2AqjMAYTMA7b4Cz4f7AdzoYdcA6cB+fCd+DrcAH1zgvhIvgD/BEexwZsxCacC5/AEZikXjuP+mozIeTv8AYuwTbqsQPwn/A2LsVl2I4d8C0aNDupLxfgSlyFq2n0/gf8Gn6Da3At9e91eDr1k27cAE9gD/ZiH/bDb+F3sA8Ow344AAfhV/AmivAIGuFR2As/gG/DHngOLobvoxa9yOwGJWEypsCz8A24HtPgS5hBtJENP4en4Rll7IWR/2j8ywZb/V/BIL4zHSuR1ZGg+I54EQUlxqWXUUWIyo7MhhvFd+j9OsqFU3Phl6gl8t/HssM2uBhvgjaaoSRyhWITzBaNtOLdA6X0jrk0im8WKml19jHU0HMO/S5AT+S/KT6R3Ai5dHIF5MzkfOT85Nzkavg7D6wgt5zKSGXlsF98EuaL/wHjwqtgE24BB7lUCtuFPjALheReBR85F33PiZeBkcJ+9o6dllPYzJ8LKT37ZfkLIZ/eO+jZysoRd4NEvyyfh+INVM5qXuc2qtsveL1Z211UjwCFRfpNot8U/tvG655KzkD1tlO+71JYR2EXwcZOYebSFJglUnqJ6lhB7y08z4fgou8m0K+DnJXKTMHDRPUvwDz6vVhIg1zebrntqbzN0Ta9ytMHjuGSjnJy/f5O7n0FJ9G6TXeGaW4WXgu19Ful4G0Brocc/GHkD+xZ+BsEmRNfJ/y1wekMD4xeCP7A6snCCk3IdPRh5CXKlx19Vjt0gwaracZkeW6BIK/Pk7zcnnh+2nbGw/mcFt+BkRic6Jv07XT6ZbQGrEdQGQVKOWPklqnyMxrwwD2R1VSvd+ldA6NlopEMoZDTZx2jYZ72SSiisnT8GzIe5F9ynPbawKT8OhX8+KPfUWiNO44HOS0qv8nktpGbR64S2yJH6LeRveNlEy0xmiW6yVHDitEug0/suZA/SzPBVfgT7c5niD+e48oxld+YWz+1Hv92/3YzOj7LaO8nKk/WMi71LlobZEdeJD8U+RP5tZFXyK+LvE1+feRu8plotUjzIICN7UvI3xN5gvy95Dt42MHDafxtNgQj+8jP5345lZwNldwPRa4jv4aHayM7yK+j8rPpK18lv4PnXc39NZG95K+N3EX+Ou7v4fF7qYQA5+4G+LoxQDX/JdNLGPmIqJ/F5/D4HIrfR34t91lbcugrL0Ie2CK7yXdwP5u+kgfzI38mv4Vy5bHrtuS385guCufzMvN5mUU8XKSEsyPPkT+fh1u43859Vv9iavXb5LdEfk9+O9WwGFZTmcXUlt9DCcHhLvJrI7vIr6M6lFDdWHgd1bCEt7SEWnoXlPEvlvEvlvGWlvOYch5TrsSEqI3lHGvlVBqLmcVj6immgtp7HfkO7mdTmRW8vRW8zhW8zpW8zEpeZiWHZBXVfx/5IWpjFcWwcC1BrIrKf5H8+sjTUM1zVfNcIfrKXiZnT+WH6FssnEZfD0E6pQ/Rd+8kv5yoK0Rf301+C1FLiOkiIn8J1TlEUGLxXTy8OvIa+Wt5zDrya/i3avi3ajhma+mLF5BvJ7jV0hdZOI2+W0tfZH42UVctUeCfyS/n6ecTBGrpu8xfQu2qpS+yXKsjj9JcYqOa11FpT5Pv4OG0yAHy07mfHdlJfjlBpo7Xv47KYT6rfx2Vto/8dh6zmlpdR3X+DtTzGtZTmdeR7+DhNCq5nspkPiuzntNJPZW5i/wW7i8hiNVTadeTv5ryzmeGq8hfxP0O7q/i/prIe+SvpTbOZ9fBKJ2N+w6qTzPP1cx0DJO/mlI2U/o/k89SLuApF3B4LuCtWMBus5G/jPvrKOVCnmYhT7OQ3Wcmt4b7a7nPymnhaVp4mhb+xRZYRHlbeD1b6Iu/J38t90/j8azkVp6rledqpbZ/RH4LD7dSylaCwHvkL+Mx7dzfw31GVYt43kU87yLK+w/yW3h4EfeXcL+d+13cZ/VcTN/9B71j9VlKcP6I/Hbus/osoxp+RD5LuZz33+U8vIKHV1CufeSzlO38K+0cku28Xe1wGo9ZRyV0cL+L8L6PfDu1ootw8SL5bJToYvqhyV/I/RbuL6Ie0cXr3MXh38Vb3cUMZZG/gvvt3O/gfif3u7i/kvuruL+a+2u4z2q+kuNoDdXkafId3J9PtV1Dbf8z+e1Ut7X87Vr+di3Hwlpeq7WcHtZy+JzG06/jKdfxlOt4W9bxlOt43U7n4dN5+NtE1bvJZzPFHj4XPMpjHoVHqVfuBZH7C6mP7IVlVP5e6u8svJKgtBdWETT2EmxZDMM4pY3wPfWMfz+jaew3tIKiX80ozWe0r9Z/AmC4A8BINTIeAjBPAlho72stJreN3Ls0ddUD2KvJvQrgoDwuD7mXAdw0M3qM5K4H8FI5SX5yfwJIobiUAXL7AFIrAdLeA8jYD+Cj9P6bAbLoe9kP0ET0NkDwbwC53TSBnE1TRjqw0ygoJIopojKKaaotMZN7hYZyKw3eVFbFuTTg0iq4ir5fTS70BEAt1a/uOYBZBwHqdwHMLid3McAcN7lxclTnhkaAxg8A5tLvvDoaCih9827quM9QN6F0i4iWFvcDLKH6tb0PsJTKWU71WLGdSJVg03EvQCd9dyXVcdXdAKvp/ZoXCOlUt3U1hEwqbwPheQOl6aZ33dTmHmpnL+XvtwOEbwLYSOk2UV3OuAFgM+XbQhQ3cgbAmdT2sV6ACYLJdoL72ZcDnJsNcN75AOe/AXABweiiawAuvhbgkrsALqX4y+4HuILavpO+98UgwJWFAFcRHq6htn+JvnEd0ff1Pwa44XaAGwk+N1J9bqI0N1P8rucBbs0FuI3iv0Yw+zq1506C7V30rW9QH7nbKbt7qd73uRV3V9x9k3DxwPqZ3YNU14eek91uwu/DBMtvEzz29Mbdo7+Lu+8QvB+nfvAEweK7BM+nqA3fo7o+Q/V+lur6LPulNj5HtPhDKut5otEfPRl3L1IZLxG8XiL6epna9ZNHAF6hPD8jOP6c6ON1wv/r+2X3BuHxLcLf/k0AB6jdvyQ6OEQ0eZho5T8p3dtzAX5N9PWbYYDfkvtdS9z9nur5DrXpXYLFu48B/IHg856GHNHNe0TnfyRaIdKHPz0L8F87Ad6nvvD+pQB/Jpr6gPrOXwjff71hqvuI8PM3a9z9nfrMx4dmdp90/g/dLpWb/Lf7t/tUh5xr9hPQcsf4aUybAoqVcEThu1nhoRifjfpEjBdnoic5LICOdupyWAQfBJWwhtIsUMISrZ5XKGEtxV/GTl40jLOdC9cqYQQPPKaEBfruK0pYhEY4qIQ14MFUJSzBJixXwlqKv3neyPC28Oh4uN/Xu8PXtGRJ55rlzZ2DW8JjRe0jW3qG28MbJ4Z6RpUXdao3PuVVXVvrYnWOeIEDoyNbfPPq1q1qXbquY01HZ3Pbus7W9g3sr7hzQdnMH4R5MALDsA3CMArj5PcTdHphB/lNtLJZwq0uLqe1YScMwhZ6P8Z3SiMU7qF87RSzESZgiJ5Gp+WoO0Ye37RcddBGq8PFx/zGTDUcoDB776O3tF6ndVQrWw3SOmsNOXZ02kZPnXwFuiH2r5hiFtBO7GRaGDtlo3VQ+UwLGaJN+VdAETUooZZx49GARjShGS1oRRva0YFOdKEbE9DD+c+c+4ypmIbpmIE+zEQ/ZmE2BjCIOZiLeZiPBViIRViMJViKZViOFViJVViNIazBWqzDWViPs3FOlLeu8NQX4EJswVZchIs5Z51x1JfjCsZV5xx1zk+fwkffgN1RLjrjw+NG3ISDeAZuxiHcgsM4glvxTBzFMRzHCdyGZ+F23IFn4zl4Lp6H5+MFeCFehBfjJXgpXoaX4xW4E7+AX8Qr8Sq8Gq/BL+G1eB1ej1/GG/AreCN+FW/C/8Cb8Rbchbfibfg1vB2/jnfgnXgXfgPvxnvwXrwP78dv4gP4ID6E38Ld+DA+gt/GPfgo7sXv4GP4OD6B38Un8Sn8Hj6Nz+D38Vn8AT6HP8Tn8Uf4Ar6IP8aX8GX8Cb6CP8Wf4c/xVXwNX8df4Bv4Ju7Dt3A/HsCDx1yf/vvvM/qTxrb29IW14e19Qz1b9GdOjNBY1TtkHJ7Y0hseHRvcOKztHxmigU23NTzaFx4eN/RsodBYz3C/iSceGxzeOBQ2bO0ZDQ8PhQfGjTw0Orhx07i+Z2w8PDo4tlmzdWhiTOob2bKlR7tpx9ZN4WEtlTE40i+NDfWMbdKcHR4dEUeGw+L4WSPS+KbRcFgzMDIxqhkY3BYWxwa3S2PhbeFhKcwK1QwPDoeprKGRYcNYeMsgD2mGwmNjUvjMiZ4h3cbRcA99lpoSHhsfHBkWesZPpfeZekd7+jaHx1mbDL0U5FU1K7G8faaesb7Bwb7B0b6JLcaJ4X4CS9/IaFjaONqzLXwqPdbASg+zL4q9PaNG/sS/ZORfGh8c6g8bmvoHw6ME9jGpaZRgr5/XF+4fJAxpm3v6JsbD2qVysmXRZIauaEjbI6fo4RU09cg1HxgKbzf0xNPw7FIPL7svWnZYzhmWc4ZVOcOxnINymkE5zaAqzWAszTAvXTsiJx2Rk46oko7Eko7ISSfkpBNy0glV0olY0v6ejRvDo9p+qh6RDqNSPaO8IWqCbizcx6hA2zsxNBQeZ3TKmr91k5Fy0ARLtD5mHA1vHGQZwv2GvpGtOzjIDeOjPf3hLT2jmyVeA330a0JTs3YZJwYDI+stg8MTY+KO8LCwZcI0Mto/QDTJSNRM4S2EtgmqRVjoocbKBBQly/6Rs4aNcq9jQe3A0AiB3LJxguAd3jLC6c4ae5L7U3hoaHAra3ATh4a2SQbRMv4jLGsWRghFw/30GW14S7/8Nbk/s9Is0Qe5ffyJ91gekiN3xKhmTTSkHyAyZDXW902MUtfu28Eryft9rJL8iRchDAwKA0MGGSX0Mavc0xlSGIBjNertGQub6N34ppEJPpo0xVFrao6HtU0c/IbmGLab5ca38nhTq4oiWmNpWuU0y+Q0y1TFLZPfdMlvulRvuvgbfT+D/djYoDH+SpLhvKWnb3RkWOodpdHIQMl6+lirNKyn6JSOYt40MbyxZ3Riy1DPxDjRNw1qm6W+HsqmXcLxrx2SfzrkyDH+IzaPbxLD45ukzk0jo8M0ApKvo6ybeoYGjD2joyNncdBKDFRRDBvGBsblsdQwwIikv3dku0Lk8BhGLqMVz3W0vpXYKZjAtpsvyL9YCOVY8GkzQlNn8zz68b0vCPdHglghXgy0I/7/IkOQcUAjAQA="}}}
},{}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 *
 *
 * @export
 * @enum {number}
 */
var PageOrientation;
(function (PageOrientation) {
    PageOrientation[PageOrientation["Portrait"] = 0] = "Portrait";
    PageOrientation[PageOrientation["Landscape"] = 1] = "Landscape";
})(PageOrientation = exports.PageOrientation || (exports.PageOrientation = {}));
/**
 *
 *
 * @export
 * @class PageSize
 */
class PageSize {
}
exports.PageSize = PageSize;
/**
 *
 *
 * @export
 * @abstract
 * @class PageSizes
 */
class PageSizes {
}
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.X4A0 = {
    width: 4767.87,
    height: 6740.79
};
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.X2A0 = {
    width: 3370.39,
    height: 4767.87
};
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.A0 = {
    width: 2383.94,
    height: 3370.39
};
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.A1 = {
    width: 1683.78,
    height: 2383.94
};
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.A2 = {
    width: 1190.55,
    height: 1683.78
};
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.A3 = { width: 841.89, height: 1190.55 };
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.A4 = { width: 595.28, height: 841.89 };
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.A5 = { width: 419.53, height: 595.28 };
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.A6 = { width: 297.64, height: 419.53 };
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.A7 = { width: 209.76, height: 297.64 };
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.A8 = { width: 147.4, height: 209.76 };
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.A9 = { width: 104.88, height: 147.4 };
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.A10 = { width: 73.7, height: 104.88 };
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.B0 = {
    width: 2834.65,
    height: 4008.19
};
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.B1 = {
    width: 2004.09,
    height: 2834.65
};
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.B2 = {
    width: 1417.32,
    height: 2004.09
};
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.B3 = {
    width: 1000.63,
    height: 1417.32
};
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.B4 = { width: 708.66, height: 1000.63 };
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.B5 = { width: 498.9, height: 708.66 };
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.B6 = { width: 354.33, height: 498.9 };
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.B7 = { width: 249.45, height: 354.33 };
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.B8 = { width: 175.75, height: 249.45 };
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.B9 = { width: 124.72, height: 175.75 };
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.B10 = { width: 87.87, height: 124.72 };
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.C0 = {
    width: 2599.37,
    height: 3676.54
};
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.C1 = {
    width: 1836.85,
    height: 2599.37
};
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.C2 = {
    width: 1298.27,
    height: 1836.85
};
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.C3 = { width: 918.43, height: 1298.27 };
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.C4 = { width: 649.13, height: 918.43 };
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.C5 = { width: 459.21, height: 649.13 };
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.C6 = { width: 323.15, height: 459.21 };
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.C7 = { width: 229.61, height: 323.15 };
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.C8 = { width: 161.57, height: 229.61 };
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.C9 = { width: 113.39, height: 161.57 };
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.C10 = { width: 79.37, height: 113.39 };
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.RA0 = {
    width: 2437.8,
    height: 3458.27
};
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.RA1 = {
    width: 1729.13,
    height: 2437.8
};
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.RA2 = {
    width: 1218.9,
    height: 1729.13
};
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.RA3 = { width: 864.57, height: 1218.9 };
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.RA4 = { width: 609.45, height: 864.57 };
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.SRA0 = {
    width: 2551.18,
    height: 3628.35
};
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.SRA1 = {
    width: 1814.17,
    height: 2551.18
};
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.SRA2 = {
    width: 1275.59,
    height: 1814.17
};
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.SRA3 = {
    width: 907.09,
    height: 1275.59
};
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.SRA4 = { width: 637.8, height: 907.09 };
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.EXECUTIVE = {
    width: 521.86,
    height: 756.0
};
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.FOLIO = { width: 612.0, height: 936.0 };
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.LEGAL = {
    width: 612.0,
    height: 1008.0
};
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.LETTER = {
    width: 612.0,
    height: 792.0
};
/**
 *
 *
 * @static
 * @type {PageSize}
 * @memberof PageSizes
 */
PageSizes.TABLOID = {
    width: 792.0,
    height: 1224.0
};
exports.PageSizes = PageSizes;

},{}],11:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pdfdocument_1 = require("./pdfdocument");
const pagesizes_1 = require("./pagesizes");
(function () {
    let w = window;
    w.PDFDocument = pdfdocument_1.PDFDocument;
    w.PageSizes = pagesizes_1.PageSizes;
    w.PageSize = pagesizes_1.PageSize;
    w.PageOrientation = pagesizes_1.PageOrientation;
})();

},{"./pagesizes":10,"./pdfdocument":12}],12:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const header_1 = require("./structure/header");
const trailer_1 = require("./structure/trailer");
const xref_1 = require("./structure/xref");
const ObjectTypes = require("./base/pdfobjecttypes");
const pagesizes_1 = require("./pagesizes");
const controlcharacters_1 = require("./controlcharacters");
const fontdescriptor_1 = require("./types/fontdescriptor");
const font_1 = require("./types/font");
const fontwidths_1 = require("./types/fontwidths");
const fontfile_1 = require("./types/fontfile");
const filespec_1 = require("./types/filespec");
const embeddedfile_1 = require("./types/embeddedfile");
const names_1 = require("./types/names");
const diverda = require("./fonts/diverda.json");
const times = require("./fonts/times-roman.json");
const content_1 = require("./types/content");
/**
 * This is what we want. A PDF Document :3
 *
 * @export
 * @class PDFDocument
 */
class PDFDocument {
    /**
     * Creates an instance of PDFDocument with a prefilled structure and one empty page.
     *
     * @param {PageSize} pagesize
     * @memberof PDFDocument
     */
    constructor(pagesize) {
        this.pagesize = pagesize;
        this.fontFiles = [];
        this.fonts = [];
        this.objects = [];
        this.pages = [];
        this.patches = []; // not yet defined
        this._activePage = 1;
        this.fontFiles.push(diverda);
        this.fontFiles.push(times);
        // ToDo: decide if we need a header object since its just 2 lines and a fixed version number
        // ! PDF/A-3 with file attachments becomes PDF/A-4f
        this.header = new header_1.Header(1.7); // ToDo Update to 2.0 as soon as PDF/A-4 hits
        this.trailer = new trailer_1.Trailer();
        // ! initialize first page a bit more elegant please
        this.catalog = new ObjectTypes.Catalog(this.nextObjectId, 0);
        this.objects.push(this.catalog);
        this.names = new names_1.Names(this.nextObjectId, 0, []);
        this.catalog.attachments.push(this.names);
        this.objects.push(this.names);
        this.pagesDictionary = new ObjectTypes.Pages(this.nextObjectId, 0);
        this.objects.push(this.pagesDictionary);
        let page = new ObjectTypes.Page(this.nextObjectId, 0, pagesize);
        page.Fonts = this.fonts;
        this.pages.push(page);
        this.objects.push(page);
        let meta = new ObjectTypes.MetaData(this.nextObjectId, 0);
        this.objects.push(meta);
        this.catalog.Pages = {
            Id: this.pagesDictionary.Id,
            Generation: this.pagesDictionary.Generation
        };
        this.catalog.MetaData = {
            Id: meta.Id,
            Generation: meta.Generation
        };
        this.pagesDictionary.Kids = [
            {
                Id: page.Id,
                Generation: page.Generation
            }
        ];
        page.Parent = {
            Id: this.pagesDictionary.Id,
            Generation: this.pagesDictionary.Generation
        };
    }
    /**
     * Getter to determine the next available object Id
     *
     *
     * @readonly
     * @type {number}
     * @memberof PDFDocument
     */
    get nextObjectId() {
        var taken = this.objects.find(object => {
            return object.Id === this.objects.length + 1;
        });
        if (!taken) {
            return this.objects.length + 1;
        }
        // ? haven't had this issue yet but it might be possible
        // ? let's find a way to handle it when we encounter this error
        throw 'Object ID already taken. If you encounter this Error, please create an Issue on github with an example PDF';
    }
    /**
     * returns a string with the current file content
     *
     * @returns {string}
     * @memberof PDFDocument
     */
    compile() {
        let file = '';
        let utf8Encode = new TextEncoder();
        this.xref = new xref_1.Xref();
        this.xref.Offsets = [];
        // default xref entry
        this.xref.Offsets.push({
            Position: 0,
            Generation: 65535,
            Free: true
        });
        // #region header
        file +=
            this.header.compile().join(controlcharacters_1.ControlCharacters.EOL) + controlcharacters_1.ControlCharacters.EOL;
        // #endregion
        // #region objects
        this.objects.forEach(object => {
            this.xref.Offsets.push({
                Position: utf8Encode.encode(file).length,
                Generation: object.Generation,
                Free: false
            });
            file += object.compile().join(controlcharacters_1.ControlCharacters.EOL);
            file += controlcharacters_1.ControlCharacters.EOL;
            file += controlcharacters_1.ControlCharacters.EOL; // and one extra line after each object to have a nice and readable document
        });
        // #endregion
        // #region xref
        // set xref offset right before we compile the xref table
        this.xref.Offset = utf8Encode.encode(file).length;
        file += 'xref' + controlcharacters_1.ControlCharacters.EOL;
        file += 0 + ' ' + this.xref.Offsets.length + controlcharacters_1.ControlCharacters.EOL;
        this.xref.Offsets.sort((obj1, obj2) => {
            if (obj1.Position > obj2.Position) {
                return 1;
            }
            if (obj1.Position < obj2.Position) {
                return -1;
            }
            return 0;
        }).forEach(offset => {
            file +=
                ('0000000000' + offset.Position).slice(-10) +
                    ' ' +
                    ('00000' + offset.Generation).slice(-5) +
                    ' ' +
                    (offset.Free ? 'f' : 'n') +
                    controlcharacters_1.ControlCharacters.EOL;
        });
        // #endregion
        // ToDo: add file patches
        // ToDo: generate actual trailer
        // #region trailer
        file += this.trailer
            .compile(this.xref.Offsets.length, this.xref.Offset)
            .join(controlcharacters_1.ControlCharacters.EOL);
        // #endregion
        // end of file!
        file += controlcharacters_1.ControlCharacters.EOL;
        file += '%%EOF';
        return file;
    }
    /**
     * returns the object type of the document
     *
     * @returns {string}
     * @memberof PDFDocument
     */
    toString() {
        return '[object PDFDocument]';
    }
    /**
     * Append a new and empty page to the PDF.
     *
     * @param {PageSize} pagesize
     * @param {PageOrientation} [pageOrientation=PageOrientation.Portrait]
     * @param {number} [needle]
     * @returns {PDFDocument}
     * @memberof PDFDocument
     */
    addPage(pagesize, pageOrientation = pagesizes_1.PageOrientation.Portrait, needle) {
        let page = new ObjectTypes.Page(this.nextObjectId, 0, pagesize, pageOrientation);
        page.Fonts = this.fonts;
        this.pagesDictionary.Kids.push({
            Id: page.Id,
            Generation: page.Generation
        });
        page.Parent = {
            Id: this.pagesDictionary.Id,
            Generation: this.pagesDictionary.Generation
        };
        this.pages.push(page);
        this.objects.push(page);
        return this;
    }
    /**
     * Adds an Attachment to the PDF
     * (does not upload or load from filesystem!)
     *
     * @param {string} fileName
     * @param {string} fileContent
     * @returns
     * @memberof PDFDocument
     */
    addAttachment(fileName, fileContent) {
        let embeddedfile = new embeddedfile_1.EmbeddedFile(this.nextObjectId, 0, fileName, fileContent);
        this.objects.push(embeddedfile);
        let filespec = new filespec_1.Filespec(this.nextObjectId, 0, fileName, embeddedfile);
        this.objects.push(filespec);
        this.names.NamedReferences.push(filespec);
        return this;
    }
    /**
     * embed a font into the pdf by the postscript name
     *
     * @param {string} fontName
     * @returns
     * @memberof PDFDocument
     */
    addFont(fontName) {
        let fontJSON = this.fontFiles.find((font) => {
            return font.BaseFont === fontName;
        });
        let fontFile = new fontfile_1.FontFile(this.nextObjectId, 0, fontJSON.Subtype, fontJSON.BaseFont, fontJSON.FirstChar, fontJSON.LastChar, fontJSON.FontDescriptor.FontFile2.Length, fontJSON.FontDescriptor.FontFile2.Length1, fontJSON.FontDescriptor.FontFile2.Stream);
        this.objects.push(fontFile);
        let fontWidths = new fontwidths_1.FontWidths(this.nextObjectId, 0, fontJSON.Widths);
        this.objects.push(fontWidths);
        let fontDescriptor = new fontdescriptor_1.FontDescriptor(this.nextObjectId, 0, fontJSON.FontDescriptor.FontName, fontJSON.FontDescriptor.FontFamily, fontJSON.FontDescriptor.FontStretch, fontJSON.FontDescriptor.FontWeight, fontJSON.FontDescriptor.Flags, fontJSON.FontDescriptor.FontBBox, fontJSON.FontDescriptor.ItalicAngle, fontJSON.FontDescriptor.Ascent, fontJSON.FontDescriptor.Descent, fontJSON.FontDescriptor.CapHeight, fontJSON.FontDescriptor.XHeight, fontJSON.FontDescriptor.StemV, fontJSON.FontDescriptor.AvgWidth, fontJSON.FontDescriptor.MaxWidth, fontFile);
        this.objects.push(fontDescriptor);
        let font = new font_1.Font(this.nextObjectId, 0, fontFile, fontDescriptor, fontWidths);
        this.fonts.push(font);
        this.objects.push(font);
        return this;
    }
    setDefaultFont(fontname, fontweight, fontsize) {
        return this;
    }
    setActivePage(index) {
        this._activePage = index;
    }
    get ActivePage() {
        return this.pagesDictionary.Kids[this._activePage - 1];
    }
    text(text) {
        const page = this.pages.find(page => {
            return page.Id === this.ActivePage.Id;
        });
        let content = new content_1.Content(this.nextObjectId, 0);
        content.Stream = text;
        page.Contents.push(content);
        this.objects.push(content);
        return this;
    }
}
exports.PDFDocument = PDFDocument;

},{"./base/pdfobjecttypes":6,"./controlcharacters":7,"./fonts/diverda.json":8,"./fonts/times-roman.json":9,"./pagesizes":10,"./structure/header":13,"./structure/trailer":14,"./structure/xref":16,"./types/content":18,"./types/embeddedfile":19,"./types/filespec":20,"./types/font":21,"./types/fontdescriptor":22,"./types/fontfile":23,"./types/fontwidths":24,"./types/names":26}],13:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 *
 *
 * @export
 * @class Header
 */
class Header {
    /**
     * header
     *
     * @param {number} version
     * @memberof Header
     */
    constructor(version) {
        this.version = version;
    }
    /**
     *
     *
     * @returns {string[]}
     * @memberof Header
     */
    compile() {
        return [`%PDF-${this.version.toFixed(1)}`, '%\xFF\xFF\xFF\xFF', ''];
    }
    /**
     *
     *
     * @returns
     * @memberof Header
     */
    toJson() {
        return {
            type: '...',
            header: `%PDF-${this.version.toFixed(1)}`
        };
    }
}
exports.Header = Header;

},{}],14:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 *
 *
 * @export
 * @class Trailer
 */
class Trailer {
    constructor() {
        /**
         *
         *
         * @type {string}
         * @memberof Trailer
         */
        this.ID = 'd41d8cd98f00b204e9800998ecf8427e'; // ToDo: how do these IDs even work?
    }
    /**
     *
     *
     * @param {number} size
     * @param {number} startXref
     * @returns {string[]}
     * @memberof Trailer
     */
    compile(size, startXref) {
        return [
            'trailer',
            '<<',
            '/ID [',
            `  <${this.ID}>`,
            `  <${this.ID}>`,
            ']',
            '/Root 1 0 R',
            '/Size ' + size,
            '>>',
            'startxref',
            startXref.toString()
        ];
    }
}
exports.Trailer = Trailer;

},{}],15:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 *
 *
 * @export
 * @class XMPMeta
 */
class XMPMeta {
    /**
     *
     *
     * @returns {string[]}
     * @memberof XMPMeta
     */
    compile() {
        return [
            `<x:xmpmeta xmlns:x='adobe:ns:meta/' x:xmptk='Insert XMP tool name here.'>`,
            `  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">`,
            `    <rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">`,
            `      <pdfaid:part>3</pdfaid:part>`,
            `      <pdfaid:conformance>U</pdfaid:conformance>`,
            `    </rdf:Description>`,
            `  </rdf:RDF>`,
            `</x:xmpmeta>`
        ];
    }
}
exports.XMPMeta = XMPMeta;

},{}],16:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 *
 *
 * @export
 * @class Offset
 */
class Offset {
}
exports.Offset = Offset;
/**
 *
 *
 * @export
 * @class Xref
 */
class Xref {
    constructor() {
        this.Offsets = [];
        this.Offset = 0;
    }
    compile() {
        return [];
    }
}
exports.Xref = Xref;

},{}],17:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pdfobject_1 = require("../base/pdfobject");
const pdfobjecttype_enum_1 = require("../base/pdfobjecttype.enum");
/**
 *
 *
 * @export
 * @class Catalog
 * @extends {PdfObject}
 */
class Catalog extends pdfobject_1.PdfObject {
    /**
     *Creates an instance of Catalog.
     * @param {number} Id
     * @param {number} Generation
     * @param {PdfObjectReference[]} [Kids]
     * @memberof Catalog
     */
    constructor(Id, Generation, Kids) {
        super();
        this.Id = Id;
        this.Generation = Generation;
        this.Kids = Kids;
        /**
         *
         *
         * @type {PdfObject[]}
         * @memberof Catalog
         */
        this.attachments = [];
        this.Type = pdfobjecttype_enum_1.PdfObjectType.Catalog;
        /**
         * 	if($this->ZoomMode=='fullpage')
              $this->_put('/OpenAction ['.$n.' 0 R /Fit]');
            elseif($this->ZoomMode=='fullwidth')
              $this->_put('/OpenAction ['.$n.' 0 R /FitH null]');
            elseif($this->ZoomMode=='real')
              $this->_put('/OpenAction ['.$n.' 0 R /XYZ null null 1]');
            elseif(!is_string($this->ZoomMode))
              $this->_put('/OpenAction ['.$n.' 0 R /XYZ null null '.sprintf('%.2F',$this->ZoomMode/100).']');
            if($this->LayoutMode=='single')
              $this->_put('/PageLayout /SinglePage');
            elseif($this->LayoutMode=='continuous')
              $this->_put('/PageLayout /OneColumn');
            elseif($this->LayoutMode=='two')
              $this->_put('/PageLayout /TwoColumnLeft');
         *
         */
    }
    /**
     *
     *
     * @returns {string[]}
     * @memberof Catalog
     */
    compileAttachments() {
        if (this.attachments.length) {
            return [
                `/Names << /EmbeddedFiles ${this.attachments[0].Id} ${this.attachments[0].Generation} R >>`,
                '/PageMode /UseAttachments'
            ];
        }
        return [];
    }
    /**
     *
     *
     * @returns {string}
     * @memberof Catalog
     */
    compilePageTreeReference() {
        return `/Pages ${this.Pages.Id} ${this.Pages.Generation} R`;
    }
    /**
     *
     *
     * @returns {string}
     * @memberof Catalog
     */
    compileMetaDataReference() {
        return `/Metadata ${this.MetaData.Id} ${this.MetaData.Generation} R`;
    }
    /**
     *
     *
     * @returns {string[]}
     * @memberof Catalog
     */
    compile() {
        return [
            ...this.startObject(),
            this.compileType(),
            this.compilePageTreeReference(),
            this.compileMetaDataReference(),
            ...this.compileAttachments(),
            ...this.endObject()
        ];
    }
}
exports.Catalog = Catalog;

},{"../base/pdfobject":4,"../base/pdfobjecttype.enum":5}],18:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pdfobject_1 = require("../base/pdfobject");
const pdfobjecttype_enum_1 = require("../base/pdfobjecttype.enum");
class Content extends pdfobject_1.PdfObject {
    constructor(Id, Generation) {
        super();
        this.Id = Id;
        this.Generation = Generation;
        this.Stream = [];
        this.Type = pdfobjecttype_enum_1.PdfObjectType.Sig;
    }
    /**
     *
     *
     * @returns {string[]}
     * @memberof PdfObject
     */
    startObject() {
        let utf8Encode = new TextEncoder();
        return [
            `${this.Id} ${this.Generation} obj`,
            `<< /Length ${utf8Encode.encode(this.Stream.join('\n') + '\n').length} >>`
        ];
    }
    /**
     *
     *
     * @returns
     * @memberof EmbeddedFile
     */
    endObject() {
        return ['stream', ...this.Stream, 'endstream', 'endobj'];
    }
    compile() {
        return [...this.startObject(), ...this.endObject()];
    }
}
exports.Content = Content;

},{"../base/pdfobject":4,"../base/pdfobjecttype.enum":5}],19:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pdfobject_1 = require("../base/pdfobject");
const pdfobjecttype_enum_1 = require("../base/pdfobjecttype.enum");
/**
 *
 *
 * @export
 * @class EmbeddedFile
 * @extends {PdfObject}
 */
class EmbeddedFile extends pdfobject_1.PdfObject {
    constructor(Id, Generation, _fileName, _fileContent) {
        super();
        this.Id = Id;
        this.Generation = Generation;
        this._fileName = _fileName;
        this._fileContent = _fileContent;
        this.Type = pdfobjecttype_enum_1.PdfObjectType.EmbeddedFile;
    }
    /**
     *
     *
     * @returns
     * @memberof EmbeddedFile
     */
    compileUnprocessed() {
        // ToDo: uhm... ya... you know
        return [
            '/Type /EmbeddedFile',
            `/Length ${this._fileContent.length}`,
            `/Params <</ModDate (D:${'20121110104707'})>>` // ToDo insert actual Date 
        ];
    }
    /**
     *
     *
     * @returns
     * @memberof EmbeddedFile
     */
    endObject() {
        return ['>>', 'stream', this._fileContent, 'endstream', 'endobj'];
    }
    /**
     *
     *
     * @returns {string[]}
     * @memberof EmbeddedFile
     */
    compile() {
        return [
            ...this.startObject(),
            ...this.compileUnprocessed(),
            ...this.endObject()
        ];
    }
}
exports.EmbeddedFile = EmbeddedFile;

},{"../base/pdfobject":4,"../base/pdfobjecttype.enum":5}],20:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pdfobject_1 = require("../base/pdfobject");
const pdfobjecttype_enum_1 = require("../base/pdfobjecttype.enum");
/**
 *
 *
 * @export
 * @class Filespec
 * @extends {PdfObject}
 */
class Filespec extends pdfobject_1.PdfObject {
    constructor(Id, Generation, _fileName, _embeddedFile) {
        super();
        this.Id = Id;
        this.Generation = Generation;
        this._fileName = _fileName;
        this._embeddedFile = _embeddedFile;
        this.Type = pdfobjecttype_enum_1.PdfObjectType.Filespec;
    }
    /**
     *
     *
     * @returns
     * @memberof Filespec
     */
    compileUnprocessed() {
        // ToDo: uhm... ya... you know
        // /Desc removed
        return [
            '/Type /Filespec',
            `/F (${this._fileName})`,
            `/UF (${this._fileName})`,
            `/EF <</F ${this._embeddedFile.Id} ${this._embeddedFile.Generation} R>>` // ToDo add embedded file reference
        ];
    }
    /**
     *
     *
     * @returns {string[]}
     * @memberof Filespec
     */
    compile() {
        return [
            ...this.startObject(),
            ...this.compileUnprocessed(),
            ...this.endObject()
        ];
    }
}
exports.Filespec = Filespec;

},{"../base/pdfobject":4,"../base/pdfobjecttype.enum":5}],21:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pdfobject_1 = require("../base/pdfobject");
const pdfobjecttype_enum_1 = require("../base/pdfobjecttype.enum");
/**
 *
 *
 * @export
 * @class Font
 * @extends {PdfObject}
 */
class Font extends pdfobject_1.PdfObject {
    constructor(Id, Generation, _fontFile, _fontDescriptor, _fontWidths) {
        super();
        this.Id = Id;
        this.Generation = Generation;
        this._fontFile = _fontFile;
        this._fontDescriptor = _fontDescriptor;
        this._fontWidths = _fontWidths;
        this.Type = pdfobjecttype_enum_1.PdfObjectType.Font;
    }
    /**
     *
     *
     * @returns
     * @memberof Font
     */
    compileUnprocessed() {
        return [
            `/Type /Font`,
            `/Subtype /TrueType`,
            `/BaseFont /${this._fontDescriptor.FontName}`,
            `/FirstChar ${this._fontFile.FirstChar}`,
            `/LastChar ${this._fontFile.LastChar}`,
            `/Widths ${this._fontWidths.Id} ${this._fontWidths.Generation} R`
        ];
    }
    /**
     *
     *
     * @returns {string[]}
     * @memberof Font
     */
    compile() {
        return [
            ...this.startObject(),
            ...this.compileUnprocessed(),
            ...this.endObject()
        ];
    }
}
exports.Font = Font;

},{"../base/pdfobject":4,"../base/pdfobjecttype.enum":5}],22:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pdfobject_1 = require("../base/pdfobject");
const pdfobjecttype_enum_1 = require("../base/pdfobjecttype.enum");
/**
 *
 *
 * @export
 * @class FontDescriptor
 * @extends {PdfObject}
 */
class FontDescriptor extends pdfobject_1.PdfObject {
    constructor(Id, Generation, FontName, FontFamily, FontStretch, FontWeight, Flags, FontBBox, ItalicAngle, Ascent, Descent, CapHeight, XHeight, StemV, AvgWidth, MaxWidth, _fontFile) {
        super();
        this.Id = Id;
        this.Generation = Generation;
        this.FontName = FontName;
        this.FontFamily = FontFamily;
        this.FontStretch = FontStretch;
        this.FontWeight = FontWeight;
        this.Flags = Flags;
        this.FontBBox = FontBBox;
        this.ItalicAngle = ItalicAngle;
        this.Ascent = Ascent;
        this.Descent = Descent;
        this.CapHeight = CapHeight;
        this.XHeight = XHeight;
        this.StemV = StemV;
        this.AvgWidth = AvgWidth;
        this.MaxWidth = MaxWidth;
        this._fontFile = _fontFile;
        this.Type = pdfobjecttype_enum_1.PdfObjectType.FontDescriptor;
    }
    /**
     *
     *
     * @returns
     * @memberof FontDescriptor
     */
    compileUnprocessed() {
        return [
            `/FontName /${this.FontName}`,
            `/FontFamily ${this.FontFamily}`,
            `/FontStretch ${this.FontStretch}`,
            `/FontWeight ${this.FontWeight}`,
            `/Flags ${this.Flags}`,
            `/FontBBox [${this.FontBBox.join(' ')}]`,
            `/ItalicAngle ${this.ItalicAngle}`,
            `/Ascent ${this.Ascent}`,
            `/Descent ${this.Descent}`,
            `/CapHeight ${this.CapHeight}`,
            `/XHeight ${this.XHeight}`,
            `/StemV ${this.StemV}`,
            `/AvgWidth ${this.AvgWidth}`,
            `/MaxWidth ${this.MaxWidth}`,
            `/FontFile2 ${this._fontFile.Id} ${this._fontFile.Generation} R`
        ];
    }
    /**
     *
     *
     * @returns {string[]}
     * @memberof FontDescriptor
     */
    compile() {
        return [
            ...this.startObject(),
            ...this.compileUnprocessed(),
            ...this.endObject()
        ];
    }
}
exports.FontDescriptor = FontDescriptor;

},{"../base/pdfobject":4,"../base/pdfobjecttype.enum":5}],23:[function(require,module,exports){
(function (Buffer){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pdfobject_1 = require("../base/pdfobject");
const pdfobjecttype_enum_1 = require("../base/pdfobjecttype.enum");
/**
 *
 *
 * @export
 * @class FontFile
 * @extends {PdfObject}
 */
class FontFile extends pdfobject_1.PdfObject {
    constructor(Id, Generation, Subtype, BaseFont, FirstChar, LastChar, Length, Length1, Stream) {
        super();
        this.Id = Id;
        this.Generation = Generation;
        this.Subtype = Subtype;
        this.BaseFont = BaseFont;
        this.FirstChar = FirstChar;
        this.LastChar = LastChar;
        this.Length = Length;
        this.Length1 = Length1;
        this.Stream = Stream;
        this.Type = pdfobjecttype_enum_1.PdfObjectType.FontFile;
    }
    /**
     *
     *
     * @returns
     * @memberof FontFile
     */
    endObject() {
        return [
            '>>',
            'stream',
            Buffer.from(this.Stream, 'base64').toString(),
            'endstream',
            'endobj'
        ];
    }
    /**
     *
     *
     * @returns
     * @memberof FontFile
     */
    compileUnprocessed() {
        return [
            `/Length ${this.Length + 4}`,
            `/Length1 ${this.Length1 + 4}`,
            `/Filter /FlateDecode`
        ];
    }
    /**
     *
     *
     * @returns {string[]}
     * @memberof FontFile
     */
    compile() {
        return [
            ...this.startObject(),
            ...this.compileUnprocessed(),
            ...this.endObject()
        ];
    }
}
exports.FontFile = FontFile;

}).call(this,require("buffer").Buffer)
},{"../base/pdfobject":4,"../base/pdfobjecttype.enum":5,"buffer":2}],24:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pdfobject_1 = require("../base/pdfobject");
const pdfobjecttype_enum_1 = require("../base/pdfobjecttype.enum");
/**
 * An object containing an array of widths for each character in a font
 *
 * @export
 * @class FontWidths
 * @extends {PdfObject}
 */
class FontWidths extends pdfobject_1.PdfObject {
    constructor(Id, Generation, Widths) {
        super();
        this.Id = Id;
        this.Generation = Generation;
        this.Widths = Widths;
        this.Type = pdfobjecttype_enum_1.PdfObjectType.FontWidths;
    }
    /**
     *
     *
     * @returns {string[]}
     * @memberof FontWidths
     */
    startObject() {
        return [`${this.Id} ${this.Generation} obj`];
    }
    /**
     *
     *
     * @returns {string[]}
     * @memberof FontWidths
     */
    endObject() {
        return ['endobj'];
    }
    /**
     *
     *
     * @returns {string[]}
     * @memberof FontWidths
     */
    compileWidths() {
        return ['[', this.Widths.join(' '), ']'];
    }
    /**
     *
     *
     * @returns {string[]}
     * @memberof FontWidths
     */
    compile() {
        return [
            ...this.startObject(),
            ...this.compileWidths(),
            ...this.endObject()
        ];
    }
}
exports.FontWidths = FontWidths;

},{"../base/pdfobject":4,"../base/pdfobjecttype.enum":5}],25:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pdfobject_1 = require("../base/pdfobject");
const pdfobjecttype_enum_1 = require("../base/pdfobjecttype.enum");
const xmpmeta_1 = require("../structure/xmpmeta");
const controlcharacters_1 = require("../controlcharacters");
/**
 *
 *
 * @export
 * @class MetaData
 * @extends {PdfObject}
 */
class MetaData extends pdfobject_1.PdfObject {
    /**
     *Creates an instance of MetaData.
     * @param {number} Id
     * @param {number} Generation
     * @param {PdfObjectReference} [Parent]
     * @memberof MetaData
     */
    constructor(Id, Generation, Parent) {
        super();
        this.Id = Id;
        this.Generation = Generation;
        this.Parent = Parent;
        this.Type = pdfobjecttype_enum_1.PdfObjectType.Metadata;
    }
    /**
     *
     *
     * @returns {string[]}
     * @memberof MetaData
     */
    compile() {
        let xmpmeta = new xmpmeta_1.XMPMeta();
        let metaxml = xmpmeta.compile().join(controlcharacters_1.ControlCharacters.EOL);
        let utf8Encode = new TextEncoder();
        return [
            `${this.Id} ${this.Generation} obj`,
            `<<`,
            `/Length ${utf8Encode.encode(metaxml).length}`,
            `/Type /${this.Type}`,
            `/Subtype /XML`,
            `>>`,
            `stream`,
            metaxml,
            `endstream`,
            `endobj`
        ];
    }
}
exports.MetaData = MetaData;

},{"../base/pdfobject":4,"../base/pdfobjecttype.enum":5,"../controlcharacters":7,"../structure/xmpmeta":15}],26:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pdfobject_1 = require("../base/pdfobject");
const pdfobjecttype_enum_1 = require("../base/pdfobjecttype.enum");
/**
 * An object containing an array of name object references
 *
 * @export
 * @class Names
 * @extends {PdfObject}
 */
class Names extends pdfobject_1.PdfObject {
    constructor(Id, Generation, NamedReferences) {
        super();
        this.Id = Id;
        this.Generation = Generation;
        this.NamedReferences = NamedReferences;
        this.Type = pdfobjecttype_enum_1.PdfObjectType.Filespec;
    }
    /**
     *
     *
     * @returns
     * @memberof Names
     */
    compileUnprocessed() {
        // ToDo: uhm... ya... you know
        return [
            `/Names [ ${this.NamedReferences.map((ref, index) => {
                return `(${('000' + index).slice(-3)}) ${ref.Id} ${ref.Generation} R`;
            }).join(' ')}]`
        ];
    }
    /**
     *
     *
     * @returns {string[]}
     * @memberof Names
     */
    compile() {
        return [
            ...this.startObject(),
            ...this.compileUnprocessed(),
            ...this.endObject()
        ];
    }
}
exports.Names = Names;

},{"../base/pdfobject":4,"../base/pdfobjecttype.enum":5}],27:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pdfobject_1 = require("../base/pdfobject");
const pdfobjecttype_enum_1 = require("../base/pdfobjecttype.enum");
const pagesizes_1 = require("../pagesizes");
class Page extends pdfobject_1.PdfObject {
    constructor(Id, Generation, _pagesize, _orientation = pagesizes_1.PageOrientation.Portrait, Parent) {
        super();
        this.Id = Id;
        this.Generation = Generation;
        this._pagesize = _pagesize;
        this._orientation = _orientation;
        this.Parent = Parent;
        /**
         * The MediaBox is the visible Page rectangle
         *
         * @memberof Page
         */
        this.MediaBox = [0, 0, 0, 0];
        this.Contents = [];
        this.Fonts = [];
        this.Type = pdfobjecttype_enum_1.PdfObjectType.Page;
        if (_orientation === pagesizes_1.PageOrientation.Portrait) {
            this.MediaBox = [0, 0, _pagesize.width, _pagesize.height];
        }
        else {
            this.MediaBox = [0, 0, _pagesize.height, _pagesize.width];
        }
        /**		$this->_put('/Rotate '.$this->PageInfo[$n]['rotation']);
         */
    }
    /**
     *
     *
     * @returns {string}
     * @memberof Page
     */
    compileMediaBox() {
        return `/MediaBox [${this.MediaBox[0]} ${this.MediaBox[1]} ${this.MediaBox[2]} ${this.MediaBox[3]}]`;
    }
    /**
     *
     *
     * @returns {string}
     * @memberof Page
     */
    compileResources() {
        return [
            '/Resources <<',
            '  /Font <<',
            ...this.Fonts.map((font, index) => {
                return `    /F${index} ${font.Id} ${font.Generation} R`;
            }),
            '  >>',
            '>>'
        ];
    }
    compileContentReferences() {
        return [
            '/Contents [',
            ...this.Contents.map((content, index) => {
                return ` ${content.Id} ${content.Generation} R`;
            }),
            ,
            ']'
        ];
    }
    /**
     *
     *
     * @returns {string}
     * @memberof Page
     */
    compileParent() {
        return this.Parent
            ? `/Parent ${this.Parent.Id} ${this.Parent.Generation} R`
            : '';
    }
    /**
     *
     *
     * @returns {string[]}
     * @memberof Page
     */
    compile() {
        return [
            ...this.startObject(),
            this.compileType(),
            this.compileParent(),
            this.compileMediaBox(),
            ...this.compileContentReferences(),
            ...this.compileResources(),
            ...this.endObject()
        ];
    }
}
exports.Page = Page;

},{"../base/pdfobject":4,"../base/pdfobjecttype.enum":5,"../pagesizes":10}],28:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pdfobject_1 = require("../base/pdfobject");
const pdfobjecttype_enum_1 = require("../base/pdfobjecttype.enum");
/**
 * Pages is a Dictionary in PDF which contains references to all Page Objects
 *
 * @export
 * @class Pages
 * @extends {PdfObject}
 */
class Pages extends pdfobject_1.PdfObject {
    constructor(Id, Generation, Kids) {
        super();
        this.Id = Id;
        this.Generation = Generation;
        this.Kids = Kids;
        this.Type = pdfobjecttype_enum_1.PdfObjectType.Pages;
    }
    /**
     *
     *
     * @returns {string[]}
     * @memberof Pages
     */
    compileSubPages() {
        if (!this.Kids || this.Kids.length === 0) {
            return [];
        }
        let kids = [];
        this.Kids.forEach(kid => {
            kids.push(`  ${kid.Id} ${kid.Generation} R`);
        });
        return ['/Kids [', ...kids, ']'];
    }
    /**
     *
     *
     * @returns {string}
     * @memberof Pages
     */
    compileCount() {
        if (!this.Kids || this.Kids.length === 0) {
            return '';
        }
        return `/Count ${this.Kids.length}`;
    }
    /**
     *
     *
     * @returns {string[]}
     * @memberof Pages
     */
    compile() {
        return [
            ...this.startObject(),
            this.compileType(),
            ...this.compileSubPages(),
            this.compileCount(),
            ...this.endObject()
        ];
    }
}
exports.Pages = Pages;

},{"../base/pdfobject":4,"../base/pdfobjecttype.enum":5}]},{},[11]);
