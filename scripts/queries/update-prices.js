console.time('runtime-update-tracked');

const axios = require('axios').default;
const util = require('util');
const fs = require('fs');
const path = require('path');

const tracked = require('../../data/tokens/tracked-prices.js');

const absolutePath = path.resolve(
  '../uniswap-skim-v2/data/tokens/tracked-prices.js'
);

const errorMessage = `invalid input

valid networks: eth, bsc, matic, ftm, xdai, heco, arbitrum`;

let network;
let chain;
let tracking = tracked;
let max = 0;
let id = 0;
let sleep = 1000;
let time = 0;
let delay = 86400;

const setNetwork = (net) => {
  if (net === 'eth') {
    network = net;
    chain = 'ethereum';
  } else if (net === 'bsc') {
    network = net;
    chain = 'binance-smart-chain';
  } else if (net === 'matic') {
    network = net;
    chain = 'polygon-pos';
  } else if (net === 'ftm') {
    network = net;
    chain = 'fantom';
  } else if (net === 'xdai') {
    network = net;
    chain = 'xdai';
  } else if (net === 'heco') {
    network = net;
    chain = 'huobi-token';
  }

  return network === undefined ? false : true;
};

const checkPrice = async (chainName, address) => {
  try {
    let response = await axios.get(
      `https://api.coingecko.com/api/v3/simple/token_price/${chainName}?contract_addresses=${address}&vs_currencies=usd&include_last_updated_at=true`
    );

    let res = response.data[address.toLowerCase()];

    return res;
  } catch (e) {
    console.log(`error on checkPrice: ${e}`);
  }
};

const update = async (time, id, token) => {
  try {
    let priceAPI = await checkPrice(chain, token.address);

    if (priceAPI !== undefined) {
      tracking[id].lastUpdated = time;

      if (priceAPI.last_updated_at > tracking[id].lastApiUpdate) {
        tracking[id].price = priceAPI.usd;
        tracking[id].lastApiUpdate = priceAPI.last_updated_at;

        await updateTracked();
      }
      return;
    } else {
      return;
    }
  } catch (e) {
    console.log(`error on update: ${e}`);
  }
};

const resolve = async () => {
  try {
    await updateTracked();

    setTimeout(() => {
      end('done updating');
    }, sleep);
  } catch (e) {
    console.log(`error on resolve: ${e}`);
  }
};

const processUpdate = () => {
  try {
    if (id < max && tracking[id].address !== undefined) {
      if (
        tracking[id].network.toString() === network &&
        tracking[id].lastUpdated + delay < time
      ) {
        console.log(`checking ${id} ${tracking[id].address}`);
        setTimeout(() => {
          update(time, id, tracking[id]);
          id++;
          if (id < max) {
            processUpdate();
          } else {
            resolve();
          }
        }, sleep);
      } else {
        console.log(`skipping ${id} ${tracking[id].address}`);
        id++;
        processUpdate();
      }
    } else {
      resolve();
    }
  } catch (e) {
    console.log(`error on processUpdate ${e}`);
  }
};

const updateTracked = () => {
  let formatted = util.inspect(tracking, {
    compact: false,
    depth: 2,
    breakLength: 80,
    maxArrayLength: null,
  });

  fs.writeFileSync(
    absolutePath,
    `module.exports = ${formatted}`,
    'utf-8',
    (e) => {
      if (e) {
        console.error(e);
        return;
      }
    }
  );

  process.nextTick(() => {
    tracking = require('../../data/tokens/tracked-prices.js');
  });
};

const end = (msg) => {
  console.log(`\n${msg}\n`);

  process.nextTick(() => {
    console.timeEnd('runtime-update-tracked');
    process.exit();
  });
};

const handleInput = () => {
  if (process.argv.length >= 3) {
    let valid = setNetwork(process.argv[2]);

    if (valid) {
      if (process.argv.length === 4) {
        delay = Number(process.argv[3]);
      }

      time = Math.round(new Date().getTime() / 1000);
      max = tracking.length;

      console.log(
        `time: ${time}\ndelay: ${delay}\nchecking prices on ${network}\n`
      );

      processUpdate();
    } else {
      end(errorMessage);
    }
  } else {
    end(errorMessage);
  }
};

handleInput();
