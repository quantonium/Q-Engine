"use strict";

/**DO NOT USE console.log() OR THERE WILL BE POTENTIAL LOCKUP!
 * Instead use this function
 */

////DEBUG CONSOLE VARS
let _consoleBuffer = []
let _consoleBufferLock = false
let _removedMessages = 0
let _maxConsoleBuffer = 1000

function bufferedConsoleLog(s) {
	if (_consoleBufferLock)
		setTimeout(bufferedConsoleLog, 10, s)
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

export default bufferedConsoleLog;