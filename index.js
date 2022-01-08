const net = require("net");
const { makeDataPacket, parseResponse } = require("./libs/utilityFunctions");
const {
  ERROR_CODES,
  FUNCTION_CODES,
  FUNCTION_NAMES,
  REV_FUNCTION_CODES
} = require("./libs/modbusConstants");
const PLC = require("./libs/plc");

const EventEmitter = require("events");
class MyEmitter extends EventEmitter { }

class ModbusTcpSlave {
  /**
   *Creates an instance of ModbusTcpSlave.
   * @param {*} parameters { ipAddress="127.0.0.1",port=502,unitId=1 }
   * @memberof ModbusTcpSlave
   */
  constructor ({ ipAddress = "127.0.0.1", port = 502, unitId = 1 }) {
    this.ipAddress = ipAddress;
    this.port = port;
    this.unitId = unitId;

    this.lastTid = 1;
    this.server = this._createServer();
    this.online = false;
    this.rejectConnectionFunction = null;
    this.resolveConnectionFunction = null;
    this.connectTimeoutTimer = null;

    this._myEmitter = new MyEmitter();

    this.transactions = [];

    this.handledFunctionCodes = {};

    this.activeConnections = [];

    this.resolveQuestionAndAnswerFunction = null;
    this.rejectQuestionAndAnswerFunction = null;
  }

  // GESTIONE EMISSIONI
  on (cosa, callback) {
    this.handledFunctionCodes[cosa] = callback;

    this._myEmitter.on(cosa, callback);
  }
  removeListener (cosa, callback) {
    delete this.handledFunctionCodes[cosa];

    this._myEmitter.removeListener(cosa, callback);
  }
  removeAllListeners (cosa) {
    this.handledFunctionCodes[cosa] = {};

    this._myEmitter.removeAllListeners(cosa);
  }

  _getTransaction (tid) {
    const currentTransaction = this.transactions[tid];
    return currentTransaction;
  }

  _deleteTransaction (tid) {
    if (this.transactions[tid]) {
      delete this.transactions[tid];
    }
  }

  _makeNewTransaction (tid) {
    const currentTransaction = {
      tid,
      rx: null,
    };

    this.transactions[tid] = currentTransaction;
    return currentTransaction;
  }

  _setOnlineStatus (value) {
    this.online = value;
  }

  _rejectAllTransactions (err) {
    const tidList = Object.keys(this.transactions);
    for (const tid of tidList) {
      this.transactions[tid].promiseReject(err);
      this._deleteTransaction(tid);
    }
  }

  testQuestionAndAnswer (question) {
    return new Promise((resolve, reject) => {
      this.resolveQuestionAndAnswerFunction = resolve;
      this.rejectQuestionAndAnswerFunction = reject;
      this.dataReceiver(question);
    });
  }

  dataReceiver (res, socket) {
    const buf = Buffer.from(res, "hex");

    const modbusRequest = parseResponse(buf);

    modbusRequest.socket = socket;

    if (this.handledFunctionCodes[REV_FUNCTION_CODES[modbusRequest.funcCode]]) {
      switch (modbusRequest.funcCode) {
      case FUNCTION_CODES.READ_COILS:
        this._myEmitter.emit("READ_COILS", modbusRequest);
        break;
      case FUNCTION_CODES.READ_DISCRETE_INPUTS:
        this._myEmitter.emit("READ_DISCRETE_INPUTS", modbusRequest);
        break;
      case FUNCTION_CODES.READ_HOLDING_REGISTERS:
        this._myEmitter.emit("READ_HOLDING_REGISTERS", modbusRequest);
        break;
      case FUNCTION_CODES.READ_INPUT_REGISTERS:
        this._myEmitter.emit("READ_INPUT_REGISTERS", modbusRequest);
        break;
      case FUNCTION_CODES.WRITE_SINGLE_COIL:
        this._myEmitter.emit("WRITE_SINGLE_COIL", modbusRequest);
        break;
      case FUNCTION_CODES.WRITE_SINGLE_REGISTER:
        this._myEmitter.emit("WRITE_SINGLE_REGISTER", modbusRequest);
        break;
      case FUNCTION_CODES.WRITE_MULTIPLE_COILS:
        this._myEmitter.emit("WRITE_MULTIPLE_COILS", modbusRequest);
        break;
      case FUNCTION_CODES.WRITE_HOLDING_REGISTERS:
        this._myEmitter.emit("WRITE_HOLDING_REGISTERS", modbusRequest);
        break;
      default:
        break;
      }
    } else {
      this._myEmitter.emit("ERROR_FUNCION_CODE_NOT_IMPLEMENTED", modbusRequest);
      this.respondToClient(modbusRequest);
    }
  }

