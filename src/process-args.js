module.exports = processArgs

/**
  Convert args array or object into a normalized value object.  Suppoorts extra
  options and(or) callback parameters.

  Per the Promise API feature promisifyAll (see also sb-promisify), the callback
  if provided must always be last.

  @arg {Array|object} args - User-provided parameter object or array of parameters
  @arg {Array} defParams - Names for the parameters.
  @arg {string} methodName - for error reporting
  @arg {function} [optionsFormatter(extraParam) = null] - optional callback used if an
    extra optional (non-callback) parameter is provided.

  @return {object} {
    params: normalized args only, parameters by name, no extra options or callback.
    options: non-null or non-undefined return value from invocation of
      optionsFormatter(optionsParam).

    callback: {function} - chained to optional callback provided in args.  Resolves
      or rejects returnPromise.

    returnPromise: {Promise} resolves or rejects based on callback
  }

  @throws TypeError - when parameter count is not exact (considers options and callback)
*/
function processArgs (args, defParams, methodName = 'method', optionsFormatter = null) {
  let params = {}
  let options = {}

  const expectedArgCount = defParams.length

  // Extra callback argument?  Last per promisifyAll standard.
  let callbackArg
  if (
    args.length - expectedArgCount >= 1 &&
    args.length - expectedArgCount <= 2 &&
    typeof args[args.length - 1] === 'function'
    // && optionsFormatter(args[args.length - 1]) == null // <- non-option arg (likely always true)
  ) {
    // Create a new callback that will resolve both returnPromise
    // and the original callback

    callbackArg = args[args.length - 1]
    args = args.slice(0, args.length - 1)
  }

  let callback
  const returnPromise = new Promise((resolve, reject) => {
    callback = function(err, result) {
      if(err) {
        reject(err)
      } else {
        resolve(result)
      }

      if(callbackArg) {
        // callbackArg(...) is last becaues it could throw an error
        if(err) {
          callbackArg(err)
        } else {
          callbackArg(null, result)
        }
      }
    }
  })

  // Look for the options parameter (after potential callback was removed)
  if(typeof optionsFormatter === 'function' && args.length > 0 &&
    ((typeof args[0] === 'object' && args.length === 2) || args.length === expectedArgCount + 1)
  ) {
    //An extra options argument
    options = optionsFormatter(args[args.length - 1])
    if(options != null) {
      // It is valid, remove it to avoid parameter count an error below
      args = args.slice(0, args.length - 1)
    }
  }

  // Parameteters (args) can be ordered or an object
  if (args.length === 1 && typeof args[0] === 'object') {
    params = args[0]
  } else {
    // give ordered paramaters names

    if (args.length > expectedArgCount) {
      // console.log('typeof defParams[expectedArgCount]', args)
      throw new TypeError(`${methodName} is expecting ${
        expectedArgCount} parameters but ${
        args.length} where provided`)
    }

    // convert ordered parameters into a value object by parameter name
    let pos = 0
    for (const defParam of defParams) {
      params[defParam] = args[pos]
      pos++
    }
  }
  return {params, options, callback, returnPromise}
}
