/* eslint-disable jest/no-conditional-expect */
const { ModbusTcpSlave } = require("./index");
// const { FUNCTION_NAMES } = require("./libs/modbusConstants");
const { setTests } = require("./testLibs/setTests");

const fs = require("fs");
const net = require("net");

// eslint-disable-next-line no-undef
jest.setTimeout(30000);

let defaultValues = {
  ipAddress: "127.0.0.1",
  port: 502,
  unitId: 1,
};

if (fs.existsSync(__dirname + "/testData.json")) {
  defaultValues = JSON.parse(fs.readFileSync(__dirname + "/testData.json"));
}

/** @type {ModbusTcpSlave} */
let modbusTcpSlaveServer;

/** @type {net.Socket} */
let fakeClient = null;

let fakeClientLastAnswer = null;

function sleep (ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function asPromise (context, callbackFunction, ...args) {
  return new Promise((resolve, reject) => {
    args.push((err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
    if (context) {
      callbackFunction.call(context, ...args);
    } else {
      callbackFunction(...args);
    }
  });
}

const createConnection = async () => {
  modbusTcpSlaveServer = new ModbusTcpSlave(defaultValues);

  await modbusTcpSlaveServer.listen();

  fakeClient = new net.Socket();
  fakeClient.on("error", (e) => {
    console.log("ERROR");
    console.log(e);
  });
  fakeClient.on("data", (e) => {
    fakeClientLastAnswer = e;
  });

  setTests(modbusTcpSlaveServer);

  await asPromise(fakeClient, fakeClient.connect, {
    port: defaultValues.port,
    host: defaultValues.ipAddress,
  });
};

beforeAll(async () => {
  await createConnection();
});
beforeEach(async () => {
  fakeClientLastAnswer = null;
  if (!fakeClient) {
    await createConnection();
  }
});

test("listen", async () => {
  let resConnect;

  try {
    // myAnswer = await modbusTcpSlaveServer.listen();

    // fakeClient.connect({port: defaultValues.port, host: defaultValues.ipAddress}, function () {
    //   console.log("CONNECTED");
    // });

    resConnect = await asPromise(fakeClient, fakeClient.connect, {
      port: defaultValues.port,
      host: defaultValues.ipAddress,
    });
    // console.log(resConnect);
  } catch (e) {
    console.log(e);
  }
  expect(resConnect).not.toBeNull();
});

test("read coils", async () => {
  try {
    let readCoilsCoilsQuestion = Buffer.from([
      0,
      3,
      0,
      0,
      0,
      6,
      1,
      1,
      0,
      0,
      0,
      11,
    ]);
    fakeClient.write(readCoilsCoilsQuestion);

    await sleep(400);
  } catch (e) {
    console.log(e);
  }
  if (fakeClientLastAnswer) {
    expect(fakeClientLastAnswer.length).toBe(11);
    expect(fakeClientLastAnswer.readUInt8(7)).toBe(1);
    expect(fakeClientLastAnswer.readUInt8(9)).toBe(5);
    expect(fakeClientLastAnswer.readUInt8(10)).toBe(7);
    // } else {
    //   expect(fakeClientLastAnswer).not.toBeNull();
  }
});

test("read discrete inputs", async () => {
  try {
    let readDiscreteInputsQuestion = Buffer.from([
      0,
      3,
      0,
      0,
      0,
      6,
      1,
      2,
      0,
      0,
      0,
      9,
    ]);
    fakeClient.write(readDiscreteInputsQuestion);

    await sleep(400);
  } catch (e) {
    console.log(e);
  }
  if (fakeClientLastAnswer) {
    expect(fakeClientLastAnswer.length).toBe(11);
    expect(fakeClientLastAnswer.readUInt8(7)).toBe(2); // function code
    expect(fakeClientLastAnswer.readUInt8(8)).toBe(2); // byte count
    expect(fakeClientLastAnswer.readUInt8(9)).toBe(255);
    expect(fakeClientLastAnswer.readUInt8(10)).toBe(1);
    // } else {
    //   expect(fakeClientLastAnswer).not.toBeNull();
  }
});

test("read holding registers", async () => {
  try {
    let readCoilsCoilsQuestion = Buffer.from([
      0,
      1,
      0,
      0,
      0,
      6,
      1,
      3,
      0,
      0,
      0,
      3,
    ]);
    fakeClient.write(readCoilsCoilsQuestion);

    await sleep(400);
  } catch (e) {
    console.log(e);
  }
  if (fakeClientLastAnswer) {
    expect(fakeClientLastAnswer.length).toBe(7 + 1 + 1 + 3 * 2);
    expect(fakeClientLastAnswer.readUInt8(7)).toBe(3);
    expect(fakeClientLastAnswer.readUInt8(8)).toBe(3 * 2);
    expect(fakeClientLastAnswer.readUInt16BE(9)).toBe(100);
    expect(fakeClientLastAnswer.readUInt16BE(11)).toBe(101);
    expect(fakeClientLastAnswer.readUInt16BE(13)).toBe(102);
    // } else {
    //   expect(fakeClientLastAnswer).not.toBeNull();
  }
});

test("write single coil", async () => {
  try {
    let writeSingleCoinQuestion = Buffer.from([
      0,
      2,
      0,
      0,
      0,
      6,
      1,
      5,
      0,
      0,
      255,
      0,
    ]);
    fakeClient.write(writeSingleCoinQuestion);

    await sleep(400);
  } catch (e) {
    console.log(e);
  }
  if (fakeClientLastAnswer) {
    expect(fakeClientLastAnswer.length).toBe(12);
    expect(fakeClientLastAnswer.readUInt8(7)).toBe(5);
    expect(fakeClientLastAnswer.readUInt16BE(8)).toBe(0);
    expect(fakeClientLastAnswer.readUInt16BE(10)).toBe(0xff00);
    // } else {
    //   expect(fakeClientLastAnswer).not.toBeNull();
  }
});

test("write multiple coils", async () => {
  try {
    let writeMultipleCoilsQuestion = Buffer.from([
      0,
      1,
      0,
      0,
      0,
      9,
      1,
      15,
      0,
      0,
      0,
      11,
      2,
      5,
      7,
    ]);
    fakeClient.write(writeMultipleCoilsQuestion);
    // myAnswer = await modbusTcpSlaveServer.writeMultipleCoils(1, coilsToWrite);

    await sleep(400);
    // console.log(fakeClientLastAnswer);
  } catch (e) {
    console.log(e);
  }
  if (fakeClientLastAnswer) {
    expect(fakeClientLastAnswer.length).toBe(12);
    expect(fakeClientLastAnswer.readUInt8(7)).toBe(15);
    expect(fakeClientLastAnswer.readUInt8(11)).toBe(11);
    // } else {
    //   expect(fakeClientLastAnswer).not.toBeNull();
  }
});

test("write multiple registers", async () => {
  try {
    let writeMultipleRegistersQuestion = Buffer.from([
      0,
      4,
      0,
      0,
      0,
      13,
      1,
      16,
      0,
      0,
      0,
      3,
      6,
      0,
      12,
      0,
      13,
      0,
      14,
    ]);
    fakeClient.write(writeMultipleRegistersQuestion);

    await sleep(400);
  } catch (e) {
    console.log(e);
  }
  if (fakeClientLastAnswer) {
    expect(fakeClientLastAnswer.length).toBe(12);
    expect(fakeClientLastAnswer.readUInt8(7)).toBe(16);
    expect(fakeClientLastAnswer.readUInt16BE(8)).toBe(0);
    expect(fakeClientLastAnswer.readUInt16BE(10)).toBe(3);
    // } else {
    //   expect(fakeClientLastAnswer).not.toBeNull();
  }
});

test("write single register", async () => {
  try {
    let writeSingleRegisterQuestion = Buffer.from([
      0,
      1,
      0,
      0,
      0,
      6,
      1,
      6,
      0,
      0,
      0,
      22,
    ]);
    fakeClient.write(writeSingleRegisterQuestion);

    await sleep(400);
  } catch (e) {
    console.log(e);
  }
  if (fakeClientLastAnswer) {
    expect(fakeClientLastAnswer.length).toBe(12);
    expect(fakeClientLastAnswer.readUInt8(7)).toBe(6);
    expect(fakeClientLastAnswer.readUInt16BE(8)).toBe(0);
    expect(fakeClientLastAnswer.readUInt16BE(10)).toBe(22);
    // } else {
    //   expect(fakeClientLastAnswer).not.toBeNull();
  }
});

test("end", async () => {
  let myAnswer;
  try {
    if (this.fakeClient) {
      this.fakeClient.close();
      await sleep(200);
    }
    myAnswer = await modbusTcpSlaveServer.end();
    modbusTcpSlaveServer = null;
  } catch (e) {
    console.log(e);
  }
  expect(myAnswer).not.toBeNull();
});

afterAll(async () => {
  if (modbusTcpSlaveServer) {
    await modbusTcpSlaveServer.end();
  }
});
