console.time('runtime-new-pools');

const env = require('dotenv').config();
const Web3 = require('web3');

const pairCounts = require('../../data/factories/pair-counts.js');
const factoryAbi = require('../../constants/abi/factory-abi.js');

let web3;
let factory;

let max = 0;
let counter = 0;
let mode = 'all';

let networkFlags = {
  bsc: false,
  eth: false,
  ftm: false,
  matic: false,
  xdai: false,
  heco: false,
  arbi: false,
};

const setRPC = async (network) => {
  mode = network;
  try {
    let rpc;

    if (network === 'eth') {
      rpc = env.parsed.ETHEREUM_RPC;
    } else if (network === 'bsc') {
      rpc = env.parsed.BSC_RPC;
    } else if (network === 'matic') {
      rpc = env.parsed.MATIC_RPC;
    } else if (network === 'ftm') {
      rpc = env.parsed.FANTOM_PRC;
    } else if (network === 'xdai') {
      rpc = env.parsed.XDAI_RPC;
    } else if (network === 'heco') {
      rpc = env.parsed.HECO_RPC;
    } else if (network === 'arbi') {
      rpc = env.parsed.ARBITRUM_RPC;
    }

    web3 = new Web3(rpc);
  } catch (e) {
    console.log(`error on setRPC: ${e}`);
  }
};

const setFactory = async (address) => {
  try {
    factory = await new web3.eth.Contract(factoryAbi, address);
    return;
  } catch (e) {
    console.log(`error on setFactory: ${e}`);
  }
};

const getPairCount = async () => {
  try {
    let count = await factory.methods.allPairsLength().call();
    return count;
  } catch (e) {
    console.log(`error on getPairCount: ${e}`);
  }
};

const checkPairCount = async (obj) => {
  try {
    if (mode === 'all') {
      await flipNetworkFlag(obj.network);
      await setFactory(obj.address);

      let count = await getPairCount();

      if (count > obj.count + 1) {
        console.log(
          `${count - obj.count - 1} new pairs created on ${obj.name}`
        );
      }
    } else {
      await setFactory(obj.address);
      let count = await getPairCount();

      if (count > obj.count + 1) {
        console.log(
          `${count - obj.count - 1} new pairs created on ${obj.name}`
        );
      }
    }
  } catch (e) {
    console.log(`error on checkPairCount: ${e}`);
  }
};

const flipNetworkFlag = async (network) => {
  try {
    if (networkFlags[network] === false) {
      await setRPC(network);
      console.log(`\n${network}\n`);
      networkFlags[network] = true;
    }
  } catch (e) {
    console.log(`error on flipNetworkFlag: ${e}`);
  }
};

const loop = async () => {
  process.nextTick(async () => {
    await checkPairCount(pairsInNetwork[counter]);
    counter++;
    if (counter < max) {
      loop();
    } else {
      end();
    }
  });
};

const end = () => {
  console.log(`\n`);
  process.nextTick(() => {
    console.timeEnd('runtime-new-pools');
    process.exit();
  });
};

let pairsInNetwork = pairCounts;

const handleInput = () => {
  if (process.argv.length === 3 && process.argv[2] !== 'all') {
    mode = process.argv[2];
    pairsInNetwork = pairCounts.filter(
      (p) => p.network.toString() === mode.toString()
    );
    console.log(`\n${mode}\n`);
    setRPC(mode);
    max = pairsInNetwork.length;
    loop();
  } else {
    setRPC(pairCounts[0].network);
    max = pairCounts.length;
    loop();
  }
};

handleInput();
