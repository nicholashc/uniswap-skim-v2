console.time('runtime-self-lp');

const Web3 = require('web3');
const util = require('util');
const env = require('dotenv').config();
const path = require('path');

const pairCounts = require('../../data/factories/pair-counts.js');
const erc20abi = require('../../constants/abi/erc-20-abi.js');

let web3;
let data;
let pairPath;

let max = 0;
let index = 0;

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
  } catch (e) {
    console.log(`error on setRPC: ${e}`);
  }
};

const check = async (num) => {
  try {
    let selfBal = await getBalance(data[num].id, data[num].id);

    if (Number(selfBal) > 0) {
      let lpSupply = await getSupply(data[num].id);
      let token0Symbol = await getSymbol(data[num].token0.id);
      let token1Symbol = await getSymbol(data[num].token1.id);

      let lpObj = {
        index: num,
        name: `${token0Symbol}-${token1Symbol} LP`,
        address: data[num].id,
        supply: lpSupply,
        selfBal: selfBal,
      };
      render(lpObj);
    }
  } catch (e) {
    console.log(`error on check: ${num}, ${e}`);
  }
};

const render = async (obj) => {
  try {
    let formatted = util.inspect(obj, {
      compact: false,
      depth: 2,
      breakLength: 80,
      colors: true,
    });

    console.log(`${formatted},`);
  } catch (e) {
    console.log(`error on render: ${e}`);
  }
};

const getSupply = async (add) => {
  try {
    let contract = await new web3.eth.Contract(erc20abi, add);
    let supply = await contract.methods.totalSupply().call();

    return supply;
  } catch (e) {
    console.log(`error on getSupply: ${e}`);
  }
};

const getSymbol = async (add) => {
  try {
    let contract = await new web3.eth.Contract(erc20abi, add);
    let symbol = await contract.methods.symbol().call();

    return symbol;
  } catch (e) {
    console.log(`error on getSymbol: ${e}`);
  }
};

const getBalance = async (add, token) => {
  try {
    let contract = await new web3.eth.Contract(erc20abi, token);
    let bal = await contract.methods.balanceOf(add).call();

    return bal;
  } catch (e) {
    console.log(`error on getBalance: ${e}`);
  }
};

const end = () => {
  process.nextTick(() => {
    console.timeEnd('runtime-self-lp');
    process.exit();
  });
};

const loop = () => {
  process.nextTick(async () => {
    await check(index);
    index++;
    if (index < max) {
      loop();
    } else {
      end();
    }
  });
};

const handleInput = async () => {
  try {
    if (process.argv.length >= 3) {
      let factory = pairCounts.find((p) => p.name === process.argv[2]);

      if (factory) {
        pairPath = path.resolve(
          '../uniswap-skim-v2/data/pairs/',
          `${factory.network}`,
          `${factory.name}.js`
        );
        data = require(pairPath);

        max = data.length;

        setRPC(factory.network);

        if (process.argv.length >= 4) {
          index = Number(process.argv[3]);

          if (index.toString().slice(0, 1) === '-') {
            let tail = index.toString().slice(1);
            index = data.length > tail ? data.length - tail : 0;
          }
        }
      } else {
        end();
      }
      console.log(`\nsearching ${factory.name} ${index}-${max}\n`);
    } else {
      end();
    }
    loop();
  } catch (e) {
    console.log(`error getting balance, ${e}`);
  }
};

handleInput();
