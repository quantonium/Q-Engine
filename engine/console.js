"use strict";

/**DO NOT USE console.log() OR THERE WILL BE POTENTIAL LOCKUP!
 * Instead use this function
 */

function _bufferedConsoleLog(s) {
	if (_consoleBufferLock)
		setTimeout(_bufferedConsoleLog, 10, s)
	else
		if (_consoleBuffer.length < _maxConsoleBuffer)
			switch (typeof s) {
				case "object": case "function": case "symbol": case "bigint":
					_consoleBuffer.push(s.valueOf())
					break
				default:
					_consoleBuffer.push(s)
			}
		else _removedMessages++

}