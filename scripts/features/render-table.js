console.time('runtime-skimmer-table');

const Web3 = require('web3');
const env = require('dotenv').config();
const path = require('path');

const pairCounts = require('../../data/factories/pair-counts.js');
const tracked = require('../../data/tokens/tracked-prices.js');
const erc20abi = require('../../constants/abi/erc-20-abi.js');

let web3;
let data;
let table = [];
let trackedCoins;

let maxRange;
let id = 0;
let minPoolValue = 0;

const setRPC = async (chain) => {
  try {
    let rpc;

    if (chain === 'eth') {
      rpc = env.parsed.ETHEREUM_RPC;
    } else if (chain === 'bsc') {
      rpc = env.parsed.BSC_RPC;
    } else if (chain === 'matic') {
      rpc = env.parsed.MATIC_RPC;
    } else if (chain === 'ftm') {
      rpc = env.parsed.FANTOM_PRC;
    } else if (chain === 'xdai') {
      rpc = env.parsed.XDAI_RPC;
    } else if (chain === 'heco') {
      rpc = env.parsed.HECO_RPC;
    } else if (chain === 'arbi') {
      rpc = env.parsed.ARBITRUM_RPC;
    }

    web3 = new Web3(rpc);
    return;
  } catch (e) {
    console.log(`error on setRPC: ${e}`);
  }
};

const check = async (num) => {
  let check0 = await isIncludedInTracking(data[num].token0.id);
  let check1 = await isIncludedInTracking(data[num].token1.id);

  let check0valid = check0.valid;
  let check1valid = check1.valid;

  let obj = {
    pool: '',
    balance0: 0,
    balance1: 0,
    symbol0: '',
    symbol1: '',
    trackedVal0: 0,
    trackedVal1: 0,
    poolVal: 0,
    poolDiff: 0,
  };

  try {
    obj.pool = data[num].id;

    let dec0 = check0valid
      ? check0.data.decimals
      : await getDecimals(data[num].token0.id);
    let bal0 = await getBalance(data[num].id, data[num].token0.id);
    obj.balance0 = await splitBN(bal0, dec0);
    obj.symbol0 = check0valid
      ? check0.data.name
      : await getName(data[num].token0.id);

    let dec1 = check1valid
      ? check1.data.decimals
      : await getDecimals(data[num].token1.id);
    let bal1 = await getBalance(data[num].id, data[num].token1.id);
    obj.balance1 = await splitBN(bal1, dec1);
    obj.symbol1 = check1valid
      ? check1.data.name
      : await getName(data[num].token1.id);

    if (check0valid) {
      let tracked0 = check0.data.price;
      obj.trackedVal0 = Number(
        (Number(tracked0) * Number(obj.balance0)).toFixed(2)
      );
    }

    if (check1valid) {
      let tracked1 = check1.data.price;
      obj.trackedVal1 = Number(
        (Number(tracked1) * Number(obj.balance1)).toFixed(2)
      );
    }

    if (check0valid && check1valid) {
      obj.poolVal = obj.trackedVal0 + obj.trackedVal1;
    } else if (check0valid && !check1valid) {
      obj.poolVal = obj.trackedVal0 * 2;
    } else if (!check0valid && check1valid) {
      obj.poolVal = obj.trackedVal1 * 2;
    }

    obj.poolDiff =
      obj.trackedVal0 > obj.trackedVal1
        ? obj.trackedVal0 - obj.trackedVal1
        : obj.trackedVal1 - obj.trackedVal0;

    if (obj.poolVal >= minPoolValue) {
      render(obj);
    }
  } catch (e) {
    render(obj);
    console.log(`error on check: ${JSON.stringify(data[num])}, ${e}`);
  }
};

const render = async (obj) => {
  try {
    let newObj = {
      pool: obj.pool,
      token0name: await normalizeStringLength(obj.symbol0, 24),
      token1name: await normalizeStringLength(obj.symbol1, 24),
      token0bal: await normalizeNumberLength(obj.balance0, 12, 4),
      token1bal: await normalizeNumberLength(obj.balance1, 12, 4),
      token0val: await normalizeNumberLength(obj.trackedVal0, 10, 2),
      token1val: await normalizeNumberLength(obj.trackedVal1, 10, 2),
      poolVal: await normalizeNumberLength(obj.poolVal, 10, 2),
      poolDiff: await normalizeNumberLength(obj.poolDiff, 10, 2),
    };
    table.push(newObj);
  } catch (e) {
    console.log(`error on render: ${obj}, ${e}`);
  }
};

