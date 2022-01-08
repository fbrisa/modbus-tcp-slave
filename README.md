<p align="center">
  <a href="" rel="noopener">
 <img width=200px height=200px src="https://i.imgur.com/6wj0hh6.jpg" alt="Project logo"></a>
</p>

<h3 align="center">modbus-tcp-slave</h3>

<div align="center">

[![Status](https://img.shields.io/badge/status-active-success.svg)]()
[![GitHub Issues](https://img.shields.io/github/issues/kylelobo/The-Documentation-Compendium.svg)](https://github.com/kylelobo/The-Documentation-Compendium/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/kylelobo/The-Documentation-Compendium.svg)](https://github.com/kylelobo/The-Documentation-Compendium/pulls)
[![License](https://img.shields.io/badge/license-GPL-blue.svg)](/LICENSE)

</div>

---

<p align="center"> Nodejs implementation of Modubus TCP slave protocol<br>
  Answers are made through callbacks that constructs the answers or apply the effects of the writes.
    <br> 
</p>

## 📝 Table of Contents

- [About](#about)
- [Getting Started](#getting_started)
- [Usage](#usage)
- [Eslint](#eslint)
- [Built Using](#built_using)
- [Authors](#authors)

## 🧐 About <a name = "about"></a>

Nodejs implementation of Modubus TCP slave protocol

## 🏁 Getting Started <a name = "getting_started"></a>

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See [deployment](#deployment) for notes on how to deploy the project on a live system.

### Prerequisites

- NodeJs

### Installing

Using npm:
* `npm install modbus-tcp-slave`

Using yarn:
* `yarn add modbus-tcp-slave`

## 🔧 Running the tests <a name = "tests"></a>

Test are jest based, so
* `path_to_jest --config jest.config.js`
i.e.
* `./node_modules/.bin/jest --config jest.config.js`

## 🔧 Eslinter <a name = "eslint"></a>

You may eslint everithing using
* `node_modules/.bin/eslint  --ext .js --fix -c .eslintrc.js  *.js libs/ testLibs/`

## 🎈 Usage <a name="usage"></a>
Using a fake PLC implementation:

```
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


```

## ⛏️ Built Using <a name = "built_using"></a>

- [NodeJs](https://nodejs.org/en/) - Server Environment

## ✍️ Authors <a name = "authors"></a>

- (https://github.com/fbrisa) - Francesco

