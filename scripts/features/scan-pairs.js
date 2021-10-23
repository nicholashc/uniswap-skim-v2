console.time('runtime-skimmer');

const Web3 = require('web3');
const util = require('util');
const env = require('dotenv').config();
const path = require('path');

const pairCounts = require('../../data/factories/pair-counts.js');
const tracked = require('../../data/tokens/tracked-prices.js');
const bridged = require('../../data/tokens/mapped-polygon.js');
const erc20abi = require('../../constants/abi/erc-20-abi.js');
const pairAbi = require('../../constants/abi/pair-abi.js');
const messages = require('../../constants/messages/cli.js');

let data;
let web3;
let trackedCoins;
let id = 0;
let max = 0;
let precision = 0;
let minPoolValue = 0;
let mode = undefined;
let detail = 'all';
let network;

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

const check = async (num, detail) => {
  try {
    let res = await getReserves(data[num].id);

    let bal0 = await getBalance(data[num].id, data[num].token0.id);
    let adj0 = await splitBN(bal0.bal, bal0.dec, false);
    let res0 = await splitBN(res[0], bal0.dec, false);
    let dif0 =
      Number(adj0) > Number(res0)
        ? await splitBN(Number(bal0.bal) - Number(res[0]), bal0.dec, false)
        : 0;

    let bal1 = await getBalance(data[num].id, data[num].token1.id);
    let adj1 = await splitBN(bal1.bal, bal1.dec, false);
    let res1 = await splitBN(res[1], bal1.dec, false);
    let dif1 =
      Number(adj1) > Number(res1)
        ? await splitBN(Number(bal1.bal) - Number(res[1]), bal1.dec, false)
        : 0;

    let obj = {
      index: num,
      pool: data[num].id,
      token0: {
        name:
          data[num].token0.name !== undefined
            ? data[num].token0.name
            : await getName(data[num].token0.id),
        address: data[num].token0.id,
        state: {
          balance: adj0,
          reserve: res0,
        },
      },
      token1: {
        name:
          data[num].token1.name !== undefined
            ? data[num].token1.name
            : await getName(data[num].token1.id),
        address: data[num].token1.id,
        state: {
          balance: adj1,
          reserve: res1,
        },
      },
    };

    let imbalance0 = Number(bal0.bal) > Number(res[0]) ? true : false;
    let imbalance1 = Number(bal1.bal) > Number(res[1]) ? true : false;

    let val0 = 0;
    let val1 = 0;

    let emoji = false;

    let notes = { notes: {} };

    let tracked0 = await getLatestPrice(data[num].token0.id, network);
    let tracked1 = await getLatestPrice(data[num].token1.id, network);
    let trackedVal0 = 0;
    let trackedVal1 = 0;
    let mismatchedPrices = false;

    if (tracked0 !== false) {
      obj.token0.price = {
        token: `$${Number(tracked0).toLocaleString()} usd`,
      };

      trackedVal0 = Number((Number(tracked0) * Number(adj0)).toFixed(2));

      obj.token0.price.value = `$${Number(trackedVal0).toLocaleString()} usd`;

      if (Number(dif0) > 0) {
        let val = (Number(tracked0) * Number(dif0)).toFixed(2);
        obj.token0.price.diffValue = `$${Number(val).toLocaleString()} usd`;

        if (Number(val) >= 10) {
          notes.notes.valuableSkim = `💵 💵 💵 skim worth $${Number(
            val
          ).toLocaleString()} usd`;
          emoji = true;
        }
      }
    }

    if (tracked1 !== false) {
      obj.token1.price = {
        token: `$${Number(tracked1).toLocaleString()} usd`,
      };

      trackedVal1 = Number((Number(tracked1) * Number(adj1)).toFixed(2));

      obj.token1.price.value = `$${Number(trackedVal1).toLocaleString()} usd`;

      if (Number(dif1) > 0) {
        let val = (Number(tracked1) * Number(dif1)).toFixed(2);
        obj.token1.price.diffValue = `$${Number(val).toLocaleString()} usd`;

        if (Number(val) >= 10) {
          notes.notes.valuableSkim = `💵 💵 💵 skim worth $${Number(
            val
          ).toLocaleString()} usd`;
          emoji = true;
        }
      }
    }

    let poolVal = 0;

    if (trackedVal0 > 0 && trackedVal1 > 0) {
      poolVal = trackedVal0 + trackedVal1;
    } else if (trackedVal0 > 0 && trackedVal1 === 0) {
      poolVal = trackedVal0 + trackedVal0;
    } else if (trackedVal1 > 0 && trackedVal0 === 0) {
      poolVal = trackedVal1 + trackedVal1;
    }

    if (poolVal > 0) {
      obj.poolValue = `$${Number(poolVal.toFixed(2)).toLocaleString()} usd`;
    }

    if (poolVal > 1000 && trackedVal0 > 0 && trackedVal1 > 0) {
      if (
        poolVal > (trackedVal0 + 100) * 2.1 ||
        poolVal > (trackedVal1 + 100) * 2.1
      ) {
        let larger = trackedVal0 > trackedVal1 ? trackedVal0 : trackedVal1;
        let smaller = trackedVal0 === larger ? trackedVal1 : trackedVal0;
        let percent = Number(smaller) / Number(larger);
        let text = larger === trackedVal0 ? 'token0' : 'token1';
        let diff = Number(larger - smaller).toFixed(2);
        notes.notes.mismatchedPrices = `💰💰💰 ${text}: ${(
          100 -
          percent * 100
        ).toFixed(2)}% larger, $${Number(
          diff
        ).toLocaleString()} usd difference`;
        mismatchedPrices = true;
        emoji = true;
      }
    }

    let isLP0 = await isLP(obj.token0.name);
    let isLP1 = await isLP(obj.token1.name);

    if (imbalance0) {
      let percentage = Number(dif0) / Number(adj0);
      let value = Math.floor(Number(bal1.bal) * percentage);
      val0 =
        value !== undefined
          ? await splitBN(value.toString(), bal1.dec, false)
          : 0;
      obj.token0.state.swapValue = `${val0} ${obj.token1.name}`;
      obj.token0.state.difference = `${dif0.toString()} ${obj.token0.name}`;

      if (Number(dif0) >= 0) {
        notes.notes.skim = `💰 skim opportunity: ${dif0.toString()} ${
          obj.token0.name
        }`;
      }

      if (tracked0 === false && tracked1 !== false) {
        let val = (Number(tracked1) * Number(val0)).toFixed(2);
        obj.token1.price.diffValue = `$${Number(val).toLocaleString()} usd`;
        if (Number(val) >= 10) {
          notes.notes.valuableSkim = `💵 💵 💵 skim worth $${Number(
            val
          ).toLocaleString()} usd`;
          emoji = true;
        }
      }
    }

    if (imbalance1) {
      let percentage = Number(dif1) / Number(adj1);
      let value = Math.floor(Number(bal0.bal) * percentage);
      val1 =
        value !== undefined
          ? await splitBN(value.toString(), bal0.dec, false)
          : 0;
      obj.token1.state.swapValue = `${val1} ${obj.token0.name}`;
      obj.token1.state.difference = `${dif1.toString()} ${obj.token1.name}`;

      if (Number(dif1) >= 0) {
        notes.notes.skim = `💰 skim opportunity: ${dif1.toString()} ${
          obj.token1.name
        }`;
      }

      if (tracked1 === false && tracked0 !== false) {
        let val = (Number(tracked0) * Number(val1)).toFixed(2);
        obj.token0.price.diffValue = `$${Number(val).toLocaleString()} usd`;
        if (Number(val) >= 10) {
          notes.notes.valuableSkim = `💵 💵 💵 skim worth $${Number(
            val
          ).toLocaleString()} usd`;
          emoji = true;
        }
      }
    }

    if ((adj0 > 1 && adj1 < 0.001) || (adj1 > 1 && adj0 < 0.001)) {
      notes.notes.imbalance = `🥴 imbalanced pool`;
      if (poolVal > 10) {
        emoji = true;
      }
    }

    if (res[0] > bal0.bal || res[1] > bal1.bal) {
      notes.notes.sync = `🔄 sync required`;
    }

    if (isLP0) {
      let sup0 = await getSupply(data[num].token0.id);
      obj.token0.lp = { supply: await splitBN(sup0.toString(), 18, false) };
      let per0 = (Number(bal0.bal) / Number(sup0)) * 100;
      obj.token0.lp.percent = `${per0.toFixed(4)}%`;

      let tokenAddresses = await getTokensFromPair(data[num].token0.id);
      let token0Symbol = await getSymbol(tokenAddresses.token0);
      let token1Symbol = await getSymbol(tokenAddresses.token1);

      obj.token0.lp.name = `${token0Symbol}-${token1Symbol} LP`;
      notes.notes.isLP = `🏦 LP tokens`;

      if (per0 >= 0.02) {
        emoji = true;
      }
    }

    if (isLP1) {
      let sup1 = await getSupply(data[num].token1.id);
      obj.token1.lp = { supply: await splitBN(sup1.toString(), 18, false) };
      let per1 = (Number(bal1.bal) / Number(sup1)) * 100;
      obj.token1.lp.percent = `${per1.toFixed(4)}%`;

      let tokenAddresses = await getTokensFromPair(data[num].token1.id);
      let token0Symbol = await getSymbol(tokenAddresses.token0);
      let token1Symbol = await getSymbol(tokenAddresses.token1);

      obj.token1.lp.name = `${token0Symbol}-${token1Symbol} LP`;
      notes.notes.isLP = `🏦 LP tokens`;

      if (per1 >= 0.02) {
        emoji = true;
      }
    }

    if (network === 'eth') {
      let mappedEth = bridged.find(
        (b) =>
          b.eth.toLowerCase() === obj.token0.address.toLowerCase() ||
          b.eth.toLowerCase() === obj.token1.address.toLowerCase()
      );

      if (mappedEth !== undefined) {
        obj.mapped = mappedEth;
        notes.notes.isMapped = `🗺️  bridged to matic`;
      }
    } else if (network === 'matic') {
      let mappedMatic = bridged.find(
        (b) =>
          b.matic.toLowerCase() === obj.token0.address.toLowerCase() ||
          b.matic.toLowerCase() === obj.token1.address.toLowerCase()
      );

      if (mappedMatic !== undefined) {
        obj.mapped = mappedMatic;
        notes.notes.isMapped = `🗺️  bridged to eth`;
      }
    }

    if (Object.keys(notes.notes).length > 0) {
      obj.notes = notes.notes;
    }

    if (detail === 'all') {
      render(obj);
    } else if (detail === 'lp') {
      if (isLP0 || isLP1) {
        render(obj);
      }
    } else if (detail === 'imb') {
      if (
        (adj0 > 1 && tracked0 === false && adj1 < 0.001) ||
        (adj1 > 1 && tracked1 === false && adj0 < 0.001) ||
        (adj0 > 1 && poolVal >= 1000 && adj1 < 0.001) ||
        (adj1 > 1 && poolVal >= 1000 && adj0 < 0.001)
      ) {
        render(obj);
      }
    } else if (detail === 'sync') {
      if (res0 > adj0 || res1 > adj1) {
        render(obj);
      }
    } else if (detail === 'emoji') {
      if (emoji === true) {
        render(obj);
      }
    } else if (detail === 'skim') {
      if (imbalance0 === true || imbalance1 === true) {
        render(obj);
      }
    } else if (detail === 'mismatch') {
      if (mismatchedPrices === true) {
        render(obj);
      }
    } else if (detail === 'pos') {
      if (network === 'matic') {
        let name0pos = isPOS(obj.token0.name, '(PoS)');
        let name1pos = isPOS(obj.token1.name, '(PoS)');
        if (name0pos || name1pos) {
          render(obj);
        }
      } else if (network === 'xdai') {
        let name0pos = isPOS(obj.token0.name, 'on xDai');
        let name1pos = isPOS(obj.token1.name, 'on xDai');
        if (name0pos || name1pos) {
          render(obj);
        }
      }
    } else {
      render(obj);
    }
  } catch (e) {
    console.log(`error on check: ${num}, ${e}`);
  }
};

