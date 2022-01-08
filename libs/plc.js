// const {
//   ERROR_CODES,
//   FUNCTION_CODES,
//   FUNCTION_NAMES,
// } = require("./modbusConstants");

const EventEmitter = require("events");
class MyEmitter extends EventEmitter { }

class PLC {
  constructor (memory) {
    memory = memory || {
      holdingRegisters: [],
      inputRegisters: [],
      discreteInputs: [],
      coils: [],
    };
    this.memory = memory;

    this._myEmitter = new MyEmitter();
  }

  // Emitter handler
  on (cosa, callback) {
    this._myEmitter.on(cosa, callback);
  }
  removeListener (cosa, callback) {
    this._myEmitter.removeListener(cosa, callback);
  }
  removeAllListeners (cosa) {
    this._myEmitter.removeAllListeners(cosa);
  }

  afterWrite (request) {
    this._myEmitter.emit("afterWrite", request);
  }
  beforeRead (request) {
    this._myEmitter.emit("beforeRead", request);
  }
}

module.exports = PLC;
