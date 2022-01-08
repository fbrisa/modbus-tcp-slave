const { FUNCTION_NAMES, ERROR_CODES } = require("../libs/modbusConstants");

const setTests = (modbusTcpSlaveServer) => {
  modbusTcpSlaveServer.on(FUNCTION_NAMES.READ_COILS, (request) => {
    const value = [
      true,
      false,
      true,
      false,
      false,
      false,
      false,
      false,

      true,
      true,
      true,
    ];

    modbusTcpSlaveServer.respondToClient(request, value);
  });
  modbusTcpSlaveServer.on(FUNCTION_NAMES.READ_DISCRETE_INPUTS, (request) => {
    const value = [
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true
    ];

    modbusTcpSlaveServer.respondToClient(request, value);
  });
  modbusTcpSlaveServer.on(FUNCTION_NAMES.READ_HOLDING_REGISTERS, (request) => {
    const value = [];

    if (request.address + request.value > 10000) {
      modbusTcpSlaveServer.respondErrorToClient(
        request,
        ERROR_CODES.ILLEGAL_DATA_ADDRESS
      );
    } else {
      for (let t = 0; t < request.value; t++) {
        value.push(100 + t);
      }

      modbusTcpSlaveServer.respondToClient(request, value);
    }
  });

  modbusTcpSlaveServer.on(FUNCTION_NAMES.READ_INPUT_REGISTERS, (request) => {
    const value = [];
    for (let t = 0; t < request.value; t++) {
      value.push(100 + t);
    }

    modbusTcpSlaveServer.respondToClient(request, value);
  });

  modbusTcpSlaveServer.on(FUNCTION_NAMES.WRITE_SINGLE_COIL, (request) => {
    modbusTcpSlaveServer.respondToClient(request);
  });
  modbusTcpSlaveServer.on(FUNCTION_NAMES.WRITE_SINGLE_REGISTER, (request) => {
    if (request.value === 255) {
      // only for test
      modbusTcpSlaveServer.respondErrorToClient(
        request,
        ERROR_CODES.ILLEGAL_DATA_VALUE
      );
    } else {
      modbusTcpSlaveServer.respondToClient(request);
    }
  });
  modbusTcpSlaveServer.on(FUNCTION_NAMES.WRITE_MULTIPLE_COILS, (request) => {
    modbusTcpSlaveServer.respondToClient(request);
  });
  modbusTcpSlaveServer.on(FUNCTION_NAMES.WRITE_HOLDING_REGISTERS, (request) => {
    modbusTcpSlaveServer.respondToClient(request);
  });

  modbusTcpSlaveServer.on("ERROR_FUNCION_CODE_NOT_IMPLEMENTED", (request) => {
    console.log("ERRORE: ERROR_FUNCION_CODE_NOT_IMPLEMENTED");
    console.log(request);
  });
};

module.exports = { setTests };
