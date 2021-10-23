console.time('runtime-scan-factory');

const Web3 = require('web3');
const util = require('util');
const fs = require('fs');
const env = require('dotenv').config();
const path = require('path');

const pairCounts = require('../../data/factories/pair-counts.js');
const erc20abi = require('../../constants/abi/erc-20-abi.js');
const pairAbi = require('../../constants/abi/pair-abi.js');
const factoryAbi = require('../../constants/abi/factory-abi.js');

const pairCountPath = path.resolve(
  '../uniswap-skim-v2/data/factories/pair-counts.js'
);

let web3;
let factory;
let pairPath;
let factoryPair;

let initial;
let max = 0;
let counter = 0;
let timeout;

const rpcTimeout = {
  local: 5, // fast ws on local network (5 seconds)
  remote: 10, // medium fast ws on dedicated remote network (10 seconds)
  public: 25, // slow public rpc or https rpc connection (25 seconds)
};

const setRPCandFactory = async (net, add) => {
  try {
    let rpc;

    if (net === 'eth') {
      rpc = env.parsed.ETHEREUM_RPC;
      timeout = rpcTimeout.local;
    } else if (net === 'bsc') {
      rpc = env.parsed.BSC_RPC;
      timeout = rpcTimeout.remote;
    } else if (net === 'matic') {
      rpc = env.parsed.MATIC_RPC;
      timeout = rpcTimeout.remote;
    } else if (net === 'ftm') {
      rpc = env.parsed.FANTOM_PRC;
      timeout = rpcTimeout.remote;
    } else if (net === 'xdai') {
      rpc = env.parsed.XDAI_RPC;
      timeout = rpcTimeout.local;
    } else if (net === 'heco') {
      rpc = env.parsed.HECO_RPC;
      timeout = rpcTimeout.public;
    } else if (net === 'arbi') {
      rpc = env.parsed.ARBITRUM_RPC;
      timeout = rpcTimeout.public;
    }

    web3 = new Web3(rpc);
    factory = new web3.eth.Contract(factoryAbi, add);
  } catch (e) {
    console.log(`error on setRPC: ${e}`);
  }
};

const getName = async (add) => {
  try {
    let token = new web3.eth.Contract(erc20abi, add);
    let name = await token.methods.name().call();

    return name;
  } catch (e) {
    console.log(`error on getName: ${e}`);
    return '';
  }
};

const getTokenNames = async (num, pair, tkn0, tkn1) => {
  try {
    let obj = {
      index: num,
      id: pair,
      token0: {
        id: tkn0,
        name: await getName(tkn0),
      },
      token1: {
        id: tkn1,
        name: await getName(tkn1),
      },
    };

    let padding = ' '.repeat(2);

    let formatted = util
      .inspect(obj, {
        compact: false,
        depth: 2,
        breakLength: 80,
      })
      .replace(/\n/g, `\n${padding}`);

    appendFile(pairPath, `\n${padding}${formatted},`);
  } catch (e) {
    console.log(`error on getTokenNames: ${e}`);
  }
};

const getTokensFromPair = async (num, add) => {
  try {
    let pair = new web3.eth.Contract(pairAbi, add);

    let token0 = await pair.methods.token0().call();
    let token1 = await pair.methods.token1().call();

    return getTokenNames(num, add, token0, token1);
  } catch (e) {
    console.log(`error on getTokensFromPair: ${e}`);
  }
};

const getPair = async (num) => {
  try {
    let pair = await factory.methods.allPairs(num).call();

    return getTokensFromPair(num, pair);
  } catch (e) {
    console.log(`error on getPair: ${e}`);
  }
};

const checkPairCount = async () => {
  try {
    let count = await factory.methods.allPairsLength().call();
    return count;
  } catch (e) {
    console.log(`error on checkPairCount: ${e}`);
  }
};

const appendFile = (file, content) => {
  fs.appendFile(file, content, 'utf-8', (e) => {
    if (e) {
      console.error(e);
      return;
    }
  });
};

const readFileAndTrim = (file) => {
  fs.readFile(file, 'utf-8', (e, data) => {
    if (e) {
      console.log(`error on readFile in readFileAndTrim: ${e}`);
      return;
    }
    let linesExceptFirst = data.replace('\n];\n', '');
    fs.writeFile(file, linesExceptFirst, 'utf-8', (e) => {
      if (e) {
        console.log(`error on writeFile in readFileAndTrim: ${e}`);
        return;
      }
    });
  });
};

const evaluateFile = (file, count) => {
  if (count > 0) {
    readFileAndTrim(file);
    return;
  } else {
    fs.writeFile(file, `module.exports = [`, 'utf-8', (e) => {
      if (e) {
        console.log(`error on evaluateFile: ${e}`);
        return;
      }
    });
  }
};

const updatePairCount = (newCount) => {
  let index = pairCounts.findIndex((n) => n.name === factoryPair.name);

  pairCounts[index].count = Number(newCount);

  let formatted = util.inspect(pairCounts, {
    compact: false,
    depth: 2,
    breakLength: 80,
    maxArrayLength: null,
  });

  fs.writeFile(pairCountPath, `module.exports = ${formatted}`, 'utf-8', (e) => {
    if (e) {
      console.log(`error on updatePairCount: ${e}`);
      return;
    }
  });
};

const loop = () => {
  setTimeout(() => {
    getPair(counter);
    counter++;
    if (counter < max) {
      loop();
    } else {
      setTimeout(() => {
        appendFile(pairPath, `\n];\n`);
        end(`updating pair count...new total: ${max} pairs`, true);
      }, timeout * 100);
    }
  }, timeout);
};

const end = (msg, updateCount) => {
  let timer = timeout * 100;

  if (updateCount) {
    updatePairCount(max - 1);
  } else {
    timer = timeout;
  }

  setTimeout(() => {
    console.log(`\n${msg}\n`);
    process.nextTick(() => {
      console.timeEnd('runtime-scan-factory');
      process.exit();
    });
  }, timer);
};

const handleInput = async () => {
  try {
    if (process.argv.length === 3) {
      factoryPair = pairCounts.find((p) => p.name === process.argv[2]);
      if (factoryPair) {
        counter = factoryPair.count > 0 ? factoryPair.count + 1 : 0;
        initial = factoryPair.count;
        pairPath = path.resolve(
          '../uniswap-skim-v2/data/pairs/',
          `{factoryPair.network}`,
          `${factoryPair.name}.js`
        );

        console.log(pairPath);

        await setRPCandFactory(factoryPair.network, factoryPair.address);

        max = await checkPairCount();

        if (initial + 1 === Number(max)) {
          end('no pairs to update', false);
        } else {
          evaluateFile(pairPath, counter);
          console.log(
            `updating ${max - initial - 1} ${factoryPair.name} pairs...`
          );
          loop();
        }
      }
    } else {
      end('invalid input', false);
    }
  } catch (e) {
    console.log(`error on handleInput: ${e}`);
  }
};

handleInput();
