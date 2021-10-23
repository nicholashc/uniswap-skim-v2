const data = require('../../data/factories/pair-counts.js');

let networks = [];
let totals = [];

const spacer = '--------------------';
const template = { chain: spacer, amms: spacer, pairs: spacer };

const getLongName = (str) => {
  let short = str.toLowerCase();

  if (short === 'eth') {
    return 'ETHEREUM';
  } else if (short === 'bsc') {
    return 'BINANCE SMART CHAIN';
  } else if (short === 'ftm') {
    return 'FANTOM';
  } else if (short === 'matic') {
    return 'POLYGON POS';
  } else if (short === 'xdai') {
    return 'XDAI';
  } else if (short === 'heco') {
    return 'HUOBI ECO CHAIN';
  } else if (short === 'arbi') {
    return 'ARBITRUM';
  } else {
    return 'UNKNOWN';
  }
};

const sumNumbers = () => {
  let count = 0;

  networks.forEach((n) => {
    count += Number(n.pairs);
  });

  return count;
};

const sort = (arr) => {
  let sorted = arr.sort((a, b) => {
    return b.count - a.count;
  });

  return sorted;
};

const render = () => {
  for (let i = 0; i < networks.length; i++) {
    totals.push({
      chain: getLongName(networks[i].chain),
      amms: networks[i].amms,
      pairs: networks[i].pairs,
    });

    let sorted = sort(networks[i].factories);

    console.table(sorted);
  }

  console.table(totals);
};

const calcTotals = () => {
  let total = {
    chain: 'TOTALS',
    amms: data.length,
    pairs: sumNumbers(),
  };

  totals.push(total);
  totals.push(template);

  render();
};

const parseNetworks = () => {
  for (let i = 0; i < data.length; i++) {
    let found = networks.find((a) => data[i].network === a.chain);

    if (found === undefined) {
      networks.push({
        chain: data[i].network,
        amms: 1,
        pairs: data[i].count,
        factories: [data[i]],
      });
    } else {
      let index = networks.findIndex((b) => b.chain === found.chain);

      networks[index].pairs += data[i].count;
      networks[index].amms += 1;
      networks[index].factories.push(data[i]);
    }
  }

  calcTotals();
};

const run = () => {
  console.log(`gathering total network, factory, and pair stats...`);

  parseNetworks();
};

run();
