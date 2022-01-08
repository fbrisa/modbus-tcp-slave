const { ModbusTcpSlave } = require("./index");
const { ERROR_CODES } = require("./libs/modbusConstants");
const { setTests } = require("./testLibs/setTests");

/** @type {ModbusTcpSlave} */
let modbusTcpSlaveServer;

let defaultValues = {
  ipAddress: "127.0.0.1",
  port: 502,
  unitId: 1,
};

const createConnection = async () => {
  modbusTcpSlaveServer = new ModbusTcpSlave(defaultValues);

  setTests(modbusTcpSlaveServer);
};

beforeAll(async () => {
  await createConnection();
});

test("read coils", async () => {
  let fakeClientLastAnswer = await modbusTcpSlaveServer.testQuestionAndAnswer(
    Buffer.from([
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
      11
    ])
  );

  expect(fakeClientLastAnswer.length).toBe(11);
  expect(fakeClientLastAnswer.readUInt8(7)).toBe(1);
  expect(fakeClientLastAnswer.readUInt8(9)).toBe(5);
  expect(fakeClientLastAnswer.readUInt8(10)).toBe(7);
});

test("read discrete inputs", async () => {
  let fakeClientLastAnswer = await modbusTcpSlaveServer.testQuestionAndAnswer(
    Buffer.from([
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
      9
    ])
  );

  expect(fakeClientLastAnswer.length).toBe(11);
  expect(fakeClientLastAnswer.readUInt8(7)).toBe(2); // function code
  expect(fakeClientLastAnswer.readUInt8(8)).toBe(2); // byte count
  expect(fakeClientLastAnswer.readUInt8(9)).toBe(255);
  expect(fakeClientLastAnswer.readUInt8(10)).toBe(1);
});

test("read holding registers", async () => {
  let fakeClientLastAnswer = await modbusTcpSlaveServer.testQuestionAndAnswer(
    Buffer.from([
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
      3
    ])
  );
  expect(fakeClientLastAnswer.length).toBe(7 + 1 + 1 + 3 * 2);
  expect(fakeClientLastAnswer.readUInt8(7)).toBe(3);
  expect(fakeClientLastAnswer.readUInt8(8)).toBe(3 * 2);
  expect(fakeClientLastAnswer.readUInt16BE(9)).toBe(100);
  expect(fakeClientLastAnswer.readUInt16BE(11)).toBe(101);
  expect(fakeClientLastAnswer.readUInt16BE(13)).toBe(102);
});

test("write single coil", async () => {
  let fakeClientLastAnswer = await modbusTcpSlaveServer.testQuestionAndAnswer(
    Buffer.from([
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
      0
    ])
  );
  expect(fakeClientLastAnswer.length).toBe(12);
  expect(fakeClientLastAnswer.readUInt8(7)).toBe(5);
  expect(fakeClientLastAnswer.readUInt16BE(8)).toBe(0);
  expect(fakeClientLastAnswer.readUInt16BE(10)).toBe(0xff00);
});

test("write multiple coils", async () => {
  let fakeClientLastAnswer = await modbusTcpSlaveServer.testQuestionAndAnswer(
    Buffer.from([
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
      7
    ])
  );
  expect(fakeClientLastAnswer.length).toBe(12);
  expect(fakeClientLastAnswer.readUInt8(7)).toBe(15);
  expect(fakeClientLastAnswer.readUInt8(11)).toBe(11);
});

test("write multiple registers", async () => {
  let fakeClientLastAnswer = await modbusTcpSlaveServer.testQuestionAndAnswer(
    Buffer.from([
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
      14
    ])
  );
  expect(fakeClientLastAnswer.length).toBe(12);
  expect(fakeClientLastAnswer.readUInt8(7)).toBe(16);
  expect(fakeClientLastAnswer.readUInt16BE(8)).toBe(0);
  expect(fakeClientLastAnswer.readUInt16BE(10)).toBe(3);
});
test("write single register", async () => {
  let fakeClientLastAnswer = await modbusTcpSlaveServer.testQuestionAndAnswer(
    Buffer.from([
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
      22
    ])
  );
  expect(fakeClientLastAnswer.length).toBe(12);
  expect(fakeClientLastAnswer.readUInt8(7)).toBe(6);
  expect(fakeClientLastAnswer.readUInt16BE(8)).toBe(0);
  expect(fakeClientLastAnswer.readUInt16BE(10)).toBe(22);
});

test("invalid function code", async () => {
  let fakeClientLastAnswer = await modbusTcpSlaveServer.testQuestionAndAnswer(
    Buffer.from([
      0,
      4,
      0,
      0,
      0,
      13,
      1,
      33,
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
      14
    ])
  );
  expect(fakeClientLastAnswer.length).toBe(9);
  expect(fakeClientLastAnswer.readUInt8(7)).toBe(33 + 0x80);
  expect(fakeClientLastAnswer.readUInt8(8)).toBe(1);
});

test("illegal data address", async () => {
  let fakeClientLastAnswer = await modbusTcpSlaveServer.testQuestionAndAnswer(
    Buffer.from([
      0,
      1,
      0,
      0,
      0,
      6,
      1,
      3,
      0xff,
      0,
      0,
      3
    ])
  );
  expect(fakeClientLastAnswer.length).toBe(9);
  expect(fakeClientLastAnswer.readUInt8(7)).toBe(3 + 0x80);
  expect(fakeClientLastAnswer.readUInt8(8)).toBe(
    ERROR_CODES.ILLEGAL_DATA_ADDRESS
  );
});
test("illegal data value", async () => {
  let fakeClientLastAnswer = await modbusTcpSlaveServer.testQuestionAndAnswer(
    Buffer.from([
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
      255
    ])
  );
  expect(fakeClientLastAnswer.length).toBe(9);
  expect(fakeClientLastAnswer.readUInt8(7)).toBe(6 + 0x80);
  expect(fakeClientLastAnswer.readUInt8(8)).toBe(
    ERROR_CODES.ILLEGAL_DATA_VALUE
  );
});