const isPOS = (name, str) => {
  if (name.toString().includes(str)) {
    return true;
  } else {
    return false;
  }
};

const isLP = (name) => {
  if (typeof name === 'string') {
    if (
      name.includes('Uniswap V2') ||
      name.includes('LP ') ||
      name.includes(' LP') ||
      name.includes(' LPs') ||
      name.includes('LPs ')
    ) {
      return true;
    } else {
      return false;
    }
  } else {
    return false;
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

    let canRender = true;

    if (precision > 0) {
      if (
        Number(obj.token0.state.balance) < precision ||
        Number(obj.token0.state.balance) < precision
      ) {
        canRender = false;
      }
    }

    if (minPoolValue > 0) {
      if (obj.poolValue) {
        let parsed = Number(
          obj.poolValue.substring(1, obj.poolValue.length - 4).replace(',', '')
        );
        if (Number(minPoolValue) > Number(parsed)) {
          canRender = false;
        }
      } else {
        canRender = false;
      }
    }

    if (canRender === true) {
      console.log(`${formatted},`);
    }
  } catch (e) {
    console.log(`error on render: ${e}`);
  }
};

const getTokensFromPair = async (add) => {
  try {
    const pair = new web3.eth.Contract(pairAbi, add);

    let token0 = await pair.methods.token0().call();
    let token1 = await pair.methods.token1().call();

    return { token0: token0, token1: token1 };
  } catch (e) {
    console.log(`error on getTokensFromPair: ${e}`);
  }
};