  _createServer () {
    const server = net.createServer((connectionListener) => {
      this.activeConnections.push(connectionListener);
      connectionListener.setEncoding("hex");

      connectionListener.on("error", (e) => {
        console.log(e);
        // this.connectTimeoutTimer && clearTimeout(this.connectTimeoutTimer);
        // this._setOnlineStatus(false);

        if (this.rejectConnectionFunction) {
          this.rejectConnectionFunction(e);
        }
        this.rejectConnectionFunction = null;

        // this._rejectAllTransactions(e);
      });
      connectionListener.on("close", () => {
        this.activeConnections = this.activeConnections.filter(
          (c) => c !== connectionListener
        );
      });

      connectionListener.on("data", (data) => {
        this.dataReceiver(data, connectionListener);
      });
    });

    server.on("error", (e) => {
      console.log(e);
      if (this.rejectConnectionFunction) {
        this.rejectConnectionFunction(e);
      }
      this.rejectConnectionFunction = null;
    });

    return server;
  }

  listen () {
    return new Promise((resolve, reject) => {
      this.connectTimeoutTimer = reject;
      this.rejectConnectionFunction = reject;

      this.server.listen({ port: this.port, host: this.ipAddress });

      resolve(this.server);
    });
  }

  end () {
    return new Promise((resolve, reject) => {
      this.rejectConnectionFunction = reject;
      this.resolveConnectionFunction = resolve;

      this.activeConnections.map((c) => c.end());

      this.server.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve(this.server);
        }
      });
    });
  }

  /**
   *
   *
   * @param {*} data
   * @param {number} tid
   * @memberof ModbusTcpSlave
   */
  sendTCP (data, tid, socket, resolve) {
    let buffer = Buffer.from(data, "hex");
    socket.write(buffer, resolve);
  }

  sendAndMakePromise (buff, tid, socket) {
    return new Promise((resolve) => {
      if (socket) {
        // standard case, under tcp connection
        this.sendTCP(buff, tid, socket, () => {
          resolve(true);
        });
      } else {
        if (this.resolveQuestionAndAnswerFunction) {
          this.resolveQuestionAndAnswerFunction(buff);
          this.resolveQuestionAndAnswerFunction = null;
          this.rejectConnectionFunction = null;
        }

        resolve(buff);
      }
    });
  }

  /**
   * @returns Promise<any>
   * @memberof ModbusTcpSlave
   */
  async prepareAndMake ({
    funcCode,
    address,
    length = 1,
    value = null,
    tid = null,
    socket = null,
    isException = false,
  }) {
    length = length || 1;
    address = address || 0;

    let buff = makeDataPacket(
      tid,
      0,
      this.unitId,
      funcCode,
      address,
      value,
      length,
      isException
    );

    return await this.sendAndMakePromise(buff, tid, socket);
  }

  /**
   *
   *
   * @param {number} address
   * @param {Array<number>} value
   * @returns
   * @memberof ModbusTcpSlave
   */
  async readCoils (address, value, tid, socket) {
    let funcCode = FUNCTION_CODES.READ_COILS;
    return await this.prepareAndMake({ funcCode, address, value, tid, socket });
  }

  /**
   *
   *
   * @param {number} address
   * @param {Array<number>} value
   * @returns
   * @memberof ModbusTcpSlave
   */
  async readDiscreteInputs (address, value, tid, socket) {
    let funcCode = FUNCTION_CODES.READ_DISCRETE_INPUTS;
    return await this.prepareAndMake({ funcCode, address, value, tid, socket });
  }

  /**
   *
   *
   * @param {number} address
   * @param {Array<number>} value
   * @returns
   * @memberof ModbusTcpSlave
   */
  async writeMultipleCoils (address, value, tid, socket) {
    let funcCode = FUNCTION_CODES.WRITE_MULTIPLE_COILS;
    let length = 1;
    if (typeof value !== "object") {
      value = [value];
    }
    length = value.length || 1;

    return await this.prepareAndMake({
      funcCode,
      address,
      length,
      value,
      tid,
      socket,
    });
  }

  /**
   *
   *
   * @param {number} address
   * @param {number} value
   * @returns
   * @memberof ModbusTcpSlave
   */
  async writeSingleCoil (address, value, tid, socket) {
    let funcCode = FUNCTION_CODES.WRITE_SINGLE_COIL;
    return await this.prepareAndMake({
      funcCode,
      address,
      value: value ? 65280 : 0,
      tid,
      socket,
    });
  }

  /**
   *
   *
   * @param {number} address
   * @param {Array<number>} value
   * @returns
   * @memberof ModbusTcpSlave
   */
  async readHoldingRegisters (address, value, tid, socket) {
    let funcCode = FUNCTION_CODES.READ_HOLDING_REGISTERS;
    return await this.prepareAndMake({
      funcCode,
      address,
      length: value.length,
      value,
      tid,
      socket,
    });
  }

  /**
   *
   *
   * @param {number} address
   * @param {number} value
   * @returns
   * @memberof ModbusTcpSlave
   */
  async readInputRegisters (address, value, tid, socket) {
    let funcCode = FUNCTION_CODES.READ_INPUT_REGISTERS;
    return await this.prepareAndMake({ funcCode, address, value, tid, socket });
  }

  /**
   *
   *
   * @param {number} address
   * @param {Array<number>} value
   * @returns
   * @memberof ModbusTcpSlave
   */
  async writeHoldingRegisters (address, value, tid, socket) {
    let funcCode = FUNCTION_CODES.WRITE_HOLDING_REGISTERS;
    let length = 1;
    if (typeof value !== "object") {
      value = [value];
    }
    length = value.length || 1;

    return await this.prepareAndMake({
      funcCode,
      address,
      length,
      value,
      tid,
      socket,
    });
  }

  /**
   *
   *
   * @param {number} address
   * @param {number} value
   * @returns
   * @memberof ModbusTcpSlave
   */
  async writeSingleRegisters (address, value, tid, socket) {
    let funcCode = FUNCTION_CODES.WRITE_SINGLE_REGISTER;
    return await this.prepareAndMake({ funcCode, address, value, tid, socket });
  }

  /**
   *
   *
   * @param {number} address
   * @param {number} exceptionCode
   * @returns
   * @memberof ModbusTcpSlave
   */
  async exceptionResponse (funcCode, exceptionCode, tid, socket) {
    return await this.prepareAndMake({
      funcCode,
      address: null,
      value: exceptionCode,
      tid,
      socket,
      isException: true,
    });
  }

  /**
   *
   *
   * @returns
   * @memberof ModbusTcpSlave
   */
  async respondErrorToClient (request, errorCode) {
    this.exceptionResponse(
      request.funcCode,
      errorCode,
      request.tid,
      request.socket
    );
  }

  /**
   *
   *
   * @returns
   * @memberof ModbusTcpSlave
   */
  async respondToClient (request, value) {
    value = value || request.value;

    switch (request.funcCode) {
    case FUNCTION_CODES.READ_COILS:
      this.readCoils(request.address, value, request.tid, request.socket);
      break;
    case FUNCTION_CODES.READ_DISCRETE_INPUTS:
      this.readDiscreteInputs(
        request.address,
        value,
        request.tid,
        request.socket
      );
      break;
    case FUNCTION_CODES.READ_HOLDING_REGISTERS:
      this.readHoldingRegisters(
        request.address,
        value,
        request.tid,
        request.socket
      );
      break;
    case FUNCTION_CODES.READ_INPUT_REGISTERS:
      this.readInputRegisters(
        request.address,
        value,
        request.tid,
        request.socket
      );
      break;
    case FUNCTION_CODES.WRITE_SINGLE_COIL:
      this.writeSingleCoil(
        request.address,
        value,
        request.tid,
        request.socket
      );
      break;
    case FUNCTION_CODES.WRITE_SINGLE_REGISTER:
      this.writeSingleRegisters(
        request.address,
        value,
        request.tid,
        request.socket
      );
      break;
    case FUNCTION_CODES.WRITE_MULTIPLE_COILS:
      this.writeMultipleCoils(
        request.address,
        value,
        request.tid,
        request.socket
      );
      break;
    case FUNCTION_CODES.WRITE_HOLDING_REGISTERS:
      this.writeHoldingRegisters(
        request.address,
        value,
        request.tid,
        request.socket
      );
      break;
    default:
      this.exceptionResponse(
        request.funcCode,
        ERROR_CODES.ILLEGAL_FUNCTION,
        request.tid,
        request.socket
      );
      break;
    }
  }
}

module.exports = { FUNCTION_NAMES, ModbusTcpSlave, PLC };
