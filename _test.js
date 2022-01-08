const { FUNCTION_NAMES, ModbusTcpSlave, PLC } = require("./index");
const fs = require("fs");

let defaultValues = {
  ipAddress: "127.0.0.1",
  port: 502,
  unitId: 1,
};

if (fs.existsSync(__dirname + "/testData.json")) {
  defaultValues = JSON.parse(fs.readFileSync(__dirname + "/testData.json"));
}

/** @type {ModbusTcpSlave} */
let modbusTcpSlaveServer = new ModbusTcpSlave(defaultValues);

const main = async () => {
  const plc = new PLC({
    coils: new Array(10000).fill(false), // discrete outputs
    inputRegisters: new Array(10000).fill(false), // discrete inputs
    discreteInputs: new Array(10000).fill(0), // analog inputs
    holdingRegisters: new Array(10000).fill(0), // analog outputs
  });

  await modbusTcpSlaveServer.listen();

  // eslint-disable-next-line no-unused-vars
  plc.on("beforeRead", (request) => {
    console.log("beforeRead");
  });
  // eslint-disable-next-line no-unused-vars
  plc.on("afterWrite", (request) => {
    console.log("afterWrite");
    console.log(plc.memory);
  });

  modbusTcpSlaveServer.on("ERROR_FUNCION_CODE_NOT_IMPLEMENTED", (request) => {
    console.log(
      "ERRORE: ERROR_FUNCION_CODE_NOT_IMPLEMENTED: " + request.funcCode
    );
  });

  modbusTcpSlaveServer.on(FUNCTION_NAMES.WRITE_SINGLE_COIL, (request) => {
    plc.memory.coils[request.address] = request.value == 1;

    modbusTcpSlaveServer.respondToClient(request);
    plc.afterWrite(request);
  });
  modbusTcpSlaveServer.on(FUNCTION_NAMES.WRITE_SINGLE_REGISTER, (request) => {
    plc.memory.holdingRegisters[request.address] = request.value;

    modbusTcpSlaveServer.respondToClient(request);
    plc.afterWrite(request);
  });
  modbusTcpSlaveServer.on(FUNCTION_NAMES.WRITE_MULTIPLE_COILS, (request) => {
    for (let pos = 0; pos < request.value.length; pos++) {
      plc.memory.coils[request.address + pos] = request.value[pos] == 1;
    }

    modbusTcpSlaveServer.respondToClient(request);
    plc.afterWrite(request);
  });
  modbusTcpSlaveServer.on(FUNCTION_NAMES.WRITE_HOLDING_REGISTERS, (request) => {
    for (let pos = 0; pos < request.value.length; pos++) {
      plc.memory.holdingRegisters[request.address + pos] = request.value[pos];
    }

    modbusTcpSlaveServer.respondToClient(request);
    plc.afterWrite(request);
  });

  modbusTcpSlaveServer.on(FUNCTION_NAMES.READ_COILS, (request) => {
    plc.beforeRead(request);

    const value = [];
    for (let pos = 0; pos < request.value; pos++) {
      value.push(plc.memory.coils[request.address + pos]);
    }

    modbusTcpSlaveServer.respondToClient(request, value);
  });
  modbusTcpSlaveServer.on(FUNCTION_NAMES.READ_DISCRETE_INPUTS, (request) => {
    plc.beforeRead(request);

    const value = [];
    for (let pos = 0; pos < request.value; pos++) {
      value.push(plc.memory.discreteInputs[request.address + pos]);
    }

    modbusTcpSlaveServer.respondToClient(request, value);
  });
  modbusTcpSlaveServer.on(FUNCTION_NAMES.READ_HOLDING_REGISTERS, (request) => {
    plc.beforeRead(request);

    const value = [];
    for (let pos = 0; pos < request.value; pos++) {
      value.push(plc.memory.holdingRegisters[request.address + pos]);
    }

    modbusTcpSlaveServer.respondToClient(request, value);
  });
  modbusTcpSlaveServer.on(FUNCTION_NAMES.READ_INPUT_REGISTERS, (request) => {
    plc.beforeRead(request);

    const value = [];
    for (let pos = 0; pos < request.value; pos++) {
      value.push(plc.memory.inputRegisters[request.address + pos]);
    }

    modbusTcpSlaveServer.respondToClient(request, value);
  });
};
main();