const getSupply = async (add) => {
  try {
    let contract = await new web3.eth.Contract(erc20abi, add);
    let supply = await contract.methods.totalSupply().call();

    return supply;
  } catch (e) {
    console.log(`error on getSupply: ${e}`);

    return 0;
  }
};

const getReserves = async (add) => {
  try {
    let contract = await new web3.eth.Contract(pairAbi, add);
    let reserves = await contract.methods.getReserves().call();

    return reserves;
  } catch (e) {
    console.log(`error on getReserves: ${e}`);
    return [0, 0];
  }
};

const getName = async (add) => {
  try {
    let contract = await new web3.eth.Contract(erc20abi, add);
    let name = await contract.methods.name().call();

    return name;
  } catch (e) {
    console.log(`error on getName: ${add}, ${e}`);
    return 'null';
  }
};

const getSymbol = async (add) => {
  try {
    let contract = await new web3.eth.Contract(erc20abi, add);
    let symbol = await contract.methods.symbol().call();

    return symbol;
  } catch (e) {
    console.log(`error on getSymbol: ${add}, ${e}`);
    return 'null';
  }
};

const getBalance = async (add, token) => {
  try {
    let contract = await new web3.eth.Contract(erc20abi, token);
    let dec = await contract.methods.decimals().call();
    let bal = await contract.methods.balanceOf(add).call();

    return {
      dec: dec,
      bal: bal,
    };
  } catch (e) {
    console.log(`error on getBalance: ${add}, ${e}`);
    return {
      dec: '18',
      bal: '0',
    };
  }
};

