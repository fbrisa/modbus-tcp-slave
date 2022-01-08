const FUNCTION_CODES = {
  READ_COILS: 1,
  READ_DISCRETE_INPUTS: 2,
  READ_HOLDING_REGISTERS: 3,
  READ_INPUT_REGISTERS: 4,
  WRITE_SINGLE_COIL: 5,
  WRITE_SINGLE_REGISTER: 6,
  WRITE_MULTIPLE_COILS: 15,
  WRITE_HOLDING_REGISTERS: 16,
};

/**
 *
 *
 * @param {number} transId
 * @param {number} protoId
 * @param {number} unitId
 * @param {number} funcCode
 * @param {number} address
 * @param {*} data
 * @param {number} length
 * @param {boolean} isException
 * @returns
 */
function makeDataPacket (
  transId,
  protoId,
  unitId,
  funcCode,
  address,
  data,
  length,
  isException
) {
  if (typeof data == "boolean" && data) {
    data = 1;
  }
  if (typeof data == "boolean" && !data) {
    data = 0;
  }

  let dataBytes = 0;

  let bufferLength = 12;

  if (funcCode == FUNCTION_CODES.READ_COILS) {
    dataBytes = Math.ceil(data.length / 8);
    //             (base + unit id) + func code + byte count + n*bytes
    bufferLength = 7 + 1 + 1 + dataBytes;
  }
  if (funcCode == FUNCTION_CODES.READ_DISCRETE_INPUTS) {
    dataBytes = Math.ceil(data.length / 8);
    //             (base + unit id) + func code + byte count + n*bytes
    bufferLength = 7 + 1 + 1 + dataBytes;
  }
  if (funcCode == FUNCTION_CODES.READ_HOLDING_REGISTERS) {
    dataBytes = data.length * 2;
    bufferLength = 9 + dataBytes;
  }
  if (funcCode == FUNCTION_CODES.READ_INPUT_REGISTERS) {
    // Response
    // Function code 1
    // Byte count 1
    // Input Registers 2*N
    dataBytes = data.length * 2;
    bufferLength = 7 + 1 + 1 + dataBytes;
  }

  if (funcCode == FUNCTION_CODES.WRITE_MULTIPLE_COILS) {
    dataBytes = length;
    // Response
    // Function code 1
    // Starting Address 2
    // Quantity of Outputs  2
    bufferLength = 7 + 1 + 2 + 2;
  }

  if (funcCode == FUNCTION_CODES.WRITE_HOLDING_REGISTERS) {
    // Response
    // Function code 1
    // Starting Address 2
    // Quantity of Registers  2
    bufferLength = 7 + 1 + 2 + 2;
  }

  if (isException) {
    bufferLength = 7 + 1 + 1;
    funcCode += 0x80;
    address = data;
  }

  let byteCount = bufferLength - 6;

  let buf = Buffer.alloc(bufferLength);

  buf.writeUInt16BE(transId, 0);
  buf.writeUInt16BE(protoId, 2);
  buf.writeUInt16BE(byteCount, 4);

  buf.writeUInt8(unitId, 6);
  buf.writeUInt8(funcCode, 7);

  if (isException) {
    buf.writeUInt8(address, 8);
  } else {
    buf.writeUInt16BE(address, 8);
  }

  if (funcCode == FUNCTION_CODES.WRITE_SINGLE_REGISTER) {
    buf.writeUInt16BE(data, 10);
  }
  if (funcCode == FUNCTION_CODES.WRITE_SINGLE_COIL) {
    buf.writeUInt16BE(data, 10);
  }
  if (funcCode == FUNCTION_CODES.WRITE_MULTIPLE_COILS) {
    buf.writeInt16BE(length, 10);
  }
  if (funcCode == FUNCTION_CODES.READ_COILS) {
    buf.writeInt8(dataBytes, 8);
    if (typeof data == "object") {
      const offset = 9;
      let mult = 1;
      let val = 0;
      let byteCounter = 0;
      for (let pos = 0; pos < data.length; pos++) {
        val += (data[pos] ? 1 : 0) * mult;
        mult *= 2;
        if (mult > 128) {
          buf.writeUInt8(val, offset + byteCounter);
          byteCounter++;
          mult = 1;
          val = 0;
        }
      }

      if (mult > 1) {
        // maybe remaining
        buf.writeUInt8(val, offset + byteCounter);
      }
    }
  }
  if (funcCode == FUNCTION_CODES.READ_DISCRETE_INPUTS) {
    buf.writeInt8(dataBytes, 8);
    if (typeof data == "object") {
      const offset = 9;
      let mult = 1;
      let val = 0;
      let byteCounter = 0;
      for (let pos = 0; pos < data.length; pos++) {
        val += (data[pos] ? 1 : 0) * mult;
        mult *= 2;
        if (mult > 128) {
          buf.writeUInt8(val, offset + byteCounter);
          byteCounter++;
          mult = 1;
          val = 0;
        }
      }

      if (mult > 1) {
        // maybe remaining
        buf.writeUInt8(val, offset + byteCounter);
      }
    }
  }
  if (funcCode == FUNCTION_CODES.READ_HOLDING_REGISTERS) {
    buf.writeInt8(length * 2, 8);
    if (typeof data == "object") {
      const offset = 9;
      for (let pos = 0; pos < data.length; pos++) {
        buf.writeUInt16BE(data[pos], offset + pos * 2);
      }
    }
  }
  if (funcCode == FUNCTION_CODES.READ_INPUT_REGISTERS) {
    buf.writeInt8(length * 2, 8);
    if (typeof data == "object") {
      const offset = 9;
      for (let pos = 0; pos < data.length; pos++) {
        buf.writeUInt16BE(data[pos], offset + pos * 2);
      }
    }
  }
  if (funcCode == FUNCTION_CODES.WRITE_HOLDING_REGISTERS) {
    buf.writeInt16BE(length, 10);
  }

  return buf;
}