const normalizeStringLength = (str, max) => {
  if (str === undefined) {
    return;
  } else {
    if (str.toString().length <= max) {
      return str.toString().padStart(max);
    } else {
      return str.toString().substring(0, max);
    }
  }
};

const normalizeNumberLength = (num, max, precision) => {
  let reformattedNumber = '';
  let numLength = Math.floor(num).toString().length;

  if (numLength <= max) {
    reformattedNumber = Math.floor(num).toString().padStart(max);
  } else if (numLength > max) {
    reformattedNumber = Math.floor(num).toString().substring(0, max);
  }

  if (precision > 0) {
    if (num.toString().includes('.')) {
      let index = num.toString().indexOf('.');
      let decimals = num.toString().substring(index + 1);
      if (decimals.length < precision) {
        decimals = decimals.padEnd(precision, '0');
      } else {
        decimals = decimals.substring(0, precision);
      }
      return `${reformattedNumber}.${decimals}`;
    } else {
      return `${reformattedNumber}.${''.padEnd(precision, '0')}`;
    }
  } else {
    return reformattedNumber;
  }
};

const getName = async (add) => {
  try {
    let contract = await new web3.eth.Contract(erc20abi, add);
    let name = await contract.methods.name().call();

    return name;
  } catch (e) {
    console.log(`error on getName: ${add}, ${e}`);
  }
};

const getBalance = async (add, token) => {
  try {
    let contract = await new web3.eth.Contract(erc20abi, token);
    let bal = await contract.methods.balanceOf(add).call();

    return bal;
  } catch (e) {
    console.log(`error on getBalance: ${add}, ${token}, ${e}`);
  }
};

const getDecimals = async (token) => {
  try {
    let contract = await new web3.eth.Contract(erc20abi, token);
    let dec = await contract.methods.decimals().call();

    return dec;
  } catch (e) {
    console.log(`error on getDecimals: ${token}, ${e}`);
  }
};

const isIncludedInTracking = async (address) => {
  try {
    let isTracked = trackedCoins.find(
      (t) => t.address.toLowerCase() === address.toLowerCase()
    );
    if (isTracked !== undefined) {
      return { valid: true, data: isTracked };
    } else {
      return { valid: false };
    }
  } catch (e) {
    console.log(`error on isIncludedInTracking: ${e}`);
  }
};

const parseTrackedCoins = (tokens, network) => {
  return tokens.filter((t) => t.tracked === true && t.network === network);
};

const splitBN = (number, dec) => {
  let numberConverted = number.toString();

  let aboveZero =
    numberConverted.length > dec
      ? numberConverted.substring(0, numberConverted.length - dec)
      : '0';

  let belowZero =
    numberConverted.length <= dec
      ? numberConverted.padStart(dec, '0')
      : numberConverted.substring(numberConverted.length - dec);

  return `${aboveZero}.${belowZero}`;
};

const end = (msg) => {
  process.nextTick(() => {
    console.timeEnd('runtime-skimmer-table');
    process.exit();
  });
};

const loop = () => {
  process.nextTick(async () => {
    await check(id);
    id++;
    if (id < maxRange) {
      loop();
    } else {
      table.sort((a, b) => {
        return b.poolVal - a.poolVal;
      });
      process.nextTick(() => {
        console.table(table);
      });
      end();
    }
  });
};

const handleInput = async () => {
  try {
    if (process.argv.length >= 3) {
      let factory = pairCounts.find((p) => p.name === process.argv[2]);

      if (factory) {
        let pairPath = path.resolve(
          '../uniswap-skim-v2/data/pairs/',
          `${factory.network}`,
          `${factory.name}.js`
        );
        data = require(pairPath);
        maxRange = data.length;

        setRPC(factory.network);
        trackedCoins = parseTrackedCoins(tracked, factory.network);

        if (process.argv.length >= 4) {
          id = process.argv[3];

          if (id.toString().slice(0, 1) === '-') {
            let tail = Number(id.toString().slice(1));
            id = data.length > tail ? data.length - tail - 1 : 0;
          }
        }

        if (process.argv.length === 5) {
          minPoolValue = Number(process.argv[4]);
        }
      } else {
        end();
      }
      console.log(
        `\nsearching ${
          factory.name
        } ${id}-${maxRange}\nmin value: $${minPoolValue.toLocaleString()}\n`
      );
    } else {
      end();
    }
    loop();
  } catch (e) {
    console.log(`error on handleInput: ${e}`);
  }
};

handleInput();