const getLatestPrice = async (address, network) => {
  try {
    let isTracked = trackedCoins.filter(
      (t) =>
        t.address.toLowerCase() === address.toLowerCase() &&
        t.network === network
    );

    if (isTracked.length !== 0) {
      let str =
        isTracked[0].price !== undefined && isTracked[0].price !== null
          ? isTracked[0].price.toString()
          : '0';

      if (str.includes('e')) {
        let decimal = parseFloat(isTracked[0].price).toFixed(18);

        while (decimal.endsWith('0')) {
          decimal = decimal.substring(0, decimal.length - 1);
        }

        return decimal;
      } else {
        return str;
      }
    } else {
      return false;
    }
  } catch (e) {
    console.log(`error on getLatestPrice: ${e}`);
    return false;
  }
};

const parseTrackedCoins = (tokens) => {
  return tokens.filter((t) => t.tracked === true);
};

const splitBN = (number, dec, comma) => {
  if (number === null || dec === null) {
    return null;
  }
  let numberConverted = number.toString();

  if (number.toString().includes('e')) {
    numberConverted = Number(number).toLocaleString('fullwide', {
      useGrouping: false,
    });
  }

  const aboveZero =
    numberConverted.length > dec
      ? numberConverted.slice(0, Math.max(0, numberConverted.length - dec))
      : 0;

  let belowZero =
    numberConverted.length < dec
      ? numberConverted.padStart(dec, '0')
      : numberConverted.slice(
          numberConverted.length - dec,
          numberConverted.length
        );

  if (dec === '0') {
    belowZero = '0';
  }

  if (comma) {
    return `${Number(aboveZero).toLocaleString()}.${belowZero}`;
  } else {
    return `${aboveZero}.${belowZero}`;
  }
};

const loop = async () => {
  process.nextTick(async () => {
    await check(id, detail);

    id++;
    if (id < max) {
      loop();
    } else {
      end(messages[0].help);
    }
  });
};

const end = (msg) => {
  console.log(`\n${msg}\n`);

  process.nextTick(() => {
    console.timeEnd('runtime-skimmer');
    process.exit();
  });
};

let pairPath;

const handleInput = async () => {
  try {
    let message = messages[0].help;

    if (process.argv.length >= 3) {
      for (let i = 0; i < pairCounts.length; i++) {
        if (process.argv[2] === pairCounts[i].name) {
          mode = process.argv[2];
          network = pairCounts[i].network;
          pairPath = path.resolve(
            '../uniswap-skim-v2/data/pairs/',
            `${network}`,
            `${mode}.js`
          );
          data = require(pairPath);
          message = `checking ${data.length} ${mode}swap pairs...`;
          trackedCoins = parseTrackedCoins(tracked);
          setRPC(network);

          break;
        }
      }

      if (process.argv.length >= 4) {
        let validDetails = [
          'all',
          'lp',
          'imb',
          'skim',
          'sync',
          'emoji',
          'mismatch',
          'pos',
        ];
        if (validDetails.includes(process.argv[3])) {
          detail = process.argv[3];
        }
      }

      if (process.argv.length >= 5) {
        id = process.argv[4];

        if (id.toString().slice(0, 1) === '-') {
          console.log(
            `tail mode: searching ${id.toString().slice(1)} most recent pairs`
          );

          let tail = Number(id.toString().slice(1));
          id = data.length > tail ? data.length - tail : 0;
        }
      }

      if (process.argv.length === 6) {
        precision = process.argv[5];
      }

      if (process.argv.length === 7) {
        minPoolValue = Number(process.argv[6]);
      }

      if (mode === undefined) {
        end(messages[0].help);
      }
    } else {
      end(messages[0].help);
    }

    max = data.length;
    console.log(message);
    loop();
  } catch (e) {
    console.log(`error on handleInput: ${e}`);
  }
};

handleInput();
console.log(messages[0].help)