/**
 *
 *
 * @param {*} buf
 * @returns
 */
function parseResponse (buf) {
  let res = {};
  res.tid = buf.readUInt16BE(0); //Transaction Id - Bytes 0 and 1
  res.pid = buf.readUInt16BE(2); //Protocal Id    - Bytes 2 and 3
  res.length = buf.readUInt16BE(4); //Length         - Bytes 4 and 5
  res.unitId = buf.readUInt8(6); //Unit Id        - Byte 6
  res.funcCode = buf.readUInt8(7); //Function Code  - Byte 7
  res.address = buf.readUInt16BE(8);
  res.exceptionCode = null;

  // check error
  if (res.funcCode > 127) {
    // 0x80
    res.exceptionCode = buf.readUInt8(8);
  } else {
    res.byteCount = Math.abs(buf.readUInt8(8)); //Byte Count     - Byte 8
    if (buf.length > 9) {
      if (res.funcCode == FUNCTION_CODES.WRITE_MULTIPLE_COILS) {
        const howManyCoils = buf.readUInt16BE(10);
        // const howManyBytes = buf.readUInt8(12);
        //res.value = buf.readUInt16BE(10);
        res.value = [];

        for (let pos = 13; pos < buf.length; pos++) {
          const byte = buf.readUInt8(pos, pos + 1);
          // for (let i = 7; i >= 0; i--) {
          for (let i = 0; i < 8; i++) {
            if (res.value.length < howManyCoils) {
              const bit = byte & (1 << i) ? 1 : 0;
              res.value.push(bit);
            }
          }
        }
      } else if (res.funcCode == FUNCTION_CODES.READ_COILS) {
        res.value = buf.readUInt16BE(10);
      } else if (res.funcCode == FUNCTION_CODES.READ_DISCRETE_INPUTS) {
        res.value = buf.readUInt16BE(10);
      } else if (res.funcCode == FUNCTION_CODES.WRITE_HOLDING_REGISTERS) {
        // 16 (0x10) Write Multiple registers
        // res.value = buf.readUInt16BE(10);

        const registerQuantity = buf.readUInt16BE(10);
        const byteQuantity = buf.readUInt8(12);

        if (
          registerQuantity >= 1 &&
          registerQuantity <= 0x7b &&
          byteQuantity == registerQuantity * 2
        ) {
          if (buf.length == registerQuantity * 2 + 13) {
            // ok right quantity

            res.value = [];

            for (let pos = 13; pos < buf.length; pos += 2) {
              const registerValue = buf.readUInt16BE(pos);
              res.value.push(registerValue);
            }
          } else {
            res.errorCode = 0x90;
            res.exceptionCode = 0x2;
          }
        } else {
          res.errorCode = 0x90;
          res.exceptionCode = 0x3;
        }
      } else if (res.funcCode == FUNCTION_CODES.READ_HOLDING_REGISTERS) {
        res.value = buf.readUInt16BE(10);
      } else if (res.funcCode == FUNCTION_CODES.READ_INPUT_REGISTERS) {
        res.value = buf.readUInt16BE(10);
      } else if (res.funcCode == FUNCTION_CODES.WRITE_SINGLE_COIL) {
        res.value = buf.readUInt16BE(10) ? 1 : 0;
      } else if (res.funcCode == FUNCTION_CODES.WRITE_SINGLE_REGISTER) {
        res.value = buf.readUInt16BE(10);
      } else {
        res.value = [];
        for (let pos = 9; pos < buf.length; pos += 2) {
          res.value.push(buf.readUInt16BE(pos, pos + 1)); //Data - Bytes 9+
        }
      }
    }
  }

  return res;
}

module.exports = {
  makeDataPacket,
  parseResponse,
  FUNCTION_CODES,
};
